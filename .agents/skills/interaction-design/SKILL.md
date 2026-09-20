---
name: interaction-design
description: Discover and plan evidence-based interaction and motion after a static publishing baseline is stable. Use for reference-driven controls, interaction planning, or intentional DESIGN_MODE motion composition.
---

# Interaction design

Decide **what** should interact, **why**, and which recipe fits. Do not become a snippet catalog.

## Modes and evidence

- `reference`: reference state, annotation, or DOM affordance is authority. HIGH may be required; MEDIUM gets conservative semantic behavior; LOW must use `implementation: "skip"`. Never invent decorative motion.
- `design`: derive one page-level motion language before selecting effects. Use two to four coherent families and state each purpose. Avoid generic card lift, repeated scale/shadow/glow, arbitrary arrows/pills, and all-sections fade-up.

Run `npm run qa:interaction-plan -- --url <page> --mode reference|design --output work/interaction-plan.json`. Review the generated evidence; do not add a candidate without an observable fact. Keep `work/interaction-plan.json` as the only interaction SSOT.

## Routing

- tabs, accordion, drawer: semantic recipes in the shared guide.
- carousel with slide/counter/pagination/progress/thumbnail synchronization: use `carousel-state`.
- duplicated continuous track: use `marquee`.
- hover, reveal, scene, pin/scrub, parallax: keep as guide recipes until repeated benchmarks justify promotion.

Every candidate defines responsive and reduced-motion behavior plus a machine-checkable verification contract. Essential content may not depend on hover or JS animation to exist.
