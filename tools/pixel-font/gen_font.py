# -*- coding: utf-8 -*-
"""
옛날 오락실 픽셀 폰트 생성기.

Noto Sans KR (SIL OFL 1.1) 을 16x16 픽셀 그리드로 래스터화한 뒤,
켜진 픽셀마다 사각형 컨투어를 만들어 진짜 비트맵 느낌의 TTF/WOFF2 를 만듭니다.
기호 몇 개는 손으로 찍은 8x8 패턴을 씁니다.

사용:
  python gen_font.py proof            # 확인용 PNG
  python gen_font.py build <out.woff2> <chars-file>
"""
import sys, os, unicodedata
from PIL import Image, ImageDraw, ImageFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from latin import LATIN

SRC_FONT = r"C:\Windows\Fonts\NotoSansKR-VF.ttf"
HERE = os.path.dirname(os.path.abspath(__file__))

# ── 그리드 정의 ────────────────────────────────
ROWS       = 16      # 셀 높이(픽셀)
WIDE       = 16      # 한글/CJK 셀 너비
NARROW     = 8       # 라틴 셀 너비
BASELINE   = 13      # 위에서 13번째 행이 베이스라인 (아래 3픽셀은 디센더)
UPM        = 1024
PX         = UPM // ROWS   # 픽셀 하나 = 64 units
SS         = 8       # 슈퍼샘플 배율
WEIGHT     = 700
THRESH     = 100
LATIN_SIZE = 15      # 손글립이 없는 문자를 Noto 로 그릴 때 크기
LATIN_TOP  = 3       # 손으로 찍은 라틴 대문자가 시작하는 행 (rows 3..12, 베이스라인 13)

# ── 손으로 찍은 8x8 기호 ───────────────────────
# 8행 x 8열, '#' = 켜짐. 세로로는 rows 4..11 에 놓습니다.
SYMBOLS = {
    "\u25b6": ["........", ".##.....", ".####...", ".######.", ".######.", ".####...", ".##.....", "........"],  # ▶
    "\u25c0": ["........", ".....##.", "...####.", ".######.", ".######.", "...####.", ".....##.", "........"],  # ◀
    "\u25b2": ["........", "...##...", "..####..", "..####..", ".######.", ".######.", "########", "........"],  # ▲
    "\u25bc": ["........", "########", ".######.", ".######.", "..####..", "..####..", "...##...", "........"],  # ▼
    "\u2190": ["........", "...#....", "..##....", ".#######", "..##....", "...#....", "........", "........"],  # ←
    "\u2192": ["........", "....#...", "....##..", "#######.", "....##..", "....#...", "........", "........"],  # →
    "\u2191": ["...#....", "..###...", ".##.##..", "...#....", "...#....", "...#....", "...#....", "........"],  # ↑
    "\u2193": ["...#....", "...#....", "...#....", "...#....", ".##.##..", "..###...", "...#....", "........"],  # ↓
    "\u2605": ["...##...", "...##...", ".######.", "########", ".#####..", ".##.##..", "##...##.", "........"],  # ★
    "\u2665": ["........", ".##.##..", "#######.", "#######.", ".#####..", "..###...", "...#....", "........"],  # ♥
    "\u25cf": ["........", "..####..", ".######.", ".######.", ".######.", "..####..", "........", "........"],  # ●
    "\u25a0": ["........", ".######.", ".######.", ".######.", ".######.", ".######.", "........", "........"],  # ■
    "\u25a1": ["........", ".######.", ".#....#.", ".#....#.", ".#....#.", ".######.", "........", "........"],  # □
    "\u266a": ["....###.", "....###.", "....#.#.", "....#...", ".####...", ".####...", "..##....", "........"],  # ♪
    "\u00b7": ["........", "........", "........", "..##....", "..##....", "........", "........", "........"],  # ·
    "\u00d7": ["........", "##....##", ".##..##.", "..####..", "..####..", ".##..##.", "##....##", "........"],  # ×
    "\u2500": ["........", "........", "........", "########", "........", "........", "........", "........"],  # ─
    "\u2588": ["########", "########", "########", "########", "########", "########", "########", "########"],  # █
    "\u25b8": ["........", "..#.....", "..##....", "..###...", "..##....", "..#.....", "........", "........"],  # ▸
    "\u25c2": ["........", ".....#..", "....##..", "...###..", "....##..", ".....#..", "........", "........"],  # ◂
}
SYM_TOP = 4   # 8x8 패턴을 16행 그리드의 4행부터 놓습니다


def is_wide(ch):
    if unicodedata.east_asian_width(ch) in ("W", "F"):
        return True
    return False


_font_cache = {}
def get_font(px):
    if px not in _font_cache:
        f = ImageFont.truetype(SRC_FONT, px * SS)
        try:
            f.set_variation_by_axes([WEIGHT])
        except Exception:
            pass
        _font_cache[px] = f
    return _font_cache[px]


