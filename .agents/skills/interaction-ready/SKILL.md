---
name: interaction-ready
description: 상호작용 발견, plan 검증, 패턴 라우팅, 의미 QA, 모션 QA, 최종 증거 gate를 순서대로 조율한다.
---

# 상호작용 준비 오케스트레이션

구현 recipe가 아니라 진입 순서를 관리하는 Skill이다.

1. 정적 Visual QA 기준선이 안정됐는지 확인한다.
2. `interaction-design`으로 후보를 발견하고 `tools/interaction-authoring.mjs`가 만든 `interactionLanguage`, `actionableAuthoring`, `interactionComposition`, candidate별 authoring(policy, intent, family, primitive)을 검토한 뒤 `work/interaction-plan.json`을 확정한다. `coverage.actionable`와 authoring selector 연결, anti-generic validator, primary/continuous composition을 확인한다.
3. `npm run qa:interaction-plan:validate -- --validate work/interaction-plan.json`으로 검증한다.
4. `tools/interaction-patterns.mjs` 레지스트리에 따라 공통 recipe 또는 전용 Skill로 보낸다.
5. 외부 target이면 모든 QA에 `--source-root <target-project>`를 명시하고, Visual QA에 `--interaction-plan ... --set-latest`를 사용한다. 모션 후보가 있으면 Motion QA를 실행한다.
6. Interaction/Motion/Geometry/Responsive QA를 필요한 범위에서 각각 실행한다. Plan 실행에서는 actionable coverage가 hover, keyboard focus-visible, perceptibility, native/verified click behavior를 모두 기록해야 한다.
7. Stop Hook은 PASS, canonical source root, 지문 최신성, plan 유효성, HIGH 후보 검증 증거, required geometry/responsive gate와 interaction coverage를 판정한다. 의도적 clipping은 `data-qa-allow-clipping`과 report의 `allowedClipping`으로 명시한다.

후보가 없는 것도 유효하고 REFERENCE_MODE의 LOW 후보를 의도적으로 skip하는 것도 유효하다. Motion QA 계약이 없는 후보는 deferred이지 PASS가 아니다.
