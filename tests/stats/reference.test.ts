import { describe, expect, it } from 'vitest'
import rawReference from '../fixtures/r-reference.json'
import { TEACHING_DATA } from '../../src/data/teaching'
import { chiSquare1Tail, estimateSurvival, exponentialQuantile, logRank,
  weibullCumulativeHazard, weibullQuantile, weibullSurvival } from '../../src/stats'
import type { Subject } from '../../src/stats'

interface ReferenceRow {
  time: number; risk: number; events: number; censored: number
  survival: number; na: number; lower: number | null; upper: number | null
}
interface ReferenceCase {
  name: string; subjects: Subject[]; rows: ReferenceRow[]
  groupRows: Record<string, ReferenceRow[]>
  logrank: null | { groups: [string, string]; counts: number[]; observed: number[]
    expected: number[]; variance: number; statistic: number; pValue: number; logPValue: number }
}
interface ReferenceBundle {
  metadata: { R: string; survival: string }
  cases: ReferenceCase[]
  tails: { statistic: number; pValue: number; logPValue: number }[]
  transforms: { uniform: number; shape: number; scale: number; eventTime: number }[]
  dropout: { uniform: number; rate: number; time: number }[]
  truth: { time: number; shape: number; scale: number; survival: number; cumulativeHazard: number }[]
}
const reference = rawReference as unknown as ReferenceBundle

function close(actual: number, expected: number, absolute = 1e-10, relative = 0): void {
  expect(Number.isFinite(actual)).toBe(true)
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(absolute + relative * Math.abs(expected))
}

function checkCurve(subjects: Subject[], expectedRows: ReferenceRow[]): void {
  const result = estimateSurvival(subjects)
  expect(result.rows).toHaveLength(expectedRows.length)
  expectedRows.forEach((expected, index) => {
    const actual = result.rows[index]!
    expect(actual.time).toBe(expected.time)
    expect(actual.risk).toBe(expected.risk)
    expect(actual.events).toBe(expected.events)
    expect(actual.censored).toBe(expected.censored)
    close(actual.survival, expected.survival)
    close(actual.na, expected.na)
    for (const bound of ['lower', 'upper'] as const) {
      if (expected[bound] === null) expect(actual[bound]).toBeNull()
      else close(actual[bound]!, expected[bound]!)
    }
  })
}

describe('independent committed R references', () => {
  it('records reference versions and includes at least 50 seeded datasets', () => {
    expect(reference.metadata.R).toMatch(/^R version/)
    expect(reference.metadata.survival).toBeTruthy()
    expect(reference.cases.filter((item) => item.name.startsWith('seeded_'))).toHaveLength(50)
    expect(reference.cases.find((item) => item.name === 'teaching')!.subjects).toEqual(TEACHING_DATA)
  })

  it('preserves survival/hazard and censor-only invariants across every reference dataset', () => {
    for (const fixture of reference.cases) {
      let previousSurvival = 1
      let previousHazard = 0
      for (const row of estimateSurvival(fixture.subjects).rows) {
        expect(row.survival).toBeGreaterThanOrEqual(0)
        expect(row.survival).toBeLessThanOrEqual(previousSurvival)
        expect(row.na).toBeGreaterThanOrEqual(previousHazard)
        expect(Math.exp(-row.na) + 1e-13).toBeGreaterThanOrEqual(row.survival)
        if (row.events === 0) {
          expect(row.survival).toBe(previousSurvival)
          expect(row.na).toBe(previousHazard)
        }
        previousSurvival = row.survival
        previousHazard = row.na
      }
    }
  })

  for (const fixture of reference.cases) {
    it(`${fixture.name}: KM, risk counts, ordinary NA and log-log bounds match R`, () => {
      checkCurve(fixture.subjects, fixture.rows)
      for (const [group, rows] of Object.entries(fixture.groupRows)) {
        checkCurve(fixture.subjects.filter((subject) => subject.group === group), rows)
      }
    })

    if (fixture.logrank) {
      it(`${fixture.name}: two-group log-rank totals and upper-tail p match R`, () => {
        const actual = logRank(fixture.subjects)
        const expected = fixture.logrank!
        expect(actual.status).toBe('estimable')
        expect(actual.groups).toEqual(expected.groups)
        expect(actual.counts).toEqual(expected.counts)
        expect(actual.observed).toEqual(expected.observed)
        close(actual.expected[0], expected.expected[0], 1e-9, 1e-9)
        close(actual.expected[1], expected.expected[1], 1e-9, 1e-9)
        close(actual.variance, expected.variance, 1e-9, 1e-9)
        close(actual.statistic!, expected.statistic, 1e-9, 1e-9)
        if (expected.pValue >= 1e-8) close(actual.pValue!, expected.pValue)
        else close(actual.logPValue!, expected.logPValue, 1e-8)
      })
    }
  }
})

describe('chi-square-one upper tails against stats::pchisq', () => {
  for (const fixture of reference.tails) {
    it(`preserves the tail at Q=${fixture.statistic}`, () => {
      const actual = chiSquare1Tail(fixture.statistic)
      expect(actual.pValue).toBeGreaterThan(0)
      close(actual.logPValue, fixture.logPValue, 1e-8)
      if (fixture.pValue >= 1e-8) close(actual.pValue, fixture.pValue)
    })
  }
})

describe('inverse transforms and generating curves against R stats', () => {
  it('Weibull inversions match qweibull, including small and large uniforms', () => {
    for (const fixture of reference.transforms) {
      close(weibullQuantile(fixture.uniform, fixture.shape, fixture.scale), fixture.eventTime, 1e-12, 1e-13)
    }
  })
  it('independent dropout inversions match qexp', () => {
    for (const fixture of reference.dropout) {
      close(exponentialQuantile(fixture.uniform, fixture.rate), fixture.time, 1e-12, 1e-13)
    }
  })
  it('known survival and cumulative hazard match pweibull', () => {
    for (const fixture of reference.truth) {
      close(weibullSurvival(fixture.time, fixture.shape, fixture.scale), fixture.survival, 1e-14)
      close(weibullCumulativeHazard(fixture.time, fixture.shape, fixture.scale), fixture.cumulativeHazard, 1e-12, 1e-13)
    }
  })
})
