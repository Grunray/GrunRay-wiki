"""处理用户提供的花藤图：去白底、逆时针旋转 45°、裁边。"""
from PIL import Image

SRC = r"C:\Users\Grunray\.cursor\projects\e-Project-GrunRay-wiki\assets\c__Users_Grunray_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_svg__3_-54761c80-1730-4130-a3b5-4b12ed06411f.png"
DST = r"e:\Project\GrunRay_wiki\designed\hover-options\flower-vine.png"

img = Image.open(SRC).convert("RGBA")
print("original:", img.size)

# 去白底：白色（近白）像素转透明，保留边缘柔化
datas = img.getdata()
new_data = []
for r, g, b, a in datas:
    # 亮度接近白 => 透明；略带灰的过渡区 => 半透
    if r > 240 and g > 240 and b > 240:
        new_data.append((r, g, b, 0))
    elif r > 225 and g > 225 and b > 225:
        # 过渡带：按离白程度给 alpha
        alpha = int(255 * (240 - min(r, g, b)) / 15)
        new_data.append((r, g, b, max(0, alpha)))
    else:
        new_data.append((r, g, b, a))
img.putdata(new_data)

# 逆时针旋转 45°（PIL rotate 正值即逆时针），expand 保留全部内容
rotated = img.rotate(45, expand=True, resample=Image.BICUBIC)
print("rotated:", rotated.size)

# 裁掉透明边
bbox = rotated.getbbox()
cropped = rotated.crop(bbox)
print("cropped:", cropped.size)

cropped.save(DST)
print("saved:", DST)
