---
name: interaction-plan
description: 실제 DOM과 레퍼런스에서 상호작용 검증 후보를 발견하고 자동 QA용 interaction-plan.json 계약을 작성한다. 새 사이트의 디자인 콘셉트를 대신하지 않는다.
---

# 상호작용 QA 계약

`work/interaction-plan.json`은 DOM selector·상태·검증 경로를 연결하는 자동 QA의 단일 계약이다. 코드 이전의 디자인 방향과 콘텐츠별 인터랙션은 `frontend-experience`에서 설계한다. DOM 관찰이나 primitive 추천이 디자인 품질을 보증하지 않는다.

## 발견과 검토

```powershell
npm run qa:interaction-plan -- --url <page> --mode reference --source-root <target-project> --output work/interaction-plan.json
npm run qa:interaction-plan:validate -- --validate work/interaction-plan.json
```

`reference`에서는 reference state·source annotation·명확한 DOM affordance를 근거로 삼는다. HIGH는 검증하고 MEDIUM은 보수적으로 판단하며 LOW 추정은 `skip`한다. 장식만 보고 새로운 기능을 만들지 않는다.

새 디자인에서 결정한 모션을 QA 계약에 연결할 때만 `design` 모드를 사용한다. **작성한 motion language가 필수**이며 고정된 기본 디자인을 자동 생성하지 않는다.

```powershell
npm run qa:interaction-plan -- --url <page> --mode design --motion-language work/motion-language.json --source-root <target-project> --output work/interaction-plan.json
```

`motion-language.json`은 `character`, `pace`, `preferredFamilies`, `bannedFamilies`, `sectionEntryVariation`, `pointerUsage`, `continuousMotionUsage`, `scrollStory`를 가진 JSON 객체다. 필요한 경우 `preferredPrimitives`/`bannedPrimitives` 배열도 사용한다. 문자열 제약은 [corpus 문서](../../../docs/interaction-corpus.md)의 도구 동작 설명을 확인한다.

발견된 후보와 실제 인터랙션 맵을 대조한다. 누락된 selector·상태·모바일/움직임 감소 동작을 명시하고 다시 검증한다. 자동 추천을 그대로 복사하거나, 검증기가 미지원인 경험을 구현하지 말아야 할 경험으로 해석하지 않는다.

## 유지할 도구 계약

- `interactionLanguage`, `actionableAuthoring`, 후보별 `authoring`, `interactionComposition`과 `coverage.actionable`의 연결을 유지한다. behavior와 hover/focus/active feedback은 별도로 검증한다.
- semantic type → intent → family → primitive는 QA의 분류 체계다. 특정 효과를 모든 섹션에 강제하는 디자인 레시피가 아니다.
- reference 근거 없는 enhanced motion은 skip한다. design 모드의 preferred/banned family와 primitive는 작성한 방향을 반영해야 한다.
- 상태 전이는 Interaction QA, 지속/스크롤 모션은 Motion QA로 보낸다. carousel·marquee·pin/scrub·scene·split text·horizontal pin은 해당 패턴 스킬을 필요할 때 읽는다.
- pointer/WebGL 등 자동 계약 밖의 경험은 `DEFERRED`/`UNSUPPORTED`로 남기고 직접 브라우저 검증을 추가한다. 미지원은 자동 PASS가 아니다.
- 기존 anti-generic 검사는 반복 primitive에 대한 도구 검사다. 그 검사의 PASS를 “AI 티가 없다”는 시각 판단으로 보고하지 않는다.