def stamp(pat, top, pad_l=0):
    """패턴 문자열을 16행 그리드에 찍습니다."""
    w = max(len(l) for l in pat) + pad_l + 2      # 좌우 여백 2px
    g = [[0] * w for _ in range(ROWS)]
    for r, line in enumerate(pat):
        if top + r >= ROWS:
            break
        for c, v in enumerate(line):
            if v == "#":
                g[top + r][c + pad_l] = 1
    return g, w


def rasterize(ch):
    """문자 하나를 (grid, width_px) 로 만듭니다. grid[row][col] = 0/1"""
    if ch in SYMBOLS:
        pat = SYMBOLS[ch]
        g = [[0] * NARROW for _ in range(ROWS)]
        for r, line in enumerate(pat):
            for c, v in enumerate(line):
                if v == "#":
                    g[SYM_TOP + r][c] = 1
        return g, NARROW

    # 손으로 찍은 아케이드 라틴 (소문자는 대문자 글립을 같이 씁니다)
    key = ch.upper() if ch.isalpha() else ch
    if key in LATIN:
        return stamp(LATIN[key], LATIN_TOP)

    if ch == " ":
        return [[0] * NARROW for _ in range(ROWS)], NARROW

    wide = is_wide(ch)
    w_px = WIDE if wide else NARROW
    size = ROWS if wide else LATIN_SIZE
    font = get_font(size)

    img = Image.new("L", (w_px * SS, ROWS * SS), 0)
    d = ImageDraw.Draw(img)

    if wide:
        # 한글은 잉크 박스를 셀 정중앙에 맞춥니다.
        bbox = d.textbbox((0, 0), ch, font=font)
        x = (w_px * SS - (bbox[2] - bbox[0])) // 2 - bbox[0]
        y = (ROWS * SS - (bbox[3] - bbox[1])) // 2 - bbox[1]
    else:
        # 라틴은 베이스라인을 맞춰야 줄이 흔들리지 않습니다.
        bbox = d.textbbox((0, 0), ch, font=font, anchor="ls")
        x = (w_px * SS - (bbox[2] - bbox[0])) // 2 - bbox[0]
        y = BASELINE * SS
    d.text((x, y), ch, font=font, fill=255, anchor=None if wide else "ls")

    small = img.resize((w_px, ROWS), Image.BOX)
    px = small.load()
    grid = [[1 if px[c, r] >= THRESH else 0 for c in range(w_px)] for r in range(ROWS)]
    return grid, w_px


def grid_to_rects(grid, w_px):
    """켜진 픽셀을 겹치지 않는 사각형들로 묶습니다(가로 런 → 세로 병합)."""
    used = [[False] * w_px for _ in range(ROWS)]
    rects = []
    for r in range(ROWS):
        c = 0
        while c < w_px:
            if grid[r][c] and not used[r][c]:
                c2 = c
                while c2 + 1 < w_px and grid[r][c2 + 1] and not used[r][c2 + 1]:
                    c2 += 1
                # 아래로 같은 런이 이어지면 합칩니다.
                r2 = r
                while r2 + 1 < ROWS and all(
                    grid[r2 + 1][x] and not used[r2 + 1][x] for x in range(c, c2 + 1)
                ):
                    r2 += 1
                for y in range(r, r2 + 1):
                    for x in range(c, c2 + 1):
                        used[y][x] = True
                rects.append((c, r, c2 + 1, r2 + 1))
                c = c2 + 1
            else:
                c += 1
    return rects


def draw_glyph(grid, w_px):
    pen = TTGlyphPen(None)
    for (x0, r0, x1, r1) in grid_to_rects(grid, w_px):
        X0 = x0 * PX
        X1 = x1 * PX
        Y1 = (BASELINE - r0) * PX      # 위쪽
        Y0 = (BASELINE - r1) * PX      # 아래쪽
        pen.moveTo((X0, Y0))
        pen.lineTo((X0, Y1))
        pen.lineTo((X1, Y1))
        pen.lineTo((X1, Y0))
        pen.closePath()
    return pen.glyph()


def build(chars, out_path):
    chars = sorted(set(chars))
    glyph_order = [".notdef"]
    cmap, glyphs, metrics = {}, {}, {}

    # .notdef — 빈 사각 테두리
    notdef_grid = [[0] * NARROW for _ in range(ROWS)]
    for r in range(2, 14):
        for c in range(0, NARROW):
            if r in (2, 13) or c in (0, NARROW - 1):
                notdef_grid[r][c] = 1
    glyphs[".notdef"] = draw_glyph(notdef_grid, NARROW)
    metrics[".notdef"] = (NARROW * PX, 0)

    for ch in chars:
        if ord(ch) < 0x20 and ch not in ("\u0020",):
            continue
        name = "uni%04X" % ord(ch) if ord(ch) > 0xFFFF else "uni%04X" % ord(ch)
        if name in glyphs:
            continue
        grid, w_px = rasterize(ch)
        glyphs[name] = draw_glyph(grid, w_px)
        metrics[name] = (w_px * PX, 0)
        cmap[ord(ch)] = name
        glyph_order.append(name)

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=BASELINE * PX, descent=-(ROWS - BASELINE) * PX, lineGap=0)
    fb.setupNameTable({
        "familyName": "Oraksil Pixel",
        "styleName": "Regular",
        "uniqueFontIdentifier": "OraksilPixel-Regular-1.0",
        "fullName": "Oraksil Pixel Regular",
        "psName": "OraksilPixel-Regular",
        "version": "Version 1.000",
        "copyright": "Bitmapped derivative of Noto Sans KR. "
                     "Noto Sans KR is licensed under the SIL Open Font License 1.1.",
        "licenseDescription": "SIL Open Font License 1.1",
    })
    fb.setupOS2(sTypoAscender=BASELINE * PX, sTypoDescender=-(ROWS - BASELINE) * PX,
                sTypoLineGap=0, usWinAscent=BASELINE * PX, usWinDescent=(ROWS - BASELINE) * PX,
                sxHeight=8 * PX, sCapHeight=11 * PX)
    fb.setupPost()
    fb.font.flavor = "woff2"
    fb.save(out_path)
    return out_path, len(glyph_order)


