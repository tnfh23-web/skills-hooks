---
name: interaction-ready
description: Orchestrate interaction discovery, plan validation, pattern routing, semantic QA, motion QA, and final evidence gates for publishing work.
---

# Interaction ready

This is an entry/orchestration Skill, not an implementation recipe.

1. Confirm the static Visual QA baseline is stable enough that motion will not hide layout defects.
2. Use `interaction-design` and generate/review `work/interaction-plan.json`.
3. Validate it with `npm run qa:interaction-plan:validate -- --validate work/interaction-plan.json`.
4. Apply `animation-guide`; route only carousel/marquee to their Dedicated Skills.
5. Run Visual QA with `--interaction-plan work/interaction-plan.json --set-latest`; add `--require-motion` when the plan contains marquee or scroll-story.
6. Run semantic Interaction QA and Motion QA separately. Then run required Geometry/Responsive QA.
7. The Stop Hook owns only objective completion: canonical reports, PASS statuses, fingerprints, plan validity, and evidence for HIGH candidates.

No interactive candidates is valid. An intentionally skipped LOW reference candidate is valid. The hook never chooses an effect.
