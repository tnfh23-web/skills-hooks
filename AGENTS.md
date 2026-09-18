# Reference publishing project rules

- Treat the supplied reference as a web interface state; do not redesign it.
- Prefer project-local assets, fonts, and libraries. Do not add CDN dependencies by default.
- Do not claim completion without a real Chromium capture and visual verification.
- Keep visual QA artifacts under `qa/`, separate from source files.
- Preserve existing user files; make the smallest targeted change that improves the largest measured mismatch.
