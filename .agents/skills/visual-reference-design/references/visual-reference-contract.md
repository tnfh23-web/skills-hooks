# Visual Reference Contract

## 파일 구조

```text
work/design/visual-reference/
├─ visual-direction.json
├─ section-reference-manifest.json
├─ visual-reference-review.json
└─ <section artifacts or generation brief>
```

모든 artifact는 이 디렉터리 안에 둔다. `work/design/`은 review 작업 영역이며 production source가 아니다.

## visual-direction.json

필수 top-level 필드:

```json
{
  "visualConcept": "...",
  "mediaStrategy": {
    "dominance": "...",
    "role": "...",
    "source": "...",
    "treatment": "...",
    "primaryMedium": "project imagery",
    "rationale": "..."
  },
  "composition": {
    "hero": "...",
    "sectionAnchors": [],
    "scaleRhythm": "...",
    "depthStrategy": "..."
  },
  "typographyBehavior": "...",
  "backgroundStrategy": "...",
  "cropGrammar": "...",
  "signatureVisualDevices": [],
  "assetRequirements": [],
  "avoid": [],
  "referenceStrategy": {
    "capability": "AVAILABLE",
    "status": "READY",
    "mode": "GENERATED_SECTION_REFERENCES",
    "rationale": "..."
  }
}
```

`primaryMedium`은 `photography`, `project imagery`, `illustration`, `3D`, `video`, `texture/material`, `generative visual`, `typography-only` 중 하나다. `typography-only`에는 `typographyOnlyRationale`의 `reason`, `mediaUnnecessaryBecause`, `productionValueSource`가 추가로 필요하다.

image generation을 실제 사용할 수 없으면 `capability: "UNAVAILABLE"`, `status: "VISUAL_REFERENCE_TOOL_UNAVAILABLE"`을 유지하고 mode는 `LOCAL_COMPOSITION_PROTOTYPE` 또는 `ART_DIRECTION_BRIEF`만 허용한다. unavailable을 `READY`로 바꾸어 통과시킬 수 없다.

## section-reference-manifest.json

```json
{
  "version": 1,
  "strategy": "GENERATED_SECTION_REFERENCES",
  "sections": [
    {
      "sectionId": "hero",
      "role": "opening scene",
      "artifact": "visual-reference/hero.png",
      "evidenceType": "generated-section-reference",
      "reviewable": true
    }
  ]
}
```

artifact path는 `work/design/visual-reference/` 내부여야 하고, 파일은 비어 있으면 안 된다. PNG는 decode 가능하고 양의 width/height를 가져야 한다.

## visual-reference-review.json

`version`, `status`, `reviewedArtifacts[]`, `issues[]`가 필요하다. available 또는 local composition fallback은 Critic `PASS`가 필요하다. local fallback은 `limitations[]`를 반드시 기록한다. `ART_DIRECTION_BRIEF`는 `VISUAL_REFERENCE_TOOL_UNAVAILABLE`을 유지하며 Composer를 차단한다.

Critic은 visual hierarchy, media가 layout material로 작동하는지, section scale/rhythm, crop와 layering, brand specificity, implementation readability를 검토한다.

## Rendered critique 연결

최종 `design-critique.json`은 기존 AI-TELL audit 외에 다음을 가진다.

- `productionValueAudit`: `materialEssential`, `mediaStructural`, `scaleVariation`, `compositionVariation`, `depthBeyondShadow`, `mediaPresence`, `postHeroIntensity`, `memorableAnchors`, `brandLinkedTreatment`, `brandSpecificity` 각 check의 PASS/FAIL과 화면 evidence를 기록한다.
- `visualFidelityReview`: `comparedArtifacts[]`와 함께 승인된 visual direction/section references와 rendered prototype의 차이를 기록한다.

두 audit이 PASS가 아니면 `DESIGN_READY`가 될 수 없다. 미적 판단은 Critic이 하고 gate는 필드, status와 실제 artifact만 검증한다.
