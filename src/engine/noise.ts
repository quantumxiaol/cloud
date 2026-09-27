// A tileable volume: smooth value-fBm in R, inverted Worley in G.
// Generated once on the CPU; all evolution and lighting happen on the GPU.
export function hash3(x: number, y: number, z: number, seed = 17): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ seed
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const wrap = (x: number, size: number) => ((x % size) + size) % size
const smooth = (t: number) => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

export function valueNoise(x: number, y: number, z: number, period: number): number {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z)
  const fx = smooth(x - ix),
    fy = smooth(y - iy),
    fz = smooth(z - iz)
  const h = (dx: number, dy: number, dz: number) =>
    hash3(wrap(ix + dx, period), wrap(iy + dy, period), wrap(iz + dz, period))
  return mix(
    mix(mix(h(0, 0, 0), h(1, 0, 0), fx), mix(h(0, 1, 0), h(1, 1, 0), fx), fy),
    mix(mix(h(0, 0, 1), h(1, 0, 1), fx), mix(h(0, 1, 1), h(1, 1, 1), fx), fy),
    fz,
  )
}

function worley(x: number, y: number, z: number, period: number): number {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z)
  let distance = 3
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = wrap(ix + dx, period),
          cy = wrap(iy + dy, period),
          cz = wrap(iz + dz, period)
        const px = ix + dx + hash3(cx, cy, cz, 123) - x
        const py = iy + dy + hash3(cx, cy, cz, 456) - y
        const pz = iz + dz + hash3(cx, cy, cz, 789) - z
        distance = Math.min(distance, px * px + py * py + pz * pz)
      }
    }
  }
  return 1 - Math.min(1, Math.sqrt(distance))
}

export function createNoiseData(size = 64): Uint8Array {
  const data = new Uint8Array(size ** 3 * 2)
  let index = 0
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = x / size,
          py = y / size,
          pz = z / size
        const n =
          valueNoise(px * 4, py * 4, pz * 4, 4) * 0.57 +
          valueNoise(px * 8, py * 8, pz * 8, 8) * 0.28 +
          valueNoise(px * 16, py * 16, pz * 16, 16) * 0.15
        data[index++] = Math.round(n * 255)
        data[index++] = Math.round(worley(px * 8, py * 8, pz * 8, 8) * 255)
      }
    }
  }
  return data
}
