import { BlendFunction, Effect } from 'postprocessing'
import { Color, Matrix4, Texture, Uniform, Vector3 } from 'three'
import shader from './photon.frag.glsl?raw'
import { SUN_REFERENCE_RGB } from './sunlight'

export class PhotonEffect extends Effect {
  readonly values = {
    noiseTexture: new Uniform<Texture | null>(null),
    cameraWorld: new Uniform(new Matrix4()),
    inverseProjection: new Uniform(new Matrix4()),
    windTime: new Uniform(0),
    evolutionTime: new Uniform(0),
    amount: new Uniform(0.55),
    cloudKind: new Uniform(0),
    sunDirection: new Uniform(new Vector3(-0.65, 0.65, 0.4).normalize()),
    sunLight: new Uniform(new Color(...SUN_REFERENCE_RGB)),
  }
  constructor() {
    super('PhotonThinClouds', shader, { blendFunction: BlendFunction.NORMAL })
    for (const [name, uniform] of Object.entries(this.values)) this.uniforms.set(name, uniform)
  }
}
