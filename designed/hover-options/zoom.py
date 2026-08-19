"""放大截取 F 方案藤蔓区域，诊断叶片位置。"""
from playwright.sync_api import sync_playwright

OUT = "e:/Project/GrunRay_wiki/designed/hover-options"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1500, "height": 1000}, device_scale_factor=3)
    page.goto(f"file:///{OUT}/index.html")
    page.wait_for_timeout(400)
    card = page.locator(".opt-f .tcard")
    card.hover()
    page.wait_for_timeout(1900)
    # 只截卡片右下角的藤蔓区域（放大后细节可见）
    box = card.bounding_box()
    page.screenshot(
        path=f"{OUT}/f-vine-zoom.png",
        clip={
            "x": box["x"] + box["width"] - 260,
            "y": box["y"] + box["height"] - 260,
            "width": 260,
            "height": 260,
        },
    )
    browser.close()
print("done")
