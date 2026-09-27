import { BlendFunction, Effect } from 'postprocessing'
import { Matrix4, Texture, Uniform } from 'three'
import shader from './photon.frag.glsl?raw'

export class PhotonEffect extends Effect {
  readonly values = {
    noiseTexture: new Uniform<Texture | null>(null),
    cameraWorld: new Uniform(new Matrix4()),
    inverseProjection: new Uniform(new Matrix4()),
    windTime: new Uniform(0),
    evolutionTime: new Uniform(0),
    amount: new Uniform(0.55),
    cloudKind: new Uniform(0),
  }
  constructor() {
    super('PhotonThinClouds', shader, { blendFunction: BlendFunction.NORMAL })
    for (const [name, uniform] of Object.entries(this.values)) this.uniforms.set(name, uniform)
  }
}
