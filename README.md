# 2026 AX 강의 — 바이브 코딩

바이브 코딩 강의본·예제 웹앱·플레이북을 모아 둔 정적 사이트입니다.
구성은 **닫혀 있습니다**: 강의 3종 + 예제 앱 4종 + 플레이북 1종.
최상위 `index.html`이 레트로 아케이드 스타일의 랜딩 페이지이며, 여기서 모든 곳으로 이동합니다.

## 구조

```
.
├── index.html              랜딩 페이지 (레트로 아케이드 · 강의 3 + 앱 4 + 플레이북 1)
├── lectures/
│   ├── lecture-01/              AI 용사의 모험 1일차 (76장면 슬라이드)
│   │   ├── index.html               dc 문서 (템플릿 + 로직)
│   │   └── support.js               dc 런타임
│   ├── lecture-02/              AI 용사의 모험 2일차 1부 (66장면, 같은 dc 형식)
│   └── lecture-03/              그릇의 비밀 — 2일차 2부·최종장 (60장면, 같은 dc 형식)
├── apps/
│   ├── app-a/                  옛날 오락실 (8비트 레트로 아케이드)
│   │   ├── index.html              게임 선택 화면
│   │   └── games/
│   │       ├── lib/arcade.js           공용 아케이드 엔진 (루프·입력·사운드·기록)
│   │       ├── neoguri/index.html      너구리 — 플레이 가능
│   │       ├── breakout/index.html     벽돌깨기 — 플레이 가능
│   │       ├── galaga/index.html       갤러그 — 플레이 가능
│   │       └── fighter/index.html      격투 게임 — 플레이 가능
│   ├── app-b/                  요즘 오락실 (실시간 3D 아케이드)
│   │   ├── index.html              게임 선택 화면
│   │   ├── lib/
│   │   │   ├── ax3d.js                 공용 WebGL2 미니 엔진
│   │   │   ├── ax-audio.js             공용 WebAudio 합성 사운드
│   │   │   ├── ax-ui.js                공용 게임 셸 (로딩·일시정지·결과)
│   │   │   └── ax-ui.css               공용 게임 셸 스타일
│   │   └── games/
│   │       ├── voxel/index.html        블록 월드 (복셀 샌드박스) — 플레이 가능
│   │       ├── claw/index.html         인형뽑기 — 플레이 가능
│   │       ├── fps/index.html          제로 프론트 (1인칭 슈팅) — 플레이 가능
│   │       └── rhythm/index.html       뉴럴 리듬 (마우스 블레이드 리듬) — 플레이 가능
│   ├── app-c/                  인터랙티브 아트 (단일 파일 비주얼 데모)
│   │   ├── index.html              심야 전시실 (데모 선택 화면)
│   │   ├── PLAN.md                 구현 플랜
│   │   └── apps/
│   │       ├── 01-life-calendar.html       인생 달력 (90년을 주 단위 격자로)
│   │       ├── 02-falling-sand.html        모래 물리 샌드박스 (셀룰러 오토마타)
│   │       ├── 03-particle-typography.html 파티클 모프 타이포그래피
│   │       ├── 04-fluid-simulation.html    유체 시뮬레이션 (WebGL Stable Fluids)
│   │       └── 05-solar-system.html        3D 태양계 (three.js r147 인라인)
│   └── app-d/index.html        Quality Lab (품질 데이터 분석 대시보드)
├── playbook/               바이브 코딩 플레이북 (0부~5부 인터랙티브 문서, dc 형식)
│   ├── index.html              dc 문서
│   └── support.js              dc 런타임
├── tools/
│   ├── pixel-font/         app-a용 픽셀 폰트 생성기 (사이트 실행에는 불필요)
│   └── qlab-check/         app-d 데이터 생성기 검증 스크립트 (사이트 실행에는 불필요)
├── README.md
└── CLAUDE.md               작업 규칙 (Claude Code용)
```

