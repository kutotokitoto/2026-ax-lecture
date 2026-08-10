# 2026 AX 강의 — 바이브 코딩

바이브 코딩 강의본과 예제 웹앱을 모아 둔 정적 사이트입니다.
최상위 `index.html`이 랜딩 페이지 역할을 하며, 여기서 각 강의본과 예제로 이동합니다.

## 구조

```
.
├── index.html              랜딩 페이지 (강의본 6개 + 예제 8개 링크)
├── lectures/
│   ├── lecture-01/index.html   AI 전사의 모험 1일차
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
│   ├── app-b/index.html
│   ├── app-c/index.html
│   ├── app-d/index.html
│   ├── app-e/index.html
│   ├── app-f/index.html
│   ├── app-g/index.html
│   └── app-h/index.html
├── README.md
└── CLAUDE.md               작업 규칙 (Claude Code용)
```

- **강의본(lectures)**: `lecture-01` ~ `lecture-06`. 바이브 코딩 강의 자료.
- **예제(apps)**: `app-a` ~ `app-h`. 강의에서 다루는 예제 웹앱.
- 각 폴더는 `index.html` 하나로 완결되며, 상단의 `← 목록으로` 링크로 랜딩 페이지에 돌아옵니다.
- `app-a`만 예외로 하위에 `games/`를 둡니다. `app-a/index.html`이 오락실 선택 화면이고,
  각 게임은 `games/<이름>/index.html` 한 파일로 완결됩니다.

`lecture-01`과 `app-a`를 제외한 하위 페이지는 아직 자리표시자(placeholder)입니다. 내용은 차차 채웁니다.
`app-a`도 선택 화면만 완성했고 게임 본체 4종은 준비 중입니다.

### 오락실에 게임을 추가하려면

1. `apps/app-a/games/<이름>/index.html`을 만듭니다 (기존 게임 페이지를 복사해서 시작).
2. `apps/app-a/index.html`의 `.cabs` 안에 `.cab` 링크를 하나 추가합니다.
   `style="--tint: …"`로 캐비닛 색을 정하고, 16×16 픽셀 SVG를 아트로 넣습니다.
3. 게임이 완성되면 그 카드의 `<span class="status" data-state="soon">준비 중</span>` 을
   `data-state="ready"`와 `READY`로 바꿉니다.

### 번들 페이지에 대하여

`lecture-01/index.html`처럼 외부에서 만들어 온 standalone 번들 파일은 원본 그대로 둡니다.
번들은 로딩 시 문서 전체를 교체하므로, 상단에 `← 목록으로` 링크를 끼워 넣어도 지워집니다.
번들 페이지에서는 브라우저 뒤로 가기로 랜딩에 돌아갑니다.

## 실행

빌드 도구나 의존성이 없습니다. `index.html`을 브라우저로 열면 됩니다.
로컬 서버가 필요하면:

```
python -m http.server 8000
```

이후 `http://localhost:8000` 으로 접속합니다.

## 기술 스택

- 순수 HTML + CSS (프레임워크·빌드 단계 없음)
- CSS 변수 기반 테마, `prefers-color-scheme`로 라이트/다크 모두 대응
- 외부 리소스 없음 — 각 파일이 자체 완결형
