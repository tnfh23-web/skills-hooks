---
name: design-workflow
description: 완성된 시안 없이 웹 디자인이 필요한 요청에서 근거 기반 Design Plan, Chromium review, critique와 동결 가능한 디자인 패키지를 만든다.
---

# Design Workflow V1.1

이 Skill은 production 페이지를 직접 완성하지 않는다. `work/design/`의 review prototype과 디자인 계약을 만들어 기존 Publishing Workflow에 넘기거나 design-only 결과로 종료한다.

## 필수 순서

1. `references/design-contract.md`와 `references/anti-ai-tell.md`를 읽는다.
2. Design Director가 brief, Design Read, thesis, 근거 있는 dials, visual language, signature device, typography/palette 방향, asset strategy, motion character와 avoided defaults를 정한다.
3. `design-art-direction` Skill과 Design Art Director가 thesis를 media, crop, scale, depth, background와 section별 visual composition으로 구체화한다.
4. UI Planner가 visual direction을 section 관계와 consistency lock이 있는 `work/design/design-plan.json`으로 확정한다.
5. `visual-reference-design` Skill로 `work/design/visual-reference/`의 visual direction, section reference manifest와 review evidence를 만든다. 실제 image generation capability가 없으면 상태와 fallback을 숨기지 않는다.
6. Visual Critic이 visual reference를 먼저 승인한다. `node tools/design-visual-reference.mjs --design-dir work/design --for-composer`가 실패하면 Composer로 진행하지 않는다.
7. Design Composer가 승인된 visual reference를 `work/design/prototype/`과 `asset-manifest.json`으로 번역한다. 첫 visual decision maker가 되지 않는다.
8. `node tools/design-capture.mjs --url <prototype> --output work/design/review`로 desktop/tablet/mobile 실제 Chromium screenshot을 만든다.
9. Visual Critic이 rendered result와 approved visual direction의 fidelity, visual production value, contextual AI-TELL을 각각 `design-critique.json`에 기록한다. screenshot이 없으면 `DESIGN_REVIEW_BLOCKED`다.
10. blocking issue는 `rootOwner`에게만 돌려보낸다. 전체 재작성보다 원인 소유자의 표적 수정을 우선한다. 최대 3회이며 초과하면 `DESIGN_BLOCKED`다.
11. critique와 모든 audit가 PASS면 `design-handoff`를 실행한다.

에이전트가 미학을 판단하고, `tools/design-gate.mjs`는 계약과 증거만 검사한다. motion은 방향과 성격만 기록하며 기존 Interaction/Motion recipe를 복제하지 않는다. High-End Motion Corpus나 motion handoff architecture는 이 V1.1 범위가 아니다.
