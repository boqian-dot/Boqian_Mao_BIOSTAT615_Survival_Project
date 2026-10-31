# SPEC: Survival Explorer

Interactive teaching of Kaplan-Meier survival estimation, Nelson-Aalen cumulative hazard, right censoring, and the two-group log-rank test.

This document is the AI-authored implementation specification produced from the completed, restarted proposal interview. It is addressed to the agentic coding tool that will build the application. The interview decisions are summarized in Section 13. Numerical defaults and engineering limits below are implementation choices made to turn those decisions into a concrete build plan; they were not individually specified by the author.

## 1. Project facts and goal

- Author: Boqian Mao, U-M uniqname boqian.
- Course: BIOSTAT 615, Fall 2026; individual project, Track A: Interactive Web Application.
- Title: Survival Explorer.
- Repository: https://github.com/boqian-dot/Boqian_Mao_BIOSTAT615_Survival_Project
- Intended deployment: https://boqian-dot.github.io/Boqian_Mao_BIOSTAT615_Survival_Project/
- Stack: React, TypeScript in strict mode, and Vite; browser-side computation and GitHub Pages hosting.
- Checkpoint: November 23, 2026, 11:59 PM ET.
- Final submission: December 17, 2026, 3:30 PM ET.
- Specification, application interface, and documentation: English.

The primary users are graduate students who know basic statistics and are new to survival analysis. The overall goal is to connect individual follow-up, risk sets, survival probability, cumulative hazard, and group comparison. After approximately ten minutes in the introductory lesson, a learner should independently identify risk sets, calculate KM probabilities for an eight-subject dataset, and explain why censoring does not itself create a downward survival step.

The eight-person lesson is the entry point, not the entire curriculum. NA and log-rank expose their calculations using the same observations and risk sets. A controlled simulator explores censoring, and the final version lets learners inspect their own supported datasets.

The survival project remains separate from TrialSizer. TrialSizer is a reference for pure statistical functions, R-generated validation fixtures, CI, and static deployment. Preserve its repository and live site. The survival repository exists; the intended live URL above is not a claim that the new application has been built or deployed.

## 2. Delivery scope

### Required for the November 23 checkpoint

1. An eight-subject KM lesson: demonstrate the first two observed times, then let the learner predict and check subsequent risk counts, event counts, and survival probabilities.
2. Linked individual timelines, risk-set explanations, KM step curves, and calculation tables.
3. A Nelson-Aalen module showing event-time increments and their cumulative sum.
4. A two-group log-rank module showing observed and expected events, variance contributions, the score, test statistic, and approximate p-value.
5. A reproducible, single-cohort independent-censoring experiment with Weibull event-time scenarios.
6. A switch for KM 95% pointwise confidence intervals, with an explanation of their interpretation. NA requires point estimates only.
7. Hand-worked and R reference checks, focused interaction tests, a public GitHub Pages prototype, and initial README/development-log/AI-usage documentation.

### Additionally required for the December 17 final version

1. CSV import with explicit column and event-code mapping, preview, validation, and study-design confirmation.
2. Free exploration of uploaded data: full-dataset estimates from all eligible uploaded records, time-specific risk-set/calculation inspection, and consistent two-group selection for comparisons. Censored event times remain unknown.
3. Clear included/excluded counts, documented supported structures and limits, and verified browser-only data processing.
4. Responsive and accessible interface, completed methods explanations, reproducible setup, source/license credits, AI_USAGE.md, and the course's 5-10 minute presentation video.

CSV support is a final requirement, not an optional extension. If time is short, defer extensions and decoration before reducing these commitments; report any missing promised feature honestly.

### Optional extensions after required work passes verification

- Repeated-study Monte Carlo experiments for bias, coverage, and power, with Monte Carlo uncertainty.
- A two-group effect simulator, NA confidence intervals, confidence-interval derivations, and NA/log-rank predict-and-check exercises.
- Additional distributions, manual dataset editing, export/share features, and an agentic-coding tutorial.
- Cox regression is not required. Any later addition needs a separate implementation and verification plan.

## 3. Teaching workflow and interface

Use four connected views: Guided KM lesson, NA and survival, Two-group comparison, and Censoring simulator. The final version adds an Upload and explore entry point. Dataset source, selected subset, and selected observation time must remain visible.

