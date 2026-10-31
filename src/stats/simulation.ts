import type { LatentSubject, SimulatedCohort, SimulationConfig, Subject } from './types'
import { createUniformStreams } from './random'

export const DEFAULT_SIMULATION: SimulationConfig = Object.freeze({
  n: 100, shape: 1, scale: 20, dropoutRate: 0.02, horizon: 24, seed: 6152026,
})

function checkPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and positive.`)
}

export function weibullQuantile(uniform: number, shape: number, scale: number): number {
  if (!Number.isFinite(uniform) || uniform <= 0 || uniform >= 1) {
    throw new RangeError('A simulation uniform must be strictly between zero and one.')
  }
  checkPositive(shape, 'Weibull shape')
  checkPositive(scale, 'Weibull scale')
  return scale * Math.pow(-Math.log1p(-uniform), 1 / shape)
}

export function weibullCumulativeHazard(time: number, shape: number, scale: number): number {
  if (!Number.isFinite(time) || time < 0) throw new RangeError('Time must be finite and nonnegative.')
  checkPositive(shape, 'Weibull shape')
  checkPositive(scale, 'Weibull scale')
  return Math.pow(time / scale, shape)
}

export function weibullSurvival(time: number, shape: number, scale: number): number {
  return Math.exp(-weibullCumulativeHazard(time, shape, scale))
}

export function exponentialQuantile(uniform: number, rate: number): number {
  if (!Number.isFinite(uniform) || uniform <= 0 || uniform >= 1) {
    throw new RangeError('A simulation uniform must be strictly between zero and one.')
  }
  checkPositive(rate, 'Dropout rate')
  return -Math.log1p(-uniform) / rate
}

export function validateSimulationConfig(config: SimulationConfig): void {
  if (!Number.isInteger(config.n) || config.n < 20 || config.n > 2000) {
    throw new RangeError('Sample size must be an integer from 20 to 2,000.')
  }
  if (![0.6, 1, 2].includes(config.shape)) throw new RangeError('Choose a supported Weibull shape: 0.6, 1, or 2.')
  if (!Number.isFinite(config.scale) || config.scale < 5 || config.scale > 50) {
    throw new RangeError('Weibull scale must be from 5 to 50 time units.')
  }
  if (!Number.isFinite(config.dropoutRate) || config.dropoutRate < 0 || config.dropoutRate > 0.2) {
    throw new RangeError('Dropout rate must be from 0 to 0.2 per time unit.')
  }
  if (!Number.isFinite(config.horizon) || config.horizon < 1 || config.horizon > 100) {
    throw new RangeError('Follow-up horizon must be from 1 to 100 time units.')
  }
  if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > 0xffffffff) {
    throw new RangeError('Seed must be an integer from 0 through 4,294,967,295.')
  }
}

/**
 * Parameter changes reuse the same indexed uniforms. Censoring-only changes
 * therefore leave every latent event time unchanged, and n uses stable prefixes.
 */
export function simulateCohort(config: SimulationConfig): SimulatedCohort {
  validateSimulationConfig(config)
  const streams = createUniformStreams(config.seed)
  const observed: Subject[] = []
  const complete: Subject[] = []
  const latent: LatentSubject[] = []
  let events = 0
  let dropouts = 0
  let administrative = 0
  for (let index = 0; index < config.n; index += 1) {
    const id = String(index + 1)
    const eventTime = weibullQuantile(streams.event(), config.shape, config.scale)
    // Consume one draw even with no random dropout, preserving the stream contract.
    const dropoutDraw = streams.dropout()
    const dropoutTime = config.dropoutRate === 0 ? null
      : exponentialQuantile(dropoutDraw, config.dropoutRate)
    const dropout = dropoutTime ?? Infinity
    const time = Math.min(eventTime, dropout, config.horizon)
    const event: 0 | 1 = eventTime <= dropout && eventTime <= config.horizon ? 1 : 0
    const censoring = event === 1 ? 'event'
      : dropout < config.horizon ? 'dropout' : 'administrative'
    if (censoring === 'event') events += 1
    else if (censoring === 'dropout') dropouts += 1
    else administrative += 1
    observed.push({ id, time, event })
    complete.push({ id, time: eventTime, event: 1 })
    latent.push({ id, eventTime, dropoutTime, censoring })
  }
  return { config: { ...config }, observed, complete, latent, events, dropouts,
    administrative, censoringFraction: (dropouts + administrative) / config.n }
}
