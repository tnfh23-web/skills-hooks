---
name: design-handoff
description: Design Workflow의 Chromium review와 계약을 검증해 frozen DESIGN_READY 패키지로 만들고 요청 경로에 따라 종료하거나 기존 Publishing Workflow에 전달한다.
---

# Design Handoff

1. critic와 audit가 PASS이고 blocking issue가 해결됐는지 확인한다. `DESIGN_REVIEW_BLOCKED`나 3회 초과를 우회하지 않는다.
2. `node tools/design-handoff.mjs --route DESIGN_ONLY|DESIGN_AND_PUBLISH`로 frozen handoff 후보를 만든다.
3. `node tools/design-gate.mjs --design-dir work/design`을 실행한다. gate가 `DESIGN_READY`가 아니면 후보 handoff를 사용하지 않는다.
4. `DESIGN_ONLY`면 산출물 위치를 보고하고 멈춘다.
5. `DESIGN_AND_PUBLISH`면 `--for-publishing` gate도 확인하고 desktop review를 primary visual reference로 기존 `reference-publish`에 전달한다. tablet/mobile과 design plan은 responsive intent다.
6. Publishing 단계는 frozen design을 재해석하지 않으며 기존 Visual/Geometry/Responsive/Interaction/Motion QA와 Stop Hook을 전부 유지한다.

Handoff 생성 후 Publishing용 gate는 `node tools/design-gate.mjs --design-dir work/design --for-publishing`으로 확인한다.
