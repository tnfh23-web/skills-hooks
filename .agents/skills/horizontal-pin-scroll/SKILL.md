---
name: horizontal-pin-scroll
description: 세로 스크롤을 가로 track 진행으로 변환하되 끝에서 pin을 해제하는 패턴을 구현하고 검증한다.
---

# 가로 핀 스크롤

## 트리거

가로로 이어지는 scene/card와 pin 근거가 명확할 때 사용한다.

## 사용할 때

세로 scroll progress를 가로 track 진행으로 변환해야 하는 긴 narrative 구간에 사용한다.

## 사용하지 않을 때

일반 carousel, 수동 slider, 단순 overflow row에는 사용하지 않는다.

## 필요한 근거

viewport, pin wrapper, moving track, `sampleSelector`, scroll range, final release를 plan에 기록한다.

## DOM / 상태 계약

viewport > pin wrapper > track 구조를 유지하고 track만 가로 transform을 소유한다.

## 구현 원칙

이동 거리는 `track.scrollWidth - viewport.clientWidth`로 런타임 측정하고 세로 range와 하나의 progress 계약으로 연결한다.

## responsive

좁은 화면에서 세로 흐름으로 전환할 수 있으며 hidden desktop branch의 animation을 반드시 중지한다.

## touch

native vertical scroll을 유지하고 별도 horizontal gesture를 강제하지 않는다.

## accessibility

DOM 순서가 읽기 순서와 같아야 하며 offscreen 콘텐츠가 focus trap을 만들지 않게 한다.

## prefers-reduced-motion

콘텐츠가 순서대로 접근 가능한 정적 흐름을 제공한다.

## 주요 구현 함정

잘못된 track width, document overflow, stale resize 값, carousel transform 충돌, final pin 미해제가 대표적이다.

## 검증 계약

`verification.viewportSelector`, `pinSelector`, `trackSelector`, `mobileFallbackSelector`, `stateAttribute`, `expectedStates`를 plan에 기록한다. Motion QA는 0/0.25/0.5/0.75/1에서 실제 track 이동이 `track.scrollWidth - viewport.clientWidth`와 맞는지, meaningful state, document overflow, final pin release, mobile fallback, reduced motion을 검사한다.

## 완료 체크리스트

track distance, 시작/끝, resize, mobile fallback, focus order, overflow, release, reduced motion을 확인한다.

## 선택 가능한 옵션

pin spacing, progress easing, mobile breakpoint는 plan 근거가 있을 때만 조정한다.
