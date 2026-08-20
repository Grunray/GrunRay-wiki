"""首页竖排目录截图验证。"""
import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = "e:/Project/GrunRay_wiki/designed/redesign-check"

POSTS = [
    {"id": 1, "slug": "a", "title": "回文串与 Manacher", "summary": "从暴力到线性的回文子串梳理。", "tags": ["算法"], "published_at": "2026-08-10T08:00:00", "updated_at": "2026-08-15T10:30:00", "pinned": True, "type": "algorithm"},
    {"id": 2, "slug": "b", "title": "三档主题的坑", "summary": "令牌、扩散动画与叠层。", "tags": ["CSS"], "published_at": "2026-07-28T08:00:00", "updated_at": "2026-08-12T09:00:00", "pinned": False, "type": "article"},
    {"id": 3, "slug": "c", "title": "LCP 优化账", "summary": "图片与字体工程。", "tags": ["性能"], "published_at": "2026-07-15T08:00:00", "updated_at": "2026-08-01T09:00:00", "pinned": False, "type": "article"},
]
PROJECTS = [
    {"id": 1, "slug": "grunray-wiki", "title": "GrunRay wiki", "summary": "站点本身：Vue 3 + Python。", "tags": ["Vue3"], "status": "published", "start_date": "2025-09-01", "year": 2025},
    {"id": 2, "slug": "crsea", "title": "crsea", "summary": "煤矿巷道支护评价系统。", "tags": ["Three.js"], "status": "archived", "start_date": "2025-07-10", "year": 2025},
]
MEDIA = [{"id": i, "url": f"https://picsum.photos/seed/gr{i}/400/500", "type": "image", "title": f"m{i}"} for i in range(1, 9)]

def mock_api(page):
    def handler(route):
        url = route.request.url
        if "/api/media/list/filmfeed" in url:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps({"code": 0, "data": MEDIA, "message": "ok"}, ensure_ascii=False))
        if "/api/media/list" in url:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps({"code": 0, "data": [{"url": "https://picsum.photos/seed/ava/300/300"}], "message": "ok"}, ensure_ascii=False))
        if "/api/posts/latest-updated" in url:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps({"posts": POSTS}, ensure_ascii=False))
        if "/api/posts/random-recommend" in url:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps({"post": POSTS[1]}, ensure_ascii=False))
        if "/api/projects" in url:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps({"projects": PROJECTS}, ensure_ascii=False))
        return route.continue_()
    page.route("**/api/**", handler)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script("try { sessionStorage.setItem('grunray_splash_woniu_v1', '1') } catch (e) {}")
    page = ctx.new_page()
    mock_api(page)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:160]))
    page.goto(BASE + "/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1600)
    page.screenshot(path=f"{OUT}/home-light.png", full_page=True)
    page.evaluate("() => document.documentElement.setAttribute('data-theme', 'dark')")
    page.wait_for_timeout(500)
    page.screenshot(path=f"{OUT}/home-dark.png", full_page=True)
    # 窄屏抽查
    page2 = ctx.new_page()
    mock_api(page2)
    page2.set_viewport_size({"width": 390, "height": 844})
    page2.goto(BASE + "/")
    page2.wait_for_load_state("networkidle")
    page2.wait_for_timeout(1400)
    page2.screenshot(path=f"{OUT}/home-mobile.png", full_page=True)
    print("errors:", errors or "none")
    browser.close()
print("done")