### Guided KM lesson

Load the fixed eight-subject dataset in Section 7. Use Next, Previous, Reset, and a time selector. Each selected time synchronizes the subject timelines, immediately-before-time risk set, counts, arithmetic, and post-update curve position.

- At the first observed time, fully demonstrate an event update.
- At the second, demonstrate censoring without a survival drop.
- At later times, ask for the risk count, event count, and new KM survival before revealing the worked calculation.
- Accept counts as exact nonnegative integers. Accept survival as a decimal or a simple numeric fraction; never evaluate arbitrary expressions. State that decimals may be rounded to three places and accept absolute error at most 0.0005 for this lesson.
- Identify which answers need correction, offer a hint, allow another attempt, and provide a Show worked answer action. Do not permanently block navigation.
- Reset feedback when the lesson is reset or its dataset changes. Keep lesson progress local to the current session; accounts and grading records are outside scope.

Visit all unique observation times, including censoring-only times. Explain risk-set membership before removing that time's events or censorings. At a tied event/censoring time, both contribute to the initial risk count; update survival for events and then remove everyone observed at that time.

### NA and survival

Reuse the dataset and risk table. Show each d/Y increment and its cumulative sum on a separate cumulative-hazard axis. Explain that cumulative hazard is not a probability and can exceed one.

Show the distinction between KM, ordinary NA, and transformations of them. A labeled comparison toggle may overlay KM with exp(-NA), but it must identify them as different estimates. Do not calculate NA by taking -log(KM). No required quiz or NA interval is added to this module.

### Two-group comparison

Use the same selected two-group subset for both group curves, risk counts, and the log-rank table. Select pooled event times in the table to highlight corresponding observations. Include plain-language explanations of observed and expected events, accumulation of evidence, and the approximate p-value. A large p-value does not establish equivalent survival or a causal conclusion.

### Uploaded-data exploration

Display full curves and calculation explanations without compulsory quizzes. Let users select any observed time; do not require clicking through thousands of times. For large datasets, show at most 50 individual timelines, clearly labeled as a display subset. All eligible records still contribute to the estimates; offer the complete selected-time risk-set list in a scrollable or virtualized table.

### Presentation and accessibility

Use a desktop layout with controls beside plots/tables and a stacked narrow-screen layout. Provide labeled keyboard-operable controls, readable focus states, accessible table alternatives, and event/censoring symbols that remain distinct without color. Use actual right-continuous step curves without smoothing. Keep methods and assumptions available near results.

## 4. Dataset and upload contracts

Support independent subjects, one row per subject, one event endpoint, and ordinary right censoring. Require a common time origin and unit. Left truncation, interval censoring, competing risks, recurrent events, weights, and clustered/repeated subject observations are outside the supported structure.

For each subject, retain an internal id, follow-up time, event indicator, optional group, and source row number.

| Field | Contract |
|---|---|
| time | Required finite number at least zero; observed event time or last observed follow-up, in the declared unit. Time-zero events are supported. |
| event | Required internal 1 for event or 0 for right censoring; uploaded codes are explicitly mapped by the user. |
| group | Optional for pooled KM/NA. Required and nonmissing for a selected group comparison. |
| id | Optional uploaded column; if supplied, nonempty and unique. Otherwise generate stable row IDs. |

### Import flow

1. Choose a UTF-8, comma-delimited CSV with a header. Support an optional UTF-8 BOM, quoted fields, and standard line endings using a maintained CSV parser; do not split raw lines at commas.
2. Preview rows and select the time column, status column, optional group column, and optional id column. Column names need not match a fixed template. Offer a downloadable standard template as a convenience.
3. Explicitly identify the observed status value meaning event and the value meaning censored. Support one or two observed status values, including a dataset containing only censored observations or only events. For a single-status file, let the user assign that sole observed code to either Event or Censored without requiring an absent opposite code. Never guess 0/1 versus 1/2 or silently collapse additional endpoint codes.
4. Ask for a time-unit label and confirmation of the supported study structure. Explain that file checks cannot establish independent censoring or subject independence.
5. Show validation results and row counts before enabling analysis. Require correction of invalid required values rather than silently deleting rows or imputing values.

