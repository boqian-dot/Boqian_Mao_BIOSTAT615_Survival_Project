import { describe, expect, it } from 'vitest'
import { TEACHING_DATA } from '../../src/data/teaching'
import { DataValidationError, checkPracticeAnswer, estimateSurvival, logRank,
  riskSetAt, validateSubjects } from '../../src/stats'
import type { Subject } from '../../src/stats'

describe('independently worked eight-subject lesson', () => {
  it('handles a censor-only step, tied events/censoring, and terminal zero', () => {
    const rows = estimateSurvival(TEACHING_DATA).rows
    expect(rows.map((row) => [row.time, row.risk, row.events, row.censored])).toEqual([
      [1,8,1,0], [2,7,0,1], [3,6,2,1], [5,3,1,0], [6,2,0,1], [7,1,1,0],
    ])
    const survival = [7/8, 7/8, 7/12, 7/18, 7/18, 0]
    const na = [1/8, 1/8, 11/24, 19/24, 19/24, 43/24]
    rows.forEach((row, i) => {
      expect(row.survival).toBeCloseTo(survival[i]!, 13)
      expect(row.na).toBeCloseTo(na[i]!, 13)
      expect(Math.exp(-row.na) + 1e-14).toBeGreaterThanOrEqual(row.survival)
    })
    expect(riskSetAt(TEACHING_DATA, 3).map((subject) => subject.id)).toEqual(['3','4','5','6','7','8'])
    expect(rows.at(-1)).toMatchObject({ survival: 0, lower: null, upper: null, ciStatus: 'terminal-zero' })
  })

  it('exposes the hand-worked log-rank contributions, not just its p-value', () => {
    const result = logRank(TEACHING_DATA)
    expect(result.rows.map((row) => [row.time, row.riskA, row.riskB, row.observedA, row.observedB])).toEqual([
      [1,4,4,1,0], [3,3,3,1,1], [5,1,2,0,1], [7,0,1,0,1],
    ])
    expect(result.observed).toEqual([2,3])
    expect(result.expected[0]).toBeCloseTo(11/6, 14)
    expect(result.expected[1]).toBeCloseTo(19/6, 14)
    expect(result.variance).toBeCloseTo(157/180, 14)
    expect(result.score).toBeCloseTo(1/6, 14)
    expect(result.statistic).toBeCloseTo(5/157, 14)
    expect(result.pValue).toBeCloseTo(0.858363575666408, 13)
    expect(result.rows.at(-1)!.variance).toBe(0)
  })
})

describe('boundaries, validation, and method invariants', () => {
  it('keeps all-censored KM at one, with explicit degenerate-interval status', () => {
    const data = TEACHING_DATA.map((subject) => ({ ...subject, event: 0 as const }))
    for (const row of estimateSurvival(data).rows) {
      expect(row).toMatchObject({ survival: 1, na: 0, lower: 1, upper: 1, ciStatus: 'no-events' })
    }
    expect(logRank(data)).toMatchObject({ status: 'not-estimable', statistic: null, pValue: null })
    expect(JSON.stringify(estimateSurvival(data))).not.toMatch(/NaN|Infinity/)
  })
  it('supports empty estimates and single subjects without inventing a test', () => {
    expect(estimateSurvival([])).toEqual({ rows: [], n: 0, events: 0, censored: 0, lastTime: null })
    expect(estimateSurvival([{ id: 'only', time: 0, event: 1 }]).rows[0]).toMatchObject({
      time: 0, risk: 1, events: 1, survival: 0, na: 1, lower: null, upper: null,
    })
    expect(logRank([]).status).toBe('not-estimable')
    expect(logRank([{ id: 'only', time: 2, event: 1 }]).status).toBe('not-estimable')
  })
  it('keeps very close recorded times distinct and supports time-zero ties', () => {
    const data: Subject[] = [{ id:'a',time:0,event:1 }, { id:'b',time:0,event:0 },
      { id:'c',time:1,event:1 }, { id:'d',time:1+1e-12,event:1 }]
    const rows = estimateSurvival(data).rows
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ time: 0, risk: 4, events: 1, censored: 1, survival: 0.75 })
    expect(rows[1]!.time).not.toBe(rows[2]!.time)
  })
  it('is invariant to row order and symmetric in group labels', () => {
    const original = logRank(TEACHING_DATA)
    const reversed = [...TEACHING_DATA].reverse()
    expect(estimateSurvival(reversed)).toEqual(estimateSurvival(TEACHING_DATA))
    expect(logRank(reversed)).toEqual(original)
    const swapped = logRank(TEACHING_DATA.map((subject) => ({ ...subject, group: subject.group === 'A' ? 'B' : 'A' })))
    expect(swapped.statistic).toBeCloseTo(original.statistic!, 13)
    expect(swapped.pValue).toBeCloseTo(original.pValue!, 13)
  })
  it('does not reject an otherwise estimable test when one group has no events', () => {
    const data: Subject[] = [
      { id:'1',time:1,event:1,group:'A' }, { id:'2',time:2,event:0,group:'B' },
      { id:'3',time:3,event:1,group:'A' }, { id:'4',time:4,event:0,group:'B' },
    ]
    expect(logRank(data).status).toBe('estimable')
    expect(logRank(data).observed[1]).toBe(0)
  })
  it('requires two complete group labels and handles zero tie variance', () => {
    expect(logRank(TEACHING_DATA.map((s) => ({ ...s, group: undefined }))).status).toBe('not-estimable')
    expect(logRank(TEACHING_DATA.map((s) => ({ ...s, group: s.id }))).status).toBe('not-estimable')
    const tied = TEACHING_DATA.map((s) => ({ ...s, time: 1, event: 1 as const }))
    expect(logRank(tied)).toMatchObject({ status: 'not-estimable', variance: 0, pValue: null })
  })
  it('reports invalid rows and preserves source-row locations rather than dropping them', () => {
    const invalid = [{ id:'x',time:-1,event:1,sourceRow:17 }, { id:'x',time:NaN,event:2 }] as unknown as Subject[]
    const issues = validateSubjects(invalid)
    expect(issues.some((issue) => issue.row === 17 && issue.field === 'time')).toBe(true)
    expect(issues.some((issue) => issue.row === 2 && issue.field === 'id')).toBe(true)
    expect(issues.some((issue) => issue.field === 'event')).toBe(true)
    expect(() => estimateSurvival(invalid)).toThrow(DataValidationError)
  })
})

describe('safe practice answers', () => {
  it('accepts exact counts, fractions, and the promised three-place rounding', () => {
    expect(checkPracticeAnswer('6', 6, 'count').correct).toBe(true)
    expect(checkPracticeAnswer('7 / 12', 7/12, 'survival').correct).toBe(true)
    expect(checkPracticeAnswer('0.583', 7/12, 'survival').correct).toBe(true)
    expect(checkPracticeAnswer('.875', 7/8, 'survival').correct).toBe(true)
    expect(checkPracticeAnswer('0.582', 7/12, 'survival').correct).toBe(false)
  })
  it('rejects arbitrary expressions, division by zero, and impossible probabilities', () => {
    for (const input of ['', '1/0', '0/0', '1+1', 'alert(1)', '-.1', '1.01']) {
      expect(checkPracticeAnswer(input, 0.5, 'survival').valid).toBe(false)
    }
    expect(checkPracticeAnswer('2.2', 2, 'count').valid).toBe(false)
    expect(checkPracticeAnswer('7', 6, 'count')).toMatchObject({ valid: true, correct: false })
  })
})
