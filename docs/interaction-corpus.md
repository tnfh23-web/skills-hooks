# 상호작용 코퍼스와 자동화 범위

이 문서는 `tools/interaction-patterns.mjs`의 사람이 읽는 대응표다. 기계 판정의 SSOT는 레지스트리이며 문서와 테스트는 그것을 따라야 한다. Authoring 단계에서는 이 corpus를 특정 사이트 효과의 복사 목록이 아니라 `semantic type → intent → interaction family → primitive → verification route`로 연결하는 interaction vocabulary로 사용한다.

## Authoring 정책

| 정책 | 대상 | authoring 계약 |
|---|---|---|
| `required-baseline` | link, button, nav, icon button, CTA | hover, focus-visible, active/tap feedback |
| `affordance-driven` | tab, arrow, menu, search, carousel, state navigation | 보이는 affordance에 맞는 보수적 state behavior |
| `enhanced-motion` | pin, scrub, parallax, split text, scene, pointer, horizontal scroll | Reference Mode에서는 명시적 source/reference/design evidence가 있을 때만 선택 |

`tools/interaction-authoring.mjs`는 DOM의 typography, line, shape, image, density, contrast, motion cue를 결정적으로 관찰해 `interactionLanguage`를 만들고, 각 discovered candidate에 vocabulary family와 primitive를 기록한다. `global-scale-1.05`, `generic-card-lift`, `decorative-arrow-default`, `all-elements-opacity-only`는 기본 금지 목록이다.

`coverage.actionable`은 `actionableAuthoring` group과 selector 기준으로 연결된다. Group에는 `semanticType`, `intent`, `interactionFamily`, `primitive`, `policy`, `rationale`, `vocabularySource`, `verificationRoute`가 있고, `behavior`와 `requiredFeedback`를 분리한다. `interactionComposition`은 페이지의 primary/stateful interaction, secondary feedback, continuous motion, restraint area를 나타낸다. Anti-generic validator는 의미가 다른 group에 동일 효과를 반복하는 false variety를 차단하지만 작은 페이지에는 예외를 둔다.

| Reference/Pattern | Category | Skill/Recipe | Verifier | 자동화 상태 |
|---|---|---|---|---|
| tabs / role=tab | STATE_INTERACTION | tabs | Interaction QA | automatic |
| details / aria-expanded panel | STATE_INTERACTION | accordion | Interaction QA | automatic |
| dropdown/menu/drawer | STATE_INTERACTION | shared recipe | Interaction QA | automatic |
| carousel + counter/pagination/progress | STATE_INTERACTION | carousel-state | Interaction QA | automatic |
| hover reveal | POINTER_INTERACTION | hover-reveal | Interaction QA | automatic |
| pointer reactive / cursor / speed | POINTER_INTERACTION | shared recipe | Motion QA | deferred |
| duplicated marquee track | CONTINUOUS_MOTION | marquee | Motion QA | automatic |
| ticker / loop / auto sequence / floating | CONTINUOUS_MOTION | shared recipe | Motion QA | deferred |
| scroll reveal / parallax / scroll story | SCROLL_MOTION | shared recipe | Motion QA | contract |
| pin + scrub | SCROLL_MOTION | pin-scrub-track | Motion QA | contract |
| scene transition | SCROLL_MOTION | scene-transition | Motion QA | contract |
| split text reveal | SCROLL_MOTION | split-text-reveal | Motion QA | contract |
| horizontal pinned track | SCROLL_MOTION | horizontal-pin-scroll | Motion QA | contract |
| image sequence | SCROLL_MOTION | shared recipe | Motion QA | contract |
| canvas / WebGL | ADVANCED | deferred | manual | unsupported |

`contract`는 `verification.sampleSelector`처럼 결정적 관찰 지점이 있어야 자동 실행한다는 뜻이다. 계약이 없으면 Motion QA는 PASS 대신 `DEFERRED`를 기록한다. Dedicated scroll recipe는 registry의 `requiredStates`와 동일한 `verification.expectedStates`를 반드시 선언한다. pin-scrub은 pin release, scene-transition은 이전→현재→다음 active scene, split-text는 accessible original/font/duplicate announcement, horizontal-pin은 `track.scrollWidth - viewport.clientWidth`, overflow, mobile fallback까지 전용 verifier가 확인한다. Interaction QA의 dropdown/menu-state는 control·panel의 초기 동기화, 실제 open, 계획된 dismiss 동작을 검사하며 generic class diff로 대체하지 않는다. Interaction QA는 Motion/Advanced 후보를 generic click으로 검사하지 않는다. Plan이 존재하는 실행에서는 `interaction-coverage`가 visible actionable control마다 hover, keyboard focus-visible, perceptibility, native/verified click behavior를 검사하며 누락 selector와 failure reason을 report한다.

