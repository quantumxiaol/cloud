import './style.css'
import {
  Color,
  Data3DTexture,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  NoColorSpace,
  NoToneMapping,
  PerspectiveCamera,
  RedFormat,
  RepeatWrapping,
  Scene,
  type Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three'
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing'
import {
  AerialPerspectiveEffect,
  getSunLightColor,
  PrecomputedTexturesLoader,
} from '@takram/three-atmosphere'
import { CloudsEffect, CloudLayers, type CloudsQualityPreset } from '@takram/three-clouds'
import {
  DataTextureLoader,
  Ellipsoid,
  Geodetic,
  parseUint8Array,
  STBNLoader,
} from '@takram/three-geospatial'
import { PhotonEffect } from './PhotonEffect'
import { MotionClock } from './MotionClock'
import { requiredElement as $ } from '../lib/dom'
import { LOW_SUN_ELEVATION, SUN_REFERENCE_RGB } from './sunlight'

type Mode = 'volume' | 'cirrus' | 'cirrocumulus'
const canvas = $<HTMLCanvasElement>('#sky')
const status = $('#status')
const pause = $<HTMLButtonElement>('#pause')
const clock = new MotionClock()
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
let ready = false
let failed = false
let mode: Mode = 'volume'
let coverage = 0.32
let pitch = 28
const defaultSun = { elevation: 40, azimuth: -58 }
const sunlight = { ...defaultSun }
let invalidate = () => {}
let applyMode = () => {}
let applyQuality = () => {}
let applySun = () => {}
let disposeRendering = () => {}
let generation = 0
let contextLost = false
let leaving = false

function releaseRendering() {
  disposeRendering()
  disposeRendering = () => {}
  invalidate = applyMode = applyQuality = applySun = () => {}
}

function setPlaybackDisabled(disabled: boolean) {
  for (const id of ['pause', 'advance', 'reset']) $<HTMLButtonElement>(`#${id}`).disabled = disabled
}

function fail(error: unknown) {
  failed = true
  console.error('Cloud lab:', error)
  status.textContent = '天空未能加载，请重新加载再试。'
  $('#retry').hidden = false
  setPlaybackDisabled(true)
}
$('#retry').addEventListener('click', () => location.reload())

function setPaused(value: boolean) {
  clock.paused = value
  pause.textContent = value ? '继续' : '暂停'
  pause.setAttribute('aria-pressed', String(value))
  invalidate()
}
pause.addEventListener('click', () => setPaused(!clock.paused))
$('#advance').addEventListener('click', () => {
  clock.advance(30)
  invalidate()
})
$('#reset').addEventListener('click', () => {
  clock.reset()
  invalidate()
})

for (const id of ['wind', 'evolution', 'coverage', 'pitch']) {
  const input = $<HTMLInputElement>(`#${id}`)
  input.addEventListener('input', () => {
    const value = Number(input.value)
    $(`#${id}-value`).textContent =
      id === 'coverage'
        ? `${Math.round(value * 100)}%`
        : id === 'pitch'
          ? `${value}°`
          : `${value.toFixed(1)}×`
    if (id === 'wind') clock.wind = value
    else if (id === 'evolution') clock.evolution = value
    else if (id === 'coverage') coverage = value
    else pitch = value
    invalidate()
  })
}
function syncSunControls() {
  for (const key of ['elevation', 'azimuth'] as const) {
    $<HTMLInputElement>(`#sun-${key}`).value = String(sunlight[key])
    $(`#sun-${key}-value`).textContent = `${sunlight[key]}°`
  }
  applySun()
  invalidate()
}
for (const key of ['elevation', 'azimuth'] as const) {
  $<HTMLInputElement>(`#sun-${key}`).addEventListener('input', (event) => {
    sunlight[key] = Number((event.target as HTMLInputElement).value)
    syncSunControls()
  })
}
$('#reset-sun').addEventListener('click', () => {
  Object.assign(sunlight, defaultSun)
  syncSunControls()
})
$('#speed').addEventListener('change', () => {
  clock.speed = Number($<HTMLSelectElement>('#speed').value)
})
$('#quality').addEventListener('change', () => {
  applyQuality()
  invalidate()
})
const descriptions: Record<Mode, string> = {
  volume: '有厚度的云，随风移动，也慢慢舒展。',
  cirrus: '高空中的细丝，在不同的气流中展开。',
  cirrocumulus: '细小的白色云粒，聚散成一片片薄云。',
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
  button.addEventListener('click', () => {
    mode = button.dataset.mode as Mode
    for (const other of document.querySelectorAll('[data-mode]'))
      other.setAttribute('aria-pressed', String(other === button))
    $('#description').textContent = descriptions[mode]
    $('#source').textContent =
      mode === 'volume' ? 'Takram · 体积云与大气散射' : 'Photon · 云形参考 / Takram · 大气'
    applyMode()
    invalidate()
  })
}

async function start(run: number) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    depth: false,
    powerPreference: 'high-performance',
  })
  renderer.toneMapping = NoToneMapping
  renderer.toneMappingExposure = 10
  renderer.debug.onShaderError = (gl, _program, _vertex, fragment) =>
    fail(gl.getShaderInfoLog(fragment))
  const camera = new PerspectiveCamera(58, 1, 1, 400000)
  // Keep camera coordinates small to preserve GPU precision near the eye.
  // Avoid the cube-sphere face centre, where the upstream UV formula suffers
  // cancellation in sqrt(1.5 - sqrt(9.0) / 2.0), creating quantized strips.
  const position = new Geodetic(Math.PI / 6, (35 * Math.PI) / 180, 120).toECEF()
  const up = Ellipsoid.WGS84.getSurfaceNormal(position)
  const east = new Vector3(-0.5, Math.sqrt(3) / 2, 0)
  const north = new Vector3().crossVectors(up, east)
  const worldToECEF = new Matrix4()
    .makeBasis(east, up, north.clone().negate())
    .setPosition(position)
  const scene = new Scene()
  const aerial = new AerialPerspectiveEffect(camera)
  aerial.sky = true
  const clouds = new CloudsEffect(camera)
  clouds.worldToECEFMatrix.copy(worldToECEF)
  aerial.worldToECEFMatrix.copy(worldToECEF)
  const photon = new PhotonEffect()
  const sun = new Vector3()
  // East/up/north for Photon; rotate to ECEF for both Takram effects.
  const localSun = photon.values.sunDirection.value
  function setSunDirection(elevation: number, azimuth: number) {
    const altitude = (elevation * Math.PI) / 180
    const bearing = (azimuth * Math.PI) / 180
    const horizontal = Math.cos(altitude)
    localSun.set(horizontal * Math.sin(bearing), Math.sin(altitude), horizontal * Math.cos(bearing))
    sun
      .copy(up)
      .multiplyScalar(localSun.y)
      .addScaledVector(east, localSun.x)
      .addScaledVector(north, localSun.z)
      .normalize()
  }
  const syncCloudComposition = () => {
    const enabled = mode === 'volume'
    aerial.overlay = enabled ? clouds.atmosphereOverlay : null
    aerial.shadow = enabled ? clouds.atmosphereShadow : null
    aerial.shadowLength = enabled ? clouds.atmosphereShadowLength : null
  }
  // Takram emits change only when composition objects are created/replaced,
  // not when an existing cloud pass is re-enabled. Also keep Photon modes
  // detached if a resize or quality change replaces these objects.
  clouds.events.addEventListener('change', syncCloudComposition)
  const composer = new EffectComposer(renderer, {
    frameBufferType: HalfFloatType,
    multisampling: 0,
  })
  composer.addPass(new RenderPass(scene, camera))
  const cloudPass = new EffectPass(camera, clouds)
  composer.addPass(cloudPass)
  composer.addPass(new EffectPass(camera, aerial))
  composer.addPass(new EffectPass(camera, photon))
  composer.addPass(new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.AGX })))

  let disposed = false
  const textures = new Set<Texture>()
  const ownTexture = <T extends Texture>(texture: T): T => {
    // A load can finish after context loss or navigation. Release stale assets
    // instead of attaching them to a newer rendering session.
    if (disposed) texture.dispose()
    else textures.add(texture)
    return texture
  }
  const resize = () => {
    applyQuality()
    invalidate()
  }
  disposeRendering = () => {
    if (disposed) return
    disposed = true
    renderer.setAnimationLoop(null)
    window.removeEventListener('resize', resize)
    clouds.events.removeEventListener('change', syncCloudComposition)
    composer.dispose()
    for (const texture of textures) texture.dispose()
    textures.clear()
    renderer.dispose()
  }

  // Resolve from the HTML route, not a hashed JS chunk; works at /cloud/lab/ too.
  const base = new URL('../reference/', document.baseURI).href
  const textureLoader = new TextureLoader()
  const load2D = async (path: string) => {
    const texture = await textureLoader.loadAsync(base + path)
    texture.colorSpace = NoColorSpace
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.minFilter = LinearMipmapLinearFilter
    texture.magFilter = LinearFilter
    return ownTexture(texture)
  }
  const load3D = async (name: string, size: number) => {
    const texture = await new DataTextureLoader(Data3DTexture, parseUint8Array, {
      width: size,
      height: size,
      depth: size,
    }).loadAsync(`${base}takram/${name}`)
    texture.format = RedFormat
    texture.minFilter = texture.magFilter = LinearFilter
    texture.wrapS = texture.wrapT = texture.wrapR = RepeatWrapping
    texture.needsUpdate = true
    return ownTexture(texture)
  }
  const loadAtmosphere = () =>
    new Promise<Awaited<ReturnType<PrecomputedTexturesLoader['loadAsync']>>>((resolve, reject) => {
      // load() returns the texture handles before the asynchronous decode finishes.
      // Own them immediately so partial failures and interrupted loads also dispose.
      const loaded = new PrecomputedTexturesLoader()
        .setType(renderer)
        .load(`${base}atmosphere`, resolve, undefined, reject)
      for (const texture of Object.values(loaded)) if (texture) ownTexture(texture)
    })
  const [atmosphere, weather, shape, detail, turbulence, stbn, noise] = await Promise.all([
    loadAtmosphere(),
    load2D('takram/local_weather.png'),
    load3D('shape.bin', 128),
    load3D('shape_detail.bin', 32),
    load2D('takram/turbulence.png'),
    new STBNLoader().loadAsync(`${base}takram/stbn.bin`).then(ownTexture),
    load2D('photon/noise.png'),
  ])
  if (disposed || run !== generation || leaving) return
  Object.assign(aerial, atmosphere)
  Object.assign(clouds, atmosphere)
  // Sample the same atmospheric transmittance LUT at the thin cloud's height.
  // Calibrate against the original daylight brightness so adding the control
  // preserves the familiar default look. Only recompute when controls change.
  const thinCloudPosition = position.clone().addScaledVector(up, 6000)
  setSunDirection(defaultSun.elevation, defaultSun.azimuth)
  const daylightColor = getSunLightColor(
    atmosphere.transmittanceTexture,
    thinCloudPosition,
    sun,
    new Color(),
  )
  applySun = () => {
    setSunDirection(sunlight.elevation, sunlight.azimuth)
    document.body.classList.toggle('low-sun', sunlight.elevation < LOW_SUN_ELEVATION)
    clouds.sunDirection.copy(sun)
    aerial.sunDirection.copy(sun)
    const light = getSunLightColor(
      atmosphere.transmittanceTexture,
      thinCloudPosition,
      sun,
      photon.values.sunLight.value,
    )
    light.setRGB(
      (light.r / daylightColor.r) * SUN_REFERENCE_RGB[0],
      (light.g / daylightColor.g) * SUN_REFERENCE_RGB[1],
      (light.b / daylightColor.b) * SUN_REFERENCE_RGB[2],
    )
  }
  applySun()
  clouds.localWeatherTexture = weather
  clouds.shapeTexture = shape
  clouds.shapeDetailTexture = detail
  clouds.turbulenceTexture = turbulence
  clouds.stbnTexture = aerial.stbnTexture = stbn
  noise.flipY = false
  noise.minFilter = LinearFilter
  photon.values.noiseTexture.value = noise

  // TAAU cycles through a 4 × 4 sample pattern. Let all pixels converge after
  // a seek/parameter edit before freezing the canvas.
  let settleFrames = 48
  invalidate = () => {
    settleFrames = 48
  }
  applyQuality = () => {
    clouds.qualityPreset = $<HTMLSelectElement>('#quality').value as CloudsQualityPreset
    // No ground geometry: light shafts bring little benefit in this proof of concept.
    clouds.lightShafts = false
    const ratio = Math.min(devicePixelRatio, 1440 / innerWidth, innerWidth < 680 ? 1 : 1.25)
    renderer.setPixelRatio(ratio)
    composer.setSize(innerWidth, innerHeight)
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
  }
  applyMode = () => {
    cloudPass.enabled = mode === 'volume'
    syncCloudComposition()
    clouds.cloudLayers.copy(CloudLayers.DEFAULT)
    photon.values.cloudKind.value = mode === 'volume' ? 0 : mode === 'cirrus' ? 1 : 2
  }
  applyQuality()
  applyMode()
  window.addEventListener('resize', resize)
  setPlaybackDisabled(false)
  ready = true
  let previous = 0
  let count = 0
  let fpsTime = 0
  let fps = 0
  renderer.setAnimationLoop((now) => {
    const delta = previous ? (now - previous) / 1000 : 0
    previous = now
    if (failed || document.hidden) return
    clock.tick(delta)
    if (clock.paused && settleFrames <= 0) return
    settleFrames--
    const angle = (pitch * Math.PI) / 180
    camera.lookAt(0.15, Math.sin(angle), -Math.cos(angle))
    camera.updateMatrixWorld()
    clouds.coverage = coverage
    // Offsets are integrated separately: changing rates never teleports clouds.
    clouds.localWeatherOffset.set(clock.windTime * 0.00008, clock.windTime * 0.000025)
    clouds.shapeOffset.set(
      clock.evolutionTime * 0.0018,
      clock.windTime * 0.0012,
      clock.windTime * 0.0003,
    )
    clouds.shapeDetailOffset.set(
      clock.evolutionTime * 0.009,
      clock.windTime * 0.024,
      clock.evolutionTime * -0.003,
    )
    photon.values.cameraWorld.value.copy(camera.matrixWorld)
    photon.values.inverseProjection.value.copy(camera.projectionMatrixInverse)
    photon.values.windTime.value = clock.windTime
    photon.values.evolutionTime.value = clock.evolutionTime
    photon.values.amount.value = coverage + (mode === 'cirrocumulus' ? 0.35 : 0.08)
    // We integrate motion ourselves so pause, stepping and restart share one clock.
    composer.render(0)
    if (failed) return
    count++
    if (now - fpsTime > 1000) {
      fps = Math.round((count * 1000) / (now - fpsTime))
      count = 0
      fpsTime = now
    }
    status.textContent = `${clock.paused ? '已暂停' : '实时'} · ${clock.elapsed.toFixed(1)} s${clock.paused ? '' : ` · ${fps} fps`}`
  })
}

