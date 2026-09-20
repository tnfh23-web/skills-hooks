---
name: interaction-ready
description: 상호작용 발견, plan 검증, 패턴 라우팅, 의미 QA, 모션 QA, 최종 증거 gate를 순서대로 조율한다.
---

# 상호작용 준비 오케스트레이션

구현 recipe가 아니라 진입 순서를 관리하는 Skill이다.

1. 정적 Visual QA 기준선이 안정됐는지 확인한다.
2. `interaction-design`으로 후보를 발견하고 `work/interaction-plan.json`을 검토한다.
3. `npm run qa:interaction-plan:validate -- --validate work/interaction-plan.json`으로 검증한다.
4. `tools/interaction-patterns.mjs` 레지스트리에 따라 공통 recipe 또는 전용 Skill로 보낸다.
5. Visual QA에 `--interaction-plan ... --set-latest`를 사용하고 모션 후보가 있으면 Motion QA를 실행한다.
6. Interaction/Motion/Geometry/Responsive QA를 필요한 범위에서 각각 실행한다.
7. Stop Hook은 PASS, 지문 최신성, plan 유효성, HIGH 후보 검증 증거만 판정한다.

후보가 없는 것도 유효하고 REFERENCE_MODE의 LOW 후보를 의도적으로 skip하는 것도 유효하다. Motion QA 계약이 없는 후보는 deferred이지 PASS가 아니다.