Initial engineering limits are 2 MiB and 5,000 data rows, excluding the header and completely blank lines. Explain limits before file selection; record and disclose any later change after performance measurement. Ignore unused columns. Report ignored blank lines and whitespace normalization; preserve original row numbers. Reject ambiguous/duplicate headers, malformed CSV, empty datasets, nonfinite or negative times, missing required values, unmapped statuses, and duplicate supplied IDs with actionable locations.

A small sample, tied times, or an all-censored dataset is not itself a file-format error. Display available estimates and method-specific unavailable states. Missing group information can prevent a comparison while pooled analysis remains available if the group mapping is removed.

### Group selection

- Without grouping, use all validated records for pooled KM and NA.
- One observed group gives no two-group test.
- With two groups, offer their curves and ordinary log-rank.
- With more than two groups, require explicit selection of exactly two distinct nonempty groups for the comparison view. Show included/excluded counts and group labels. Recompute every related comparison curve, table, and test from the same subset.
- Retain a separately labeled pooled view if useful; never silently display a full-data curve beside a subset-only test.

Uploaded data stays in browser memory and is not sent to a server or analytics endpoint. Do not place raw records or identifiers in URLs, repository files, or persistent browser storage by default. Provide Clear data. This is a static educational application, not a hosted data-management service.

## 5. Statistical computation

Keep statistical functions pure and independent of React, chart libraries, and the DOM. Each method returns a trace and a structured result/status, not just a final number or plotted points.

### 5.1 Risk sets and tied times

Let X_i be observed follow-up and delta_i the event indicator. At every unique observed time t_j:

- Y_j = count of X_i >= t_j, immediately before t_j.
- d_j = count of X_i = t_j and delta_i = 1.
- c_j = count of X_i = t_j and delta_i = 0.

Use exact numeric equality for recorded ties. Do not silently round data or merge near ties. Sort internally without losing IDs or source rows. Apply events before removing that time's events and censorings from later risk sets.

### 5.2 Kaplan-Meier

S_KM(t) = product over t_j <= t of (1 - d_j / Y_j), starting with S(0-) = 1.

Return time, Y, d, c, factor, survival, and CI/status. Resolve risk-set member IDs for the selected time. Censoring-only times have factor 1. Censor marks at tied times appear at the post-event survival height.

Use log1p(-d/Y) for stable log-survival accumulation when d < Y. Handle d = Y explicitly: survival becomes zero. Keep the multiplication factors visible for teaching. Represent time-zero drops correctly. End each group's curve at its last follow-up; do not extrapolate a positive tail beyond observed support.

### 5.3 KM 95% pointwise intervals

Use Greenwood G(t) = sum d_j / [Y_j * (Y_j - d_j)] and the log-log transformation. For 0 < S < 1:

```text
z = 1.959963984540054
a = log(-log(S))
b = z * sqrt(G) / abs(log(S))
lower = exp(-exp(a + b))
upper = exp(-exp(a - b))
```

Provide a Show 95% pointwise CI switch. Explain that these intervals refer to individual times, rather than simultaneous coverage of an entire curve; derivation is not a required lesson.

At S = 1 and G = 0, return [1,1], with an explanation when no events have been observed that this does not establish certainty of future survival. At a terminal update d = Y, return S = 0 and null interval bounds with a boundary-unavailable status. Avoid division by zero and arbitrary epsilon clamping. Never leak NaN/Infinity into the interface or JSON fixtures.

### 5.4 Ordinary Nelson-Aalen

H_NA(t) = sum over t_j <= t of d_j / Y_j.

Return event-time increments and their cumulative sum, retaining zero increments at censor-only observation times for linked teaching. Use the same risk sets and event counts as KM. Ordinary NA is required; do not silently substitute the Fleming-Harrington tied-event correction.

In finite samples H_NA generally differs from -log(S_KM), and exp(-H_NA) differs from S_KM. A terminal KM value of zero can coexist with finite NA. For checks, exp(-H_NA) >= S_KM up to numerical tolerance. Distinguish the exact population identity H = -log(S) for the generating model from differences between sample estimators. NA confidence intervals are an extension.

### 5.5 Two-group log-rank

At pooled event times, define group risks Y_Aj,Y_Bj, events d_Aj,d_Bj, totals Y_j and d_j, and:

