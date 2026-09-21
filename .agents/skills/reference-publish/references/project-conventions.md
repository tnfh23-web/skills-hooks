# 신규 퍼블리싱 프로젝트 convention

이 규칙은 앞으로 새로 생성하는 퍼블리싱 프로젝트의 기본값이다. 기존 프로젝트를 자동 rename하거나 강제로 재구성하지 않는다. 기존 구조 변경은 사용자가 명시적으로 요청한 경우에만 수행한다.

## 기본 구조

```text
project/
├─ index.html
├─ assets/
│  ├─ images/
│  ├─ icons/
│  └─ fonts/
├─ css/
│  ├─ fonts.css
│  ├─ reset.css
│  ├─ common.css
│  ├─ layout.css
│  ├─ responsive.css
│  └─ style.css
└─ js/
   ├─ common.js
   └─ script.js
```

- 이미지 파일은 `assets/images/`, SVG를 포함한 아이콘은 `assets/icons/`, local font는 `assets/fonts/`에 둔다.
- CDN font와 CDN asset을 기본값으로 사용하지 않는다.
- `index.html`은 CSS를 여러 개 직접 연결하지 않고 `<link rel="stylesheet" href="./css/style.css">` 하나만 연결한다.
- `style.css`는 entry 역할을 유지하며 아래 순서로 불러온다.

```css
@import url("./fonts.css");
@import url("./reset.css");
@import url("./common.css");
@import url("./layout.css");
@import url("./responsive.css");
```

- JavaScript는 `<script src="./js/common.js"></script>` 다음 `<script src="./js/script.js"></script>` 순서로 연결한다. `common.js`는 공통 UI/behavior, `script.js`는 페이지·section 전용 interaction을 담당한다.

## Section naming

주요 section root는 `[section-name]-sec`, content width·중앙 정렬·내부 layout boundary를 담당하는 wrapper는 `[section-name]-sec-grid`로 이름 짓는다.

```html
<section class="contact-sec">
  <div class="contact-sec-grid">
    ...
  </div>
</section>
```

`-sec-grid`는 CSS `display: grid` 사용을 뜻하지 않으며 max-width 같은 수치도 고정하지 않는다. 디자인 또는 reference에 맞는 layout을 선택한다. 주요 section에 `.section1`, `.section-wrap`, `.inner`, `.container`, `.area`, `.box` 같은 의미 없는 generic 이름을 기본값으로 사용하지 않는다. Component 내부 보조 class는 이 제한의 대상이 아니다.

## SVG와 icon 안전성

SVG asset을 사용하기 전에 내부 `fill`과 `stroke`를 확인한다. `currentColor` SVG를 `<img>`로 삽입했을 때 부모의 CSS `color`가 적용된다고 가정하지 않는다. 사용 배경과 상태에 따라 inline SVG, CSS mask, explicit fill/stroke variant, 제공된 light/dark variant 중 가장 안전한 방식을 선택한다. 모든 SVG를 일괄 inline 처리하거나 모든 stroke를 흰색으로 하드코딩하지 않는다.

Visual Critic은 actionable control의 존재와 상호작용뿐 아니라 실제 icon glyph가 배경과 구분되는지 확인한다. Dark/light 배경의 기본 상태와 hover/active 상태에서 icon과 배경이 같은 색으로 사라지지 않아야 하며, `<img>` SVG의 `currentColor` 상속을 검증 없이 전제하지 않는다. 이 책임은 기존 Visual Critic 범위이며 별도 Icon QA 시스템을 만들지 않는다.
