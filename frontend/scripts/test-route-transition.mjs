import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const out = '.screenshots'
mkdirSync(out, { recursive: true })

function curtainDebug(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.route-curtain')
    const panel = document.querySelector('.route-curtain__panel')
    if (!root || !panel) return { missing: true }
    return {
      state: root.dataset.state,
      rootOpacity: getComputedStyle(root).opacity,
      pointerEvents: getComputedStyle(root).pointerEvents,
      panelTransform: panel.style.transform || getComputedStyle(panel).transform,
      path: location.pathname,
    }
  })
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.addInitScript(() => {
  sessionStorage.setItem('grunray_splash_woniu_v1', '1')
})

const base = process.env.PREVIEW_URL || 'http://localhost:4173'
await page.goto(`${base}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${out}/01-home.png`, fullPage: true })
console.log('home', JSON.stringify(await curtainDebug(page), null, 2))

// 博客在「创作」下拉中
await page.locator('.nav-group').first().hover()
await page.waitForTimeout(300)
await page.locator('.dropdown-item[href="/blog"]').click()
await page.waitForTimeout(350)
await page.screenshot({ path: `${out}/02-blog-mid.png`, fullPage: true })
console.log('mid', JSON.stringify(await curtainDebug(page), null, 2))

await page.waitForTimeout(900)
await page.screenshot({ path: `${out}/03-blog-after.png`, fullPage: true })
console.log('after', JSON.stringify(await curtainDebug(page), null, 2))

await page.locator('nav a.link[href="/"]').click()
await page.waitForTimeout(350)
await page.screenshot({ path: `${out}/04-home-mid.png`, fullPage: true })
console.log('back-mid', JSON.stringify(await curtainDebug(page), null, 2))

await page.waitForTimeout(900)
await page.screenshot({ path: `${out}/05-home-final.png`, fullPage: true })
console.log('back-final', JSON.stringify(await curtainDebug(page), null, 2))

await browser.close()
