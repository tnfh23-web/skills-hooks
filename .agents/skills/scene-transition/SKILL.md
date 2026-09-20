---
name: scene-transition
description: 이전·현재·다음 장면의 전환과 최종 안전 상태를 스크롤 진행률 계약으로 구현하고 검증한다.
---

# 장면 전환

## 트리거

outer/inner reveal, crossfade, background offset, active scene처럼 장면 단위 전환 근거가 있을 때 사용한다.

## 사용할 때

previous/current/next 상태와 최종 안전 상태를 함께 관리해야 하는 sequential composition에 사용한다.

## 사용하지 않을 때

모든 section에 반복되는 fade-up이나 단일 element reveal에는 사용하지 않는다.

## 필요한 근거

scene root, `sampleSelector`, expected states, transition family, final state를 plan에 기록한다.

## DOM / 상태 계약

scene collection과 하나의 active scene 상태를 둔다. inactive scene의 z-index/pointer-events를 정리하고 DOM 읽기 순서를 보존한다.

## 구현 원칙

outer, inner, background, crossfade를 하나의 강제 구현으로 합치지 않고 plan의 family만 조합한다.

## responsive

branch마다 scene 수와 진행 구간을 다시 계산하고 hidden branch animation을 중지한다.

## touch

native scroll을 유지하고 작은 화면에서 전환이 읽기나 tap을 막지 않게 한다.

## accessibility

active 상태를 의미적으로 노출하고 inactive 장면 때문에 focus가 숨겨지지 않게 한다.

## prefers-reduced-motion

순서와 핵심 콘텐츠가 보존되는 정적 또는 즉시 전환 상태를 제공한다.

## 주요 구현 함정

동시 active scene, stale z-index, 중간 opacity에 남은 본문, 마지막 overlay/pin 미해제가 대표적이다.

## 검증 계약

5개 sample에서 최소 세 개의 의미 있는 상태, expected state coverage, final safe state, overflow, runtime error, reduced motion을 검사한다.

## 완료 체크리스트

previous/current/next, outer/inner/background, sequential activation, final release, mobile, reduced motion을 확인한다.

## 선택 가능한 옵션

crossfade, clip, offset, overlap duration은 reference 또는 DESIGN_MODE 근거가 있을 때만 선택한다.
