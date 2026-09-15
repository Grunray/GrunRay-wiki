const SAFE_RETURN_RE = /^\/[a-zA-Z0-9/_\-?=&%.]*$/
export const SITE_LEAVE_DEFAULT_RETURN_TO = '/friends'

export function sanitizeSiteLeaveReturnTo(raw: string | null | undefined): string {
  if (!raw) return SITE_LEAVE_DEFAULT_RETURN_TO
  const path = raw.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return SITE_LEAVE_DEFAULT_RETURN_TO
  if (!SAFE_RETURN_RE.test(path)) return SITE_LEAVE_DEFAULT_RETURN_TO
  return path
}

/** 仅允许 http(s) 外链 */
export function sanitizeExternalLeaveUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const value = raw.trim()
  try {
    const u = new URL(value)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.href
  } catch {
    return null
  }
}

/**
 * 相对或绝对 href 是否为「非本站」http(s)。
 * 站内路径、同 origin、mailto/tel/javascript 等返回 false。
 */
export function isExternalHttpUrl(
  href: string,
  siteOrigin: string = typeof window !== 'undefined' ? window.location.origin : '',
): boolean {
  if (!href || !siteOrigin) return false
  const trimmed = href.trim()
  if (
    trimmed.startsWith('#')
    || trimmed.startsWith('mailto:')
    || trimmed.startsWith('tel:')
    || trimmed.startsWith('javascript:')
  ) {
    return false
  }
  try {
    const absolute = new URL(trimmed, siteOrigin)
    if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') return false
    return absolute.origin !== new URL(siteOrigin).origin
  } catch {
    return false
  }
}

export function externalLeaveHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export const SITE_LEAVE_REDIRECT_ROUTE_NAME = 'site-leave-redirect' as const

export function siteLeaveRedirectRoute(
  targetUrl: string,
  returnTo: string,
  options?: { tab?: boolean },
) {
  return {
    name: SITE_LEAVE_REDIRECT_ROUTE_NAME,
    query: {
      url: targetUrl,
      return_to: sanitizeSiteLeaveReturnTo(returnTo),
      ...(options?.tab ? { tab: '1' } : {}),
    },
  }
}

/** 新标签出站确认的绝对 URL（与 SiteLeaveRedirectView 同一套布局） */
export function siteLeaveRedirectHref(
  targetUrl: string,
  returnTo: string,
  options?: { tab?: boolean },
): string {
  const q = new URLSearchParams({
    url: targetUrl,
    return_to: sanitizeSiteLeaveReturnTo(returnTo),
  })
  if (options?.tab) q.set('tab', '1')
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${base}/leave/redirect?${q.toString()}`
}

export const SITE_LEAVE_JUMP_DELAY_MS = 320
