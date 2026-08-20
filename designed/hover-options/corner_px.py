"""打印卡片最右下 60px 的像素，看是不是真有残片。"""
from PIL import Image
import numpy as np

img = Image.open(r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle.png")
W, H = img.size
crop = np.array(img.convert("RGB").crop((W-60, H-60, W, H)))
Image.fromarray(crop).resize((240, 240), Image.NEAREST).save(
    r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle-corner.png"
)
print("unique colors (count>5):")
flat = crop.reshape(-1, 3)
# round to reduce aa
from collections import Counter
c = Counter(map(tuple, flat))
for col, n in c.most_common(12):
    print(n, col)