# ── 확인용 시트 ────────────────────────────────
def proof():
    samples = [
        "옛날 오락실 8-BIT",
        "SELECT GAME  INSERT COIN",
        "1UP 000000  HI-SCORE 087650  CREDIT 04",
        "너구리 벽돌깨기 갤러그 격투 게임",
        "0123456789 ABCDEFGHIJKLM",
        "abcdefghijklmnopqrstuvwxyz",
        "▶ ◀ ▲ ▼ ← → ★ ♥ ● ■ □ ♪ · × ─",
        "사다리를 오르내리며 과일을 먹고 뱀을 피하는 고전 액션",
    ]
    VIEW = 4
    lines = []
    for s in samples:
        cells = [rasterize(ch) for ch in s]
        w = sum(c[1] for c in cells)
        lines.append((cells, w))
    W = max(w for _, w in lines) * VIEW
    H = len(lines) * (ROWS + 3) * VIEW
    out = Image.new("RGB", (W, H), (11, 11, 20))
    dr = ImageDraw.Draw(out)
    for i, (cells, _) in enumerate(lines):
        ox = 0
        oy = i * (ROWS + 3) * VIEW
        for grid, w_px in cells:
            for r in range(ROWS):
                for c in range(w_px):
                    if grid[r][c]:
                        dr.rectangle([(ox + c) * VIEW, oy + r * VIEW,
                                      (ox + c + 1) * VIEW - 1, oy + (r + 1) * VIEW - 1],
                                     fill=(243, 238, 226))
            ox += w_px
    p = os.path.join(HERE, "proof_font.png")
    out.save(p)
    print("saved", p, out.size)


"""── HTML 주입 ──────────────────────────────────
페이지에 실제로 쓰인 글자만 담은 서브셋을 만들어 @font-face 에 넣습니다.
이미 주입된 파일에 다시 돌려도 됩니다(기존 base64 를 덮어씁니다).
"""
import re, base64, tempfile

FONT_SRC_RE = re.compile(r'(src:\s*url\("data:font/woff2;base64,)([A-Za-z0-9+/=]*)(")')

# 앞으로 JS 로 만들어 낼 수도 있는 낱말들 — 미리 넣어 둡니다.
EXTRA = (
    "가나다라마바사아자차카타파하"
    "게임시작준비중선택동전투입크레딧점수최고기록"
    "너구리벽돌깨기갤러그격투옛날오락실"
    "소리켜기끄기다시조작방법이동화면전환없음"
    "한판더도전성공실패계속대기상태확인"
)


def inject(path):
    html = open(path, encoding="utf-8").read()
    stripped = FONT_SRC_RE.sub(r"\1\3", html)          # 기존 폰트 데이터는 글자 수집에서 제외
    chars = set(stripped)
    chars |= set(chr(c) for c in range(0x20, 0x7F))     # 아스키 전체
    chars |= set(EXTRA)
    chars |= set(SYMBOLS.keys())
    chars = {c for c in chars if c.isprintable() or c == " "}

    tmp = os.path.join(tempfile.gettempdir(), "oraksil.woff2")
    build(chars, tmp)
    b64 = base64.b64encode(open(tmp, "rb").read()).decode("ascii")

    new = FONT_SRC_RE.sub(lambda m: m.group(1) + b64 + m.group(3), html, count=1)
    if new == html:
        print("!! @font-face 자리를 못 찾았습니다:", path)
        return
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(new)
    print("%-58s %4d글자  woff2 %6d B  base64 %6d B"
          % (os.path.basename(os.path.dirname(path)), len(chars),
             os.path.getsize(tmp), len(b64)))


if __name__ == "__main__":
    if sys.argv[1] == "proof":
        proof()
    elif sys.argv[1] == "build":
        out = sys.argv[2]
        chars = open(sys.argv[3], encoding="utf-8").read()
        p, n = build(chars, out)
        print("saved", p, n, "glyphs", os.path.getsize(p), "bytes")
    elif sys.argv[1] == "inject":
        for p in sys.argv[2:]:
            inject(p)
