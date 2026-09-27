import { describe, expect, it } from 'vitest'
import { createNoiseData, valueNoise } from './noise'

describe('tileable density texture', () => {
  it('wraps seamlessly on all three axes, including negative coordinates', () => {
    for (const point of [
      [1.37, 2.42, 0.18],
      [-0.03, 0.8, 3.7],
      [3.9999, 2, 1],
    ]) {
      const [x, y, z] = point as [number, number, number]
      const value = valueNoise(x, y, z, 4)
      expect(valueNoise(x + 4, y, z, 4)).toBeCloseTo(value, 10)
      expect(valueNoise(x, y - 4, z, 4)).toBeCloseTo(value, 10)
      expect(valueNoise(x, y, z + 4, 4)).toBeCloseTo(value, 10)
    }
  })
  it('produces reproducible, nonconstant density and cellular channels', () => {
    const data = createNoiseData(8)
    expect(data.length).toBe(8 ** 3 * 2)
    expect(createNoiseData(8)).toEqual(data)
    expect(new Set(data.filter((_, index) => index % 2 === 0)).size).toBeGreaterThan(30)
    expect(new Set(data.filter((_, index) => index % 2 === 1)).size).toBeGreaterThan(30)
  })
})
