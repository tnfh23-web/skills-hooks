# 콘텐츠 중심 디자인 + 레퍼런스 퍼블리싱

이 저장소는 새 웹사이트의 **디자인·인터랙션 지침**과 기존 **퍼블리싱 QA 도구·Hook**을 함께 관리한다.

디자인의 두 기준은 **풍부한 인터랙션**과 **AI 티가 나지 않는 것**이다. 기존의 “정적 화면을 먼저 만든 뒤 DOM에서 효과를 골라 붙이는 디자인 흐름”과 커스텀 Design Director 역할을 교체했다. 시안 측정·픽셀 비교·상태 검증·반응형 검사·소스 최신성을 확인하는 퍼블리싱 도구는 유지한다.

## 어떤 흐름을 사용할까

| 요청 | 진입점 | 결과 |
|---|---|---|
| 새 사이트·리디자인 | [frontend-experience](.agents/skills/frontend-experience/SKILL.md) | 콘텐츠 기반 콘셉트와 인터랙션 맵 → 구현 → 실제 화면 비교 |
| 제공된 시안 구현 | [reference-publish](.agents/skills/reference-publish/SKILL.md) | 시안 측정 → 구현 → 퍼블리싱 QA 반복 |
| 실제 상태·모션 검증 | [interaction-ready](.agents/skills/interaction-ready/SKILL.md) / [interaction-plan](.agents/skills/interaction-plan/SKILL.md) | DOM 계약 → 상태/모션 QA → 완료 gate |
| 모션 구현 | [animation-guide](.agents/skills/animation-guide/SKILL.md) + 필요한 패턴 스킬 | 입력·반응형·움직임 감소·성능을 보존한 구현 |
| 제작 과정 페이지 | [프로세스 페이지 지침](.agents/skills/frontend-experience/references/process-pages.md) | 기획·디자인·제작 과정과 최신 실제 화면 |

기존 화면의 작은 수정에는 전체 콘셉트 제작을 다시 시작하지 않는다. 사용자가 선택한 스택·기존 브랜드·최신 지시가 이 저장소의 기본값보다 우선한다.

## 새 디자인의 기본 흐름

1. 목적·대상·콘텐츠·핵심 행동·브랜드 자산을 확인한다.
2. **구현 전에** 주요 섹션/상태의 콘셉트, 타이포그래피·레이아웃 체계와 콘텐츠별 인터랙션 맵을 만든다.
3. 설치되어 있으면 Build Web Apps의 `frontend-app-builder` 흐름을 사용한다. 커스텀 디자인 디렉터를 자동으로 추가하지 않는다.
4. 콘셉트에 맞춰 구현한다. 히어로뿐 아니라 페이지 전반의 글자·사진·작품·조작에 반응이 이어지게 한다.
5. 실제 브라우저에서 데스크톱·태블릿·모바일, 입력, 움직임 감소, 최초 진입/반복 이동을 확인한다.
6. 시안과 최신 렌더링을 직접 비교하고 불일치·조작 오류·성능 문제를 수정한다. 자동 QA PASS와 디자인 완성 판단은 구분한다.

인터랙션 맵은 `콘텐츠 / 입력 / 반응 / 모바일·키보드 대안 / 움직임 감소 / 검증 방법`을 정리한다. 구현 뒤 만드는 `interaction-plan.json`은 자동 QA 계약이며 이 사전 설계를 대신하지 않는다.

## 반영한 디자인 기준

- 본문·UI는 보통 **Pretendard**, 제목은 **브랜드와 콘텐츠**에 맞춰 선택한다. 분위기용 세리프를 기본값으로 넣지 않는다.
- 모든 버튼에 장식 화살표를 반복하지 않는다. 실제 방향·동작을 전달할 때 사용한다.
- 반복 카드·같은 섹션 구도·같은 fade-up으로 전체 페이지를 처리하지 않는다. 콘텐츠별 비중과 흐름을 설계한다.
- 스크롤·포인터·클릭·드래그 반응을 연결하고 가독성이 필요한 구간에는 여유를 둔다. 단순 효과 개수로 풍부함을 판단하지 않는다.
- 부드러운 스크롤·드래그·회전을 검토하고 렉 때문에 연출이 보이지 않는 상태를 해결한다.
- Three.js·GSAP/ScrollTrigger·Lenis/ScrollSmoother·AOS·Swiper는 목적에 맞는 선택지다. 모든 프로젝트에 전부 설치하거나 3D 캐릭터를 강제하지 않는다.
- 프로세스는 입장 안내가 아닌 **기획·디자인·제작 과정**이다. 순차 등장·재진입 반응·챕터 탐색과 현재 구현의 실제 캡처를 제공한다.

구현 세부 기준은 [모션·입력·성능](.agents/skills/frontend-experience/references/motion-and-input.md)에 있다.

## 이 지침을 다른 프로젝트에서 쓰기

이 저장소 안에서는 루트 `AGENTS.md`와 `.agents/skills/`를 사용한다. 다른 프로젝트에서 사용하려면 필요한 스킬 폴더를 그 프로젝트의 `.agents/skills/`에 복사하고 관련 진입점을 연결한다. 설치된 개인 스킬로 사용하려면 선택한 스킬 폴더를 Codex 스킬 설치 방식으로 설치한다.

