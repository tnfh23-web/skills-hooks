# skills-hooks 파일 역할과 실행 흐름

확인일: 2026-10-11. 이 저장소는 웹앱 자체가 아니라 디자인·퍼블리싱 지침과 브라우저 QA 도구를 제공한다. 문법을 외우기보다 아래에서 필요한 작업과 파일을 찾는다.

## 읽는 순서

1. `AGENTS.md`: 요청에 맞는 작업 진입점.
2. `.agents/skills/`: 해당 작업의 지침. 디자인은 `frontend-experience`, 시안 구현은 `reference-publish`, 문서 관리는 `code-map`.
3. `package.json`: 도구 실행 명령.
4. 아래 표의 관련 `tools/` 파일과 그에 대응하는 테스트.

## 도구 소스

| 파일 | 역할 | 연결 | 수정할 때 |
|---|---|---|---|
| `tools/reference-measure.mjs` | PNG 시안에서 영역을 측정한다. | reference-spec | 시안 측정값 계산 |
| `tools/reference-spec.mjs` | 시안 크기·viewport·자산·영역을 구현 계약으로 만든다. | reference-measure, geometry-qa | 시안 계약 필드 |
| `tools/visual-qa.mjs` | Chromium 캡처와 픽셀 비교, diff·overlay·보고서를 만든다. | interaction-qa, source-fingerprint, qa-run | 시각 비교·QA 실행 흐름 |
| `tools/geometry-qa.mjs` | DOM 위치·크기·타이포를 시안 좌표와 비교한다. | reference-spec, source-fingerprint | 좌표·글꼴 검사 |
| `tools/responsive-qa.mjs` | 여러 viewport의 넘침·잘림과 표시 문제를 검사한다. | source-fingerprint | 반응형 검사 기준 |
| `tools/interaction-patterns.mjs` | 자동 검사할 모션·조작 패턴을 등록한다. | interaction-plan, interaction-qa, motion-qa | 새 검증 패턴 |
| `tools/interaction-coverage.mjs` | 조작 요소를 수집하고 hover·focus·click 피드백을 검사한다. | interaction-plan, interaction-qa | 버튼·링크 검사 범위 |
| `tools/interaction-authoring.mjs` | 관찰한 상태·작성한 모션 언어를 QA 계약과 연결한다. | interaction-patterns, interaction-plan | 모션 언어와 QA 연결 |
| `tools/interaction-plan.mjs` | DOM에서 검사 후보를 수집하고 selector·상태·증거 계약을 검증한다. | coverage, authoring, patterns | QA plan 생성·검증 |
| `tools/interaction-qa.mjs` | 버튼·메뉴·탭·캐러셀 등의 조작 전후 상태를 검사한다. | interaction-plan, coverage, patterns | 조작 상태 판정 |
| `tools/motion-qa.mjs` | 스크롤·진행·핀 해제·등장 등의 실제 변화와 움직임 감소를 검사한다. | interaction-plan, source-fingerprint | 연속 모션 판정 |
| `tools/source-fingerprint.mjs` | 검사 대상의 소스 목록과 내용 지문을 만든다. | QA 도구, Stop Hook | 소스 최신성 범위 |
| `tools/qa-run.mjs` | 프로젝트 안의 최신 QA 실행 경로를 기록하고 찾는다. | visual-qa, Stop Hook | 최신 결과 선택 |
| `.codex/hooks/stop-reference-publish.mjs` | 완료 직전에 필수 보고서·소스 지문·대상 경로를 검사한다. | QA reports, interaction-plan, qa-run | 퍼블리싱 완료 gate |

## 검사 소스

| 파일 | 역할 | 연결 | 수정할 때 |
|---|---|---|---|
| `tests/syntax.test.mjs` | 도구 문법과 Hook JSON·역할 모델 설정을 확인한다. | tools, .codex | 설정·도구 추가 |
| `tests/qa-contract.test.mjs` | 시각 비교와 보고서·증거 계약을 검증한다. | visual-qa | 시각 QA 변경 |
| `tests/workflow-contract.test.mjs` | 시안·좌표·반응형·외부 대상·최신 결과 선택을 검증한다. | reference-spec, geometry, responsive, qa-run | QA 워크플로 변경 |
| `tests/interaction-motion-contract.test.mjs` | 실제 HTML 조작·모션의 정상/실패 판정을 검증한다. | interaction-qa, motion-qa | 조작·모션 검사 변경 |
| `tests/interaction-authoring.test.mjs` | 작성 규칙과 상태·모션 연결 계약을 검증한다. | interaction-authoring | 모션 계약 작성 변경 |
| `tests/interaction-plan-cli.test.mjs` | CLI 입력과 모션 언어 전달을 검증한다. | interaction-plan | CLI 옵션 변경 |
| `tests/hook.test.mjs` | 보고서 누락·실패·오래된 소스에서 Stop Hook이 차단하는지 확인한다. | Stop Hook | 완료 gate 변경 |
| `tests/code-map.test.mjs` | 문서 누락·중복·삭제·소스 변경 감지와 검토 기록을 검증한다. | code-map 스킬 검사기 | 파일 역할표 검사 변경 |

