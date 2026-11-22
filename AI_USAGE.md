# AI usage

This individual BIOSTAT 615 project is being developed with OpenAI Codex, an
agentic tool with access to the project files and terminal. The visible session
identifies the GPT-6 model family; its exact variant/build is not exposed.
The November 22 checkpoint session (verification, push preparation, and checkpoint
report) used Claude Code with Claude Opus 5.5; see `docs/dev-log.md`.

## How agents are used

The author directed a question-by-question design interview, selected the
teaching goals and scope, and asked the agent to generate `SPEC.md`. During
implementation the coordinating agent delegates bounded statistics, interface,
and CSV tasks, then integrates and checks the results. Agents can write files,
run R and automated checks, and revise failures; this is an agentic workflow.

## Human decisions and verification

The author chose the learner audience, eight-person guided practice, stepwise
KM/NA/log-rank explanations, independent-censoring simulation, Weibull scenarios,
CSV column mapping, method/data restrictions, GitHub Pages, and checkpoint/final
priorities. `SPEC.md` distinguishes these choices from implementation defaults.

Verification uses independent hand calculations and R survival fixtures rather
than accepting AI output on appearance. The development log will record actual
test results, failures, corrections, and publication status. The author is
responsible for understanding the shipped statistical methods and explaining
their verification in the final video.

## Failures and course corrections

- Earlier proposal planning was restarted with the author's detailed English
  prompt so the proposal can truthfully retain the first prompt of that session.
- The local directory initially inherited a different Git repository. It was
  isolated before staging or committing project source.
- Node was absent on PATH; a verified project-local runtime was required.
- An R reference-call issue with explicit `survdiff(timefix=FALSE)` was observed;
  the fixture strategy documents the working integer-time oracle.

See `docs/dev-log.md` for the chronological record. This document will be updated
as development proceeds; it does not claim unperformed tests or a finished demo.

## First implementation evidence

The first integrated version passed `npm run check`: ESLint, strict TypeScript,
179 tests (151 statistics, 20 import, 8 UI), and production build. R fixture
regeneration was byte-identical. Browser inspection exposed an early-answer leak
in the lesson, which was fixed and regression-tested. Dependency audit findings
in a development glob-matcher were resolved with a tested patched override.

The actual restarted English prompt is retained in `docs/prompts.md`. Subsequent
Chinese instructions and agent assignments are summarized in English and labeled
as summaries rather than fabricated verbatim quotations. The log distinguishes
local verification from remote publication and uncompleted course deliverables.
