# Reference publishing automation V1

This repository captures a local-first, measured Chromium workflow for publishing from a static reference.

## Workflow

1. Measure the immutable reference with `npm run qa:measure -- --reference path/to/reference.png --output work/reference-measurement.json`.
2. Create `work/reference-spec.json` with `npm run qa:spec -- --reference path/to/reference.png --capture-mode viewport|fullPage --viewport-width 1440 --viewport-height 900 --asset-root path/to/assets --manifest work/reference-manifest.json`.
3. Implement the static page using the reference pixel coordinate space. In full-page mode the viewport stays fixed while Chromium captures the document with `fullPage: true`.
4. After the static baseline is stable, discover and review the single interaction SSOT. REFERENCE_MODE requires evidence; DESIGN_MODE additionally requires a page-level motion language:

```powershell
npm run qa:interaction-plan -- --url http://127.0.0.1:3000/ --mode reference --output work/interaction-plan.json
npm run qa:interaction-plan:validate -- --validate work/interaction-plan.json
```

5. Run Visual QA, semantic Interaction QA, Motion QA when required, then geometry and responsive QA:

```powershell
npm run qa -- --reference reference.png --url http://127.0.0.1:3000/ --capture-mode fullPage --width 1440 --height 900 --output qa --interaction-plan work/interaction-plan.json --require-motion --require-geometry --require-responsive --set-latest
npm run qa:interaction -- --url http://127.0.0.1:3000/ --plan work/interaction-plan.json --output qa/interaction-report.json
npm run qa:motion -- --url http://127.0.0.1:3000/ --plan work/interaction-plan.json --output qa/motion-report.json
npm run qa:geometry -- --spec work/reference-spec.json --url http://127.0.0.1:3000/ --output qa/geometry-report.json
npm run qa:responsive -- --url http://127.0.0.1:3000/ --output qa/responsive-report.json
```

The reports include measured reference coordinates, DOM `getBoundingClientRect()` values, `dx/dy/dw/dh`, fingerprints, capture mode, semantic before/after state, deterministic motion samples, and responsive findings. `--set-latest` writes `qa/latest-run.json`, so the Stop Hook gates the selected output even when it is an alternate directory. Generated artifacts stay under `qa/` or `work/`.

Interaction planning uses two modes. `reference` implements HIGH-evidence controls, keeps MEDIUM behavior conservative, and skips LOW guesses. `design` first defines a coherent motion language. Newly generated pages use `html { font-size: 62.5%; }` so CSS follows `1rem = 10px`; reference/QA coordinates remain px. Dependencies are local-first and no CDN is injected by default.

## Codex app Stop Hook

After changing source files, rerun QA before completion. If the hook is not active, reopen the project in Codex, trust/enable project hooks when prompted, reload the project, and run a small hook smoke test with `npm test` or `node .codex/hooks/stop-reference-publish.mjs`. The hook resolves the canonical run and blocks stale PASS reports, invalid/stale interaction plans, missing evidence for HIGH candidates, failed visual/interaction/motion checks, and required geometry/responsive gates. It does not choose creative effects.
