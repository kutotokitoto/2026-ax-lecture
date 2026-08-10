# CLAUDE.md

이 저장소에서 작업할 때 참고할 규칙입니다.

## 프로젝트 개요

바이브 코딩(vibe coding) 강의 자료 사이트입니다. 강의본과 예제 웹앱을 정적 HTML로 제공합니다.

- 최상위 `index.html` — 랜딩 페이지. 모든 강의본·예제로 가는 진입점입니다.
- `lectures/lecture-01` ~ `lecture-06` — 강의본. 각 폴더에 `index.html` 하나.
- `apps/app-a` ~ `app-h` — 예제 웹앱. 각 폴더에 `index.html` 하나.

강의본과 예제의 실제 내용은 사용자가 차차 전달합니다. 현재는 모두 자리표시자 상태입니다.

## 규칙

1. **빌드 도구를 도입하지 않습니다.** npm, 번들러, 프레임워크 없이 순수 HTML/CSS/JS로 작성합니다.
   `index.html`을 브라우저에서 바로 여는 것만으로 동작해야 합니다.
2. **외부 리소스에 의존하지 않습니다.** CDN 스크립트, 웹폰트, 원격 이미지를 쓰지 않습니다.
   필요하면 CSS/JS는 인라인으로, 이미지는 data URI로 넣습니다.
3. **경로는 상대 경로**로 씁니다. 하위 페이지에서 랜딩으로 돌아갈 때는 `../../index.html`.
4. **테마**: CSS 변수로 색을 정의하고 `prefers-color-scheme: dark`에서 변수만 재정의합니다.
   색을 미디어 쿼리 안에서만 정의하지 않습니다.
5. **폰트 스택**은 기존 페이지와 동일하게 유지합니다:
   `Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif`
6. **폴더를 추가·삭제하면** 최상위 `index.html`의 카드 목록과 `README.md`의 구조 트리를 함께 갱신합니다.
   세 곳이 어긋나지 않게 합니다.
7. **파일 인코딩은 UTF-8**, 문서 언어는 `<html lang="ko">`입니다.
8. **명명 규칙**: 폴더는 소문자 케밥 케이스. 강의는 `lecture-NN`(2자리 0채움), 예제는 `app-x`(소문자 한 글자).
9. **외부에서 가져온 자료는 standalone 번들 대신 디번들 원본을 씁니다.** 번들은 15MB급이고 편집이 불가능합니다.
   원본 폴더에 `.dc.html` + `support.js`가 있으면 그쪽을 가져옵니다. `lecture-01`이 이 방식입니다.
   위 1·2·5번 규칙은 이렇게 가져온 자료에는 적용하지 않습니다(외부 CDN 의존을 허용).
10. **커밋 앤 푸시는 기본 동작입니다.** 사용자가 별도로 말하지 않아도 작업을 마치면 커밋하고 origin에 푸시합니다.

## dc 문서(`lecture-01`) 다룰 때

`lectures/lecture-01/index.html`은 dc 런타임(`support.js`)이 렌더하는 문서입니다. 일반 HTML이 아닙니다.

- 구조: `<x-dc>` 안이 템플릿(`{{ 보간 }}`, `<sc-if>`), 문서 끝 `<script type="text/x-dc" data-dc-script>`가 상태·로직.
- 부팅 시 `support.js`가 `<x-dc>` 엘리먼트 **하나만** `#dc-root`로 교체합니다.
  따라서 back 링크처럼 남겨야 하는 마크업은 `<body>` 직속 자식으로 둡니다.
- **`<body>`와 `<x-dc>` 사이 영역에 dc 루트 여는 태그와 같은 문자열을 쓰지 않습니다. 주석 안이라도 안 됩니다.**
  런타임이 `fetch(location.href)`로 원본을 다시 받아 정규식으로 파싱하는데, 첫 매칭을 템플릿 시작점으로 잡습니다.
  실제로 이 문제로 주석 잔여 텍스트가 화면에 노출된 적이 있습니다.
- React·ReactDOM·Babel을 unpkg에서, 픽셀 폰트를 jsdelivr·Google Fonts에서 받습니다. 오프라인에서는 렌더되지 않습니다.

## 작업 시 주의

- Windows PowerShell 5.1 환경입니다. `.ps1` 스크립트에 한글을 넣을 때는 UTF-8 BOM을 붙여야 파싱이 깨지지 않습니다.
- 하위 페이지 레이아웃은 서로 일관되게 유지합니다. 새 페이지는 기존 자리표시자 페이지(`lectures/lecture-02/index.html`)를 기준으로 삼습니다.
  `lecture-01`은 형식이 달라 기준이 되지 않습니다.
- 렌더 검증이 필요하면 헤드리스 크롬을 씁니다:
  `chrome --headless=new --virtual-time-budget=15000 --dump-dom <url>` (로컬 서버 필요).