- **강의본(lectures)**: `lecture-01` ~ `lecture-03`. "AI 용사의 모험" 시리즈 (전사→용사로 통일).
- **예제(apps)**: `app-a` ~ `app-d`. 강의에서 다루는 예제 웹앱.
- **플레이북(playbook)**: 실전 안내서. 강의와 같은 dc 형식의 인터랙티브 문서(목차·검색·진행률).
- 각 폴더는 `index.html` 하나로 완결되며, 상단의 `← 목록으로` 링크로 랜딩 페이지에 돌아옵니다.
- **랜딩은 강의 덱과 같은 레트로 픽셀 문법**(다크 고정 — 규칙 4의 의도적 예외)이며,
  강의 덱과 동일한 소스의 픽셀 폰트(Galmuri11·Press Start 2P)를 CDN에서 받습니다(규칙 2의 예외).
  오프라인이면 시스템 글꼴로 대체될 뿐 내용은 그대로 보입니다.
- `app-a`와 `app-b`는 예외로 하위에 `games/`를 둡니다. 각 앱의 `index.html`이 오락실 선택 화면이고,
  게임은 `games/<이름>/index.html` 한 파일로 완결됩니다.
- `app-c`도 예외로 하위에 `apps/`를 둡니다. `index.html`이 전시실(허브)이고,
  데모는 `apps/NN-<이름>.html` 한 파일로 완결됩니다. 상세 플랜은 `apps/app-c/PLAN.md` 참고.
- `app-a`는 8비트 레트로(CRT·픽셀 아트), `app-b`는 실시간 3D(글래스·네온),
  `app-c`는 인터랙티브 아트(심야 전시실·다크 고정) 콘셉트입니다.

모든 페이지가 완성 상태입니다.
`app-a`는 게임 4종(너구리·벽돌깨기·갤러그·격투)이 모두 플레이 가능합니다.
하이스코어는 실제 플레이로 얻은 값만 sessionStorage에 세션 한정으로 기록합니다(조작된 초기값 없음).
`app-b`는 게임 4종(블록 월드·제로 프론트·인형뽑기·뉴럴 리듬)이 모두 플레이 가능합니다.
뉴럴 리듬의 손 추적 콘셉트는 사내 시연 환경(카메라 사용 불가)을 고려해
마우스 광선 블레이드로 바꿔 구현했습니다.
`app-c`는 비주얼 데모 5종(인생 달력·모래 샌드박스·파티클 타이포·유체 시뮬·3D 태양계)이 모두 동작합니다.
프로젝터 대비를 위해 다크 고정 테마(규칙 4의 의도적 예외)이며, `05-solar-system.html`에는
three.js r147(MIT)이 통째로 인라인되어 있어 실행 시 외부 요청이 없습니다.
`app-d`(Quality Lab)는 부품 측정 더미 데이터를 통계 차트 7종(히스토그램+Cp/Cpk·박스플롯·
산점도+회귀·불량 히트맵·3D 단차 서피스·파레토·로트별 X̄ 관리도)이 연동 해부하는
품질 분석 대시보드입니다. 현재 필터 상태를 CSV로 내보낼 수 있습니다.
시드 RNG 기반 제약 샘플링으로 "재생성"마다 스토리가 바뀌되 항상 통계적으로 그럴듯한
데이터가 나옵니다. **Plotly.js 3.7.0 CDN에 의존하는 유일한 앱**이라 인터넷 연결이 필요하고
(규칙 2의 의도적 예외), 프로젝터 대비 라이트 고정 테마(규칙 4의 예외)입니다.
`?seed=N`으로 데이터 고정, `?selftest`로 연동 자가 검증이 됩니다.

### app-b의 3D 엔진 (`lib/ax3d.js`)

외부 라이브러리 금지 규칙 때문에 three.js 대신 직접 만든 WebGL2 미니 엔진을 씁니다.
행렬 연산, 셰이더·메시·렌더타겟 래퍼, 절차 텍스처, 섀도맵, 블룸·ACES 톤매핑
포스트프로세싱, 입력, 고정 스텝 루프가 들어 있습니다. `ax-ui.js`는 로딩·시작·
일시정지·결과 화면과 화질 전환(낮음/보통/높음, 자동 강등)을 담당합니다.

