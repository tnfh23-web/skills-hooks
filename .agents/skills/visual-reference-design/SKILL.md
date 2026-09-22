---
name: visual-reference-design
description: production 코드보다 먼저 section별 visual reference를 만들고 승인해 Design Composer가 구현할 단일 visual intent를 확정한다.
---

# Visual Reference Design

`design-art-direction`이 승인한 방향을 production implementation과 분리된 시각 증거로 만든다. 시작 전 [visual-reference-contract.md](references/visual-reference-contract.md)를 전부 읽는다.

## 필수 흐름

1. 현재 세션에 실제 image generation capability가 노출됐는지 확인하고 결과를 `visual-direction.json.referenceStrategy`에 기록한다.
2. 사용 가능하면 major section별로 충분히 크게 검수 가능한 독립 reference를 만든다. 여러 section을 작은 한 장의 board로 압축하거나 기존 큰 이미지를 잘라 section reference인 척하지 않는다.
3. 사용할 수 없으면 `VISUAL_REFERENCE_TOOL_UNAVAILABLE`을 보존하고 둘 중 하나를 명시적으로 선택한다.
   - `ART_DIRECTION_BRIEF`: 사용자가 생성/제공할 수 있는 구체적 brief를 만든다. 이 경로는 Design Composer 진입을 허용하지 않는다.
   - `LOCAL_COMPOSITION_PROTOTYPE`: `work/design/visual-reference/` 안에 production source와 분리된 composition artifact를 만들고 limitation을 기록한다.
4. `section-reference-manifest.json`에 section과 artifact의 대응을 기록한다.
5. Visual Critic이 실제 artifact를 검토해 `visual-reference-review.json`을 작성한다. 승인 전에는 Design Composer가 prototype을 만들 수 없다.

## Fidelity 기준

reference는 layout, hierarchy, spacing, type scale, media treatment, crop, section rhythm과 composition anchor를 구현 가능한 수준으로 보여야 한다. 멋있지만 구조를 읽을 수 없는 추상 이미지는 frontend reference가 아니다.

Design Composer는 승인된 visual direction, section references, design plan, 구현 제약 순서로 번역한다. reference의 layered image composition을 평범한 two-column grid로 바꾸는 식의 재설계는 허용하지 않는다.

## 금지

- 존재하지 않는 생성 파일이나 capability를 `generated` 또는 `PASS`로 기록하지 않는다.
- production HTML/CSS를 먼저 만든 뒤 그 screenshot을 선행 visual reference라고 부르지 않는다.
- framework, font, CDN 또는 motion library를 자동 선택하지 않는다.
- 기존 Publishing reference/QA를 대체하지 않는다.

Composer 진입 전 `node tools/design-visual-reference.mjs --design-dir work/design --for-composer`로 evidence를 확인한다.
