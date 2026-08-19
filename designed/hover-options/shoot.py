"""hover-options 预览截图：每个方案 hover 列表卡时截一次。"""
from playwright.sync_api import sync_playwright

OUT = "e:/Project/GrunRay_wiki/designed/hover-options"
URL = "file:///e:/Project/GrunRay_wiki/designed/hover-options/index.html"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.goto(URL)
    page.wait_for_timeout(600)

    # 全页静态总览
    page.screenshot(path=f"{OUT}/overview.png", full_page=True)

    # 每个方案 hover 其列表卡，截该方案区块
    for key in ["a", "b", "c", "d", "e", "f", "g"]:
        sec = page.locator(f".opt-{key}")
        card = sec.locator(".tcard")
        card.hover()
        page.wait_for_timeout(1700 if key in ("f", "g") else 500)
        sec.screenshot(path=f"{OUT}/option-{key}.png")
    browser.close()
print("done")
