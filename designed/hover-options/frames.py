"""截 F 方案生长动画的中间帧序列，验证沿茎绘制效果。"""
from playwright.sync_api import sync_playwright

OUT = "e:/Project/GrunRay_wiki/designed/hover-options"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1500, "height": 1000}, device_scale_factor=2)
    page.goto(f"file:///{OUT}/index.html")
    page.wait_for_timeout(400)
    sec = page.locator(".opt-f")
    card = sec.locator(".tcard")
    card.hover()
    page.wait_for_timeout(50)
    box = card.bounding_box()
    clip = {
        "x": box["x"] + box["width"] - 220,
        "y": box["y"] + box["height"] - 220,
        "width": 220,
        "height": 220,
    }
    for i, t in enumerate([300, 700, 1100]):
        page.wait_for_timeout(300 if i == 0 else 400)
        page.screenshot(path=f"{OUT}/f-frame-{t}ms.png", clip=clip)
    browser.close()
print("done")
