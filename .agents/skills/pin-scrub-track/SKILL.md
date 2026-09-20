---
name: pin-scrub-track
description: 스크롤 구간에 고정된 요소의 시작·중간·종료 상태와 pin 해제를 결정적으로 구현하고 검증한다.
---

# 핀 스크럽 트랙

## 트리거

명확한 sticky/pin 구성과 스크롤 진행률에 따른 연속 상태 변화가 있을 때 사용한다.

## 사용할 때

pinned scene, graph/path progression, long sequential section처럼 시작·중간·끝 계약이 필요할 때 사용한다.

## 사용하지 않을 때

단순 reveal, 일반 sticky header, 진행률과 무관한 fixed element에는 사용하지 않는다.

## 필요한 근거

root, `sampleSelector`, scroll range, expected states, 필요 시 `pinSelector`를 plan에 기록한다.

## DOM / 상태 계약

scroll container, pin wrapper, animated sample을 분리하고 document 좌표의 trigger와 viewport 진행률을 명확히 연결한다.

## 구현 원칙

거리와 진행률은 런타임 geometry로 계산한다. layout transform과 scrub transform은 별도 wrapper가 소유한다.

## responsive

resize 후 trigger/range를 다시 측정하며 좁은 화면에서 과도한 sticky 높이와 가로 overflow를 막는다.

## touch

native vertical scroll을 보존하고 touch gesture를 불필요하게 가로채지 않는다.

## accessibility

핵심 콘텐츠의 DOM 순서와 읽기 가능성을 progress와 무관하게 유지한다.

## prefers-reduced-motion

scrub을 멈추고 핵심 콘텐츠가 보이는 안정 상태를 제공한다.

## 주요 구현 함정

문서/viewport 높이 혼동, stale range, transform 충돌, 끝에서 남는 pin, 숨겨진 필수 콘텐츠가 대표적이다.

## 검증 계약

`verification.expectedStates`는 registry의 `start/intermediate/final/pin-released`와 일치해야 한다. Motion QA는 trigger 도달 후 0/0.25/0.5/0.75/1 sample에서 semantic state coverage, meaningful progression, runtime error, overflow, final visibility, 실제 pin release, reduced motion을 검사한다. transform 변화만으로 PASS하지 않으며 계약이 없으면 `DEFERRED`다.

## 완료 체크리스트

trigger 도달, expected state coverage, resize, mobile, final release, reduced motion을 확인한다.

## 선택 가능한 옵션

scrub smoothing, range, pin spacing은 시안과 plan 근거가 있을 때만 조정한다.
