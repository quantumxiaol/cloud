import { describe, expect, it } from 'vitest'
import { MotionClock } from './MotionClock'

describe('cloud motion controls', () => {
  it('can evolve with no wind, and drift with no evolution', () => {
    const clock = new MotionClock()
    clock.wind = 0
    clock.advance(30)
    expect(clock.windTime).toBe(0)
    expect(clock.evolutionTime).toBe(30)
    clock.wind = 2
    clock.evolution = 0
    clock.advance(10)
    expect(clock.windTime).toBe(20)
    expect(clock.evolutionTime).toBe(30)
  })
  it('pauses playback but allows explicit stepping', () => {
    const clock = new MotionClock()
    clock.paused = true
    clock.tick(0.1)
    expect(clock.elapsed).toBe(0)
    clock.advance(30)
    expect(clock.elapsed).toBe(30)
  })
  it('keeps continuity on speed changes and limits background catch-up', () => {
    const clock = new MotionClock()
    clock.advance(10)
    clock.wind = 4
    expect(clock.windTime).toBe(10)
    clock.speed = 10
    clock.tick(120)
    expect(clock.elapsed).toBe(11)
    expect(clock.windTime).toBe(14)
    clock.reset()
    expect([clock.elapsed, clock.windTime, clock.evolutionTime]).toEqual([0, 0, 0])
  })
})
