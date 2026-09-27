import {
  Data3DTexture,
  GLSL3,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RawShaderMaterial,
  RepeatWrapping,
  RGFormat,
  Scene,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import type { Cloud } from '../data/clouds'
import { createNoiseData, hash3 } from './noise'
import vertexShader from '../shaders/sky.vert.glsl?raw'
import fragmentShader from '../shaders/sky.frag.glsl?raw'

export type Quality = 'auto' | 'high' | 'low'

export class CloudRenderer {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private texture: Data3DTexture
  private material: RawShaderMaterial
  private geometry = new PlaneGeometry(2, 2)
  private observer: ResizeObserver
  private frame = 0
  private previousFrame = 0
  private lastDraw = 0
  private sampleCount = 0
  private averageFrame = 0
  private quality: Quality = 'auto'
  private scale = 0.8
  private visible = true
  private contextLost = false
  private dirty = true
  private thumbnailQueue: { cloud: Cloud; callback: (image: string) => void }[] = []
  private onError: (message: string) => void
  private onReady: () => void
  private ready = false
  private pointerTarget = new Vector2()
  paused = false
  private uniforms = {
    uNoise: { value: null as Data3DTexture | null },
    uResolution: { value: new Vector2(1, 1) },
    uPointer: { value: new Vector2() },
    uTime: { value: 0 },
    uSeed: { value: 1 },
    uWind: { value: 1 },
    uSun: { value: 0.2 },
    uDensity: { value: 0.65 },
    uMorph: { value: 1 },
    uKind: { value: 0 },
    uFromKind: { value: 0 },
    uSteps: { value: 56 },
    uParams: { value: new Vector3(0.78, 0.55, 0) },
    uFromParams: { value: new Vector3(0.78, 0.55, 0) },
  }

  constructor(canvas: HTMLCanvasElement, onError: (message: string) => void, onReady: () => void) {
    this.onError = onError
    this.onReady = onReady
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.debug.onShaderError = (_gl, _program, _vertex, fragment) => {
      console.error('Cloud shader:', _gl.getShaderInfoLog(fragment))
      this.contextLost = true
      this.onError('天空渲染未能启动。请更新浏览器，或重新加载再试。')
    }
    this.texture = new Data3DTexture(createNoiseData(), 64, 64, 64)
    this.texture.format = RGFormat
    this.texture.type = UnsignedByteType
    this.texture.minFilter = LinearFilter
    this.texture.magFilter = LinearFilter
    this.texture.wrapS = this.texture.wrapT = this.texture.wrapR = RepeatWrapping
    this.texture.unpackAlignment = 1
    this.texture.needsUpdate = true
    this.uniforms.uNoise.value = this.texture
    this.material = new RawShaderMaterial({
      vertexShader,
      fragmentShader,
      glslVersion: GLSL3,
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
    })
    this.scene.add(new Mesh(this.geometry, this.material))
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(canvas)
    canvas.addEventListener('webglcontextlost', this.handleContextLost)
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored)
    document.addEventListener('visibilitychange', this.handleVisibility)
    this.resize()
    this.frame = requestAnimationFrame(this.tick)
  }

  get time() {
    return this.uniforms.uTime.value
  }
  set time(value: number) {
    this.uniforms.uTime.value = value
    this.dirty = true
  }

  setCloud(cloud: Cloud, immediate = false) {
    this.uniforms.uFromKind.value = this.uniforms.uKind.value
    this.uniforms.uFromParams.value.copy(this.uniforms.uParams.value)
    this.uniforms.uKind.value = cloud.kind
    this.uniforms.uParams.value.set(cloud.density, cloud.coverage, cloud.storm)
    this.uniforms.uMorph.value = immediate ? 1 : 0
    this.dirty = true
  }

  setWeather(seed: number, wind: number, sun: number, density: number) {
    this.uniforms.uSeed.value = hash3(seed, 29, 71) * 1000
    this.uniforms.uWind.value = wind
    this.uniforms.uSun.value = sun
    this.uniforms.uDensity.value = density
    this.dirty = true
  }

  setPointer(x: number, y: number) {
    this.pointerTarget.set(x, y)
    this.dirty = true
  }
  setPaused(value: boolean) {
    this.paused = value
    this.dirty = true
  }
  setVisible(value: boolean) {
    this.visible = value
    this.previousFrame = 0
  }

  setQuality(value: Quality) {
    this.quality = value
    this.scale = value === 'low' ? 0.5 : value === 'high' ? 1.1 : 0.8
    this.uniforms.uSteps.value = value === 'low' ? 36 : value === 'high' ? 80 : 56
    this.sampleCount = 0
    this.resize()
  }

  queuePreviews(clouds: Cloud[], callback: (id: string, image: string) => void) {
    this.thumbnailQueue = clouds.map((cloud) => ({
      cloud,
      callback: (image) => callback(cloud.id, image),
    }))
  }

  private resize() {
    const canvas = this.renderer.domElement
    const width = Math.max(1, canvas.clientWidth),
      height = Math.max(1, canvas.clientHeight)
    const ratio = Math.min(this.scale, 1600 / width)
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.uniforms.uResolution.value.set(width * ratio, height * ratio)
    this.dirty = true
  }

  private renderPreview() {
    const entry = this.thumbnailQueue.shift()
    if (!entry) return
    const u = this.uniforms
    const saved = {
      kind: u.uKind.value,
      params: u.uParams.value.clone(),
      resolution: u.uResolution.value.clone(),
      time: u.uTime.value,
      seed: u.uSeed.value,
      morph: u.uMorph.value,
      steps: u.uSteps.value,
      sun: u.uSun.value,
      density: u.uDensity.value,
    }
    const target = new WebGLRenderTarget(240, 140)
    u.uKind.value = entry.cloud.kind
    u.uParams.value.set(entry.cloud.density, entry.cloud.coverage, entry.cloud.storm)
    u.uResolution.value.set(240, 140)
    u.uTime.value = 0
    u.uSeed.value = 927
    u.uMorph.value = 1
    u.uSteps.value = 40
    u.uSun.value = 0.15
    u.uDensity.value = 0.65
    try {
      this.renderer.setRenderTarget(target)
      this.renderer.render(this.scene, this.camera)
      const pixels = new Uint8Array(240 * 140 * 4)
      this.renderer.readRenderTargetPixels(target, 0, 0, 240, 140, pixels)
      const canvas = document.createElement('canvas')
      canvas.width = 240
      canvas.height = 140
      const ctx = canvas.getContext('2d')!
      const flipped = new Uint8ClampedArray(pixels.length)
      for (let row = 0; row < 140; row++)
        flipped.set(pixels.subarray(row * 960, (row + 1) * 960), (139 - row) * 960)
      ctx.putImageData(new ImageData(flipped, 240, 140), 0, 0)
      entry.callback(canvas.toDataURL('image/webp', 0.85))
    } finally {
      this.renderer.setRenderTarget(null)
      target.dispose()
      u.uKind.value = saved.kind
      u.uParams.value.copy(saved.params)
      u.uResolution.value.copy(saved.resolution)
      u.uTime.value = saved.time
      u.uSeed.value = saved.seed
      u.uMorph.value = saved.morph
      u.uSteps.value = saved.steps
      u.uSun.value = saved.sun
      u.uDensity.value = saved.density
    }
  }

  capture(): Promise<Blob> {
    this.renderer.render(this.scene, this.camera)
    return new Promise((resolve, reject) => {
      this.renderer.domElement.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('无法保存天空'))),
        'image/png',
      )
    })
  }

  private tick = (now: number) => {
    this.frame = requestAnimationFrame(this.tick)
    if (this.contextLost || document.hidden || (!this.visible && !this.thumbnailQueue.length)) {
      this.previousFrame = now
      return
    }
    const delta = this.previousFrame ? Math.min((now - this.previousFrame) / 1000, 0.1) : 0
    this.previousFrame = now
    if (!this.paused) this.uniforms.uTime.value += delta
    this.uniforms.uMorph.value = Math.min(1, this.uniforms.uMorph.value + delta * 0.9)
    this.uniforms.uPointer.value.lerp(this.pointerTarget, Math.min(1, delta * 3))
    const moving = this.uniforms.uPointer.value.distanceTo(this.pointerTarget) > 0.001
    if (
      this.paused &&
      !this.dirty &&
      !moving &&
      this.uniforms.uMorph.value >= 1 &&
      !this.thumbnailQueue.length
    )
      return
    if (now - this.lastDraw < 30) return
    const frameDuration = now - this.lastDraw
    this.lastDraw = now
    if (this.thumbnailQueue.length) this.renderPreview()
    if (!this.visible) return
    this.renderer.render(this.scene, this.camera)
    this.dirty = false
    if (!this.ready && !this.contextLost) {
      this.ready = true
      this.onReady()
    }
    if (
      this.quality === 'auto' &&
      !this.paused &&
      this.uniforms.uMorph.value === 1 &&
      !this.thumbnailQueue.length
    ) {
      this.averageFrame += frameDuration
      if (++this.sampleCount === 90) {
        if (this.averageFrame / this.sampleCount > 48 && this.scale > 0.5) {
          this.scale = Math.max(0.5, this.scale - 0.15)
          this.resize()
        }
        this.averageFrame = 0
        this.sampleCount = 0
      }
    }
  }

  private handleVisibility = () => {
    this.previousFrame = 0
  }
  private handleContextLost = (event: Event) => {
    event.preventDefault()
    this.contextLost = true
    this.onError('图形连接暂时中断，正在等待浏览器恢复。云图鉴仍可阅读。')
  }
  private handleContextRestored = () => {
    this.contextLost = false
    this.texture.needsUpdate = true
    this.material.needsUpdate = true
    this.dirty = true
    this.ready = false
    this.previousFrame = 0
  }

  dispose() {
    cancelAnimationFrame(this.frame)
    this.observer.disconnect()
    document.removeEventListener('visibilitychange', this.handleVisibility)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost)
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored)
    this.geometry.dispose()
    this.material.dispose()
    this.texture.dispose()
    this.renderer.dispose()
  }
}
