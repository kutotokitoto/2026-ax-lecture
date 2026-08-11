# CLAUDE.md

이 저장소에서 작업할 때 참고할 규칙입니다.

## 프로젝트 개요

바이브 코딩(vibe coding) 강의 자료 사이트입니다. **구성은 닫혀 있습니다** — 임의로 항목을 늘리지 않습니다.

- 최상위 `index.html` — 랜딩 페이지. **레트로 아케이드 스타일**(강의 덱과 같은 픽셀 문법, 다크 고정 —
  규칙 4의 의도적 예외). 강의 덱과 동일한 소스의 픽셀 폰트(Galmuri11·Press Start 2P)를 CDN에서
  받습니다(규칙 2의 예외 — 오프라인이면 시스템 글꼴로 대체).
- `lectures/lecture-01` ~ `03` — 강의본 "AI 용사의 모험" 시리즈. **호칭은 '용사'입니다** ('전사' 아님 —
  2026-08-11에 전부 용사로 통일했습니다).
- `apps/app-a` ~ `app-d` — 예제 웹앱 4종.
- `playbook/` — 바이브 코딩 플레이북. 강의와 같은 dc 형식의 인터랙티브 문서(0부~5부, 목차·검색).

상세는 `README.md` 참고.

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
8. **명명 규칙**: 폴더는 소문자 케밥 케이스. 강의는 `lecture-NN`(2자리 0채움), 예제는 `app-x`(소문자 한 글자),
   플레이북은 `playbook`.
9. **외부에서 가져온 자료는 standalone 번들 대신 디번들 원본을 씁니다.** 번들은 15MB급이고 편집이 불가능합니다.
   원본 폴더에 `.dc.html` + `support.js`가 있으면 그쪽을 가져옵니다. `lecture-01`이 이 방식입니다.
   위 1·2·5번 규칙은 이렇게 가져온 자료에는 적용하지 않습니다(외부 CDN 의존을 허용).
10. **커밋 앤 푸시는 기본 동작입니다.** 사용자가 별도로 말하지 않아도 작업을 마치면 커밋하고 origin에 푸시합니다.

## dc 문서(`lecture-01`~`03`, `playbook`) 다룰 때

`lectures/lecture-01`~`03`과 `playbook`의 `index.html`은 dc 런타임(`support.js`)이 렌더하는 문서입니다. 일반 HTML이 아닙니다.
(플레이북은 helmet에 자체 `<title>`이 있어 head에 별도 title을 넣지 않았고, back 링크는 한 단계 위 `../index.html`입니다.)

- 구조: `<x-dc>` 안이 템플릿(`{{ 보간 }}`, `<sc-if>`), 문서 끝 `<script type="text/x-dc" data-dc-script>`가 상태·로직.
- 부팅 시 `support.js`가 `<x-dc>` 엘리먼트 **하나만** `#dc-root`로 교체합니다.
  따라서 back 링크처럼 남겨야 하는 마크업은 `<body>` 직속 자식으로 둡니다.
- **`<body>`와 `<x-dc>` 사이 영역에 dc 루트 여는 태그와 같은 문자열을 쓰지 않습니다. 주석 안이라도 안 됩니다.**
  런타임이 `fetch(location.href)`로 원본을 다시 받아 정규식으로 파싱하는데, 첫 매칭을 템플릿 시작점으로 잡습니다.
  실제로 이 문제로 주석 잔여 텍스트가 화면에 노출된 적이 있습니다.
- React·ReactDOM·Babel을 unpkg에서, 픽셀 폰트를 jsdelivr·Google Fonts에서 받습니다. 오프라인에서는 렌더되지 않습니다.
- **덱의 `chapters`/`nodes` 배열 인덱스는 슬라이드의 `data-i`/`data-chapter`와 일치해야 합니다.**
  어긋나면 월드맵·우측 내비가 챕터 중간으로 점프하고 하이라이트가 밀립니다 — lecture-03을 가져올 때
  실제로 이 버그(+1~+2 어긋남)를 수정했습니다. 검증은 슬라이드의 data-chapter 전환 지점을 실측해 대조합니다.
- 헤드리스 크롬에서는 rAF 스로틀 때문에 smooth scroll·rAF 의존 검증이 완주되지 않을 수 있습니다.
  장면 이동 검증은 scrollTop 직접 설정으로, 상태 검증은 DOM 덤프로 합니다.

## app-d (Quality Lab) 다룰 때

- **Plotly.js 3.7.0 고정 버전 CDN**(`plotly-3.7.0.min.js`)을 쓰는 유일한 앱입니다(규칙 2의 의도적 예외).
  `plotly-latest.min.js`는 v1.58에 동결된 함정이므로 금지. 버전을 올릴 때는 v3 breaking change
  (문자열 `layout.title` 불가, `transforms` 제거, surface `zmin/zmax` 제거)를 확인합니다.
- 렌더는 `newPlot` 1회 + 이후 전부 `Plotly.react`. 재생성 때 `newPlot`을 다시 부르면
  WebGL 컨텍스트가 누적되어 3D가 죽습니다. `uirevision`/`scene.uirevision`은 seed로 키잉되어 있습니다.
- 상태 변이는 `setFilters`/`setSelection`/`regenerate` 세 함수로만 합니다. 산점도 선택은
  하이라이트 전용(필터 아님)이고, 선택 스코프 렌더에서 산점도는 `restyle`만 받습니다.
- 데이터 생성기를 수정하면 `node tools/qlab-check/check.js`를 돌립니다(HTML에서 인라인 코드를
  직접 추출해 고정 8시드 + 200시드 스윕 검사 — Cpk 0.75~1.35, |r| 0.55~0.8, 불량률 3~6.5%, 파레토 지배 40~75%).
- `?seed=N` = 데이터 고정(스크린샷 재현), `?line=L3`·`?lot=L3-01` = 필터 딥링크(강의 슬라이드용),
  `?selftest` = 연동 자가 검증(결과는 `<pre id="selftest-out">`와 document.title의 SELFTEST-PASS/FAIL).
  헤드리스 검증 시 rAF가 멎을 수 있어 렌더 스케줄러는 setTimeout 기반입니다.
- 관리도는 군 크기 n=5(로트당 앞 2군, c4=0.94) 기준입니다. 로트 단위 X̄(n=200)로 바꾸면
  관리한계가 ±7µm로 조여져 20개 중 14개 로트가 이탈 판정 — 서사가 죽으니 되돌리지 않습니다.
- 프로젝터 대비 라이트 고정 테마(규칙 4의 예외). 차트 색은 CVD 검증을 거친 팔레트라 임의로 바꾸지 않습니다.

## 작업 시 주의

- Windows PowerShell 5.1 환경입니다. `.ps1` 스크립트에 한글을 넣을 때는 UTF-8 BOM을 붙여야 파싱이 깨지지 않습니다.
- 구성이 닫혀 있어 새 페이지를 만들 일은 없지만, 만들게 되면 랜딩(`index.html`)의 레트로 픽셀 문법을 기준으로 삼습니다.
- 렌더 검증이 필요하면 헤드리스 크롬을 씁니다:
  `chrome --headless=new --virtual-time-budget=15000 --dump-dom <url>` (로컬 서버 필요).
