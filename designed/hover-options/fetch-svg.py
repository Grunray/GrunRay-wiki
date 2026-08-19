"""用浏览器上下文绕过限流拉取 SVG 素材。"""
from playwright.sync_api import sync_playwright

URLS = {
    "assets-branches.svg": "https://www.svgrepo.com/show/126550/branches-with-leaves.svg",
    "assets-leaves.svg": "https://upload.wikimedia.org/wikipedia/commons/d/d7/NounProject_Leaves.svg",
}
OUT = "e:/Project/GrunRay_wiki/designed/hover-options"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
    for name, url in URLS.items():
        try:
            resp = ctx.request.get(url, timeout=20000)
            if resp.ok:
                body = resp.body()
                with open(f"{OUT}/{name}", "wb") as f:
                    f.write(body)
                print(name, "ok", len(body), "bytes")
            else:
                print(name, "HTTP", resp.status)
        except Exception as e:
            print(name, "fail", str(e)[:120])
    browser.close()
