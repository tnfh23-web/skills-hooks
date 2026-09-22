# Workflow routing

- Record the top-level route in `work/workflow-route.json` before implementation.
- A completed visual reference with a faithful implementation request uses the existing Reference Publishing workflow only.
- A request without a completed reference uses Design Workflow first; `DESIGN_ONLY` stops at frozen handoff and `DESIGN_AND_PUBLISH` continues through the existing Reference Publishing workflow.
- Design review artifacts belong under ignored `work/design/`. Never bypass existing Publishing QA or its Stop Hook.

# Reference publishing project rules

- Treat the supplied reference as a web interface state; do not redesign it.
- Prefer project-local assets, fonts, and libraries. Do not add CDN dependencies by default.
- Do not claim completion without a real Chromium capture and visual verification.
- Keep visual QA artifacts under `qa/`, separate from source files.
- Preserve existing user files; make the smallest targeted change that improves the largest measured mismatch.

# Design workflow project rules

- Build review prototypes only under `work/design/`; they are not production source.
- Require real Chromium desktop/tablet/mobile review before `DESIGN_READY`; unavailable review means `DESIGN_REVIEW_BLOCKED`.
- Freeze a passing design before handoff, then return design changes to Design Workflow instead of reinterpreting them during Publishing.