`frontend-experience`는 자신의 두 reference 파일을 포함하므로 **폴더 전체**를 전달한다. 순수 디자인 지침으로 단독 사용할 수 있다. 퍼블리싱 자동 명령을 사용하려면 이 저장소의 `tools/`, 의존성과 관련 패턴 스킬도 접근 가능해야 한다. 명령은 이 도구 저장소에서 실행하며 `--source-root`로 대상 프로젝트를 지정한다.

다른 프로젝트의 기존 `AGENTS.md`를 통째로 덮어쓰지 않는다. `.codex/config.toml`과 Hook을 복사하거나 글로벌 설정을 바꾸는 것은 별도 선택이다. 저장소를 수정하거나 링크를 열었다고 모델이 영구 학습하거나 모든 대화에 자동 적용되는 것은 아니다.

## 유지한 퍼블리싱 자동화

시안은 구현할 웹 인터페이스 상태로 취급한다. 로컬 자산·폰트·라이브러리를 우선하며 CDN을 자동 추가하지 않는다. 긴 시안은 문서 높이이고 뷰포트 높이가 아니다.

```powershell
npm ci
npm run qa:measure -- --reference reference.png --output work/reference-measurement.json
npm run qa:spec -- --reference reference.png --capture-mode fullPage --viewport-width 1440 --viewport-height 900 --output work/reference-spec.json
npm run qa:interaction-plan -- --url http://127.0.0.1:3000/ --mode reference --source-root C:/target-project --output work/interaction-plan.json
npm run qa:interaction-plan:validate -- --validate work/interaction-plan.json
npm run qa -- --reference reference.png --url http://127.0.0.1:3000/ --capture-mode fullPage --width 1440 --height 900 --output C:/target-project/qa --source-root C:/target-project --interaction-plan work/interaction-plan.json --require-motion --require-geometry --require-responsive --set-latest
```

`reference-spec.json`은 좌표·viewport·captureMode 계약이다. `interaction-plan.json`은 selector·semantic state·evidence·recipe·모바일/움직임 감소·verification 계약이다. 생성된 후보는 실제 콘텐츠와 조작을 보고 검토한다.

새 디자인의 모션 방향을 QA에 전달할 때는 **직접 작성한** `motion-language.json`을 사용한다. 고정된 기본 디자인을 생성하던 폴백은 제거했다.

```powershell
npm run qa:interaction-plan -- --url http://127.0.0.1:3000/ --mode design --motion-language work/motion-language.json --source-root C:/target-project --output work/interaction-plan.json
```

입력 필드와 선택기 규칙은 [interaction-plan](.agents/skills/interaction-plan/SKILL.md) 및 [corpus 문서](docs/interaction-corpus.md)를 확인한다. `reference` 명령과 기존 QA report 계약은 유지한다. 기존 API/CLI에서 `design` 모드를 사용했다면 이제 작성한 motion language를 전달해야 한다.

### QA와 완료 gate

| 검사 | 확인하는 것 |
|---|---|
| Visual | 동일 dimension의 actual/diff/overlay/mask와 주요 mismatch |
| Geometry | 레퍼런스 좌표와 실제 `getBoundingClientRect()` 차이 |
| Responsive | overflow·잘림·중복 instance·숨겨진 branch·hover-only 정보 |
| Interaction | 클릭 전후 semantic state, carousel projection, actionable feedback |
| Motion | 움직임의 실제 상태 sample·pin 해제·장면 전환·움직임 감소 |
| Stop Hook | 필요한 report PASS·canonical source root·source fingerprint 최신성 |

`tools/interaction-patterns.mjs`는 자동 검증 패턴 레지스트리다. carousel·marquee·pin/scrub·scene transition·split text·horizontal pin 스킬을 필요한 경우 선택한다. 세부 대응은 [interaction-corpus.md](docs/interaction-corpus.md)에 있다.

계약 부족은 `DEFERRED`, 자동 범위 밖은 `UNSUPPORTED`로 기록한다. 특히 canvas/WebGL은 직접 브라우저에서 검증하며 미지원을 자동 PASS로 바꾸지 않는다. Visual/Interaction/Motion PASS는 디자인의 독창성·페이지 전반의 경험·기기별 성능을 자동 보증하지 않는다.

Stop Hook은 기존 퍼블리싱 gate이며 이번 변경에서 새 사이트의 창작 품질 gate로 확대하지 않았다. 필요한 report와 실제 화면 비교를 함께 확인한다. source 변경 뒤 관련 QA를 다시 실행하고 `--set-latest`로 선택한 대상의 QA run을 가리킨다. 의도적 clipping은 `data-qa-allow-clipping`과 report에 남긴다.

## 프로젝트 에이전트와 테스트

커스텀 Design Director 대신 제공 시안의 측정·QA 계약만 맡는 Reference Planner를 둔다. 나머지 퍼블리싱 역할과 모델 설정은 유지하며 필요하고 위임이 허용된 작업에서만 사용한다. [agent-roles.md](docs/agent-roles.md)에 범위를 정리했다.

```powershell
npm test
```

syntax/config, Visual QA, reference/geometry/responsive, interaction/motion, authoring, CLI motion-language 입력, Stop Hook의 실제 상태·소스 최신성을 검사한다. 스킬 형식 검증과 동작 테스트가 통과해도 새 디자인 결과의 품질은 실제 제작과 렌더링으로 검증해야 한다.