```text
E_Aj = d_j * Y_Aj / Y_j
E_Bj = d_j * Y_Bj / Y_j
V_j = Y_Aj * Y_Bj * d_j * (Y_j - d_j) / (Y_j^2 * (Y_j - 1))  if Y_j > 1
V_j = 0                                                       if Y_j = 1
U = sum(d_Aj - E_Aj)
V = sum(V_j)
Q = U^2 / V                                                   if V > 0
```

When V > 0, use an approximate chi-square distribution with one degree of freedom. Return every event-time contribution, cumulative score, group totals, Q, p, and estimability status. A group with zero events does not automatically invalidate the test. If V = 0, report Test not estimable with a reason; do not fabricate p = 1. No arbitrary minimum-event cutoff is required.

Compute p = erfc(sqrt(Q / 2)) using a direct, validated complementary-error routine, such as a version-locked browser-compatible stdlib implementation. A reused TrialSizer normal lower-tail routine is also acceptable if p = 2*Phi(-sqrt(Q)) passes the same tail tests. Do not subtract a nearly-one CDF from one. Q = 0 yields p = 1. Display very small probabilities in scientific notation or below a stated threshold, rather than as exact zero.

## 6. Weibull censoring simulator

The core experiment is one simulated cohort. It isolates how independent censoring changes observed information. It is not a repeated-study power/coverage experiment or a two-group effect simulator.

The following are concrete implementation defaults, rather than individually author-specified numerical preferences:

| Setting | Default | Allowed range or presets |
|---|---:|---|
| Sample size n | 100 | Integer 20-2,000 |
| Weibull shape k | 1 | 0.6: decreasing hazard; 1: constant; 2: increasing |
| Weibull scale eta | 20 | 5-50 time units |
| Independent dropout rate gamma | 0.02 | 0-0.2 per time unit |
| Administrative horizon tau | 24 | 1-100 time units |
| Seed | 6152026 | Integer 0 through 2^32-1 |

Use a documented, fixed seeded PRNG with separate event and dropout streams or stable indexed uniforms. Uniforms must lie strictly inside (0,1). Generate:

```text
T_i = eta * (-log1p(-U_event_i))^(1 / k)
D_i = -log1p(-U_dropout_i) / gamma       if gamma > 0
D_i = no-dropout sentinel               if gamma = 0
X_i = min(T_i, D_i, tau)
delta_i = 1 if T_i <= D_i and T_i <= tau, otherwise 0
S_true(t) = exp(-(t / eta)^k)
H_true(t) = (t / eta)^k
```

Treat the no-dropout sentinel as infinity internally only where safe; serialize an explanatory null/status if exported. Scale eta is the 63.2% event-time quantile, not the mean. Keeping eta fixed across shapes does not hold mean or median fixed. Expose a short explanation of the selected hazard shape. Do not evaluate instantaneous hazard at time zero for shape 0.6; no instantaneous-hazard plot is required.

### Controls and reproducibility

Provide sample size, shape scenario, scale, dropout intensity, follow-up horizon, seed, and Generate new sample. Group less central settings in a labeled settings panel if needed.

- Changing gamma or tau preserves all latent T_i exactly.
- Changing k or eta transforms the same event uniforms and is labeled a change in the event-time model.
- Changing n uses a stable prefix, preserving existing subjects and both streams. Do not generate n event draws followed by n dropout draws from a single mutable stream, which would move the dropout stream when n changes.
- Same seed and parameters reproduce identical records; generating a new sample updates the visible seed.

### Comparisons and explanations

Show realized complete-event empirical KM/NA and observed censored-data KM/NA as distinct labeled curves on the common displayed horizon. Make the known generating S/H available as optional reference overlays. Explain that complete latent times and model truth are available because these data were simulated; uploaded censored event times remain unknown.

Display the realized censoring fraction and distinguish dropout from administrative censoring. Gamma is a rate, not a guaranteed censoring percentage. Do not claim more censoring necessarily moves KM in one direction or monotonically widens a particular realized pointwise interval. Preserve the difference between the known population curve and the empirical complete-event curve.

## 7. Verified eight-subject teaching example

```csv
id,time,event,group
1,1,1,A
2,2,0,B
3,3,1,A
4,3,1,B
5,3,0,A
6,5,1,B
7,6,0,A
8,7,1,B
```

