"""量化花藤剪影有多少像素没被当前生长路径覆盖。"""
from PIL import Image, ImageDraw
import numpy as np

PNG = r"e:\Project\GrunRay_wiki\designed\hover-options\flower-vine.png"
img = Image.open(PNG).convert("RGBA")
W, H = img.size
alpha = np.array(img)[..., 3]
sil = alpha > 40

# 当前路径（与 index.html 一致）+ 线宽
paths = [
    ("main", 46, [(312,318),(276,290),(246,252),(218,220),(194,192),(166,164),(140,130),(126,112),(116,92),(108,68)]),
    ("bottom", 38, [(240,250),(218,258),(194,264),(172,268)]),
    ("leaf-l2", 38, [(210,226),(184,228),(156,226),(136,224),(124,222),(116,220),(112,218)]),
    ("leaf-l1", 38, [(218,215),(196,204),(172,192),(150,180),(140,174),(132,170),(128,166)]),
    ("right", 28, [(185,185),(202,170),(218,158),(232,152),(240,148),(246,148),(250,150)]),
    ("tendril", 28, [(160,152),(182,136),(200,116),(208,96),(212,86),(214,80),(213,74)]),
    ("spike", 40, [(108,68),(100,54),(92,38),(88,24),(86,16),(86,12),(86,10)]),
    ("spike-r", 28, [(104,56),(114,46),(122,38),(130,30)]),
    ("spike-l", 28, [(98,48),(88,42),(78,36),(72,32)]),
]

cover = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(cover)
for name, width, pts in paths:
    d.line(pts, fill=255, width=width, joint="curve")
    r = width // 2
    for x, y in pts:
        d.ellipse((x-r, y-r, x+r, y+r), fill=255)

cov = np.array(cover) > 128
miss = sil & ~cov
print(f"silhouette px: {sil.sum()}")
print(f"covered px:    {(sil & cov).sum()} ({100*(sil&cov).sum()/sil.sum():.1f}%)")
print(f"missed px:     {miss.sum()} ({100*miss.sum()/sil.sum():.1f}%)")

# 未覆盖区域的质心 / bbox，方便补路径
ys, xs = np.where(miss)
if len(xs):
    print(f"miss bbox: x {xs.min()}-{xs.max()}, y {ys.min()}-{ys.max()}")
    # 分块 40px 网格看热点
    gx, gy = 40, 40
    heat = {}
    for x, y in zip(xs, ys):
        k = (x // gx * gx, y // gy * gy)
        heat[k] = heat.get(k, 0) + 1
    top = sorted(heat.items(), key=lambda kv: -kv[1])[:12]
    print("hot cells (origin, count):")
    for k, c in top:
        print(f"  {k}  {c}")

# 可视化：绿=覆盖，红=漏画
vis = np.zeros((H, W, 3), dtype=np.uint8)
vis[:] = (244, 241, 232)
vis[sil & cov] = (46, 107, 79)
vis[miss] = (200, 40, 40)
Image.fromarray(vis).save(r"e:\Project\GrunRay_wiki\designed\hover-options\coverage.png")
print("saved coverage.png")
