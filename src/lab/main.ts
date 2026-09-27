import './style.css'
import {
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
import { AerialPerspectiveEffect, PrecomputedTexturesLoader } from '@takram/three-atmosphere'
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

type Mode = 'volume' | 'cirrus' | 'cirrocumulus'
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const canvas = $<HTMLCanvasElement>('#sky')
const status = $('#status')
const pause = $<HTMLButtonElement>('#pause')
const clock = new MotionClock()
let ready = false
let failed = false
let mode: Mode = 'volume'
let coverage = 0.32
let pitch = 28
let invalidate = () => {}
let applyMode = () => {}
let applyQuality = () => {}

function fail(error: unknown) {
  failed = true
  console.error('Cloud lab:', error)
  status.textContent = '天空未能加载，请重新加载再试。'
  $('#retry').hidden = false
  for (const id of ['pause', 'advance', 'reset']) $<HTMLButtonElement>(`#${id}`).disabled = true
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

async function start() {
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
  const sun = up
    .clone()
    .multiplyScalar(0.65)
    .addScaledVector(east, -0.65)
    .addScaledVector(north, 0.4)
    .normalize()
  clouds.sunDirection.copy(sun)
  aerial.sunDirection.copy(sun)
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

  // Resolve from the HTML route, not a hashed JS chunk; works at /cloud/lab/ too.
  const base = new URL('../reference/', document.baseURI).href
  const textureLoader = new TextureLoader()
  const load2D = async (path: string) => {
    const texture = await textureLoader.loadAsync(base + path)
    texture.colorSpace = NoColorSpace
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.minFilter = LinearMipmapLinearFilter
    texture.magFilter = LinearFilter
    return texture
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
    return texture
  }
  const [atmosphere, weather, shape, detail, turbulence, stbn, noise] = await Promise.all([
    new PrecomputedTexturesLoader().setType(renderer).loadAsync(`${base}atmosphere`),
    load2D('takram/local_weather.png'),
    load3D('shape.bin', 128),
    load3D('shape_detail.bin', 32),
    load2D('takram/turbulence.png'),
    new STBNLoader().loadAsync(`${base}takram/stbn.bin`),
    load2D('photon/noise.png'),
  ])
  Object.assign(aerial, atmosphere)
  Object.assign(clouds, atmosphere)
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
  const resize = () => {
    applyQuality()
    invalidate()
  }
  window.addEventListener('resize', resize)
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    fail('WebGL context lost')
  })
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true)
  for (const id of ['pause', 'advance', 'reset']) $<HTMLButtonElement>(`#${id}`).disabled = false
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
  window.addEventListener(
    'pagehide',
    () => {
      renderer.setAnimationLoop(null)
      window.removeEventListener('resize', resize)
      composer.dispose()
      for (const texture of [
        weather,
        shape,
        detail,
        turbulence,
        stbn,
        noise,
        ...Object.values(atmosphere),
      ])
        texture?.dispose()
      renderer.dispose()
    },
    { once: true },
  )
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && ready && !failed && event.target === document.body) {
    event.preventDefault()
    setPaused(!clock.paused)
  }
})
start().catch(fail)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) location.reload()
})
