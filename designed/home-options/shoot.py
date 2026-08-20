"""截图验证四个首页方案预览。"""
from playwright.sync_api import sync_playwright

URL = "file:///e:/Project/GrunRay_wiki/designed/home-options/index.html"
OUT = "e:/Project/GrunRay_wiki/designed/home-options"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))
    page.goto(URL)
    page.wait_for_timeout(1800)
    for v in ["a", "b", "c", "mix"]:
        page.click(f'button[data-v="{v}"]')
        page.wait_for_timeout(900)
        page.screenshot(path=f"{OUT}/option-{v}.png")
    print("errors:", errors or "none")
    browser.close()
print("done")