function launch(message: string) {
  releaseRendering()
  ready = false
  failed = false
  $('#retry').hidden = true
  status.textContent = message
  setPlaybackDisabled(true)
  const run = ++generation
  start(run).catch((error: unknown) => {
    if (run !== generation || leaving) return
    releaseRendering()
    fail(error)
  })
}

function handleContextLost(event: Event) {
  event.preventDefault()
  contextLost = true
  ready = false
  generation++
  releaseRendering()
  status.textContent = '图形连接暂时中断，正在等待浏览器恢复。'
  $('#retry').hidden = false
  setPlaybackDisabled(true)
}

function handleContextRestored() {
  if (!contextLost || leaving) return
  contextLost = false
  // Rebuild the complete postprocessing pipeline. UI parameters and MotionClock
  // stay outside the rendering session, so restoration preserves the same sky.
  launch('图形连接已恢复，正在重新加载天空…')
}

function handleReducedMotion(event: MediaQueryListEvent) {
  if (event.matches) setPaused(true)
}

function teardown() {
  leaving = true
  generation++
  releaseRendering()
  canvas.removeEventListener('webglcontextlost', handleContextLost)
  canvas.removeEventListener('webglcontextrestored', handleContextRestored)
  reducedMotion.removeEventListener('change', handleReducedMotion)
  window.removeEventListener('pagehide', teardown)
}

canvas.addEventListener('webglcontextlost', handleContextLost)
canvas.addEventListener('webglcontextrestored', handleContextRestored)
reducedMotion.addEventListener('change', handleReducedMotion)
window.addEventListener('pagehide', teardown, { once: true })
if (import.meta.hot) import.meta.hot.dispose(teardown)

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && ready && !failed && event.target === document.body) {
    event.preventDefault()
    setPaused(!clock.paused)
  }
})
setPaused(reducedMotion.matches)
launch('正在加载天空…')
window.addEventListener('pageshow', (event) => {
  if (event.persisted) location.reload()
})
