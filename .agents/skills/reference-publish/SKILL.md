---
name: reference-publish
description: Build and verify a web interface from a static design reference using a measured Chromium visual-QA repair loop. Use when the user provides a design screenshot, local assets/fonts, or asks for screenshot-faithful publishing. Do not use for general web work without a visual reference.
---

# Reference publishing V1

Reconstruct the intended web interface while preserving reference fidelity. The reference is a state of a real website, not a reason to invent a new design.

## Required loop

1. **SEE** — inspect the reference, available local assets, fonts, and any existing page before coding.
2. **INFER** — implement only interactions that are clear or strongly implied by visible affordances. If evidence is absent, do not invent behavior. Before coding, create `work/reference-spec.json` with reference pixel dimensions, capture mode, viewport dimensions, sections, asset inventory, typography/fallback notes, and major elements. Prefer source-provided bounds; otherwise use `npm run qa:measure` and lower confidence only where deterministic measurement is unavailable.
3. **BUILD** — implement HTML/CSS/JS using local resources first. Match typography, wrapping, dimensions, spacing, crop, positioning, color, borders, radius, alignment, and z-order. Exact pixel corrections are acceptable.
4. **CAPTURE** — run the repository Visual QA command against a fixed Chromium viewport. Choose `viewport` for a single-screen reference or `fullPage` for a long document reference. It waits for fonts, images, and layout stability and disables motion for the comparison capture. A long reference image does not become the browser viewport height.
5. **COMPARE / DIAGNOSE** — inspect `qa/report.json`, `qa/actual.png`, and `qa/diff.png`. Use the reported largest mismatch regions and DOM labels to choose one high-impact cause. Compare reference pixel coordinates to Chromium document coordinates with `npm run qa:geometry`; it records `dx/dy/dw/dh` and only non-null typography expectations are asserted. Use `npm run qa:responsive` at 1024×768 and 390×844 for structural checks; internal carousel overflow is exempt when it is part of the existing slider structure.
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

Use `--capture-mode viewport` (the default) for a one-screen reference, or `--capture-mode fullPage` with `--width` and `--height` set to the browser viewport for a long reference:

```powershell
npm run qa -- --capture-mode fullPage --reference path/to/long-reference.png --url http://127.0.0.1:3000/ --width 1920 --height 1080 --output qa
```

The reference and actual capture must have exactly the same width and height. A dimension mismatch is a FAIL; never resize the reference to hide it. In `fullPage` mode, the page still renders in the configured viewport and only the screenshot extends to the document height. The runner records reference, viewport, document, actual screenshot dimensions, and `captureMode`. It writes `qa/actual.png`, `qa/diff.png`, `qa/overlay.png`, `qa/mask.png`, and `qa/report.json`.

`report.json` is evidence, not an opinion. It contains dimensions, mismatch pixel count/ratio, largest regions, DOM overlap hints, the tolerance decision and observed threshold values, status, and human-readable failure reasons. Matching dimensions are mandatory; a small mismatch ratio can PASS only when no meaningful/large region exceeds the per-region tolerance. Treat antialiasing noise as low-value only when the artifacts and numbers support that conclusion; do not self-declare PASS.

`work/reference-spec.json` stays in reference pixel space. Do not fill bounds with visual guesses when a deterministic PNG/source measurement is available. For full-page references, preserve document `y` coordinates; never turn the reference height into the browser viewport height.

For pages with clearly detectable controls, the runner performs low-risk focus/hover checks, clicks stateful tabs, summaries, `aria-expanded` toggles, and marked pagination/slider/menu controls, then compares observable before/after state. It records the control type, click-before state, click-after state, status, and failure reason in `qa/interaction-report.json`. Navigation links are treated as successful navigation and are not forced into a same-page state assertion. Use `--no-interaction-qa` only when the page has no required interaction and document that choice in the task summary.

## Stop gate

Before saying the task is complete, ensure the latest `qa/report.json` is PASS and, when interaction QA is required, `qa/interaction-report.json` is PASS. When `qualityGates.geometryRequired` or `qualityGates.responsiveRequired` is true, the corresponding reports must also be PASS. The source fingerprint must match the latest report. If a gate fails, inspect the artifacts, fix the largest remaining mismatch, and run verification again. In Codex app, reopen/reload or trust project hooks if needed, then run a hook smoke test before completion.

## V1 boundaries

Do not add planner/evaluator/coder subagents, routers, state managers, font extraction, PSD parsing, deploy workflows, or a large interaction recipe library. Add capability only after a benchmark demonstrates the need.
