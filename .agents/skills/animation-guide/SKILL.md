---
name: animation-guide
description: Apply shared local-first implementation rules for planned interaction and motion without compromising static reference fidelity.
---

# Animation guide

Use only after the static reference baseline is sufficiently stable and `work/interaction-plan.json` validates.

## Shared rules

- Inspect local libraries/helpers first. Reuse them; install locally only when justified. Never inject a public CDN by default.
- Separate layout transform ownership from motion transform ownership with wrappers. Do not overwrite transforms owned by a carousel/library.
- Do not copy the previous section's animation and only swap selectors. Choose from semantic intent.
- Do not animate a hidden responsive branch. Recompute dynamic measurements on resize/refresh.
- Render essential content safely before JavaScript; motion enhances it.
- Hover cannot be the only path to essential information; preserve keyboard and touch access.
- Define `prefers-reduced-motion`: stop loops/scrub/parallax or expose a final safe state while preserving controls.
- Keep continuous loops separate from scroll timelines. Visual QA stabilizes motion; Motion QA tests active behavior separately.
- Never trade motion for reference fidelity.

## Recipes kept here

- hover emphasis/reveal: observable pointer/focus state, reversible leave where intended, mobile essential-content fallback.
- scroll reveal: safe initial content, reachable final content; do not repeat fade-up everywhere.
- scroll story/pin-scrub: measurable start/intermediate/final states, runtime-measured distances, released final pin.
- scene transition/parallax: use only with compositional evidence; preserve readable final state and responsive branches.

## Units

For newly generated pages set `html { font-size: 62.5%; }` and prefer rem (`1rem = 10px`) for CSS dimensions, spacing, typography, radius, and motion distance. Reference/QA coordinates, runtime browser measurements, and physical hairlines remain px. Do not mass-convert an existing page.
