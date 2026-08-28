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

export function externalLeaveHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export const SITE_LEAVE_REDIRECT_ROUTE_NAME = 'site-leave-redirect' as const

export function siteLeaveRedirectRoute(targetUrl: string, returnTo: string) {
  return {
    name: SITE_LEAVE_REDIRECT_ROUTE_NAME,
    query: {
      url: targetUrl,
      return_to: sanitizeSiteLeaveReturnTo(returnTo),
    },
  }
}

export const SITE_LEAVE_JUMP_DELAY_MS = 320
