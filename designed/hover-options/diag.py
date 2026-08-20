"""诊断抠图质量：检查剩余近白像素、alpha 分布。"""
from PIL import Image
import numpy as np

img = Image.open(r"e:\Project\GrunRay_wiki\designed\hover-options\flower-vine.png")
a = np.array(img)
print("shape:", a.shape)

alpha = a[..., 3]
opaque = alpha > 200
print("opaque px:", opaque.sum(), "/", alpha.size)

# 不透明像素的亮度分布（找出残留的白/灰底）
rgb = a[..., :3].astype(int)
lum = rgb.sum(axis=2)
print("opaque lum>700 (近白):", (opaque & (lum > 700)).sum())
print("opaque lum>600:", (opaque & (lum > 600)).sum())
print("opaque lum>500:", (opaque & (lum > 500)).sum())
print("lum min/max of opaque:", lum[opaque].min(), lum[opaque].max())
