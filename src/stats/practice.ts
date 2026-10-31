export interface PracticeFeedback {
  valid: boolean
  correct: boolean
  value: number | null
  message: string
}

/** Parse decimal/simple-fraction answers; never evaluate an arbitrary expression. */
export function checkPracticeAnswer(
  input: string,
  expected: number,
  kind: 'count' | 'survival',
): PracticeFeedback {
  const text = input.trim()
  let value: number
  if (kind === 'count') {
    if (!/^\d+$/.test(text)) {
      return { valid: false, correct: false, value: null, message: 'Enter a nonnegative whole-number count.' }
    }
    value = Number(text)
  } else {
    const decimal = '(?:\\d+(?:\\.\\d*)?|\\.\\d+)'
    const match = new RegExp(`^(${decimal})(?:\\s*/\\s*(${decimal}))?$`).exec(text)
    if (!match) {
      return { valid: false, correct: false, value: null,
        message: 'Enter a decimal or a simple fraction, such as 0.875 or 7/8.' }
    }
    const numerator = Number(match[1])
    const denominator = match[2] === undefined ? 1 : Number(match[2])
    value = numerator / denominator
  }
  if (!Number.isFinite(value) || value < 0 || (kind === 'survival' && value > 1)) {
    return { valid: false, correct: false, value: null,
      message: kind === 'count' ? 'Enter a finite nonnegative count.' : 'Survival must be between 0 and 1.' }
  }
  const correct = kind === 'count' ? value === expected : Math.abs(value - expected) <= 0.0005 + 1e-15
  return { valid: true, correct, value,
    message: correct ? 'Correct.' : kind === 'count'
      ? 'Count the subjects immediately before this time, including tied events and censorings.'
      : 'Multiply the previous survival by (number at risk minus events) / number at risk.' }
}
