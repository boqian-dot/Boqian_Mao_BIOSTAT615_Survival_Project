import type { LogRankResult, LogRankRow, Subject } from './types'
import { chiSquare1Tail } from './numerics'
import { assertValidSubjects } from './validation'

function unavailable(reason: string): LogRankResult {
  return { status: 'not-estimable', reason, groups: null, counts: [0, 0], rows: [],
    observed: [0, 0], expected: [0, 0], variance: 0, score: 0,
    statistic: null, pValue: null, logPValue: null }
}

/**
 * Ordinary unweighted two-group log-rank, with a hypergeometric tie variance.
 * Supply exactly the same selected records used for the comparison curves.
 * Reference: R survival::survdiff(..., rho=0), src/survdiff2.c.
 */
export function logRank(subjects: readonly Subject[]): LogRankResult {
  assertValidSubjects(subjects)
  if (subjects.some((subject) => !subject.group?.trim())) {
    return unavailable('Every subject needs a nonempty group label for a comparison.')
  }
  const labels = [...new Set(subjects.map((subject) => subject.group!))].sort()
  if (labels.length !== 2) {
    return unavailable('Select exactly two distinct nonempty groups for the comparison.')
  }
  const groups: [string, string] = [labels[0]!, labels[1]!]
  const sorted = [...subjects].sort((a, b) => a.time - b.time)
  const countA = subjects.filter((subject) => subject.group === groups[0]).length
  const counts: [number, number] = [countA, subjects.length - countA]
  const observed: [number, number] = [0, 0]
  const expected: [number, number] = [0, 0]
  const rows: LogRankRow[] = []
  let riskA = counts[0]
  let riskB = counts[1]
  let cumulativeScore = 0
  let cumulativeVariance = 0
  let index = 0
  while (index < sorted.length) {
    const time = sorted[index]!.time
    let end = index
    let observedA = 0
    let observedB = 0
    let removedA = 0
    let removedB = 0
    while (end < sorted.length && sorted[end]!.time === time) {
      const subject = sorted[end]!
      if (subject.group === groups[0]) {
        removedA += 1
        observedA += subject.event
      } else {
        removedB += 1
        observedB += subject.event
      }
      end += 1
    }
    const events = observedA + observedB
    if (events > 0) {
      const risk = riskA + riskB
      const expectedA = events * riskA / risk
      const expectedB = events * riskB / risk
      const variance = risk > 1
        ? riskA * riskB * events * (risk - events) / (risk * risk * (risk - 1)) : 0
      const score = observedA - expectedA
      cumulativeScore += score
      cumulativeVariance += variance
      observed[0] += observedA
      observed[1] += observedB
      expected[0] += expectedA
      expected[1] += expectedB
      rows.push({ time, riskA, riskB, observedA, observedB, expectedA, expectedB,
        variance, score, cumulativeScore, cumulativeVariance })
    }
    riskA -= removedA
    riskB -= removedB
    index = end
  }
  const base = { groups, counts, rows, observed, expected,
    variance: cumulativeVariance, score: cumulativeScore }
  if (cumulativeVariance === 0) {
    return { ...base, status: 'not-estimable',
      reason: 'The total log-rank variance is zero; the test is not estimable.',
      statistic: null, pValue: null, logPValue: null }
  }
  const statistic = cumulativeScore * cumulativeScore / cumulativeVariance
  return { ...base, status: 'estimable', statistic, ...chiSquare1Tail(statistic) }
}
