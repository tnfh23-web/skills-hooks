---
name: carousel-state
description: Implement and verify carousels whose slide, counter, pagination, progress, thumbnails, and ARIA state must remain synchronized.
---

# Carousel state

## Triggers

Repeated/clipped slides plus prev/next, pagination, counter, progress, thumbnails, or active state.

## When to use / not use

Use when two or more state projections derive from one carousel index. Do not use for a static gallery or a lone decorative horizontal row without controls/evidence.

## Evidence / preconditions

Record visible affordances in `interaction-plan.json` and identify root, slides, controls, and every state projection.

## DOM / state contract

One zero-based `index` is the source of truth. Active slide, one-based current counter, total, pagination, progress, thumbnail, `aria-current`, and `aria-selected` derive from it. Never use a QA-only marker as proof.

## Implementation principle

Change index once, render all projections from it, and let the carousel/library retain transform ownership.

## Responsive behavior / touch behavior / accessibility

Controls stay reachable. Swipe may supplement buttons on touch but must update the same index. Give controls names; expose current state semantically; manage focus only when user-initiated behavior requires it.

## Prefers-reduced-motion

Disable autoplay/large transition motion while keeping manual navigation and synchronized state.

## Known implementation traps

Independent counters, duplicated active classes, hidden desktop/mobile instances both running, library transforms overwritten, autoplay racing QA.

## Verification contract

After navigation, active slide equals counter equals pagination equals progress/thumbnail where present. Any partial update is FAIL.

## Completion checklist / optional knobs

Verify next, previous/boundary behavior, keyboard/touch as applicable, responsive conversion, reduced motion, and no overflow. Optional knobs: wrap, autoplay, transition duration, swipe threshold; none may create a second state owner.
