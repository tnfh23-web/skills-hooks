---
name: interaction-design
description: 정적 기준선 이후 근거 기반 상호작용과 모션을 발견하고 분류하며 단일 interaction plan을 작성한다.
---

# 상호작용 설계

무엇이 왜 움직여야 하는지 결정한다. 코드 조각 모음이 아니다.

## 모드와 근거

- `reference`: reference state, source annotation, DOM affordance가 권위다. HIGH는 required, MEDIUM은 conservative, LOW는 `skip`한다.
- `design`: 효과 전에 페이지 단위 motion language를 정한다. 성격, 속도, 선호/금지 family, section entry 변주, pointer/continuous/scroll 원칙을 모두 기록한다.

`npm run qa:interaction-plan -- --url <page> --mode reference|design --output work/interaction-plan.json`을 실행하고 근거를 검토한다. `work/interaction-plan.json`만 SSOT로 유지한다.

## 라우팅

- 상태 전이: tabs, accordion, dropdown, drawer, menu, carousel → Interaction QA
- 포인터: hover reveal은 Interaction QA, pointer reactive/cursor/speed는 Motion QA의 deferred
- 지속 모션: marquee는 자동 Motion QA, 나머지는 계약 유무에 따라 deferred
- 스크롤 모션: sample selector와 진행 상태 계약이 있으면 Motion QA, 없으면 deferred
- advanced: canvas/WebGL은 현재 manual/unsupported

전용 Skill은 carousel, marquee, pin/scrub, scene transition, split text reveal, horizontal pin scroll에만 둔다. 단순 reveal/parallax/ticker는 공통 recipe를 사용한다.
