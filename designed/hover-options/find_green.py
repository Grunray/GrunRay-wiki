"""检测 idle 截图里是否还有 accent 绿色像素。"""
from PIL import Image
import numpy as np

img = Image.open(r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle.png").convert("RGB")
a = np.array(img)
print("size", a.shape)
# accent #2e6b4f = 46,107,79
r, g, b = a[...,0].astype(int), a[...,1].astype(int), a[...,2].astype(int)
# 墨绿：g 明显高于 r 和 b，且不太亮
mask = (g > 70) & (g > r + 20) & (g > b + 15) & (r < 120)
print("green-ish px", int(mask.sum()))
ys, xs = np.where(mask)
if len(xs):
    print("bbox", xs.min(), ys.min(), xs.max(), ys.max())
    # 标红便于看
    vis = a.copy()
    vis[mask] = (220, 30, 30)
    Image.fromarray(vis).save(r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle-green.png")
else:
    print("no green")
