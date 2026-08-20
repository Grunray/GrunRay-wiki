"""裁 cover-story 右下角，打印是否有墨绿。"""
from PIL import Image
import numpy as np

img = Image.open(r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle.png").convert("RGB")
a = np.array(img)
H, W = a.shape[:2]
# 右卡大约在右半
crop = a[int(H*0.45):, int(W*0.62):]
print("crop", crop.shape)
Image.fromarray(crop).save(r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle-br.png")
r, g, b = crop[...,0].astype(int), crop[...,1].astype(int), crop[...,2].astype(int)
# 更严：接近 #2e6b4f
mask = (np.abs(r-46)<40) & (np.abs(g-107)<50) & (np.abs(b-79)<40) & (g>r)
print("accent-like", int(mask.sum()), "of", crop.size//3)
if mask.sum():
    vis = crop.copy()
    vis[mask] = (255, 0, 0)
    Image.fromarray(vis).save(r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle-br-mark.png")
    ys, xs = np.where(mask)
    print("bbox in crop", xs.min(), ys.min(), xs.max(), ys.max())
