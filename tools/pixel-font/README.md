# 오락실 픽셀 폰트 생성기

`apps/app-a`(옛날 오락실)의 페이지들이 쓰는 8비트 픽셀 폰트를 만들어
각 HTML의 `@font-face`에 base64로 직접 써 넣는 도구입니다.

**사이트를 보는 데는 필요 없습니다.** HTML에 폰트가 이미 박혀 있으므로
`index.html`을 브라우저로 열면 그대로 동작합니다. 이 도구는 페이지에
**새로운 한글 글자를 추가했을 때만** 다시 돌리면 됩니다.

## 왜 이렇게 만들었나

- 저장소 규칙상 외부 리소스(웹폰트 CDN)를 쓸 수 없습니다.
- `file://`로 열었을 때 상대 경로 폰트 파일은 브라우저 CORS 정책에 막힙니다.
- 그래서 **페이지에 실제로 쓰인 글자만** 담은 서브셋을 만들어 data URI로 인라인합니다.
  덕분에 메인 페이지 기준 base64가 14KB 남짓입니다.

## 만드는 방식

| 구간 | 방식 |
|---|---|
| 한글·기타 | `Noto Sans KR`(SIL OFL 1.1)을 16×16 픽셀 그리드로 래스터화 |
| 라틴 대문자·숫자·문장부호 | `latin.py`에 손으로 찍은 6~7×10 아케이드 서체 |
| `▶ ★ ♥ ♪ ← →` 등 기호 | `gen_font.py`의 `SYMBOLS`에 손으로 찍은 8×8 패턴 |

켜진 픽셀을 사각형 컨투어로 바꿔 TrueType 아웃라인을 만들기 때문에,
확대해도 픽셀 모서리가 그대로 살아 있습니다.
소문자는 대문자 글립을 함께 씁니다(옛 아케이드 서체 관례).

## 쓰는 법

필요한 것: Python 3, `fonttools`, `pillow`, `brotli`.
Windows에 `C:\Windows\Fonts\NotoSansKR-VF.ttf`가 있어야 합니다
(다른 OS라면 `gen_font.py`의 `SRC_FONT` 경로를 고쳐 주세요).

```
pip install fonttools pillow brotli

# 페이지를 훑어 필요한 글자만 담은 폰트를 만들고 @font-face에 써 넣습니다.
python gen_font.py inject ../../apps/app-a/index.html ../../apps/app-a/games/*/index.html

# 글립 모양 확인용 PNG
python gen_font.py proof
```

`inject`는 이미 폰트가 들어 있는 파일에 다시 돌려도 됩니다(기존 base64를 덮어씁니다).

## 라이선스

한글 글립은 **Noto Sans KR**(Copyright Google Inc., SIL Open Font License 1.1)을
비트맵으로 변환한 파생물입니다. OFL 1.1은 개작과 재배포를 허용하며,
파생 폰트에는 예약 글꼴 이름(Reserved Font Name)을 쓰지 않았습니다
(생성물 이름은 `Oraksil Pixel`입니다). 라이선스 전문은
<https://openfontlicense.org> 를 참고하세요.

라틴 글립과 기호는 이 저장소에서 직접 찍은 것입니다.
