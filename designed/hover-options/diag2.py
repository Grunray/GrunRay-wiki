"""诊断原图的实际像素内容。"""
from PIL import Image
import numpy as np

SRC = r"C:\Users\Grunray\.cursor\projects\e-Project-GrunRay-wiki\assets\c__Users_Grunray_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_svg__3_-54761c80-1730-4130-a3b5-4b12ed06411f.png"
img = Image.open(SRC)
print("mode:", img.mode, "size:", img.size)
a = np.array(img)
print("shape:", a.shape)
if img.mode == "RGBA":
    print("alpha unique:", np.unique(a[..., 3])[:10])
    rgb = a[..., :3]
else:
    rgb = a
# 非白区域的颜色样本
mask = rgb.sum(axis=2) < 700
print("non-white px:", mask.sum())
if mask.sum() > 0:
    print("sample colors:", rgb[mask][:: max(1, mask.sum() // 8)][:8])
