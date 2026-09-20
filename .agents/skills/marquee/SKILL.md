---
name: marquee
description: Implement and verify a continuous duplicated-track marquee with clipping, accessibility, responsive, and reduced-motion guarantees.
---

# Marquee

## Triggers

Obvious ticker/marquee evidence or a DESIGN_MODE continuous-motion decision.

## When to use / not to use

Use for continuous repeated content. Do not use for ordinary horizontal layout, essential controls, or decoration without evidence in REFERENCE_MODE.

## Evidence / preconditions

Plan the clipping viewport, moving track, complete original group, complete duplicate, and motion purpose.

## DOM / state contract

`viewport > track > original + duplicate`. The viewport clips and never owns the moving transform. The track uses its own measured content width. The duplicate is `aria-hidden="true"` and contains no focusable duplicate controls.

## Implementation principle

Prevent accidental flex shrink; move exactly one repeated-group width; avoid an empty reset frame. Extract a clone helper only after real repetition.

## Responsive behavior / touch behavior / accessibility

No document-level horizontal overflow. Do not require hover pause on touch. Duplicate announcements and interactive controls are forbidden.

## Prefers-reduced-motion

Stop the loop and leave readable original content visible.

## Known implementation traps

Animating the clipping wrapper, measuring the wrong element, incomplete duplication, transform conflicts, tiny content leaving a gap, inaccessible repeated links.

## Verification contract

Motion exists normally; track width covers a seamless repeat; duplicate is inaccessible; page has no horizontal overflow; reduced motion stops while content stays visible.

## Completion checklist / optional knobs

Verify desktop/mobile width, restart seam, reduced motion, and optional pause/slow behavior only when planned. Knobs: direction, speed, gap, planned pause behavior.
