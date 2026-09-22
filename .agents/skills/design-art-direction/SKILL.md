---
name: design-art-direction
description: Design Director의 브랜드·콘텐츠 thesis를 구현 전 화면 구성, media 전략, visual material과 section별 art direction으로 구체화한다.
---

# Design Art Direction

Design Director의 WHY를 화면의 WHAT으로 바꾼다. production HTML/CSS를 쓰거나 미리 정한 스타일 recipe를 무작위 선택하지 않는다.

## 입력과 산출물

1. `work/design/design-plan.json`의 brief, Design Read, thesis, dials와 제약을 읽는다.
2. 실제 사용 가능한 local asset/font와 현재 세션의 image generation capability를 확인한다. 도구 이름이나 과거 세션을 근거로 사용 가능하다고 추측하지 않는다.
3. `work/design/visual-reference/visual-direction.json`에 아래를 구체적으로 결정한다.
   - visual concept, hierarchy, dominant material과 media dominance
   - image role, source, treatment와 crop grammar
   - scale contrast, composition anchors, background modes
   - typography behavior, materiality, depth strategy
   - section visual rhythm, signature visual device, visual restraint
   - 필요한 asset과 피해야 할 구현 shortcut
4. 각 major section의 `sectionRole`, `visualAnchor`, `mediaRole`, `compositionAnchor`, `scaleContrast`, `depthMode`, `backgroundMode`, `transitionIntent`, `interactionOpportunity`, `restraint`를 UI Planner가 사용할 수 있게 명시한다.

`modern`, `bold`, `premium`, `creative` 같은 형용사만으로 끝내지 않는다. 어떤 재료가 어떤 크기·crop·foreground/background 관계로 화면을 지배하는지 설명한다.

## 판단 원칙

- brief와 audience에 맞는 한 visual language를 유지하되 section마다 scale, density, anchor와 background intensity를 의도적으로 조절한다.
- `text-left/image-right`, centered hero, three equal cards를 자동 시작점으로 삼지 않는다. 필요한 경우에는 이유를 기록한다.
- 이미지는 단순 `<img>`가 아니라 crop, masking, layering, type와 section boundary의 관계를 가진 layout material로 계획한다.
- creative agency, portfolio, brand, campaign, editorial, premium marketing처럼 visual-heavy한 page kind는 photography, project imagery, illustration, 3D, video, texture/material, generative visual, typography-only 중 하나를 명시한다.
- typography-only는 giant type + mono label + thin line + CSS rectangle로 도피하는 선택이 아니다. media가 불필요한 브랜드·콘텐츠 근거를 별도 rationale로 남긴다.
- composition vocabulary는 후보군이다: full-bleed media, image-as-canvas, off-grid editorial, layered overlap, split field, cropped edge, vertical stage, pinned visual stage, gallery-led composition, poster composition, negative-space composition, spatial type + media, media bleed, masked media, stacked scene. preset처럼 한 개를 강제하거나 무작위 선택하지 않는다.

## 경계

- React, Next.js, Tailwind, CDN, Google Fonts, 특정 font pool을 전제하지 않는다.
- AIDA, bento, massive spacing, serif, WebGL 또는 특정 hero architecture를 품질 공식으로 강제하지 않는다.
- motion 구현 recipe는 만들지 않는다. visual contract에는 미래 handoff를 위한 `transitionIntent`와 `interactionOpportunity`만 남긴다.
- 기존 Publishing Workflow와 QA는 수정하거나 우회하지 않는다.

ULDesign, PLAN-AZ, Plus X, DOES, Atoll Digital, RAYRAYlab, Studio X Lab, NineOneLabs, Remain Layer, GLIQ, V-W는 복제 대상이 아니라 quality-range 참고다. 색·hero·WebGL을 따라 하지 말고 real media, 큰 scale 변화, section-specific scene, spatial composition과 brand-specific interaction이 production value를 만드는 이유만 추출한다.

Visual Reference를 만들 때는 `visual-reference-design` Skill과 그 contract를 따른다.
