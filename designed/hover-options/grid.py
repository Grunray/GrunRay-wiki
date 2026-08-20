"""在花藤图上叠加 20px 坐标网格，辅助读取枝杈路径坐标。"""
from PIL import Image, ImageDraw

img = Image.open(r"e:\Project\GrunRay_wiki\designed\hover-options\flower-vine.png").convert("RGBA")
W, H = img.size
canvas = Image.new("RGBA", (W, H), (250, 248, 241, 255))  # 纸色底便于看剪影
canvas.paste(img, (0, 0), img)

d = ImageDraw.Draw(canvas)
for x in range(0, W, 20):
    d.line([(x, 0), (x, H)], fill=(255, 0, 0, 60), width=1)
    d.text((x + 1, 2), str(x), fill=(200, 0, 0, 200))
for y in range(0, H, 20):
    d.line([(0, y), (W, y)], fill=(255, 0, 0, 60), width=1)
    d.text((2, y + 1), str(y), fill=(200, 0, 0, 200))

canvas = canvas.resize((W * 2, H * 2), Image.NEAREST)
canvas.save(r"e:\Project\GrunRay_wiki\designed\hover-options\flower-grid.png")
print("done", canvas.size)
