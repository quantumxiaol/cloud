// Separate clocks prevent jumping when a speed slider changes mid-animation.
export class MotionClock {
  elapsed = 0
  windTime = 0
  evolutionTime = 0
  paused = false
  wind = 1
  evolution = 1
  speed = 1

  advance(seconds: number) {
    this.elapsed += seconds
    this.windTime += seconds * this.wind
    this.evolutionTime += seconds * this.evolution
  }

  tick(delta: number) {
    if (!this.paused) this.advance(Math.min(Math.max(delta, 0), 0.1) * this.speed)
  }

  reset() {
    this.elapsed = this.windTime = this.evolutionTime = 0
  }
}