## Reference corpus 매핑

| Reference / Pattern | Category | Skill 또는 Recipe | Verifier | 자동 검증 여부 |
|---|---|---|---|---|
| KUMU / dropdown, backdrop, mobile sidebar, dim, outside close | STATE_INTERACTION | drawer / dropdown shared recipe | interaction-qa | 상태 전이 자동 |
| KUMU·Main Portfolio / scroll-hide header, direction state | SCROLL_MOTION | scroll-header-state shared recipe | motion-qa | sample contract |
| KUMU / accordion, tabs | STATE_INTERACTION | accordion / tabs primitive | interaction-qa | 자동 |
| KUMU / hero·responsive slider, current-total-pagination | STATE_INTERACTION | carousel-state | interaction-qa | projection 동기화 자동 |
| KUMU / marquee | CONTINUOUS_MOTION | marquee | motion-qa | 기본 구조·movement 자동 |
| KUMU / button·product·tone·text hover | POINTER_INTERACTION | hover-reveal shared recipe | interaction-qa | observable state 자동 |
| KUMU / marquee pause | POINTER_INTERACTION | speed-control shared recipe | motion-qa | evidence contract 전까지 deferred |
| EATGO / pinned scrub, graph/path progression, scroll character | SCROLL_MOTION | pin-scrub-track | motion-qa | deterministic sample contract |
| EATGO / SVG draw, saturation, scale, counter, curtain | SCROLL_MOTION | scroll-reveal shared recipe | motion-qa | sample contract |
| EATGO / pointer tooltip | POINTER_INTERACTION | cursor-tooltip shared recipe | motion-qa | deferred |
| EATGO / marquee, floating | CONTINUOUS_MOTION | marquee / floating-motion | motion-qa | marquee 자동, floating deferred |
| Star / side menu·submenu replacement | STATE_INTERACTION | drawer / menu-state shared recipe | interaction-qa | 상태 전이 자동 |
| Star / hero·room·mobile slider, active-prev-next-current-total-progress | STATE_INTERACTION | carousel-state | interaction-qa | 동기화 자동 |
| Star / room tabs | STATE_INTERACTION | tabs primitive | interaction-qa | 자동 |
| Star / room·event hover | POINTER_INTERACTION | hover-reveal shared recipe | interaction-qa | 자동 |
| KUHNIL / pinned long sequential section | SCROLL_MOTION | pin-scrub-track | motion-qa | deterministic sample contract |
| KUHNIL / text highlight | SCROLL_MOTION | scroll-reveal shared recipe | motion-qa | sample contract |
| KUHNIL / underline navigation, CTA fill, dim+text | POINTER_INTERACTION | hover-reveal shared recipe | interaction-qa | observable state 자동 |
| React Modoo / mobile menu, scroll lock, radio | STATE_INTERACTION | drawer / menu-state shared recipe | interaction-qa | 상태 전이 자동, scroll lock은 contract |
| React Modoo·Star·EATGO / loading intro·morph·lock | CONTINUOUS_MOTION | auto-sequence shared recipe | motion-qa | deferred |
| React Modoo / dual marquee | CONTINUOUS_MOTION | marquee | motion-qa | 자동 |
| React Modoo / marquee speed control | POINTER_INTERACTION | speed-control shared recipe | motion-qa | deferred |
| React Modoo / portfolio·process slider, progress | STATE_INTERACTION | carousel-state | interaction-qa | projection 동기화 자동 |
| React Modoo / about pin, text clip | SCROLL_MOTION | pin-scrub-track / split-text-reveal | motion-qa | sample contract |
| Main Portfolio / mobile close, outside/Escape close | STATE_INTERACTION | drawer shared recipe | interaction-qa | close contract 자동 |
| Main Portfolio / divider marquee | CONTINUOUS_MOTION | marquee | motion-qa | 자동 |
| Main Portfolio / pinned accordion·pinned scene | SCROLL_MOTION | pin-scrub-track | motion-qa | deterministic sample contract |
| Main Portfolio / split title | SCROLL_MOTION | split-text-reveal | motion-qa | sample contract |
| Main Portfolio / outer·inner reveal, background offset, active scene | SCROLL_MOTION | scene-transition | motion-qa | sample contract |
| Main Portfolio / hero speed·circular hover | POINTER_INTERACTION | speed-control / pointer-reactive | motion-qa | deferred |
| 모든 corpus / canvas·3D·WebGL | ADVANCED | deferred | manual | unsupported |

Swiper, GSAP, ScrollTrigger, Lenis, SplitText 같은 라이브러리 이름은 증거일 뿐 recipe 자체가 아니다. 구현은 기존 local dependency를 우선하며 CDN을 자동 추가하지 않는다.
