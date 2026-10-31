# Development log

## October 31 2026 — Proposal and first implementation

### Author direction and scope

The author restarted the design interview with the English prompt retained in
`PROPOSAL_GOOGLE_DOC.txt` (local proposal content) and answered one question at a
time. The resulting AI-authored `SPEC.md` records the actual confirmed decisions.
The author then asked to begin work, follow the project requirements, and connect
the separate survival repository. This paragraph summarizes that instruction in
English; it is not a verbatim quotation of the original Chinese message.

### Work in progress

- Verified the empty public survival repository.
- Found that the local directory inherited an unrelated home-directory Git
  repository; created an isolated Git repository in the survival directory.
- Found no Node executable on PATH; requested a project-local Node 24 runtime
  downloaded from the official Node.js distribution and checked its SHA-256.
- Split bounded work among agents: statistical core/R fixtures, React teaching
  interface, and CSV parsing/mapping. The coordinating agent owns integration,
  build configuration, documentation, tests, and deployment setup.
- Added project scaffolding and an MIT license. Third-party course handouts and
  the local proposal text are excluded from the public source tree.

### Design verification already performed

R 4.4.2 and survival 3.8.6 reproduced the eight-subject pooled KM/ordinary NA trace
and log-rank Q = 5/157, p approximately 0.858363575666408. Weibull inverse transforms
were checked against R quantiles. A public `survdiff(timefix=FALSE)` call produced
a package model-frame error; the integer-time log-rank reference uses the working
public default call, where near-tie processing does not alter the times.

### Verification to finish before reporting success

Install locked dependencies; run lint, TypeScript checks, numerical/R-fixture and
CSV tests, linked-view interaction tests, production build, and browser review.
Record actual results below. A written plan is not evidence that an app check or
remote deployment has passed.

### First implementation verification

- Installed Node 24.22.2 in ignored `.tools/` after official SHA-256 verification;
  dependencies are version-pinned and recorded in package-lock.json.
- First lint run identified published numerical coefficients with more decimal
  digits than an IEEE754 number. The agent preserved their full source strings
  and used explicit Number conversion; it did not weaken lint or test tolerances.
- Browser inspection identified an answer leak: demonstration tables exposed
  future practice values, and jumping ahead could expose skipped curve steps.
  Per-row reveal state and a contiguous worked curve prefix fixed both, with a
  regression test for initial display, isolated reveal, skip, solve, and reset.
- Final `npm run check` passed: ESLint, strict TypeScript, **179 tests in 6 files**,
  and production build. Test split: 151 statistical, 20 import, 8 UI interactions.
- R fixture regeneration was checked for byte-identical output. The numerical
  references include 184 pooled/group curve comparisons and 57 estimable log-rank
  comparisons; the independent C harness verifies the PRNG transition/jump.
- npm initially reported 11 moderate findings, all from a transitive development
  minimatch issue (GHSA-g3hv-75wg-m249). A locked override to the patched 11.0.1
  passed the full checks; the ensuing online install audit reported 0 findings.
  No force downgrade or unchecked audit fix was used.
- Local Vite HTTP response and the repository base path were verified. The KM
  page was visually inspected in Chrome; other module states and CSV end-to-end
  exploration were covered by interaction tests. A final importer integration
  review found no substantive issue.
- The author confirmed that the separate final-submission guidelines have not
  yet been released. Continue following the currently published requirements and
  review those guidelines when available.

### Publication state at time of this entry

Source is ready for its first commit/push. The GitHub connector can read the
repository but has no write permission on this connection; publication will use
the user's local Git configuration if authenticated. Remote push, Actions, and
Pages success must be verified separately and recorded after they occur.