## 테스트용 화면

아래 HTML은 사용자용 사이트가 아니라 QA 판정을 재현하는 화면이다. 일부는 의도적으로 깨져 있다.

| 파일 | 역할 | 연결 | 수정할 때 |
|---|---|---|---|
| `tests/fixtures/index.html` | 기본 QA 대상 화면 | QA 테스트 | 기본 비교 기준 |
| `tests/fixtures/aa.html` | 안티앨리어싱 차이 검사 화면 | Visual QA | 작은 픽셀 노이즈 |
| `tests/fixtures/full-page.html` | 긴 페이지 캡처 화면 | Visual QA | 전체 페이지 크기 |
| `tests/fixtures/geometry.html` | 좌표·크기·글꼴 측정 화면 | Geometry QA | 위치 비교 |
| `tests/fixtures/responsive.html` | 정상 반응형 화면 | Responsive QA | 정상 기준 |
| `tests/fixtures/responsive-overflow.html` | 가로 넘침 실패 화면 | Responsive QA | overflow 탐지 |
| `tests/fixtures/responsive-intentional-clip.html` | 허용한 잘림을 기록한 화면 | Responsive QA | 의도한 clipping |
| `tests/fixtures/interaction-motion.html` | 조작과 모션이 함께 있는 화면 | Interaction/Motion QA | 복합 흐름 |
| `tests/fixtures/carousel.html` | 정상 캐러셀 화면 | Interaction QA | 정상 캐러셀 |
| `tests/fixtures/broken-carousel.html` | 상태가 정상 변경되지 않는 캐러셀 | Interaction QA | 실패 캐러셀 |
| `tests/fixtures/carousel-index-only.html` | index만 변하고 실제 투영이 없는 캐러셀 | Interaction QA | 잘못된 PASS 방지 |
| `tests/fixtures/carousel-stale-counter.html` | 표시 숫자가 갱신되지 않는 캐러셀 | Interaction QA | 숫자 동기화 |
| `tests/fixtures/carousel-stale-slide.html` | 실제 슬라이드가 갱신되지 않는 캐러셀 | Interaction QA | 이미지 동기화 |
| `tests/fixtures/clickable-without-hover.html` | hover 반응이 없는 조작 요소 | Coverage QA | hover 검사 |
| `tests/fixtures/coverage-positive.html` | 조작 피드백이 있는 정상 화면 | Coverage QA | 정상 피드백 |
| `tests/fixtures/dead-arrow-control.html` | 동작하지 않는 이동 컨트롤 | Coverage QA | 클릭 실패 탐지 |
| `tests/fixtures/missing-focus-feedback.html` | 키보드 포커스 피드백 누락 화면 | Coverage QA | 키보드 검사 |
| `tests/fixtures/dropdown-menu.html` | 정상 드롭다운 메뉴 | Interaction QA | 메뉴 정상 기준 |
| `tests/fixtures/dropdown-unsynced.html` | 열림 상태와 표시가 어긋난 드롭다운 | Interaction QA | 메뉴 상태 동기화 |
| `tests/fixtures/menu-state-unsynced.html` | 메뉴 상태가 어긋난 화면 | Interaction QA | 메뉴 실패 기준 |
| `tests/fixtures/tabs-split-state.html` | 탭 상태 표시가 분리된 화면 | Interaction QA | 탭 상태 검증 |
| `tests/fixtures/dedicated-motion.html` | 전용 모션 패턴이 있는 화면 | Motion QA | 정상 전용 패턴 |
| `tests/fixtures/dedicated-horizontal-overflow.html` | 가로 핀 구간이 넘치는 화면 | Motion QA | 가로 이동 실패 |
| `tests/fixtures/dedicated-pin-no-release.html` | 핀이 해제되지 않는 화면 | Motion QA | 핀 해제 실패 |
| `tests/fixtures/dedicated-scene-static.html` | 전환이 실제로 움직이지 않는 화면 | Motion QA | 정적 전환 실패 |
| `tests/fixtures/dedicated-split-missing.html` | 분할 글자 변화가 누락된 화면 | Motion QA | 텍스트 모션 실패 |

## 코드 외 설정과 스킬

`package.json`은 실행 명령과 의존성, `.codex/config.toml`과 `.codex/agents/`는 선택 가능한 역할 설정이다. `.codex/hooks.json`이 기존 Stop Hook을 연결한다. 스킬별 사용 시점은 [structure.md](structure.md)에 있다.

