# Numerical methods and reference provenance

The application implements the risk-set sweep, Kaplan-Meier estimator, Greenwood log-log intervals, ordinary Nelson-Aalen estimator, log-rank contributions, and Weibull/dropout transforms as independent TypeScript functions. R supplies verification values, rather than application runtime calculations. New project code is covered by the repository license; the external algorithm sources and their notices below retain their own terms.

## Reproduce the R references

From the repository root:

```sh
Rscript reference/generate_fixtures.R
```

Requires R, `survival`, and `jsonlite`. The committed reference JSON records the actual versions and command. Its initial generation used R 4.4.2, survival 3.8.6, and jsonlite 2.0.0. It contains 62 datasets (including 50 fixed-seed integer-time datasets), grouped curve references, nine chi-square-one upper tails through Q=1400, and direct Weibull/dropout transform references. Regeneration should change fixtures only when intentional inputs, reference versions, or precision change. Never edit expected values to accommodate an implementation error.

KM/NA references use `survfit(stype=1, ctype=1, robust=FALSE, timefix=FALSE, conf.type="log-log")`. Log-rank references use `survdiff(rho=0)` on integer recorded times, and `pchisq(..., lower.tail=FALSE)` for p-values. An explicit `timefix=FALSE` argument to `survdiff` produces a model-frame error in the installed survival 3.8.6; the R script therefore does not pass that argument. The near-distinct-time dataset checks KM/NA with exact recorded times and deliberately has no public `survdiff` reference. Degenerate log-rank cases are tested as explicit non-estimable states, not fabricated p-values.

The R sources are [survfit.formula](https://stat.ethz.ch/R-manual/R-devel/library/survival/html/survfit.formula.html), [summary.survfit](https://stat.ethz.ch/R-manual/R-devel/library/survival/html/summary.survfit.html), [survdiff](https://stat.ethz.ch/R-manual/R-devel/library/survival/html/survdiff.html), [Weibull](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/Weibull.html), and [chi-square](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/Chisquare.html).

## Complementary error function

`src/stats/numerics.ts` adapts the real erfc rational approximations and coefficients from [SciPy/xsf cephes/ndtr.h](https://github.com/scipy/xsf/blob/main/include/xsf/cephes/ndtr.h). Original coefficients: Cephes Math Library release 2.2 (June 1992), Stephen L. Moshier, copyright 1984, 1987, 1988, 1992. SciPy's C++ translation dates to 2024.

The TypeScript adaptation evaluates the rational expression on the log scale before exponentiation, retaining a log-probability even when a double-precision tail underflows. Only the small-argument branch uses 1-erf, where cancellation is controlled. The chi-square-one tail is computed as erfc(sqrt(Q/2)); it never subtracts a nearly-one CDF from one. Source notices are retained here and in the implementation. See the [SciPy/xsf BSD license](https://github.com/scipy/xsf/blob/main/LICENSE).

BSD 3-Clause License

Copyright (c) 2024, SciPy

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Reproducible random streams

`src/stats/random.ts` adapts [xoshiro128** 1.1](https://prng.di.unimi.it/xoshiro128starstar.c) by David Blackman and Sebastiano Vigna (2018), retaining unsigned 32-bit arithmetic in JavaScript. A fixed four-word counter/mixer expansion initializes the 128-bit nonzero state from the public 32-bit seed. The event stream starts there; the dropout stream uses the reference jump of 2^64 states. Each uint32 is mapped to the strictly open interval by `(word + 0.5) / 2^32`. This is an educational simulation PRNG, not cryptography. Its algorithm, seeding, jump, and mapping are part of the reproducibility contract.

`reference/prng_reference.c` is an independent C harness for the reference integer transition, seed expansion, and jump. Regenerate its committed 32-word test fixture with:

```sh
cc -O2 reference/prng_reference.c -o /tmp/survival-prng-reference
/tmp/survival-prng-reference > tests/fixtures/prng-reference.json
```

Written in 2018 by David Blackman and Sebastiano Vigna.

To the extent possible under law, the author has dedicated all copyright and related and neighboring rights to this software to the public domain worldwide.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
