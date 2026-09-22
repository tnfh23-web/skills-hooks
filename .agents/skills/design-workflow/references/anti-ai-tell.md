# Contextual Anti-AI-Tell Review

AI-TELL audit은 문자열 금지 목록이 아니라 실제 rendered composition의 반복 조합을 평가한다. 한 패턴만 존재한다는 이유로 자동 FAIL하지 않는다. 브랜드·독자·콘텐츠·communication goal에 근거가 있고 전체 시스템 안에서 역할이 분명하면 사용할 수 있다.

## 점검할 조합

- giant multiline headline 또는 centered hero + badge + 2 CTA가 내용보다 공식을 앞세우는 경우
- three equal cards, bento, repeated left/right zig-zag가 정보 구조와 무관하게 반복되는 경우
- 근거 없이 반복되는 pill/badge, CTA arrow, `01/02/03` 장식 label, rounded card와 soft shadow
- image마다 scale hover, card마다 translateY, 모든 section의 fade-up처럼 feedback/entry가 획일적인 경우
- marquee가 유일한 dynamic device이거나 디자인 부족을 움직임으로 가리는 경우
- random purple/blue glow, glassmorphism, gradient/blob/noise가 브랜드 근거 없이 결합되는 경우
- huge whitespace에 rhythm이 없거나 serif를 premium 공식으로 사용하는 경우
- `bento = creativity`, `dark + neon = tech` 같은 장르 shortcut이 content를 대신하는 경우
- 동일한 icon bubble, eyebrow, feature trio, logo cloud, testimonial card의 상투적 연쇄
- stock-like asset과 추상 장식이 브랜드 특성을 대신하거나 섹션이 component catalog처럼 나열되는 경우

## PASS 질문

1. signature device가 brief와 thesis에서 설명되는가?
2. typography, palette, shape가 일관되면서도 콘텐츠 위계를 실제로 전달하는가?
3. 섹션 간 전환과 밀도 변화가 intentional한가?
4. familiar pattern을 썼다면 이 문맥에서 필요한 이유가 있는가?
5. 제거해도 의미가 변하지 않는 장식이 핵심 개성을 가장하고 있지 않은가?

여러 generic pattern이 근거 없이 결합되어 페이지의 주된 인상을 만들면 FAIL issue로 기록한다. issue에는 화면 근거, 영향, 원인, `rootOwner`, 표적 수정 방향을 남긴다.
