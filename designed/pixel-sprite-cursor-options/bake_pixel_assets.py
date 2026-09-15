"""烘焙哥伦比娅像素三月（完整月相）+ 淡蓝白羽毛。

虹月 / 恒月 / 霜月：完整圆月；虹·恒破损；虹月带深紫渊气；霜月完整并带光芒。
直径烘焙比例约 1 : 3 : 2（虹 : 恒 : 霜）。
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)

# 虹月：红粉 + 深渊紫气
RAINBOW = {
    "ink": (72, 18, 32),
    "mid": (220, 72, 92),
    "lit": (255, 168, 180),
    "core": (255, 220, 226),
    "shade": (140, 40, 58),
    "abyss": (88, 36, 120),
    "abyss_lit": (140, 70, 170),
    "abyss_soft": (160, 100, 190),
}

# 恒月：金黄破损
ETERNAL = {
    "ink": (88, 52, 8),
    "mid": (232, 168, 42),
    "lit": (255, 220, 120),
    "core": (255, 246, 200),
    "shade": (168, 110, 28),
}

# 霜月：冰蓝完整 + 光芒
FROST = {
    "ink": (40, 72, 120),
    "mid": (140, 190, 230),
    "lit": (200, 228, 248),
    "core": (240, 248, 255),
    "shade": (90, 140, 190),
    "ray": (210, 232, 255),
}

# 羽毛：很淡的蓝白色（偏白，略带冰蓝）
FEATHER_PALS = [
    {"ink": (168, 188, 210), "mid": (228, 238, 248), "lit": (248, 252, 255)},
    {"ink": (160, 182, 205), "mid": (222, 234, 246), "lit": (245, 250, 255)},
    {"ink": (172, 192, 212), "mid": (232, 240, 250), "lit": (250, 253, 255)},
]


def nearest(im: Image.Image, n: int) -> Image.Image:
    return im.resize((im.width * n, im.height * n), Image.Resampling.NEAREST)


def set_px(im: Image.Image, x: int, y: int, rgba: tuple[int, int, int, int]) -> None:
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), rgba)


def draw_full_moon(
    size: int,
    pal: dict,
    *,
    damaged: bool = False,
    abyss_aura: bool = False,
    glow_rays: bool = False,
) -> Image.Image:
    """完整圆月；可选破损缺口、渊气色晕、霜辉射线。"""
    # 为光芒 / 渊气留边
    pad = 4 if (abyss_aura or glow_rays) else 1
    canvas = size + pad * 2
    im = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    cx = cy = (canvas - 1) / 2
    r = size * 0.42

    # 破损：边缘少量缺口，仍保持「完整圆月」可读性
    chips: list[tuple[float, float, float]] = []
    if damaged:
        chips = [
            (0.55, 0.32, r * 0.2),
            (2.55, 0.28, r * 0.16),
            (4.35, 0.24, r * 0.14),
        ]

    def chipped(x: float, y: float) -> bool:
        if not chips:
            return False
        ang = math.atan2(y - cy, x - cx)
        if ang < 0:
            ang += math.pi * 2
        d = math.hypot(x - cx, y - cy)
        for a0, half, cr in chips:
            da = abs((ang - a0 + math.pi) % (math.pi * 2) - math.pi)
            if da < half and d > r - cr:
                # 缺口更克制：只在扇区中心挖，边缘保留
                if da < half * 0.7 and ((int(x) + int(y) * 2) % 3) != 0:
                    return True
                if da < half * 0.4:
                    return True
        return False

    # 渊气：月外稀疏紫像素环带
    if abyss_aura:
        for y in range(canvas):
            for x in range(canvas):
                d = math.hypot(x - cx, y - cy)
                if r * 1.05 < d < r * 1.55:
                    # 稀疏「气」
                    h = (x * 13 + y * 7) % 11
                    ring = abs(d - r * 1.28)
                    if h < 3 and ring < r * 0.22:
                        a = 200 if h == 0 else 120
                        col = pal["abyss_lit"] if h == 1 else pal["abyss"]
                        if h == 2:
                            col = pal["abyss_soft"]
                            a = 90
                        set_px(im, x, y, (*col, a))
                # 内层贴近月缘的紫渍
                if r * 0.92 < d <= r * 1.08 and (x + y * 3) % 4 == 0:
                    set_px(im, x, y, (*pal["abyss"], 160))

    # 霜辉：短射线（像素风十字/斜线）
    if glow_rays:
        rays = 8
        for i in range(rays):
            ang = (math.pi * 2 * i) / rays + 0.18
            for t in range(int(r * 0.95), int(r * 1.7)):
                x = int(round(cx + math.cos(ang) * t))
                y = int(round(cy + math.sin(ang) * t))
                fade = 1 - (t - r) / (r * 0.75)
                if fade <= 0:
                    break
                if t % 2 == 0:
                    a = int(170 * fade)
                    set_px(im, x, y, (*pal["ray"], a))
                if t % 3 == 0:
                    set_px(im, x, y, (*pal["core"], int(110 * fade)))
        # 十字主辉更亮一点
        for ang in (0.0, math.pi / 2, math.pi, math.pi * 1.5):
            for t in range(int(r * 1.05), int(r * 1.85)):
                x = int(round(cx + math.cos(ang) * t))
                y = int(round(cy + math.sin(ang) * t))
                fade = 1 - (t - r) / (r * 0.9)
                if fade <= 0:
                    break
                if t % 2 == 0:
                    set_px(im, x, y, (*pal["core"], int(150 * fade)))

    # 月体
    for y in range(canvas):
        for x in range(canvas):
            d = math.hypot(x - cx, y - cy)
            if d > r + 0.55:
                continue
            if chipped(x, y):
                continue
            # 边缘
            edge = d > r - 0.95
            # 简单明暗：左上亮
            nx = (x - cx) / r
            ny = (y - cy) / r
            shade = nx * 0.35 + ny * 0.25
            if edge:
                rgba = (*pal["ink"], 255)
            elif shade < -0.25:
                rgba = (*pal["lit"], 255)
            elif shade > 0.35:
                rgba = (*pal["shade"], 255)
            elif abs(nx + 0.25) + abs(ny + 0.2) < 0.35:
                rgba = (*pal["core"], 255)
            else:
                rgba = (*pal["mid"], 255)
            set_px(im, x, y, rgba)

    # 破损边缘描深一点
    if damaged:
        for y in range(canvas):
            for x in range(canvas):
                if im.getpixel((x, y))[3] == 0:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < canvas and 0 <= yy < canvas and im.getpixel((xx, yy))[3] == 0:
                        if chipped(xx, yy) or True:
                            # 缺口内侧加深
                            if any(
                                0 <= x + sx < canvas
                                and 0 <= y + sy < canvas
                                and im.getpixel((x + sx, y + sy))[3] == 0
                                for sx, sy in ((2, 0), (-2, 0), (0, 2), (0, -2))
                            ):
                                set_px(im, x, y, (*pal["ink"], 255))
                            break

    return im


def draw_feather(w: int, h: int, pal: dict, tilt: int = 0, lean: int = 0) -> Image.Image:
    """淡蓝白像素羽毛：可读羽轴 + 斜羽枝，浅底上仍能辨认。"""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mx = w // 2
    for i in range(h):
        t = i / max(1, h - 1)
        if t < 0.08:
            half = 0
        elif t < 0.25:
            half = 1
        elif t < 0.82:
            half = 2 if t < 0.7 else 2
        else:
            half = 1
        bend = lean if t > 0.22 else 0
        y = i
        ax = mx + bend + (tilt if t > 0.4 else 0)
        # 浅描边：轴旁一格更淡，避免奶油底上看不见
        if 0.06 < t < 0.95:
            set_px(im, ax - 1, y, (*pal["lit"], 70))
            set_px(im, ax + 1, y, (*pal["lit"], 70))
        # 羽轴
        set_px(im, ax, y, (*pal["ink"], 245 if t > 0.1 else 200))
        if 0.1 < t < 0.92:
            span = half
            if i % 2 == 0:
                span = min(3, half + 1)
            for s in range(1, span + 1):
                oy = 1 if (s > 1 and i % 2 == 0) else 0
                a = 230 - s * 40
                col = pal["mid"] if s == 1 else pal["lit"]
                set_px(im, ax - s, y + oy, (*col, max(120, a)))
                set_px(im, ax + s, y + oy, (*col, max(120, a)))
            if 0.3 < t < 0.75 and i % 3 == 0:
                set_px(im, ax - span - 1, y, (*pal["lit"], 140))
                set_px(im, ax + span + 1, y + 1, (*pal["lit"], 120))
        if t < 0.12:
            set_px(im, ax, y, (*pal["lit"], 240))
    return im


def main() -> None:
    # 直径 1 : 3 : 2（虹 : 恒 : 霜）；整体偏小
    moons = {
        "moon-rainbow": draw_full_moon(10, RAINBOW, damaged=True, abyss_aura=True),
        "moon-eternal": draw_full_moon(30, ETERNAL, damaged=True),
        "moon-frost": draw_full_moon(20, FROST, glow_rays=True),
    }
    for name, im in moons.items():
        im.save(OUT / f"{name}.png")
        nearest(im, 2).save(OUT / f"{name}@2x.png")
        nearest(im, 3).save(OUT / f"{name}@3x.png")

    feathers = []
    for i, pal in enumerate(FEATHER_PALS):
        variants = [
            draw_feather(13, 20, pal, tilt=0, lean=0),
            draw_feather(13, 19, pal, tilt=1, lean=1),
            draw_feather(12, 18, pal, tilt=-1, lean=-1),
        ]
        for j, f in enumerate(variants):
            tag = "abc"[j]
            f.save(OUT / f"feather-{i}{tag}.png")
            nearest(f, 2).save(OUT / f"feather-{i}{tag}@2x.png")
            feathers.append(f)

    # 预览：棋盘底
    preview = Image.new("RGBA", (320, 100), (0, 0, 0, 0))
    draw = ImageDraw.Draw(preview)
    for y in range(0, 100, 8):
        for x in range(0, 320, 8):
            c = (230, 230, 230, 255) if ((x // 8) + (y // 8)) % 2 == 0 else (255, 255, 255, 255)
            draw.rectangle([x, y, x + 7, y + 7], fill=c)
    x = 10
    for im in list(moons.values()) + feathers[:4]:
        big = nearest(im, 2)
        preview.paste(big, (x, (100 - big.height) // 2), big)
        x += big.width + 12
    preview.save(OUT / "columbina-pixel-preview.png")
    print("sizes", {k: v.size for k, v in moons.items()})
    print("wrote", OUT)


if __name__ == "__main__":
    main()
