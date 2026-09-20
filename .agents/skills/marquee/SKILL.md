---
name: marquee
description: 클리핑, 중복 콘텐츠 접근성, 반응형, reduced motion을 보장하는 연속 marquee를 구현하고 검증한다.
---

# 마키

## 트리거

명확한 ticker/marquee 근거 또는 DESIGN_MODE의 continuous-motion 결정이 있을 때 사용한다.

## 사용할 때

하나의 완전한 콘텐츠 그룹이 끊김 없이 반복돼야 할 때 사용한다.

## 사용하지 않을 때

일반 가로 배치, 핵심 form/control, REFERENCE_MODE에서 근거 없는 장식에는 사용하지 않는다.

## 필요한 근거

clipping viewport, moving track, original, complete duplicate, 방향·속도 목적을 plan에 기록한다.

## DOM / 상태 계약

`viewport > track > original + duplicate`를 사용한다. viewport는 clipping, track은 transform을 소유한다. duplicate는 `aria-hidden="true"`이며 focus 가능한 control을 포함하지 않는다.

## 구현 원칙

flex shrink를 막고 정확히 한 반복 그룹 너비만 이동한다. 빈 reset frame을 만들지 않는다.

## responsive

각 너비에서 반복 그룹을 다시 측정하고 document horizontal overflow를 만들지 않는다.

## touch

hover pause를 유일한 조작 경로로 요구하지 않는다.

## accessibility

duplicate의 중복 낭독과 focus를 차단하고 original 정보는 정상 DOM에 유지한다.

## prefers-reduced-motion

loop를 정지하고 읽을 수 있는 original 콘텐츠를 보인다.

## 주요 구현 함정

clipping wrapper 자체 animation, 잘못된 width 측정, 불완전 duplicate, transform 충돌, 짧은 track의 빈 공간이 대표적이다.

## 검증 계약

실제 movement, complete duplicate, seamless width, duplicate 접근성 제외, clipping, overflow 부재, reduced motion을 검사한다.

## 완료 체크리스트

desktop/mobile width, seam, duplicate focus, overflow, reduced motion을 확인한다.

## 선택 가능한 옵션

direction, speed, gap, pause/slow는 plan 근거가 있을 때만 사용한다.