Pooled trace:

| Time | Y | d | c | KM factor | KM survival | NA increment | NA cumulative |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 8 | 1 | 0 | 7/8 | 7/8 | 1/8 | 1/8 |
| 2 | 7 | 0 | 1 | 1 | 7/8 | 0 | 1/8 |
| 3 | 6 | 2 | 1 | 2/3 | 7/12 | 1/3 | 11/24 |
| 5 | 3 | 1 | 0 | 2/3 | 7/18 | 1/3 | 19/24 |
| 6 | 2 | 0 | 1 | 1 | 7/18 | 0 | 19/24 |
| 7 | 1 | 1 | 0 | 0 | 0 | 1 | 43/24 |

The first two times demonstrate an event and a censoring. The first practice time includes two events and a tied censoring, so offer a hint to count risk-set members before removing anyone. The terminal time illustrates zero KM and finite NA.

Two-group log-rank trace, with A's score:

| Time | Y_A | Y_B | O_A | O_B | E_A | E_B | V contribution | Cumulative U_A |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 4 | 4 | 1 | 0 | 1/2 | 1/2 | 1/4 | 1/2 |
| 3 | 3 | 3 | 1 | 1 | 1 | 1 | 2/5 | 1/2 |
| 5 | 1 | 2 | 0 | 1 | 1/3 | 2/3 | 2/9 | 1/6 |
| 7 | 0 | 1 | 0 | 1 | 0 | 1 | 0 | 1/6 |

Totals: O=(2,3), E=(11/6,19/6), V=157/180, Q=5/157=0.0318471337579618, and approximate p=0.858363575666408. Group A's curve ends at time 6 at survival 0.5; do not extend it through B's time 7.

This fixture was checked during proposal design with R 4.4.2 and survival 3.8.6. That design check is not a claim that application tests or CI already exist.

## 8. Verification plan

### Independent references

Generate JSON reference fixtures with an R script in reference/, commit the script and fixtures, and record actual R/package versions and generation commands. Ordinary frontend CI uses committed fixtures and does not require R. Never edit expected numbers manually to accommodate a failing implementation.

For KM and NA use:

```r
fit <- survival::survfit(
  survival::Surv(time, event) ~ 1, data = dat,
  stype = 1, ctype = 1, robust = FALSE, timefix = FALSE,
  conf.type = "log-log", conf.int = 0.95
)
```

Validate time, risks, events, censorings, fit$surv, fit$cumhaz, and defined CI bounds. Grouped fits verify group traces. Use summary(fit, censored=TRUE) without a new requested times grid when comparing original observation-time counts. Raw fit$std.err and summary standard errors may use different scales; compare estimates and CI bounds directly unless the scale is explicitly named.

For log-rank use survival::survdiff(Surv(time,event) ~ group, data=dat, rho=0), then pchisq(Q, df=1, lower.tail=FALSE). Do not substitute the default Efron-ties Cox score test. Use integer-time fixtures for this public oracle so its near-tie preprocessing cannot alter the data. Explicit timefix=FALSE on survdiff produced a model-frame error in the package version used during planning; do not promise that untested call as a working fixture generator. Check behavior and record versions before expanding near-tie oracle fixtures.

Compare counts exactly; survival, NA, and defined CI bounds within absolute 1e-10; expected events, V, and Q within absolute-plus-relative tolerance 1e-9. Compare ordinary p-values within absolute 1e-10. For positive p < 1e-8 compare log(p) with absolute tolerance 1e-8 so an erroneous zero cannot pass. Include Q=0,1,3.841458820694124,10,50,100,500,1000,1400 for tail verification.

Verify Weibull inversion against qweibull with the same shape/scale and uniforms, dropout inversion against qexp, and generating survival against pweibull(..., lower.tail=FALSE). R and the browser need not use identical RNG algorithms; match deterministic uniforms when checking the transforms.

### Boundary and property tests

Cover all censored, all events, terminal KM=0, a positive tail ending in censoring, tied events, event/censor ties, censor-only times, time-zero events, one subject, unsorted rows, invalid fields, one/no/more-than-two groups, V=0, and one group with no events but positive V.

