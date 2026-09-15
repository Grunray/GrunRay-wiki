"""从带网格的参考图提取真正像素精灵 → 透明 PNG。

流程：检测网格间距 → 对齐相位 → 每格中心采样 → 边缘洪水填白为透明
     → 裁切 → 最近邻放大（@2x/@3x/@4x）。
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "shaonv.jpg"
OUT_1X = ROOT / "sprite.png"
OUT_2X = ROOT / "sprite@2x.png"
OUT_3X = ROOT / "sprite@3x.png"
OUT_4X = ROOT / "sprite@4x.png"
OUT_PREVIEW = ROOT / "sprite-preview.png"


def autocorr_pitch(mean_1d: np.ndarray, lo: int = 10, hi: int = 60) -> int:
    x = mean_1d - mean_1d.mean()
    corr = np.correlate(x, x, mode="full")
    corr = corr[len(corr) // 2 :]
    hi = min(hi, len(corr) - 2)
    best_lag = lo
    best_val = -1e18
    for lag in range(lo, hi):
        if corr[lag] > best_val and corr[lag] >= corr[lag - 1] and corr[lag] >= corr[lag + 1]:
            best_val = float(corr[lag])
            best_lag = lag
    return int(best_lag)


def best_phase(mean_1d: np.ndarray, pitch: int) -> int:
    best_ox = 0
    best_score = 1e18
    for ox in range(pitch):
        idxs = []
        for i in range(ox, len(mean_1d), pitch):
            idxs.append(i)
            if i + 1 < len(mean_1d):
                idxs.append(i + 1)
        score = float(mean_1d[idxs].mean()) if idxs else 1e18
        if score < best_score:
            best_score = score
            best_ox = ox
    return best_ox


def sample_cell(rgb: np.ndarray, y0: int, x0: int, cell: int) -> tuple[int, int, int]:
    inset = max(2, cell // 5)
    y1 = y0 + inset
    y2 = y0 + cell - inset
    x1 = x0 + inset
    x2 = x0 + cell - inset
    if y2 <= y1 or x2 <= x1:
        cy = y0 + cell // 2
        cx = x0 + cell // 2
        r, g, b = rgb[cy, cx]
        return int(r), int(g), int(b)
    patch = rgb[y1:y2, x1:x2]
    color = np.median(patch.reshape(-1, 3), axis=0)
    return int(round(color[0])), int(round(color[1])), int(round(color[2]))


def near_white(r: int, g: int, b: int) -> bool:
    return r >= 238 and g >= 238 and b >= 238 and (max(r, g, b) - min(r, g, b)) <= 12


def flood_clear_background(rgba: np.ndarray) -> np.ndarray:
    """从边缘洪水填充：与画布边缘连通的近白格 → 透明；内部白（脸/蝶结）保留。"""
    h, w = rgba.shape[:2]
    out = rgba.copy()
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def try_push(y: int, x: int) -> None:
        if y < 0 or x < 0 or y >= h or x >= w or visited[y, x]:
            return
        r, g, b, a = out[y, x]
        if a == 0:
            visited[y, x] = True
            return
        if not near_white(int(r), int(g), int(b)):
            return
        visited[y, x] = True
        q.append((y, x))

    for x in range(w):
        try_push(0, x)
        try_push(h - 1, x)
    for y in range(h):
        try_push(y, 0)
        try_push(y, w - 1)

    while q:
        y, x = q.popleft()
        out[y, x] = (0, 0, 0, 0)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            try_push(y + dy, x + dx)

    return out


def quantize_mild(rgba: np.ndarray) -> np.ndarray:
    """轻微量化，压掉 JPG 采样噪点，保持像素块干净。"""
    out = rgba.copy()
    mask = out[:, :, 3] > 0
    # 每通道按 8 阶靠拢，避免糊边
    for c in range(3):
        ch = out[:, :, c].astype(np.int16)
        ch = ((ch + 4) // 8) * 8
        ch = np.clip(ch, 0, 255)
        out[:, :, c] = np.where(mask, ch.astype(np.uint8), out[:, :, c])
    return out


def extract_sprite(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w = rgb.shape[:2]
    lum = rgb.mean(axis=2)

    pitch_x = autocorr_pitch(lum.mean(axis=0))
    pitch_y = autocorr_pitch(lum.mean(axis=1))
    pitch = pitch_x if abs(pitch_x - pitch_y) <= 2 else int(round((pitch_x + pitch_y) / 2))

    ox = best_phase(lum.mean(axis=0), pitch)
    oy = best_phase(lum.mean(axis=1), pitch)

    line_w = 1
    origin_x = ox + line_w
    origin_y = oy + line_w
    while origin_x - pitch >= 0:
        origin_x -= pitch
    while origin_y - pitch >= 0:
        origin_y -= pitch

    cols = list(range(origin_x, w - pitch + 1, pitch))
    rows = list(range(origin_y, h - pitch + 1, pitch))
    gw, gh = len(cols), len(rows)
    out = np.zeros((gh, gw, 4), dtype=np.uint8)

    for yi, y0 in enumerate(rows):
        for xi, x0 in enumerate(cols):
            r, g, b = sample_cell(rgb, y0, x0, pitch)
            out[yi, xi] = (r, g, b, 255)

    out = flood_clear_background(out)
    out = quantize_mild(out)

    alpha = out[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        raise RuntimeError("提取结果为空，请检查网格相位")
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    pad = 1
    y0 = max(0, y0 - pad)
    x0 = max(0, x0 - pad)
    y1 = min(gh, y1 + pad)
    x1 = min(gw, x1 + pad)
    cropped = out[y0:y1, x0:x1]

    print(
        f"source={w}x{h} pitch={pitch} phase=({ox},{oy}) "
        f"grid={gw}x{gh} sprite={cropped.shape[1]}x{cropped.shape[0]} "
        f"opaque={(cropped[:, :, 3] > 0).sum()}"
    )
    return Image.fromarray(cropped, mode="RGBA")


def nearest_scale(im: Image.Image, factor: int) -> Image.Image:
    w, h = im.size
    return im.resize((w * factor, h * factor), Image.Resampling.NEAREST)


def make_preview(sprite: Image.Image, scale: int = 10) -> Image.Image:
    fg = nearest_scale(sprite, scale)
    pw, ph = fg.size
    margin = scale * 2
    board = Image.new("RGBA", (pw + margin * 2, ph + margin * 2), (0, 0, 0, 0))
    tile = max(4, scale)
    px = board.load()
    for y in range(board.height):
        for x in range(board.width):
            c = (228, 228, 228, 255) if ((x // tile) + (y // tile)) % 2 == 0 else (255, 255, 255, 255)
            px[x, y] = c
    board.paste(fg, (margin, margin), fg)
    return board


def main() -> None:
    src = Image.open(SRC)
    sprite = extract_sprite(src)
    sprite.save(OUT_1X)
    nearest_scale(sprite, 2).save(OUT_2X)
    nearest_scale(sprite, 3).save(OUT_3X)
    nearest_scale(sprite, 4).save(OUT_4X)
    make_preview(sprite, 10).save(OUT_PREVIEW)
    print("wrote", OUT_1X.name, OUT_2X.name, OUT_3X.name, OUT_4X.name, OUT_PREVIEW.name)


if __name__ == "__main__":
    main()
