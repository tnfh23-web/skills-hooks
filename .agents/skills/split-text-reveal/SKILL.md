---
name: split-text-reveal
description: 접근 가능한 원문을 보존하면서 문자·단어·행 분할 reveal을 구현하고 스크롤 상태를 검증한다.
---

# 분할 텍스트 리빌

## 트리거

word/line/character 단위 타이포그래피 모션이 reference 또는 DESIGN_MODE의 핵심일 때 사용한다.

## 사용할 때

분할 단위와 reveal 순서가 시각 구성의 의미를 만들 때 사용한다.

## 사용하지 않을 때

일반 제목, 정적 본문, 단순 fade로 충분한 텍스트에는 사용하지 않는다.

## 필요한 근거

분할 단위, 원문 selector, `sampleSelector`, expected states, font/resize 재계산 조건을 plan에 기록한다.

## DOM / 상태 계약

접근 가능한 원문과 읽기 순서를 보존한다. 시각 조각은 중복 낭독되지 않게 처리한다.

## 구현 원칙

font load 뒤 측정하고 layout transform과 glyph motion transform을 분리한다. JavaScript 실패 시 원문이 보여야 한다.

## responsive

line split은 resize 후 다시 계산하며 desktop 조각 좌표를 mobile 줄바꿈에 재사용하지 않는다.

## touch

touch 입력에 의존하지 않고 scroll/entry 상태만으로 전체 텍스트에 접근 가능해야 한다.

## accessibility

screen reader용 원문, 선택/복사, 의미 순서를 유지한다.

## prefers-reduced-motion

분할 모션 없이 원문 전체를 즉시 보인다.

## 주요 구현 함정

font 전 측정, duplicate narration, layout shift, resize 후 stale line, mobile wrapping 파손이 대표적이다.

## 검증 계약

시작·중간·완료 sample, expected state, 최종 가시성, overflow, runtime error, reduced motion을 검사한다.

## 완료 체크리스트

wrapping, accessibility text, font load, resize, layout shift, mobile, reduced motion을 확인한다.

## 선택 가능한 옵션

word/line/character, stagger, clip/mask는 근거가 있을 때만 선택한다.
