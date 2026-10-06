---
name: interaction-ready
description: 구현된 화면의 상호작용 QA 계약, 패턴 검증과 퍼블리싱 완료 gate를 조율한다.
---

# 상호작용 준비 오케스트레이션

구현 recipe가 아니라 진입 순서를 관리하는 Skill이다.

1. 비교할 정적 상태를 정한다. 새 디자인의 콘텐츠별 인터랙션은 구현 전에 `frontend-experience`로 계획하며, 이 검증 단계가 끝날 때까지 모션 설계를 미루지 않는다.
2. `interaction-plan`으로 QA 후보를 발견하고 `tools/interaction-authoring.mjs`가 만든 `interactionLanguage`, `actionableAuthoring`, `interactionComposition`, candidate별 authoring(policy, intent, family, primitive)을 검토한 뒤 `work/interaction-plan.json`을 확정한다. DESIGN_MODE에는 직접 작성한 motion language가 필요하다. `coverage.actionable`와 authoring selector가 연결됐는지, element 수 기준 anti-generic validator가 적용됐는지, 네 composition role이 존재하며 continuous-only가 아닌지 확인한다.
3. `npm run qa:interaction-plan:validate -- --validate work/interaction-plan.json`으로 검증한다.
4. `tools/interaction-patterns.mjs` 레지스트리에 따라 공통 recipe 또는 전용 Skill로 보낸다.
5. 외부 target이면 모든 QA에 `--source-root <target-project>`를 명시하고, Visual QA에 `--interaction-plan ... --set-latest`를 사용한다. 모션 후보가 있으면 Motion QA를 실행한다.
6. Interaction/Motion/Geometry/Responsive QA를 필요한 범위에서 각각 실행한다. Plan 실행에서는 actionable coverage가 hover, keyboard focus-visible, perceptibility, native/verified click behavior를 모두 기록해야 한다.
7. Stop Hook은 PASS, canonical source root, 지문 최신성, plan 유효성, HIGH 후보 검증 증거, required geometry/responsive gate와 interaction coverage를 판정한다. 의도적 clipping은 `data-qa-allow-clipping`과 report의 `allowedClipping`으로 명시한다.

후보가 없는 것도 유효하고 REFERENCE_MODE의 LOW 후보를 의도적으로 skip하는 것도 유효하다. Motion QA 계약이 없는 후보는 deferred이지 PASS가 아니다.