Check KM in [0,1] and nonincreasing, NA nondecreasing, censor-only updates unchanged, correct pre-time risk counts, permutation invariance, group-label symmetry of Q/p, and exp(-NA)>=KM within tolerance. Add at least 50 fixed-seed small/medium datasets with integer ties to R comparisons. Include direct exact-time checks for distinct, very close recorded times.

Simulator tests verify seed reproducibility, stable prefixes for n, unchanged latent T when only censoring changes, correct observed X/delta, and monotone shortening of dropout times as gamma increases with fixed uniforms. This last property must not be confused with monotonic movement of estimated curves. Check shape presets and gamma=0 without manufacturing ties by rounding continuous times.

### Focused interaction and final-upload tests

Verify the full eight-person walkthrough, correct/incorrect/fraction practice answers, hints and worked answers, synchronized time selection, interval switching, group selection, and simulator control behavior. For final upload, test renamed columns, 0/1 and 1/2 status mapping, single-status files, quoted CSV, bad rows, duplicate IDs, limits, missing groups, and an explicit two-of-many subset. Confirm excluded counts and all comparison estimates use that same subset. Verify that local data processing does not send records off-device.

CI must run lint, TypeScript checks, numerical tests, focused interaction tests, and production build before deployment. Benchmark the maximum supported dataset and test actual Pages base-path assets and refresh behavior. These are planned checks, not already completed application validation.

## 9. Architecture, performance, and hosting

Suggested structure:

```text
SPEC.md
README.md
AI_USAGE.md
LICENSE
src/stats/            validation, risk sets, KM/CI, NA, log-rank, distributions, simulation
src/components/       lesson, timelines, curves, tables, feedback, controls
src/state/            dataset source/revision, selected groups/time, simulator settings
src/import/           CSV parsing, explicit mapping, preview, validation report
src/worker/           only if performance measurements justify a worker
reference/            R generators and provenance
tests/fixtures/       committed JSON reference outputs
tests/                numerical and interaction checks
docs/dev-log.md       real session log and verification evidence
.github/workflows/    checks and GitHub Pages deployment
```

Use one canonical active dataset plus explicit subset and time selection. Build chart values from the validated numerical trace. A chart library may draw values but must not supply an uninspected replacement estimator. Use SVG or a library that handles step functions and censor marks faithfully.

Sort and sweep in O(n log n), with O(n) trace storage. Resolve risk-set membership for the selected time rather than materializing an O(n^2) matrix. Target under 300 ms for typical n<=2,000 recomputation on a documented development laptop; benchmark the 5,000-row final upload cap. If a worker is required, label pending state and ignore stale responses using request IDs. Measure before adding concurrency.

Set Vite base to /Boqian_Mao_BIOSTAT615_Survival_Project/. Use tabs or hash navigation that works on static hosting. Run GitHub Actions checks and deploy main only after they pass. Pin a supported Node version and lockfile. Document npm ci, npm run dev, npm test, npm run build, and R fixture regeneration. No paid server or runtime API is needed.

## 10. Milestones and acceptance

| Period in 2026 | Concrete result |
|---|---|
| Oct 31-Nov 6 | Final specification, scaffold/CI/early Pages build, verified eight-person fixture, risk-set/KM/NA core. |
| Nov 7-13 | Linked lesson, practice feedback, KM intervals, stepwise log-rank, R checks and boundary handling. |
| Nov 14-20 | Weibull censoring experiment, reference comparisons, seed controls, focused interaction and performance checks. |
| Nov 21-23 | Deploy and verify the required prototype; README/AI log, honest checkpoint report. |
| Nov 24-Dec 6 | CSV mapping/validation/exploration, two-of-many group handling, final upload tests, checkpoint feedback. |
| Dec 7-17 | Usability/accessibility/reproducibility pass, methods and source credits, final AI_USAGE.md and video. |

Checkpoint acceptance: a learner can complete the eight-person demonstration and practice, inspect the NA and log-rank traces, and vary censoring on a fixed simulated cohort. The prototype is deployed, CI passes, and its documented numerical outputs match hand/R references.

Final acceptance adds a successful differently named-column CSV import, explicit event recoding, useful row-level errors, a reproducible selected two-group comparison, browser-only processing, and the required repository/video/documentation deliverables.

## 11. Risks and development rules

