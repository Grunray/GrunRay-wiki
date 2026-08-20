"""统计 idle 时间线卡右下角是否还有花藤绿。"""
from PIL import Image
import numpy as np

p = r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle-tcard.png"
img = np.array(Image.open(p).convert("RGB"))
H, W = img.shape[:2]
crop = img[int(H*0.45):, int(W*0.55):]
r,g,b = crop[:,:,0].astype(int), crop[:,:,1].astype(int), crop[:,:,2].astype(int)
green = (np.abs(r-46)<25) & (np.abs(g-107)<25) & (np.abs(b-79)<25)
print("tcard br accent px", int(green.sum()), "crop", crop.shape)
Image.fromarray(crop).save(r"e:\Project\GrunRay_wiki\designed\hover-options\f-idle-tcard-br.png")
