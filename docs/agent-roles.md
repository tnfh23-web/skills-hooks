# Codex 프로젝트 에이전트 역할

프로젝트 설정은 `.codex/config.toml`, 역할별 정의는 `.codex/agents/*.toml`에 둔다. 이 설정은 앞으로 이 프로젝트에서 생성되는 subagent에 적용되며 이미 실행 중인 세션을 소급 변경하지 않는다.

| 역할 | 모델 | 추론 강도 | 기본 권한 |
|---|---|---:|---|
| Main | gpt-5.6-sol | high | 현재 세션 권한 |
| Planner / Design Director | gpt-5.6-sol | high | read-only |
| Verifier / Visual Critic | gpt-5.6-sol | high | read-only |
| General UI Coder | gpt-5.6-luna | medium | workspace-write |
| Motion Coder | gpt-5.6-terra | high | workspace-write |
| Debugger | gpt-5.6-terra | high | read-only |
| Explorer | gpt-5.6-terra | medium | read-only |

Planner는 plan과 분류를, Verifier는 시각/의미 증거를, Coder는 명시된 범위의 구현을, Debugger는 재현과 원인 진단을, Explorer는 읽기 전용 탐색을 담당한다. 같은 파일을 동시에 쓰는 역할은 만들지 않는다. Visual/Interaction/Motion/Geometry/Responsive QA는 Node/Playwright 도구이며 LLM 모델을 사용하지 않는다.

형식과 필드는 OpenAI의 [Codex Subagents 문서](https://learn.chatgpt.com/docs/agent-configuration/subagents?translationFallback=es-419)를 따르고, main 모델 ID는 [GPT-5.6 Sol 공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-5.6-sol)를 기준으로 했다.