- Timing/tie errors: validate the hand fixture before connecting plots and preserve the pre-time convention throughout.
- Confusing survival, hazard, and cumulative hazard: use separate labeled axes, distinguish generating truth from sample estimates, and preserve KM/exp(-NA) differences.
- Misleading censoring claims: keep latent times fixed, show realized censoring, and explain that independent censoring is a model/design condition.
- CI and tail errors: explicit boundary statuses, transformed pointwise intervals, and small-tail log checks.
- Upload misuse: explicit supported-data confirmation, coding preview, actionable validation, no silent row removal, and consistent subset counts.
- Scope/performance growth: complete required teaching and final upload work before extensions, and measure before adding workers or higher limits.

Develop with an agentic coding tool. Record each session's goal, meaningful prompts, changes, failures, corrections, and verification in docs/dev-log.md, and compile AI_USAGE.md from that real record. Do not invent historical prompts, tests, deployment success, user studies, or progress. Explain the method and verification in the final video.

Use small reviewable changes and appropriate checks. Investigate failures rather than weakening tolerances or editing fixtures to pass. Credit algorithms, dependencies, R references, data, and any reused TrialSizer code. Use an MIT license for new project code unless the author chooses otherwise; respect all reused-code licenses. Resolve material ambiguities through continued discussion and revise this AI-authored specification when required.

## 12. Primary references

- R survival data encoding: https://stat.ethz.ch/R-manual/R-devel/library/survival/html/Surv.html
- R KM/NA options: https://stat.ethz.ch/R-manual/R-devel/library/survival/html/survfit.formula.html
- Risk and curve timing: https://stat.ethz.ch/R-manual/R-devel/library/survival/html/summary.survfit.html
- Survival object quantities: https://stat.ethz.ch/R-manual/R-devel/library/survival/html/survfit.object.html
- KM interval implementation: https://stat.ethz.ch/R-manual/R-devel/library/survival/html/survfit_confint.html
- Log-rank: https://stat.ethz.ch/R-manual/R-devel/library/survival/html/survdiff.html
- Official implementations: https://github.com/therneau/survival/blob/master/src/survfitkm.c and https://github.com/therneau/survival/blob/master/src/survdiff2.c
- R Weibull: https://stat.ethz.ch/R-manual/R-devel/library/stats/html/Weibull.html
- R exponential: https://stat.ethz.ch/R-manual/R-devel/library/stats/html/Exponential.html
- R chi-square tail: https://stat.ethz.ch/R-manual/R-devel/library/stats/html/Chisquare.html
- Direct complementary error function: https://github.com/stdlib-js/math-base-special-erfc
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- TrialSizer technical reference: https://github.com/boqian-dot/Boqian_Mao_BIOSTAT615_Final_Project

## 13. Interview decision record

These are English summaries of the actual restarted interview, not verbatim quotations or claims that every implementation default was author-specified.

| Topic | Confirmed decision |
|---|---|
| Audience and entry goal | Graduate students with basic statistics, new to survival; independently work through risk sets/KM/censoring in an eight-person example. |
| KM interaction | First two observed times demonstrated; subsequent times use prediction, checking, and explanation. |
| Method breadth | KM, Nelson-Aalen cumulative hazard, and the two-group log-rank test. |
| NA/log-rank depth | Expose increments, expected/observed counts, variance contributions, and final results; full quizzes are not required there. |
| Upload workflow | User-selected CSV columns and explicit event/censoring code mapping. |
| Uploaded-data experience | Free exploration with time-specific calculations and group comparisons, without mandatory exercises. |
| Main simulation | Independent censoring, with latent event times fixed when censoring changes. |
| Simulation model | Weibull in the core; default shape 1, with decreasing/constant/increasing hazard scenarios. |
| Delivery order | Teaching and censoring simulator by checkpoint; CSV upload/mapping required in final version. |
| Architecture and verification | React/TypeScript/Vite, browser-side computation, GitHub Pages, hand/R fixtures and focused interaction tests. |
| Supported upload structure | Ordinary right censoring, one row per independent subject, one endpoint; explicit two-group selection when there are more groups. |
| Intervals | Switchable KM 95% pointwise intervals; NA point estimates in the core. |
| Separation and language | Separate survival repository; TrialSizer as a reference; all specification prose in English. |
