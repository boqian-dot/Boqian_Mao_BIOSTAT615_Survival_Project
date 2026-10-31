# Selected prompts and decisions

This file retains the actual English kickoff prompt used for the restarted design
interview. Later summaries are labeled as summaries, not reconstructed quotations.
A complete transcript is not claimed or required by the currently supplied course
instructions. AI_USAGE.md and docs/dev-log.md explain the actual workflow.

## Restarted interview prompt — verbatim

```text
I'm working on my BIOSTAT 615 Fall 2026 final project (Track A: Interactive Web Application). I want to build an interactive educational tool called **Survival Explorer**, focusing on survival analysis, particularly Kaplan-Meier estimation, right censoring, and the two-group log-rank test.
My goal is to create a website where users can interact with survival datasets, visualize Kaplan-Meier survival curves, understand how censoring affects survival estimates, and explore the statistical calculations behind these methods. I would also like to include a simulation feature that allows users to change parameters and observe their effects.
Before we start coding, I want you to **grill me with detailed questions** about my project. Ask me questions about the main features, statistical methods, user interactions, technical requirements, testing, deployment, and potential limitations. Help me identify anything I might have overlooked and distinguish essential features from optional extensions.
Please ask follow-up questions whenever my answers are unclear, rather than making assumptions. Once we have established a clear project scope, help me create a detailed `SPEC.md` that can guide an AI coding agent through implementation.
I previously worked on a sample-size calculation project called TrialSizer, which can serve as a technical reference, but I want this survival analysis project to remain separate.
```

## Implementation direction — English summary

The author asked the agent to begin work, follow every published project
requirement, and use the separately created survival repository. The original
message was in Chinese; this is an English paraphrase, not a literal quotation.
When asked about the separate final-submission guidelines, the author confirmed
that they had not been released yet and directed development to continue.

## Agent task boundaries — summaries

- Statistical agent: implement pure KM/CI, ordinary NA, log-rank, stable seeded
  Weibull censoring, safe practice checking, and genuine R/C references.
- Interface agent: implement the linked teaching views and SVG curves/timelines,
  practice feedback, simulator controls, and uploaded-data exploration.
- Import agent: implement explicit CSV column/status mapping, structural
  validation, preview, single-status handling, and memory-only clearing.
- Coordinating agent: isolate Git state, configure dependencies and hosting,
  integrate the pieces, run checks, inspect browser output, and maintain evidence.

## Corrective direction — summaries

Preserve full published numerical coefficients with deliberate IEEE754 conversion
rather than truncating source values or weakening lint/test rules. Keep practice
answers hidden until that particular row is solved or explicitly revealed, and
prevent jumping ahead from exposing skipped curve updates. Regression tests were
added for those lesson states. Numerical tolerances were not weakened.