`code-map` 스킬 폴더 안의 `scripts/check-code-map.mjs`는 별도 패키지 없이 Node로 실행한다. 대상 소스를 읽고 문서 역할표의 경로·중복·내용 지문을 확인한다. `--stamp`는 사람이 설명을 검토한 뒤 검토 기준만 기록하며 설명 자체를 작성하지 않는다. `.agents/` 내부 지원 코드와 의존성·빌드·QA 실행 결과는 기본 역할표 검사 대상에서 제외한다.

## 실행 흐름과 수정 위치

- 시안 구현: 시안 PNG를 `reference-measure`로 측정하고 `reference-spec`으로 계약을 만든 다음 대상 프로젝트를 구현한다. `visual-qa`가 실제 화면을 캡처·비교하고 `geometry-qa`가 좌표, `responsive-qa`가 기기별 배치를 확인한다.
- 조작 검사: `interaction-plan`이 DOM과 패턴을 연결한다. `interaction-qa`가 조작 전후 상태와 feedback, `motion-qa`가 연속 변화를 확인한다. 실패하면 대상 프로젝트를 고치고 관련 검사를 다시 수행한다.
- 완료 판단: QA 보고서와 실제 화면 검토를 완료한다. 연결된 환경의 Stop Hook이 결과와 현재 소스의 지문이 일치하는지 확인한다. 코드 문서 검사는 별도이며 디자인 품질이나 기능 검증을 대신하지 않는다.
- 기능 변경: 도구 또는 대상 앱을 수정한 뒤 `code-map`으로 관련 역할표·기능 흐름·연결 상태를 갱신하고 `docs:stamp`, `docs:check`를 실행한다.

기존 디자인·퍼블리싱 QA의 동작과 글로벌 Hook 설정은 이 문서 작업에서 바꾸지 않았다.

