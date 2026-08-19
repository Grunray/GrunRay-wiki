"""清掉花藤 PNG 四角伪影方块。"""
from PIL import Image
import numpy as np

p = r"e:\Project\GrunRay_wiki\designed\hover-options\flower-vine.png"
img = Image.open(p).convert("RGBA")
a = np.array(img)
H, W = a.shape[:2]
print("before opaque", (a[..., 3] > 40).sum())
# 四角 16px 清掉
m = 22
a[:m, :m, 3] = 0
a[:m, -m:, 3] = 0
a[-m:, :m, 3] = 0
a[-m:, -m:, 3] = 0
print("after opaque", (a[..., 3] > 40).sum())
Image.fromarray(a).save(p)
print("updated", p)
