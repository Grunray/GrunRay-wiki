from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / ".screenshots"
OUT.mkdir(exist_ok=True)


def curtain_debug(page):
    return page.evaluate(
        """() => {
          const root = document.querySelector('.route-curtain');
          if (!root) return { missing: true };
          const panels = [...document.querySelectorAll('.route-curtain__panel')].map((el) => ({
            inline: el.style.transform,
            computed: getComputedStyle(el).transform,
          }));
          return {
            state: root.dataset.state,
            pointerEvents: getComputedStyle(root).pointerEvents,
            panels,
          };
        }"""
    )


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:5173/", wait_until="networkidle")
    page.wait_for_timeout(2500)
    page.screenshot(path=str(OUT / "01-home.png"), full_page=True)

    page.locator('nav a[href="/blog"]').first.click()
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / "02-blog-mid.png"), full_page=True)
    print("mid:", curtain_debug(page))

    page.wait_for_timeout(1200)
    page.screenshot(path=str(OUT / "03-blog-after.png"), full_page=True)
    print("after:", curtain_debug(page))
    print("url:", page.url)

    page.locator('nav a[href="/"]').first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "04-back-home.png"), full_page=True)
    print("back:", curtain_debug(page))

    browser.close()
