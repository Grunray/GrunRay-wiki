"""截图验证 106-2 详情滚动侧栏的 4 种动画方案（GSAP scrub）。"""
from playwright.sync_api import sync_playwright

BASE = "file:///e:/Project/GrunRay_wiki/designed/scroll-sidebar"
OUT = "e:/Project/GrunRay_wiki/designed/scroll-sidebar"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 940})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))

    page.goto(f"{BASE}/index.html")
    page.wait_for_timeout(2000)

    for v in ["flip", "fold", "stack", "ghost"]:
        page.click(f'button[data-scheme="{v}"]')
        page.wait_for_timeout(400)
        for frame_sel in ["#frame-post", "#frame-project"]:
            fh = page.frame_locator(frame_sel)
            fh.locator("body").evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(350)
        for frame_sel in ["#frame-post", "#frame-project"]:
            fh = page.frame_locator(frame_sel)
            fh.locator("body").evaluate(
                "window.scrollTo(0, document.documentElement.scrollHeight * 0.32)"
            )
        page.wait_for_timeout(1800)
        page.screenshot(path=f"{OUT}/option-{v}.png", full_page=False)

    # 回顶复位
    for frame_sel in ["#frame-post", "#frame-project"]:
        fh = page.frame_locator(frame_sel)
        fh.locator("body").evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{OUT}/option-reset-top.png", full_page=False)

    print("errors:", errors or "none")
    browser.close()
print("done")
