---
name: workflow-router
description: 완성된 시안 유무와 구현 요청을 근거로 Reference Publishing, Design and Publish, Design Only 중 하나를 선택한다.
---

# Workflow Router

이 라우터는 저장소의 최상위 작업 경로만 정한다. DOM 상호작용 패턴을 분류하는 기존 Interaction Router와 다르다.

## 절차

1. 사용자의 명시적 표현과 제공 파일에서 완성된 visual reference 유무, faithful implementation 요청, 구현 요청, design-only 요청을 확인한다.
2. `node tools/workflow-router.mjs`로 `work/workflow-route.json`을 만든다.
3. 아래 한 경로만 실행한다.

- 완성 reference + 충실한 구현 요청: `REFERENCE_PUBLISH` → 기존 `reference-publish`만 사용한다.
- 완성 reference 없음 + 구현 요청: `DESIGN_AND_PUBLISH` → `design-workflow` → `design-handoff` → 기존 `reference-publish`.
- design-only 요청: `DESIGN_ONLY` → `design-workflow` → `design-handoff` → 중지.

애매한 입력을 추측해 라우팅하지 않는다. 판단 근거는 `evidence`에 남기며, reference가 있는 faithful 구현을 새로 디자인하지 않는다.