<!-- code-map-review:start -->
{
  "version": 1,
  "files": {
    ".codex/hooks/stop-reference-publish.mjs": "ca7b5b5fea4c1251b6703308250f547f9017b207230b6784a28e17af0a1801a3",
    "tests/code-map.test.mjs": "9f5b36a6305be2e004364ac403e88d29e7c866c16526f757f523b1227c2260e0",
    "tests/fixtures/aa.html": "151cdba37ac866b890a531dba01ab6f4e03cd895a12941513e82e11b8a82acb0",
    "tests/fixtures/broken-carousel.html": "fce3894427640f43d4bf176ed20cb60f4ea45be52084d10392b571420d678b38",
    "tests/fixtures/carousel-index-only.html": "b8da941ed1c5d88ebf06befaf5c66880abc9907845f68bddb2b786bd6e7c0acd",
    "tests/fixtures/carousel-stale-counter.html": "86df95377431adc238c6b16816599eed0f15dba047f3320265520b7bcc2971d2",
    "tests/fixtures/carousel-stale-slide.html": "d0915e8143133be711fe65db770d03ad5ffe82f6be5e6027347b3d7a662d459f",
    "tests/fixtures/carousel.html": "951444a60ee0d1fe3af92f8f737f5ee6b55687475e9fc92b0475cbc8fc0fe4de",
    "tests/fixtures/clickable-without-hover.html": "e8058dd1552374999993f29c824b84a4623198b70a0994cf7f045bdbc2bc0046",
    "tests/fixtures/coverage-positive.html": "a9c657b33a0299731d728411d48ae85c29bd0916699b408711203f3674b029c0",
    "tests/fixtures/dead-arrow-control.html": "e532bb1b9f11ba5b9f25a4fe793fc0e1f252a8f147f3d5432d91fa974e74c8b2",
    "tests/fixtures/dedicated-horizontal-overflow.html": "10d2841fa0450073bb0b3278a536e5903adb7ddba12b2d5ee7ffa2480664fde6",
    "tests/fixtures/dedicated-motion.html": "c3eac34a6bc84865b5f201f6663c8939a82a31f49e69b7ac192be6b721a928fe",
    "tests/fixtures/dedicated-pin-no-release.html": "9a3495017f9e53d152bcdd6d2d4679308a8887de4f036034a5bc97640edc809d",
    "tests/fixtures/dedicated-scene-static.html": "e1ec125d533170687f2b863957b222fa716fce59722eb78115a623084aa46c61",
    "tests/fixtures/dedicated-split-missing.html": "def77285c4c960c9b69b7e791b2d5c4400d34a812bdacd1f7fa7dad1daf395f7",
    "tests/fixtures/dropdown-menu.html": "5b44d8e0e94c9cd288a80d2d8a9027a53a7ea87a28dc87f24197ef724a2ca515",
    "tests/fixtures/dropdown-unsynced.html": "7f32b91c6438d8ca73b53a24eb3db8a93892228f92c2834a64512ecc71d6d027",
    "tests/fixtures/full-page.html": "12bb06d043147c878bd0072d1c2e16792d54a2a307b1bd7f4a4bbf13d50a061f",
    "tests/fixtures/geometry.html": "b7d8a5dce6f95f8368508a8a997348b430f5809a8f88e09a0d9e0a163fea1713",
    "tests/fixtures/index.html": "a8fa4cb420b0e2d173a931641be7cea555e1a49adf482c2cf37a3e1ec29e0e68",
    "tests/fixtures/interaction-motion.html": "ab57f56eedededca0f0115f7f21cfd3b844c52aa312757abf9138646b322212a",
    "tests/fixtures/menu-state-unsynced.html": "4d4e7d5e0d4dcb3e9eac394ce4cae838434a99839ec4a8752039d94db9e07fa8",
    "tests/fixtures/missing-focus-feedback.html": "1331be02b609dacab3b64919f604be0fff06bad1daf547b1be229ed346faf657",
    "tests/fixtures/responsive-intentional-clip.html": "5fabffcbb8381113f69fed9ea95454b94f136fddbc14f7abf6069acdf78bc3ff",
    "tests/fixtures/responsive-overflow.html": "b96a15b4c4a12fb06137590237473e9e2dedc46ea3a55676a98fe332188ee3a3",
    "tests/fixtures/responsive.html": "f21c236d2be84993c3ba7c2483cf4c9d72ec8d5d907e230882fa93bcd5b54577",
    "tests/fixtures/tabs-split-state.html": "69cf81683c66754bc094b3d35408abfe74a2fd02a7a5cb5b95f2b97267598a40",
    "tests/hook.test.mjs": "92a6e7259147e84029a54caa58bb4ba7d24f982bd1199dc63525815fbb9987f6",
    "tests/interaction-authoring.test.mjs": "de500ffdf8c62a19c52f6e65f4d5a3f063a2caa927f92b3b45c08ad5aa472ca9",
    "tests/interaction-motion-contract.test.mjs": "f807cd1169df6a4c109022015ccd879f2180ccac1d134df49c9d82423c48ae00",
    "tests/interaction-plan-cli.test.mjs": "2217f83b3fd30fa911f504ecc13f341fc39d79790081b9aa08086944ffc2b03d",
    "tests/qa-contract.test.mjs": "c46e324d433e65c0778bcef796d23e43d6ceaa9c455518a83b50fc2c7aa23f17",
    "tests/syntax.test.mjs": "f2ec4ad877b51a55bb862aaf343698ebdf1979a59cfd31a9037a223f4f97eb13",
    "tests/workflow-contract.test.mjs": "38eedc31ab2118d316aad3f6e39530195f170ffb8ae31c7d1403fa25fc0dc4a6",
    "tools/geometry-qa.mjs": "44a8a17bfa6a7f364c2ed9a25a32d2317f9847c9759cabbeba44bdbc72537998",
    "tools/interaction-authoring.mjs": "a9cb544a3f778ffe75b29de50cbca809a99c8804636e5f69d01466c80ceaaf9d",
    "tools/interaction-coverage.mjs": "3667de1e68fa6e69fa3183ce8a1370d2f4de7ca437e5c8bfc94d844b11465f68",
    "tools/interaction-patterns.mjs": "11c71d2a9d4f314d1c43003446285dfb1633adb752473c6dc2d3e3155eddcec5",
    "tools/interaction-plan.mjs": "7f7a7f0d681504debd26bf8a01d962060dd7f0d5546a8f747edad5daf1c9258d",
    "tools/interaction-qa.mjs": "d84b264bcb633555b10ff2dc25f232464e0ef0652f104957974f72c08701a7de",
    "tools/motion-qa.mjs": "1409104f15d720912f6c55a711d22855a93e01472d4a2d360db73aee5b5eee4d",
    "tools/qa-run.mjs": "2ad1c473fb659f5ec46fa49c21fba711868979f54af8488074944b60f986cdea",
    "tools/reference-measure.mjs": "60cdc9f0faea367d97eb6e786989827b36fb29c6703db2a1e2e9cfb6c13f560d",
    "tools/reference-spec.mjs": "fa1fe94b6b2c85d91d8a7115b70da5710e05251f23e842da7e833997f94917f7",
    "tools/responsive-qa.mjs": "c9d4d3595a95430ea7b89e123e6b9f5289e32065ecae20a657bbf205684b6899",
    "tools/source-fingerprint.mjs": "fc81b6639d5a87b3ac36eb21dda0ff7eef4ac7a57d1b213a4e4a87bd1ae0d5ea",
    "tools/visual-qa.mjs": "942f9bd1613ce64e4b229ef3375a57466ab60671242d6f9c623319b19e5bfbd1"
  }
}
<!-- code-map-review:end -->
