import {
  sanitizeExternalLeaveUrl,
  siteLeaveRedirectHref,
} from '@/config/siteLeaveRedirect'

/**
 * 同步打开新标签出站确认（与原先 `/leave/redirect` 同一套布局；`tab=1` 取消为关页）。
 *
 * 先 `about:blank` 再 `location.replace`：Chromium 对直接 `open(url, '_blank')`
 * 常因默认 noopener 返回 `null`，会误判失败并在当前页再开一次确认。
 *
 * @returns true 已在新标签处理；false 弹窗被拦（调用方在当前标签回退）。
 */
export function openExternalLeaveConfirm(
  rawUrl: string,
  returnTo: string = typeof window !== 'undefined'
    ? window.location.pathname + window.location.search
    : '/',
): boolean {
  const targetUrl = sanitizeExternalLeaveUrl(rawUrl)
  if (!targetUrl) return false

  const href = siteLeaveRedirectHref(targetUrl, returnTo, { tab: true })
  const popup = window.open('about:blank', '_blank')
  if (!popup) return false

  try {
    popup.location.replace(href)
  } catch {
    try {
      popup.close()
    } catch {
      /* ignore */
    }
    return false
  }

  try {
    popup.opener = null
  } catch {
    /* ignore */
  }
  return true
}
