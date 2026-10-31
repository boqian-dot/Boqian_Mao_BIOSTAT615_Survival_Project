import type { Subject, SurvivalEstimate, SurvivalRow } from './types'
import { assertValidSubjects } from './validation'

const Z_975 = 1.959963984540054

/**
 * KM and ordinary Nelson-Aalen share one exact-time sweep. Both events and
 * censorings at t are in the risk set at t-. No risk-membership matrix is kept.
 * Reference: R survival survfit.formula, stype=1, ctype=1, robust=FALSE.
 */
export function estimateSurvival(subjects: readonly Subject[]): SurvivalEstimate {
  assertValidSubjects(subjects)
  const sorted = [...subjects].sort((a, b) => a.time - b.time)
  const rows: SurvivalRow[] = []
  let logSurvival = 0
  let greenwood = 0
  let cumulativeHazard = 0
  let totalEvents = 0
  let terminal = false
  let index = 0

  while (index < sorted.length) {
    const time = sorted[index]!.time
    const risk = sorted.length - index
    let end = index
    let events = 0
    let censored = 0
    while (end < sorted.length && sorted[end]!.time === time) {
      if (sorted[end]!.event === 1) events += 1
      else censored += 1
      end += 1
    }
    totalEvents += events
    const factor = (risk - events) / risk
    const naIncrement = events / risk
    cumulativeHazard += naIncrement
    if (events === risk) {
      terminal = true
    } else if (events > 0 && !terminal) {
      logSurvival += Math.log1p(-events / risk)
      greenwood += events / (risk * (risk - events))
    }

    const survival = terminal ? 0 : Math.exp(logSurvival)
    let lower: number | null = null
    let upper: number | null = null
    let ciStatus: SurvivalRow['ciStatus'] = 'terminal-zero'
    if (!terminal && greenwood === 0) {
      lower = 1
      upper = 1
      ciStatus = 'no-events'
    } else if (!terminal) {
      // logSurvival is retained directly to avoid recomputing log(exp(logS)).
      const a = Math.log(-logSurvival)
      const b = Z_975 * Math.sqrt(greenwood) / Math.abs(logSurvival)
      lower = Math.exp(-Math.exp(a + b))
      upper = Math.exp(-Math.exp(a - b))
      ciStatus = 'available'
    }
    rows.push({ time, risk, events, censored, factor, survival,
      na: cumulativeHazard, naIncrement, lower, upper, ciStatus })
    index = end
  }

  return { rows, n: sorted.length, events: totalEvents,
    censored: sorted.length - totalEvents, lastTime: rows.at(-1)?.time ?? null }
}

/** The subjects at risk immediately BEFORE the selected time (including ties). */
export function riskSetAt(subjects: readonly Subject[], time: number): Subject[] {
  if (!Number.isFinite(time) || time < 0) throw new RangeError('Selected time must be finite and at least zero.')
  return subjects.filter((subject) => subject.time >= time)
}
