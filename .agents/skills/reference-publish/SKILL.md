---
name: reference-publish
description: 정적 디자인 레퍼런스를 실제 픽셀 좌표로 측정하고 Chromium 시각 QA 반복을 통해 충실한 웹 인터페이스를 구현한다.
---

# 레퍼런스 퍼블리싱 V1

레퍼런스는 새 디자인의 영감이 아니라 구현할 실제 웹 상태다.

## 필수 반복

1. **보기** — 레퍼런스, 로컬 asset/font, 기존 페이지를 먼저 조사한다.
2. **측정/추론** — `work/reference-spec.json`에 reference dimensions, capture mode, viewport, section, asset, typography, 주요 bounds를 기록한다. source bounds를 우선하고 없으면 `npm run qa:measure`를 사용한다. 자동 측정 불가 항목만 낮은 confidence의 시각 추정을 허용한다.
3. **구현** — 로컬 리소스로 typography, wrapping, 크기, 간격, crop, 위치, 색, border, radius, 정렬, z-order를 맞춘다.
4. **캡처** — 단일 화면은 `viewport`, 긴 문서는 `fullPage`를 사용한다. 긴 reference 높이를 viewport 높이로 바꾸지 않는다.
5. **비교/진단** — `qa/report.json`, `actual.png`, `diff.png`와 Geometry QA의 `dx/dy/dw/dh`로 가장 큰 원인을 찾는다.
6. **수정** — 가장 작은 관련 범위를 고치고 다시 캡처한다.
7. **검증** — 최종 Visual QA 뒤 상호작용이 있으면 `interaction-ready` 단계로 들어가 plan을 만들고 Interaction/Motion QA를 분리 실행한다.

## 시각 QA 계약

reference와 actual은 width/height가 정확히 같아야 한다. dimension mismatch는 즉시 FAIL이며 reference를 resize해 숨기지 않는다. 작은 mismatch ratio라도 큰 의미 영역이 남으면 FAIL할 수 있다. AA noise는 실제 mismatch mask에서 제외하지만 사람이 보는 diff는 유지한다.

`fullPage`에서도 브라우저는 지정 viewport로 렌더되고 screenshot만 문서 전체를 캡처한다. `report.json`은 reference, viewport, document, actual dimensions와 capture mode를 기록한다. `work/reference-spec.json`은 document 기준 reference pixel 좌표를 유지한다.

## 상호작용 계약

명확한 affordance만 구현한다. state interaction은 클릭 전후 semantic state를 검사한다. continuous/scroll/pointer motion 후보는 generic click fallback으로 보내지 않고 Motion QA에 라우팅한다. 계약이 없으면 deferred, 지원 밖이면 unsupported로 기록한다.

## 완료 gate

필요한 Visual/Interaction/Motion/Geometry/Responsive 보고서가 PASS이고 현재 소스 지문과 일치해야 한다. Stop Hook은 객관적 증거만 검사하며 효과를 발명하지 않는다.
