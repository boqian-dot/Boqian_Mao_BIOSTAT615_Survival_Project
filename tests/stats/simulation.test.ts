import { describe, expect, it } from 'vitest'
import { DEFAULT_SIMULATION, estimateSurvival, simulateCohort, weibullQuantile } from '../../src/stats'
import { createUniformStreams } from '../../src/stats/random'
import prngReference from '../fixtures/prng-reference.json'

describe('reproducible independent-censoring experiment', () => {
  it('matches independently compiled C xoshiro output and the 2^64 dropout jump', () => {
    const streams = createUniformStreams(prngReference.seed)
    for (const expected of prngReference.eventUint32) {
      expect(streams.event()).toBe((expected + 0.5) / 4294967296)
    }
    for (const expected of prngReference.dropoutUint32) {
      expect(streams.dropout()).toBe((expected + 0.5) / 4294967296)
    }
  })
  it('reproduces the same sample and uses stable subject prefixes for either stream', () => {
    const first = simulateCohort(DEFAULT_SIMULATION)
    expect(simulateCohort(DEFAULT_SIMULATION)).toEqual(first)
    const larger = simulateCohort({ ...DEFAULT_SIMULATION, n: 200 })
    expect(larger.latent.slice(0, first.latent.length)).toEqual(first.latent)
    expect(larger.observed.slice(0, first.observed.length)).toEqual(first.observed)
    expect(simulateCohort({ ...DEFAULT_SIMULATION, seed: DEFAULT_SIMULATION.seed + 1 }).latent).not.toEqual(first.latent)
  })
  it('holds latent event times fixed when only dropout or horizon changes', () => {
    const baseline = simulateCohort(DEFAULT_SIMULATION)
    const heavier = simulateCohort({ ...DEFAULT_SIMULATION, dropoutRate: 0.2 })
    const shorter = simulateCohort({ ...DEFAULT_SIMULATION, horizon: 5 })
    expect(heavier.latent.map((s) => s.eventTime)).toEqual(baseline.latent.map((s) => s.eventTime))
    expect(shorter.latent.map((s) => s.eventTime)).toEqual(baseline.latent.map((s) => s.eventTime))
    expect(shorter.latent.map((s) => s.dropoutTime)).toEqual(baseline.latent.map((s) => s.dropoutTime))
    baseline.latent.forEach((s, i) => {
      expect(heavier.latent[i]!.dropoutTime!).toBeLessThan(s.dropoutTime!)
    })
  })
  it('uses the same event uniforms when scale or shape changes', () => {
    const baseline = simulateCohort(DEFAULT_SIMULATION)
    const stretched = simulateCohort({ ...DEFAULT_SIMULATION, scale: 40 })
    const increasing = simulateCohort({ ...DEFAULT_SIMULATION, shape: 2 })
    baseline.latent.forEach((s, i) => {
      expect(stretched.latent[i]!.eventTime).toBe(s.eventTime * 2)
      expect(increasing.latent[i]!.eventTime).toBeCloseTo(20 * Math.sqrt(s.eventTime / 20), 12)
      expect(increasing.latent[i]!.dropoutTime).toBe(s.dropoutTime)
    })
  })
  it('implements the observation rule and labels censoring without replacing latent times', () => {
    for (const shape of [0.6, 1, 2]) {
      const sample = simulateCohort({ ...DEFAULT_SIMULATION, shape })
      sample.latent.forEach((latent, i) => {
        const observed = sample.observed[i]!
        const dropout = latent.dropoutTime ?? Infinity
        expect(observed.time).toBe(Math.min(latent.eventTime, dropout, sample.config.horizon))
        expect(observed.event).toBe(latent.eventTime <= dropout && latent.eventTime <= sample.config.horizon ? 1 : 0)
        expect(sample.complete[i]).toMatchObject({ id: latent.id, time: latent.eventTime, event: 1 })
      })
      expect(sample.events + sample.dropouts + sample.administrative).toBe(sample.config.n)
      expect(sample.censoringFraction).toBe((sample.dropouts + sample.administrative) / sample.config.n)
      expect(JSON.stringify(sample)).not.toMatch(/Infinity|NaN/)
      for (const row of estimateSurvival(sample.observed).rows) {
        expect(row.survival).toBeGreaterThanOrEqual(0)
        expect(row.survival).toBeLessThanOrEqual(1)
      }
    }
  })
  it('represents no random dropout explicitly and keeps records finite', () => {
    const sample = simulateCohort({ ...DEFAULT_SIMULATION, dropoutRate: 0 })
    expect(sample.dropouts).toBe(0)
    expect(sample.latent.every((s) => s.dropoutTime === null)).toBe(true)
    expect(sample.observed.every((s) => Number.isFinite(s.time))).toBe(true)
    expect(sample.events + sample.administrative).toBe(sample.config.n)
  })
  it('enforces the bounded simulator inputs and open-interval inverse inputs', () => {
    expect(() => simulateCohort({ ...DEFAULT_SIMULATION, n: 0 })).toThrow(RangeError)
    expect(() => simulateCohort({ ...DEFAULT_SIMULATION, shape: 0 })).toThrow(RangeError)
    expect(() => simulateCohort({ ...DEFAULT_SIMULATION, seed: -1 })).toThrow(RangeError)
    expect(() => simulateCohort({ ...DEFAULT_SIMULATION, dropoutRate: NaN })).toThrow(RangeError)
    expect(() => weibullQuantile(0, 1, 20)).toThrow(RangeError)
    expect(() => weibullQuantile(1, 1, 20)).toThrow(RangeError)
  })
})
