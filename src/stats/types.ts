/** One independent subject with ordinary right-censored follow-up. */
export interface Subject {
  id: string
  time: number
  event: 0 | 1
  group?: string
  sourceRow?: number
}

export type ConfidenceStatus = 'available' | 'no-events' | 'terminal-zero'

export interface SurvivalRow {
  time: number
  risk: number
  events: number
  censored: number
  factor: number
  survival: number
  na: number
  naIncrement: number
  lower: number | null
  upper: number | null
  ciStatus: ConfidenceStatus
}

export interface SurvivalEstimate {
  rows: SurvivalRow[]
  n: number
  events: number
  censored: number
  lastTime: number | null
}

export interface ValidationIssue {
  row: number
  id?: string
  field: string
  message: string
}

export interface LogRankRow {
  time: number
  riskA: number
  riskB: number
  observedA: number
  observedB: number
  expectedA: number
  expectedB: number
  variance: number
  score: number
  cumulativeScore: number
  cumulativeVariance: number
}

export interface LogRankResult {
  status: 'estimable' | 'not-estimable'
  reason?: string
  groups: [string, string] | null
  counts: [number, number]
  rows: LogRankRow[]
  observed: [number, number]
  expected: [number, number]
  variance: number
  score: number
  statistic: number | null
  pValue: number | null
  /** Remains finite even when the probability itself underflows to zero. */
  logPValue: number | null
}

export interface SimulationConfig {
  n: number
  shape: number
  scale: number
  dropoutRate: number
  horizon: number
  seed: number
}

export interface LatentSubject {
  id: string
  eventTime: number
  /** null means no random dropout, not an unobserved numeric draw. */
  dropoutTime: number | null
  censoring: 'event' | 'dropout' | 'administrative'
}

export interface SimulatedCohort {
  config: SimulationConfig
  observed: Subject[]
  complete: Subject[]
  latent: LatentSubject[]
  events: number
  dropouts: number
  administrative: number
  censoringFraction: number
}
