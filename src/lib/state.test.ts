import { describe, expect, it } from 'vitest'
import { dailySeed, isStateHash, parseState, serializeState } from './state'

describe('shareable skies', () => {
  it('round-trips the cloud, weather, seed, time and pause state', () => {
    const sky = {
      cloud: 'cirrus',
      seed: 987654321,
      wind: 2.4,
      sun: 0.82,
      density: 0.41,
      time: 123.45,
      paused: true,
    }
    expect(parseState(`#${serializeState(sky)}`)).toEqual(sky)
  })
  it('rejects unknown clouds and non-finite or blank input, and clamps unsafe ranges', () => {
    expect(
      parseState('#cloud=unknown&seed=Infinity&wind=100&sun=-4&density=&t=NaN', 20260927),
    ).toEqual({
      cloud: 'cumulus',
      seed: 20260927,
      wind: 3,
      sun: 0,
      density: 0.65,
      time: 0,
      paused: false,
    })
  })
  it('derives the daily sky from the local calendar date', () => {
    expect(dailySeed(new Date(2026, 8, 27, 23, 59))).toBe(20260927)
  })
  it('distinguishes state parameters from section anchors and unrelated keys', () => {
    for (const hash of ['', '#sky', '#atlas', '#foo=bar', '#notpaused=1'])
      expect(isStateHash(hash)).toBe(false)
    for (const hash of ['#cloud=cirrus', '#wind=2', '#paused=0', '#%63loud=cirrus'])
      expect(isStateHash(hash)).toBe(true)
  })
  it('honours reduced motion unless a valid pause choice is explicitly shared', () => {
    for (const hash of ['', '#cloud=cirrus', '#cloud=cumulus&notpaused=1', '#paused=oops'])
      expect(parseState(hash, 20261003, true).paused).toBe(true)
    expect(parseState('#cloud=cirrus&paused=0', 20261003, true).paused).toBe(false)
    expect(parseState('#paused=1', 20261003, false).paused).toBe(true)
    expect(parseState('#paused=0', 20261003, false).paused).toBe(false)
    expect(parseState('#%70aused=0', 20261003, true).paused).toBe(false)
  })
})
