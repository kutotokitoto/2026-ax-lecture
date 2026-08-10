# 2026 AX 강의 — 바이브 코딩

바이브 코딩 강의본과 예제 웹앱을 모아 둔 정적 사이트입니다.
최상위 `index.html`이 랜딩 페이지 역할을 하며, 여기서 각 강의본과 예제로 이동합니다.

## 구조

```
.
├── index.html              랜딩 페이지 (강의본 6개 + 예제 8개 링크)
├── lectures/
│   ├── lecture-01/              AI 전사의 모험 1일차 (76장면 슬라이드)
│   │   ├── index.html               dc 문서 (템플릿 + 로직)
│   │   └── support.js               dc 런타임
│   ├── lecture-02/index.html
│   ├── lecture-03/index.html
│   ├── lecture-04/index.html
│   ├── lecture-05/index.html
│   └── lecture-06/index.html
├── apps/
│   ├── app-a/                  옛날 오락실 (8비트 레트로 아케이드)
│   │   ├── index.html              게임 선택 화면
│   │   └── games/
│   │       ├── neoguri/index.html      너구리
│   │       ├── breakout/index.html     벽돌깨기
│   │       ├── galaga/index.html       갤러그
│   │       └── fighter/index.html      격투 게임
│   ├── app-b/                  요즘 오락실 (실시간 3D 아케이드)
│   │   ├── index.html              게임 선택 화면
│   │   └── games/
│   │       ├── voxel/index.html        블록 월드 (복셀 샌드박스)
│   │       ├── claw/index.html         인형뽑기
│   │       ├── fps/index.html          제로 프론트 (1인칭 슈팅)
│   │       └── rhythm/index.html       뉴럴 리듬 (손 추적 리듬)
│   ├── app-c/index.html
│   ├── app-d/index.html
│   ├── app-e/index.html
│   ├── app-f/index.html
│   ├── app-g/index.html
│   └── app-h/index.html
├── tools/
│   └── pixel-font/         app-a용 픽셀 폰트 생성기 (사이트 실행에는 불필요)
├── README.md
└── CLAUDE.md               작업 규칙 (Claude Code용)
```

- **강의본(lectures)**: `lecture-01` ~ `lecture-06`. 바이브 코딩 강의 자료.
- **예제(apps)**: `app-a` ~ `app-h`. 강의에서 다루는 예제 웹앱.
- 각 폴더는 `index.html` 하나로 완결되며, 상단의 `← 목록으로` 링크로 랜딩 페이지에 돌아옵니다.
- `app-a`와 `app-b`만 예외로 하위에 `games/`를 둡니다. 각 앱의 `index.html`이 오락실 선택 화면이고,
  게임은 `games/<이름>/index.html` 한 파일로 완결됩니다.
- `app-a`는 8비트 레트로(CRT·픽셀 아트), `app-b`는 실시간 3D(글래스·네온) 콘셉트입니다.

`lecture-01`, `app-a`, `app-b`를 제외한 하위 페이지는 아직 자리표시자(placeholder)입니다. 내용은 차차 채웁니다.
`app-a`와 `app-b`도 선택 화면만 완성했고 게임 본체 8종은 준비 중입니다.

### 오락실에 게임을 추가하려면

**app-a (옛날 오락실)**

1. `apps/app-a/games/<이름>/index.html`을 만듭니다 (기존 게임 페이지를 복사해서 시작).
2. `apps/app-a/index.html`의 `.cabs` 안에 `.cab` 링크를 하나 추가합니다.
   `style="--tint: …"`로 캐비닛 색을 정하고, 16×16 픽셀 SVG를 아트로 넣습니다.
3. 게임이 완성되면 그 카드의 `<span class="status" data-state="soon">준비 중</span>` 을
   `data-state="ready"`와 `READY`로 바꿉니다.
4. **한글을 새로 쓰면 픽셀 폰트를 다시 만들어야 합니다.** 아래 「app-a의 픽셀 폰트」 참고.

**app-b (요즘 오락실)**

