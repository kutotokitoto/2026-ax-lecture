# 2026 AX 강의 — 바이브 코딩

바이브 코딩 강의본과 예제 웹앱을 모아 둔 정적 사이트입니다.
최상위 `index.html`이 랜딩 페이지 역할을 하며, 여기서 각 강의본과 예제로 이동합니다.

## 구조

```
.
├── index.html              랜딩 페이지 (강의본 6개 + 예제 8개 링크)
├── lectures/
│   ├── lecture-01/index.html
│   ├── lecture-02/index.html
│   ├── lecture-03/index.html
│   ├── lecture-04/index.html
│   ├── lecture-05/index.html
│   └── lecture-06/index.html
├── apps/
│   ├── app-a/index.html
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

현재 모든 하위 페이지는 자리표시자(placeholder)입니다. 내용은 차차 채웁니다.

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
