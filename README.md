# Survival Explorer

An interactive survival-analysis teaching lab for BIOSTAT 615, Fall 2026.
Learn how individual follow-up records become Kaplan-Meier survival estimates,
Nelson-Aalen cumulative hazard, and a two-group log-rank test.

**Author:** Boqian Mao (boqian)  
**Repository:** https://github.com/boqian-dot/Boqian_Mao_BIOSTAT615_Survival_Project

The intended GitHub Pages address is
https://boqian-dot.github.io/Boqian_Mao_BIOSTAT615_Survival_Project/ .
Remote publication and deployment status are recorded in `docs/dev-log.md`;
this address alone does not establish that a deployment succeeded.

## Explore the application

- **Kaplan-Meier lesson:** eight individual timelines, two worked observation
  times, then predict-and-check practice with fractions, hints, and worked answers.
- **Nelson-Aalen:** reuse the risk sets, add d/Y contributions, and compare KM
  with exp(-NA) while keeping their estimands and finite-sample differences clear.
- **Compare groups:** inspect observed/expected event counts, variance contributions,
  the score, chi-square statistic, and approximate log-rank p-value.
- **Censoring lab:** generate a seeded Weibull cohort, then vary independent
  dropout and administrative follow-up while keeping latent event times fixed.
- **Your own data:** map CSV columns and status codes explicitly, inspect validation
  feedback, and explore supported observations without compulsory quizzes.

KM offers a switch for **95% pointwise** log-log confidence intervals. NA shows
point estimates. Curves stop at each group's last observed follow-up; a zero KM
endpoint has an explicitly unavailable transformed interval.

## Run locally

Requires **Node.js 24** and npm. Exact dependency versions are in the lockfile.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite, including the repository base path. A local
Node runtime used during development lives in ignored `.tools/`; it is not
required or distributed to other users.

```sh
npm run check        # lint, TypeScript, automated tests, production build
npm run build        # production output in dist/
npm run preview      # preview the production build locally
```

## Upload requirements

Use a UTF-8 comma-delimited CSV with a header, at most 2 MiB and 5,000 data rows.
Columns may have arbitrary names: explicitly map follow-up time, event/status,
optional group, and optional subject ID. Download the sample template from the app.

- One row per independent subject, one event endpoint, ordinary right censoring.
- Follow-up must be finite and nonnegative, with a common time origin and unit.
- Assign each observed status code explicitly to Event or Censored. Single-status
  files are allowed. The app never guesses whether 1/2 or 0/1 coding was intended.
- Provided IDs must be nonempty and unique. Required invalid fields produce
  row-level errors rather than silent deletion or imputation.
- Missing grouping does not prevent pooled estimates. A two-group comparison
  requires two nonempty labels. With more groups, select two explicitly; curves,
  calculations, and tests use the same subset and show exclusions.

The supported structure excludes weights, left truncation, interval censoring,
competing risks, recurrent events, and repeated/clustered subject observations.
The user confirms the study design: CSV checks cannot establish subject independence
or independent censoring. Records remain in browser memory, are not uploaded to
an application server, and can be cleared.

## How correctness is checked

The TypeScript numerical core is isolated in `src/stats/`. Its step-by-step
outputs are checked against hand arithmetic and **genuine R reference fixtures**,
not merely another implementation of the same frontend formula.

The eight-subject example has pooled KM values
`7/8, 7/8, 7/12, 7/18, 7/18, 0` and ordinary NA values
`1/8, 1/8, 11/24, 19/24, 19/24, 43/24`.
Its log-rank statistic is `5/157`, with p approximately `0.858363575666408`.

Reference generation requires R with `survival` and `jsonlite`:

```sh
npm run fixtures
```

The committed fixtures record the actual versions and cover 62 datasets,
including 50 fixed-seed cases, pooled/group curves, tied events/censoring,
confidence boundaries, log-rank cases, extreme probability tails, and Weibull
transforms. Normal frontend CI does not need R. The public R log-rank call uses
integer-time fixtures; the documented `timefix` caveat is in
[reference/NUMERICS.md](reference/NUMERICS.md).

Tests also check PRNG output against an independent C harness, stable simulated
subject prefixes, explicit CSV mapping/error behavior, and linked teaching
interactions. The first integrated version passed 179 tests, lint, strict TypeScript, and production build. See the development log for actual check results and corrections.
Never edit expected fixtures by hand to make failing code pass.

## Deployment

`.github/workflows/checks.yml` runs checks on pushes and pull requests. A successful
main-branch build can deploy `dist/` to GitHub Pages. In repository **Settings →
Pages**, set the deployment source to **GitHub Actions**. Vite's base path matches
this repository's name. Pull requests run checks without publishing.

## Project process and limitations

`SPEC.md` is the AI-authored design from the restarted interview. The checkpoint
requires the teaching modules and censoring simulator by November 23; the final
requires CSV import/exploration and completed documentation/video by December 17.
`docs/requirements.md` tracks course requirements and outstanding evidence.

`AI_USAGE.md` and `docs/dev-log.md` describe actual agent use, failures, corrections,
and verification. The application is educational: small or heavily censored
samples can give uninformative estimates or an unavailable group test. A large
p-value does not show equivalence; group comparisons do not establish causation.
The exponential is the Weibull shape-1 teaching scenario, rather than a requirement
on uploaded data. The simulator compares model truth, a realized complete-event
sample, and censored observations as distinct quantities.

## Credits and license

New project code is MIT-licensed; see `LICENSE`. R survival supplies independent
references, with KM/NA/log-rank methods attributed in the numerical documentation.
The complementary-error routine adapts Cephes coefficients through SciPy/xsf
(BSD terms), and seeded streams adapt the public-domain xoshiro128** algorithm.
Full notices and provenance are in [reference/NUMERICS.md](reference/NUMERICS.md)
and are shipped with the static build as [NUMERICS.md](public/NUMERICS.md).
React, Vite, Papa Parse, and development tools retain their respective licenses.