1. `apps/app-b/games/<이름>/index.html`을 만듭니다 (기존 게임 페이지를 복사해서 시작).
2. `apps/app-b/index.html`의 `.rack` 안에 `.card` 링크를 하나 추가합니다.
   `style="--tint: …"`로 카드 색을 정하고, `320×200` viewBox의 SVG를 `.shot` 안에 넣습니다.
   SVG `<defs>`의 그라디언트 `id`는 문서 안에서 겹치지 않게 접두어를 붙입니다.
3. 상태 표시는 app-a와 같은 규칙(`data-state="soon"` → `"ready"`)을 씁니다.

### app-a의 픽셀 폰트

`app-a`의 페이지들은 8비트 픽셀 폰트를 `@font-face`에 base64로 박아 두고 씁니다.
외부 웹폰트를 못 쓰는 규칙과 `file://`의 폰트 CORS 제약을 동시에 피하기 위해서입니다.
**페이지에 실제로 쓰인 글자만** 담기 때문에 파일당 6~14KB 정도입니다.

- 한글 글립: `Noto Sans KR`(SIL OFL 1.1)을 16×16 픽셀 그리드로 래스터화한 파생물입니다.
- 라틴 대문자·숫자·기호: 직접 찍은 아케이드 서체입니다.
- 글자를 새로 추가했다면 `tools/pixel-font/`의 생성기를 다시 돌립니다.
  자세한 내용은 [tools/pixel-font/README.md](tools/pixel-font/README.md) 참고.

돌리지 않아도 페이지는 뜹니다. 다만 폰트에 없는 글자만 시스템 글꼴로 나와 튑니다.

### lecture-01의 dc 문서 형식

`lecture-01`만 다른 페이지와 형식이 다릅니다. 15MB짜리 standalone 번들 대신
편집 가능한 dc 문서(`index.html` + `support.js`)로 두었습니다.

- `index.html`은 `<x-dc>` 블록 안에 템플릿(`{{ }}` 보간, `<sc-if>` 등)을 담고,
  문서 끝의 `<script type="text/x-dc">`에 상태와 로직을 담습니다. 텍스트라 그대로 고치면 됩니다.
- `support.js`가 이를 읽어 React로 렌더합니다. React·ReactDOM·Babel은 실행 시
  unpkg에서, 픽셀 폰트(Galmuri11, Press Start 2P)는 jsdelivr·Google Fonts에서 받습니다.
  **즉 이 페이지만은 인터넷 연결이 필요합니다.**
- `← 목록으로` 버튼은 `<body>` 직속 자식으로 두었습니다. 런타임이 `<x-dc>` 엘리먼트만
  교체하기 때문에 마운트 후에도 남습니다.
- 이 영역에 dc 루트 여는 태그와 같은 문자열을 쓰면 안 됩니다(주석 안이라도).
  런타임이 원본을 다시 받아 파싱할 때 첫 매칭을 템플릿 시작점으로 잡아 화면이 깨집니다.

원본은 `K:\NEW K\다운로드\인터랙티브 AI 교육 슬라이드`에 있고, 인쇄용 변형본
(`-print.dc.html` + `print-assets/`)은 아직 저장소에 넣지 않았습니다.

## 실행

빌드 도구나 의존성이 없습니다. `index.html`을 브라우저로 열면 됩니다.
로컬 서버가 필요하면:

```
python -m http.server 8000
```

이후 `http://localhost:8000` 으로 접속합니다.
`lecture-01`은 `file://`로도 뜨지만, 서버로 여는 쪽이 안정적입니다.

## 기술 스택

- 순수 HTML + CSS (프레임워크·빌드 단계 없음)
- CSS 변수 기반 테마, `prefers-color-scheme`로 라이트/다크 모두 대응
- 외부 리소스 없음 — 각 파일이 자체 완결형. 단 `lecture-01`은 예외입니다(위 참고).
- 이미지·폰트가 필요한 곳은 인라인 SVG, data URI, `<canvas>` 픽셀 드로잉으로 해결합니다.
