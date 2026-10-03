import { cloudById } from '../data/clouds'

export interface SkyState {
  cloud: string
  seed: number
  wind: number
  sun: number
  density: number
  time: number
  paused: boolean
}

export function dailySeed(date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

const stateKeys = ['cloud', 'seed', 'wind', 'sun', 'density', 't', 'paused'] as const

export function isStateHash(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return stateKeys.some((key) => params.has(key))
}

export function parseState(hash: string, seed = dailySeed(), pausedByDefault = false): SkyState {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const number = (key: string, fallback: number, min: number, max: number) => {
    const raw = params.get(key)
    const value = raw === null || raw.trim() === '' ? NaN : Number(raw)
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
  }
  const id = params.get('cloud') ?? 'cumulus'
  return {
    cloud: cloudById(id)?.id ?? 'cumulus',
    seed: Math.floor(number('seed', seed, 1, 999999999)),
    wind: number('wind', 1, 0, 3),
    sun: number('sun', 0.2, 0, 1),
    density: number('density', 0.65, 0.2, 1),
    time: number('t', 0, 0, 100000),
    paused:
      params.get('paused') === '1' ? true : params.get('paused') === '0' ? false : pausedByDefault,
  }
}

export function serializeState(state: SkyState): string {
  return new URLSearchParams({
    cloud: state.cloud,
    seed: String(state.seed),
    wind: String(state.wind),
    sun: String(state.sun),
    density: String(state.density),
    t: state.time.toFixed(2),
    paused: state.paused ? '1' : '0',
  }).toString()
}
