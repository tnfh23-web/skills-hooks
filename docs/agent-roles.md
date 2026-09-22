# Codex 프로젝트 에이전트 역할

프로젝트 설정은 `.codex/config.toml`, 역할별 정의는 `.codex/agents/*.toml`에 둔다. 이 설정은 앞으로 이 프로젝트에서 생성되는 subagent에 적용되며 이미 실행 중인 세션을 소급 변경하지 않는다. 기존 Planner/Verifier는 **Reference Publishing 역할**이며 새 Design Workflow 역할과 이름이나 책임을 합치지 않는다.

| 역할 | 모델 | 추론 강도 | 기본 권한 |
|---|---|---:|---|
| Main | gpt-5.6-sol | high | 현재 세션 권한 |
| Publishing Planner / Design Director | gpt-5.6-sol | high | read-only |
| Publishing Verifier / Visual Critic | gpt-5.6-sol | high | read-only |
| General UI Coder | gpt-5.6-luna | medium | workspace-write |
| Motion Coder | gpt-5.6-terra | high | workspace-write |
| Debugger | gpt-5.6-terra | high | read-only |
| Explorer | gpt-5.6-terra | medium | read-only |

Planner는 plan과 분류를, Verifier는 시각/의미 증거를, Coder는 명시된 범위의 구현을, Debugger는 재현과 원인 진단을, Explorer는 읽기 전용 탐색을 담당한다. 같은 파일을 동시에 쓰는 역할은 만들지 않는다. Visual/Interaction/Motion/Geometry/Responsive QA는 Node/Playwright 도구이며 LLM 모델을 사용하지 않는다.

## Design Workflow 역할

| 역할 | 모델 | 추론 강도 | 기본 권한 | 책임 |
|---|---|---:|---|---|
| Design Director | gpt-5.6-sol | high | read-only | brief, Design Read, thesis, dials와 근거 |
| Design Art Director | gpt-5.6-sol | high | read-only | media, crop, scale, depth, section별 visual art direction과 reference strategy |
| Design UI Planner | gpt-5.6-sol | high | read-only | visual language, consistency lock, section composition |
| Design Composer | gpt-5.6-luna | medium | workspace-write | 승인된 visual reference를 `work/design/` review prototype으로 번역 |
| Design Visual Critic | gpt-5.6-sol | high | read-only | visual reference 승인, Chromium fidelity, production value, contextual AI-TELL, root ownership |

Design 역할은 완성 reference가 없는 경로에서만 동작한다. Art Director는 Design Director의 WHY를 구현 전 visual WHAT으로 구체화하고, Composer는 승인된 visual reference 없이는 시작하지 않는다. Composer의 쓰기 범위는 review용 `work/design/`이며 production 구현은 frozen handoff 뒤 기존 Publishing 역할이 담당한다. Critic은 image generation capability나 screenshot이 없을 때 PASS를 추측하지 않고 각각 `VISUAL_REFERENCE_TOOL_UNAVAILABLE`, `DESIGN_REVIEW_BLOCKED`를 기록한다.

형식과 필드는 OpenAI의 [Codex Subagents 문서](https://learn.chatgpt.com/docs/agent-configuration/subagents?translationFallback=es-419)를 따르고, main 모델 ID는 [GPT-5.6 Sol 공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-5.6-sol)를 기준으로 했다.
