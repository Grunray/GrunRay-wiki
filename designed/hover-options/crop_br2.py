"""放大 cover-story 右下角 开始阅读 一带。"""
from PIL import Image
import numpy as np

img = Image.open(r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle.png")
W, H = img.size
# 右下 280x200
crop = img.crop((W-280, H-200, W, H))
crop.resize((280*3, 200*3), Image.NEAREST).save(
    r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle-br-zoom.png"
)
a = np.array(crop.convert("RGB"))
# unique-ish colors that aren't paper/text gray
paper = np.array([250, 248, 241])
diff = np.abs(a.astype(int) - paper).sum(axis=2)
# pixels clearly not paper and not dark text
r,g,b = a[:,:,0].astype(int), a[:,:,1].astype(int), a[:,:,2].astype(int)
green = (g > r+15) & (g > b+10) & (g > 60)
print("green px in corner crop", int(green.sum()), "size", a.shape)
print("sample greens", a[green][:8] if green.any() else None)
if green.any():
    vis = a.copy()
    vis[green] = (255,0,0)
    Image.fromarray(vis).resize((280*3, 200*3), Image.NEAREST).save(
        r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle-br-zoom-mark.png"
    )
