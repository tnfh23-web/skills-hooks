# Reference publishing automation V1

This repository captures a local-first, measured Chromium workflow for publishing from a static reference.

## Workflow

1. Measure the immutable reference with `npm run qa:measure -- --reference path/to/reference.png --output work/reference-measurement.json`.
2. Create `work/reference-spec.json` with `npm run qa:spec -- --reference path/to/reference.png --capture-mode viewport|fullPage --viewport-width 1440 --viewport-height 900 --asset-root path/to/assets --manifest work/reference-manifest.json`.
3. Implement the page using the reference pixel coordinate space. In full-page mode the viewport stays fixed while Chromium captures the document with `fullPage: true`.
4. Run Visual QA, then geometry and responsive QA when the report marks those gates required:

```powershell
npm run qa -- --reference reference.png --url http://127.0.0.1:3000/ --capture-mode fullPage --width 1440 --height 900 --output qa --require-geometry --require-responsive
npm run qa:geometry -- --spec work/reference-spec.json --url http://127.0.0.1:3000/ --output qa/geometry-report.json
npm run qa:responsive -- --url http://127.0.0.1:3000/ --output qa/responsive-report.json
```

The reports include the measured reference coordinates, DOM `getBoundingClientRect()` values, `dx/dy/dw/dh`, source fingerprint, capture mode, interaction state before/after, and responsive findings. Generated artifacts stay under `qa/` or `work/`.

## Codex app Stop Hook

After changing source files, rerun QA before completion. If the hook is not active, reopen the project in Codex, trust/enable project hooks when prompted, reload the project, and run a small hook smoke test with `npm test` or `node .codex/hooks/stop-reference-publish.mjs`. The hook blocks stale PASS reports, failed visual/interaction checks, and required geometry/responsive gates.