- **클래식 스크립트**입니다(전역 `AX`). ES module로 바꾸면 `file://`에서 CORS로 깨집니다.
- 같은 이유로 Web Worker를 쓰지 않습니다. 무거운 작업(복셀 청크 생성 등)은
  프레임당 시간 예산을 정해 나눠 처리합니다.
- 게임 페이지에 `?autostart`를 붙이면 시작 화면을 건너뜁니다(렌더 검증용).

### 오락실에 게임을 추가하려면

**app-a (옛날 오락실)**

1. `apps/app-a/games/<이름>/index.html`을 만듭니다 (기존 게임 페이지를 복사해서 시작).
   공용 엔진은 `games/lib/arcade.js`(클래식 스크립트, 전역 `ARC`)를 `<script src="../lib/arcade.js">`로 씁니다 —
   60Hz 고정 스텝 루프, 키보드+터치 입력, WebAudio 합성음, 상태 머신, `sessionStorage` 세션 기록(`ARC.best`).
2. `apps/app-a/index.html`의 `.cabs` 안에 `.cab` 링크를 하나 추가합니다.
   `style="--tint: …"`로 캐비닛 색을 정하고, 16×16 픽셀 SVG를 아트로 넣습니다.
3. 게임이 완성되면 그 카드의 `<span class="status" data-state="soon">준비 중</span>` 을
   `data-state="ready"`와 `READY`로 바꿉니다.
4. **한글을 새로 쓰면 픽셀 폰트를 다시 만들어야 합니다.** 아래 「app-a의 픽셀 폰트」 참고.
   **`arcade.js`에는 화면용 한글 문자열을 넣지 않습니다** — 폰트 도구는 HTML만 스캔하므로,
   화면에 나갈 한글은 반드시 각 게임 페이지(마크업·인라인 스크립트) 안에 있어야 합니다.
5. 게임 페이지에 `?autostart`를 붙이면 어트랙트 화면을 건너뜁니다(검증용, app-b와 동일).

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

### lecture-01~03·playbook의 dc 문서 형식

`lecture-01`~`lecture-03`과 `playbook`은 다른 페이지와 형식이 다릅니다. standalone 번들 대신
편집 가능한 dc 문서(`index.html` + `support.js`)로 두었습니다.
`lecture-03`은 가져올 때 스크립트의 챕터 인덱스 배열이 슬라이드와 어긋나 있던 버그
(월드맵·내비 점프가 챕터 중간으로 감)를 수정했습니다 — 원본 폴더의 파일은 그대로입니다.

- `index.html`은 `<x-dc>` 블록 안에 템플릿(`{{ }}` 보간, `<sc-if>` 등)을 담고,
  문서 끝의 `<script type="text/x-dc">`에 상태와 로직을 담습니다. 텍스트라 그대로 고치면 됩니다.
- `support.js`가 이를 읽어 React로 렌더합니다. React·ReactDOM·Babel은 실행 시
  unpkg에서, 픽셀 폰트(Galmuri11, Press Start 2P)는 jsdelivr·Google Fonts에서 받습니다.
  **즉 이 페이지만은 인터넷 연결이 필요합니다.**
- `← 목록으로` 버튼은 `<body>` 직속 자식으로 두었습니다. 런타임이 `<x-dc>` 엘리먼트만
  교체하기 때문에 마운트 후에도 남습니다.
- 이 영역에 dc 루트 여는 태그와 같은 문자열을 쓰면 안 됩니다(주석 안이라도).
  런타임이 원본을 다시 받아 파싱할 때 첫 매칭을 템플릿 시작점으로 잡아 화면이 깨집니다.

원본은 `K:\NEW K\다운로드\인터랙티브 AI 교육 슬라이드` 및 `… (1)` 폴더에 있고, 인쇄용 변형본
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
