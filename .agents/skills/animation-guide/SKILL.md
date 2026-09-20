---
name: animation-guide
description: 정적 시안 충실도를 해치지 않으면서 계획된 상호작용과 모션을 로컬 우선 방식으로 구현하는 공통 규칙을 적용한다.
---

# 애니메이션 구현 가이드

정적 기준선이 안정되고 `work/interaction-plan.json` 검증이 끝난 뒤 사용한다.

## 공통 원칙

- 로컬 라이브러리와 helper를 먼저 조사하며 공개 CDN을 기본값으로 넣지 않는다.
- layout transform과 motion transform은 wrapper를 나눠 소유권을 분리한다.
- 이전 section 효과에서 selector만 바꾸지 말고 의미와 구성에 맞는 family를 선택한다.
- 숨겨진 responsive branch를 실행하지 않고 동적 거리는 resize/refresh 때 다시 측정한다.
- 핵심 콘텐츠는 JavaScript 전에도 안전하게 보이며 hover 외 키보드·터치 경로를 가진다.
- `prefers-reduced-motion`에서는 loop/scrub/parallax를 멈추거나 안전한 최종 상태를 제공한다.
- Visual QA용 정지와 실제 Motion QA를 분리하고 모션으로 시안 오차를 숨기지 않는다.

## 계층

- primitive: duration/easing, progress sampling, visible-state 검사, underline/active bar, text shift/mask, button fill/border/background, 기본 image crop/scale, transform ownership wrapper
- shared recipe: dropdown/drawer/menu state, hover caption/dim/image swap, pointer tooltip/reactive/speed control, scroll reveal(fade/translate/stagger/clip/mask/media/counter/SVG/text highlight/saturation), parallax, ticker/loop/floating, scroll story
- dedicated skill: `carousel-state`, `marquee`, `pin-scrub-track`, `scene-transition`, `split-text-reveal`, `horizontal-pin-scroll`
- deferred: canvas/WebGL 및 결정적 계약이 없는 효과

## 단위

새 페이지는 필요할 때 `html { font-size: 62.5%; }`와 rem(`1rem = 10px`)을 사용한다. 레퍼런스 좌표, 런타임 브라우저 측정, 물리적 hairline은 px로 유지한다. 기존 페이지를 일괄 변환하지 않는다.
