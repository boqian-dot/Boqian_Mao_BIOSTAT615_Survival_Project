/**
 * xoshiro128** 1.1 by David Blackman and Sebastiano Vigna (2018).
 * Public-domain reference: https://prng.di.unimi.it/xoshiro128starstar.c
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted. THE SOFTWARE IS PROVIDED
 * "AS IS", WITHOUT WARRANTY. Full notice: reference/NUMERICS.md.
 *
 * Integer overflow is made explicit for JavaScript. The dropout stream is
 * jumped 2^64 states ahead, rather than sharing a mutable draw counter with n.
 */

function rotateLeft(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0
}

function initialState(seed: number): [number, number, number, number] {
  let counter = seed >>> 0
  const word = () => {
    // A fixed counter + bijective 32-bit finalizer expands the public seed.
    counter = (counter + 0x9e3779b9) >>> 0
    let result = counter
    result = Math.imul(result ^ (result >>> 16), 0x85ebca6b)
    result = Math.imul(result ^ (result >>> 13), 0xc2b2ae35)
    return (result ^ (result >>> 16)) >>> 0
  }
  // Distinct counter inputs and bijective mixing cannot produce all zero words.
  return [word(), word(), word(), word()]
}

class Xoshiro128 {
  private state: [number, number, number, number]

  constructor(seed: number) {
    this.state = initialState(seed)
  }

  nextUint32(): number {
    const state = this.state
    const result = Math.imul(rotateLeft(Math.imul(state[1], 5), 7), 9) >>> 0
    const shifted = state[1] << 9
    state[2] = (state[2] ^ state[0]) >>> 0
    state[3] = (state[3] ^ state[1]) >>> 0
    state[1] = (state[1] ^ state[2]) >>> 0
    state[0] = (state[0] ^ state[3]) >>> 0
    state[2] = (state[2] ^ shifted) >>> 0
    state[3] = rotateLeft(state[3], 11)
    return result
  }

  jump(): void {
    const accumulated: [number, number, number, number] = [0, 0, 0, 0]
    for (const polynomial of [0x8764000b, 0xf542d2d3, 0x6fa035c3, 0x77f2db5b]) {
      for (let bit = 0; bit < 32; bit += 1) {
        if ((polynomial & (1 << bit)) !== 0) {
          for (let index = 0; index < 4; index += 1) {
            accumulated[index] = (accumulated[index]! ^ this.state[index]!) >>> 0
          }
        }
        this.nextUint32()
      }
    }
    this.state = accumulated
  }

  nextOpenUniform(): number {
    return (this.nextUint32() + 0.5) / 4294967296
  }
}

/** Stable non-overlapping subsequences; these are simulation, not crypto, draws. */
export function createUniformStreams(seed: number): { event: () => number; dropout: () => number } {
  const eventGenerator = new Xoshiro128(seed)
  const dropoutGenerator = new Xoshiro128(seed)
  dropoutGenerator.jump()
  return { event: () => eventGenerator.nextOpenUniform(), dropout: () => dropoutGenerator.nextOpenUniform() }
}
