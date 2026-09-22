# Design Contract

## 왜 이 디자인인가

모든 주요 결정은 `brand`, `audience`, `contentPriority`, `communicationGoal`, `designThesis` 중 하나 이상의 근거를 가져야 한다. 취향, 유행, 무작위 선택만으로 결정하지 않는다.

## Design Plan SSOT

`work/design/design-plan.json`은 다음 top-level 필드를 모두 가진다.

`brief`, `designRead`, `designThesis`, `dials`, `visualLanguage`, `signatureDevices`, `typography`, `palette`, `shapeLanguage`, `assetStrategy`, `sectionPlan`, `motionDirection`, `avoidedDefaults`.

`designRead`에는 `pageKind`, `audience`, `brandPersonality`, `contentPriority`, `communicationGoal`, `desiredEmotion`, `constraints`가 필요하다.

`dials`의 `designVariance`, `motionIntensity`, `visualDensity`는 각각 `{ "value": <number>, "reason": "..." }` 형태다. 수치를 무작위로 고르지 않는다.

각 `sectionPlan` 항목은 기존 관계 필드에 더해 `sectionRole`, `mediaRole`, `compositionAnchor`, `scaleContrast`, `depthMode`, `backgroundMode`, `transitionIntent`를 가진다. 섹션을 독립 카드 묶음으로 만들지 말고 앞뒤 관계와 visual intensity 변화를 설명한다.

`motionDirection`은 `motionCharacter`, `primaryMovement`, `secondaryMovement`, `continuousMovement`, `sectionEntryVariation`, `pointerUsage`, `scrollUsage`, `restraint`를 가진다. conceptual direction만 기록하고 production primitive는 기존 Publishing Interaction Authoring에 맡긴다.

## 역할별 산출물

- Design Director: brief, Design Read, thesis, dials, visual language, signature device, typography/palette 방향, asset strategy, motion character, avoided defaults와 evidence.
- Design Art Director: visual concept, media/crop/scale/depth/background strategy, section anchors, asset requirements와 visual reference strategy.
- UI Planner: 승인된 art direction의 consistency lock, signature devices, section composition, restraint.
- Design Composer: 승인된 visual reference를 번역한 `work/design/prototype/`, `asset-manifest.json`, review target.
- Visual Critic: visual reference 선행 review와 실제 screenshot 기반 `design-critique.json`; AI-TELL, production value와 fidelity audit; 모든 issue에 valid `rootOwner`.

## Critique 계약

`status`는 `PASS`, `FAIL`, `DESIGN_REVIEW_BLOCKED` 중 하나다. `renderedReview`, `revisionCount`, `aiTellAudit`, `productionValueAudit`, `visualFidelityReview`, `issues[]`를 기록한다. issue의 `rootOwner`는 `DESIGN_DIRECTOR`, `DESIGN_ART_DIRECTOR`, `UI_PLANNER`, `DESIGN_COMPOSER`, `VISUAL_CRITIC` 중 하나다. blocking issue는 `blocking: true`, 해결되면 `resolved: true`로 표시한다.

## Review와 handoff

필수 산출물은 `visual-reference/visual-direction.json`, `visual-reference/section-reference-manifest.json`, `visual-reference/visual-reference-review.json`, 각 manifest artifact, `review/desktop.png`, `review/tablet.png`, `review/mobile.png`, `design-plan.json`, `design-critique.json`, `asset-manifest.json`, `handoff.json`이다. 모두 `work/design/` 아래에 있고 Git에 포함하지 않는다.

Design-only는 frozen handoff 뒤 멈춘다. Design-and-publish는 desktop screenshot을 기존 `reference-publish`의 primary reference로 전달한다. tablet/mobile과 plan은 responsive intent이며, 기존 Publishing QA와 Stop Hook을 대체하거나 우회하지 않는다.
