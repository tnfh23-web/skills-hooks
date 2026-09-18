---
name: reference-publish
description: Build and verify a web interface from a static design reference using a measured Chromium visual-QA repair loop. Use when the user provides a design screenshot, local assets/fonts, or asks for screenshot-faithful publishing. Do not use for general web work without a visual reference.
---

# Reference publishing V1

Reconstruct the intended web interface while preserving reference fidelity. The reference is a state of a real website, not a reason to invent a new design.

## Required loop

1. **SEE** — inspect the reference, available local assets, fonts, and any existing page before coding.
2. **INFER** — implement only interactions that are clear or strongly implied by visible affordances. If evidence is absent, do not invent behavior.
3. **BUILD** — implement HTML/CSS/JS using local resources first. Match typography, wrapping, dimensions, spacing, crop, positioning, color, borders, radius, alignment, and z-order. Exact pixel corrections are acceptable.
4. **CAPTURE** — run the repository Visual QA command against a fixed Chromium viewport. It waits for fonts, images, and layout stability and disables motion for the comparison capture.
5. **COMPARE / DIAGNOSE** — inspect `qa/report.json`, `qa/actual.png`, and `qa/diff.png`. Use the reported largest mismatch regions and DOM labels to choose one high-impact cause.
6. **REPAIR** — change the smallest related scope, then capture and compare again. Record before/after mismatch numbers when useful. Do not rewrite the whole page because one region is wrong.
7. **VERIFY** — run visual QA again after the final change. If interactive controls are present, run the built-in low-risk interaction checks too.

## Interaction inference

- Clear affordance: implement it.
- Strongly implied by arrows, pagination, active states, clipped repeated content, hamburger, plus/minus, thumbnails, or similar cues: implement the most natural minimal web behavior.
- No evidence: do not add a feature merely because it is common.
- Give visible controls natural hover, focus-visible, and active states derived from the reference language. Avoid generic lift, glow, scale, or identical easing everywhere.

## Visual QA contract

Run:

```powershell
npm run qa -- --reference path/to/reference.png --url http://127.0.0.1:3000/ --output qa
```

The reference and actual capture must have exactly the same width and height. A dimension mismatch is a FAIL; never resize the reference to hide it. The runner fixes Chromium, viewport, device scale factor, font/image readiness, and motion state. It writes `qa/actual.png`, `qa/diff.png`, `qa/overlay.png`, `qa/mask.png`, and `qa/report.json`.

`report.json` is evidence, not an opinion. It contains dimensions, mismatch pixel count/ratio, largest regions, DOM overlap hints, status, and failure reasons. Treat antialiasing noise as low-value only when the artifacts and numbers support that conclusion; do not self-declare PASS.

For pages with detectable controls, the runner performs low-risk focus/hover checks and records `qa/interaction-report.json`. Use `--no-interaction-qa` only when the page has no required interaction and document that choice in the task summary.

## Stop gate

Before saying the task is complete, ensure the latest `qa/report.json` is PASS and, when interaction QA is required, `qa/interaction-report.json` is PASS. If either fails, inspect the artifacts, fix the largest remaining mismatch, and run QA again. The project Stop Hook enforces this gate; it does not make design judgments.

## V1 boundaries

Do not add planner/evaluator/coder subagents, routers, state managers, font extraction, PSD parsing, deploy workflows, or a large interaction recipe library. Add capability only after a benchmark demonstrates the need.
