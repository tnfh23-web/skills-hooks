---
name: carousel-state
description: 슬라이드, 카운터, 페이지네이션, 진행률, 썸네일, ARIA 상태가 하나의 index에서 동기화되는 캐러셀을 구현하고 검증한다.
---

# 캐러셀 상태

## 트리거

반복/클리핑된 slide와 prev/next, pagination, counter, progress, thumbnail 또는 active 표시가 둘 이상 함께 보일 때 사용한다.

## 사용할 때

여러 상태 표현이 하나의 현재 slide index에서 파생돼야 하는 carousel/slider에 사용한다.

## 사용하지 않을 때

조작 근거가 없는 정적 gallery, 단순 overflow row, slide가 하나뿐인 장식에는 사용하지 않는다.

## 필요한 근거

`interaction-plan.json`에 root, slide, control, 존재하는 projection, autoplay/loop/swipe 근거를 기록한다.

## DOM / 상태 계약

0부터 시작하는 하나의 `index`만 상태 소유자로 둔다. active slide, 1 기반 current, total, pagination, progress, thumbnail, `aria-current`, `aria-selected`는 모두 이 index에서 파생한다.

## 구현 원칙

index를 한 번만 갱신하고 모든 projection을 한 render에서 동기화한다. 이동 transform은 carousel/library가 소유하며 motion wrapper가 덮어쓰지 않는다.

## responsive

desktop/mobile create·destroy 시 이전 instance를 정리한다. 숨겨진 두 instance를 동시에 autoplay하지 않는다.

## touch

swipe는 button을 보완할 수 있지만 같은 index를 갱신하고 과도한 page scroll 차단을 피한다.

## accessibility

control에 이름을 주고 현재 상태를 의미적으로 노출한다. 복제 slide는 중복 focus/낭독을 만들지 않는다.

## prefers-reduced-motion

autoplay와 큰 전환을 끄되 수동 navigation과 상태 동기화는 유지한다.

## 주요 구현 함정

독립 counter, 중복 active class, stale pagination/thumbnail, hidden instance autoplay, transform 충돌, QA와 autoplay race가 대표적이다.

## 검증 계약

이동 뒤 active slide = current = pagination = progress/thumbnail이어야 한다. 일부 projection만 바뀌면 FAIL이다.

## 완료 체크리스트

next, previous, boundary/loop, counter, pagination, progress, thumbnail, ARIA, mobile 전환, overflow, reduced motion을 확인한다.

## 선택 가능한 옵션

wrap, autoplay, duration, swipe threshold를 선택할 수 있지만 두 번째 상태 소유자를 만들 수는 없다.
