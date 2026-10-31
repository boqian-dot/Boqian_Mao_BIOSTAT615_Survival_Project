/**
 * Direct complementary error function using Cephes rational approximations.
 * Coefficients: Stephen L. Moshier, Cephes Math Library release 2.2 (1992),
 * as maintained in SciPy/xsf cephes/ndtr.h (2024 C++ translation).
 * Copyright 1984, 1987, 1988, 1992 Stephen L. Moshier; Copyright 2024 SciPy.
 * See reference/NUMERICS.md for source, modifications, and BSD license notice.
 * This computes tails directly: it does not subtract a nearly-one CDF.
 */
// Preserve published decimal coefficients, then deliberately round once to IEEE-754.
const P = ['2.46196981473530512524e-10', '5.64189564831068821977e-1',
  '7.46321056442269912687', '4.86371970985681366614e1', '1.96520832956077098242e2',
  '5.26445194995477358631e2', '9.34528527171957607540e2',
  '1.02755188689515710272e3', '5.57535335369399327526e2'].map(Number)
const Q = ['1.32281951154744992508e1', '8.67072140885989742329e1',
  '3.54937778887819891062e2', '9.75708501743205489753e2', '1.82390916687909736289e3',
  '2.24633760818710981792e3', '1.65666309194161350182e3', '5.57535340817727675546e2'].map(Number)
const R = ['5.64189583547755073984e-1', '1.27536670759978104416',
  '5.01905042251180477414', '6.16021097993053585195', '7.40974269950448939160',
  '2.97886665372100240670'].map(Number)
const S = ['2.26052863220117276590', '9.39603524938001434673',
  '1.20489539808096656605e1', '1.70814450747565897222e1',
  '9.60896809063285878198', '3.36907645100081516050'].map(Number)
const T = ['9.60497373987051638749', '9.00260197203842689217e1',
  '2.23200534594684319226e3', '7.00332514112805075473e3', '5.55923013010394962768e4'].map(Number)
const U = ['3.35617141647503099647e1', '5.21357949780152679795e2',
  '4.59432382970980127987e3', '2.26290000613890934246e4', '4.92673942608635921086e4'].map(Number)

function polynomial(x: number, coefficients: readonly number[]): number {
  let result = 0
  for (const coefficient of coefficients) result = result * x + coefficient
  return result
}

function monicPolynomial(x: number, coefficients: readonly number[]): number {
  let result = 1
  for (const coefficient of coefficients) result = result * x + coefficient
  return result
}

function smallErf(x: number): number {
  const square = x * x
  return x * polynomial(square, T) / monicPolynomial(square, U)
}

/** Log(erfc(x)) for nonnegative x, avoiding underflow in extreme tails. */
export function logErfc(x: number): number {
  if (Number.isNaN(x) || x < 0) throw new RangeError('logErfc requires a nonnegative argument.')
  if (x === Infinity) return -Infinity
  if (x < 1) return Math.log1p(-smallErf(x))
  const numerator = polynomial(x, x < 8 ? P : R)
  const denominator = monicPolynomial(x, x < 8 ? Q : S)
  return -x * x + Math.log(numerator) - Math.log(denominator)
}

export function erfc(x: number): number {
  if (Number.isNaN(x)) throw new RangeError('erfc requires a number.')
  return x < 0 ? 2 - Math.exp(logErfc(-x)) : Math.exp(logErfc(x))
}

/** Chi-square-one upper tail and its logarithm. Q must be finite and >= 0. */
export function chiSquare1Tail(statistic: number): { pValue: number; logPValue: number } {
  if (!Number.isFinite(statistic) || statistic < 0) {
    throw new RangeError('A chi-square statistic must be finite and nonnegative.')
  }
  const logPValue = logErfc(Math.sqrt(statistic / 2))
  return { pValue: Math.exp(logPValue), logPValue }
}
