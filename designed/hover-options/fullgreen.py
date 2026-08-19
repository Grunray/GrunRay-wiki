"""把完整剪影染成 accent 绿，与当前 hover 最终态对比。"""
from PIL import Image
import numpy as np

png = Image.open(r"e:\Project\GrunRay_wiki\designed\hover-options\flower-vine.png").convert("RGBA")
a = np.array(png)
# 四角伪影清掉
H, W = a.shape[:2]
for (cx, cy) in [(0,0),(W-1,0),(0,H-1),(W-1,H-1)]:
    a[max(0,cy-14):cy+15, max(0,cx-14):cx+15, 3] = 0
# 染墨绿
out = np.zeros_like(a)
out[..., 0] = 46
out[..., 1] = 107
out[..., 2] = 79
out[..., 3] = a[..., 3]
Image.fromarray(out).save(r"e:\Project\GrunRay_wiki\designed\hover-options\flower-full-green.png")
print("saved", out[..., 3].max(), "opaque", (out[..., 3] > 40).sum())
