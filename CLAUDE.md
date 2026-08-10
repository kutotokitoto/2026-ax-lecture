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

## 작업 시 주의

- Windows PowerShell 5.1 환경입니다. `.ps1` 스크립트에 한글을 넣을 때는 UTF-8 BOM을 붙여야 파싱이 깨지지 않습니다.
- 하위 페이지 레이아웃은 서로 일관되게 유지합니다. 새 페이지는 기존 `lectures/lecture-01/index.html`을 기준으로 삼습니다.
