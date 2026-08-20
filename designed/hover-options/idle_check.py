"""对比 F 方案 idle vs hover，确认静止无残片。"""
from playwright.sync_api import sync_playwright

OUT = "e:/Project/GrunRay_wiki/designed/hover-options"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1500, "height": 1000}, device_scale_factor=2)
    page.goto(f"file:///{OUT}/index.html")
    page.wait_for_timeout(400)
    sec = page.locator(".opt-f")
    for sel in [".opt-f .tcard .flower", ".opt-f .ccard .flower"]:
        loc = page.locator(sel)
        print(sel, loc.evaluate("el => getComputedStyle(el).opacity"))
    page.locator(".opt-f .tcard").screenshot(path=f"{OUT}/f-idle-tcard.png")
    page.locator(".opt-f .ccard").screenshot(path=f"{OUT}/f-idle-ccard.png")
    sec.screenshot(path=f"{OUT}/f-idle.png")
    card = sec.locator(".tcard")
    card.hover()
    page.wait_for_timeout(1900)
    sec.screenshot(path=f"{OUT}/f-hover.png")
    # 移到页面标题，离开卡片
    page.locator(".page-head h1").hover()
    page.wait_for_timeout(500)
    sec.screenshot(path=f"{OUT}/f-leave.png")
    browser.close()
print("done")
