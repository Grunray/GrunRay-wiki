/**
 * 验证页面入场 GSAP
 * PREVIEW_URL=http://localhost:5175 node scripts/test-page-enter.mjs
 */
import { chromium } from 'playwright'

async function readState(page) {
  return page.evaluate(() => {
    const root =
      document.querySelector('.blog-page') ??
      document.querySelector('.home-layout')
    const target = root?.querySelector('h1.h') ?? document.querySelector('.home-layout .avatar')
    return {
      path: location.pathname,
      playClass: Boolean(root?.classList.contains('page-enter--play')),
      targetOpacity: target ? getComputedStyle(target).opacity : null,
    }
  })
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (err) => console.log('ERR:', err.message))

await page.addInitScript(() => sessionStorage.setItem('grunray_splash_woniu_v1', '1'))
const base = process.env.PREVIEW_URL || 'http://localhost:5175'

await page.goto(`${base}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const home = await readState(page)
console.log('home-final', home)

await page.goto(`${base}/blog`)
await page.waitForTimeout(2500)
const blog = await readState(page)
console.log('blog-final', blog)

await page.goto(`${base}/`)
await page.waitForTimeout(800)
await page.goto(`${base}/blog`)
await page.waitForTimeout(300)
const blogMid = await readState(page)
await page.waitForTimeout(2200)
const blogRouteFinal = await readState(page)
console.log('route-blog', { mid: blogMid, final: blogRouteFinal })

const ok =
  home.playClass &&
  home.targetOpacity === '1' &&
  blog.playClass &&
  blog.targetOpacity === '1' &&
  blogMid.targetOpacity !== '1' &&
  blogRouteFinal.targetOpacity === '1'

console.log('ASSERT_OK', ok)
await browser.close()
process.exit(ok ? 0 : 1)
