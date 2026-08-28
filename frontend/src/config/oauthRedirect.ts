export type OAuthProvider = 'github' | 'google'

const SAFE_RETURN_RE = /^\/[a-zA-Z0-9/_\-?=&%.]*$/
export const OAUTH_DEFAULT_RETURN_TO = '/messages'

/** 与后端 `auth_api._safe_return_to` 对齐 */
export function sanitizeOAuthReturnTo(raw: string | null | undefined): string {
  if (!raw) return OAUTH_DEFAULT_RETURN_TO
  const path = raw.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return OAUTH_DEFAULT_RETURN_TO
  if (!SAFE_RETURN_RE.test(path)) return OAUTH_DEFAULT_RETURN_TO
  return path
}

export function parseOAuthProvider(raw: unknown): OAuthProvider | null {
  if (raw === 'github' || raw === 'google') return raw
  return null
}

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base.replace(/\/$/, '')}${p}` : p
}

/** 后端 OAuth 入口（整页跳转到 GitHub / Google） */
export function buildOAuthApiStartUrl(provider: OAuthProvider, returnTo: string): string {
  const safeReturn = sanitizeOAuthReturnTo(returnTo)
  const q = new URLSearchParams({ return_to: safeReturn })
  return apiUrl(`/api/auth/${provider}?${q.toString()}`)
}

export const OAUTH_REDIRECT_ROUTE_NAME = 'oauth-redirect' as const

export function oauthRedirectRoute(provider: OAuthProvider, returnTo: string) {
  return {
    name: OAUTH_REDIRECT_ROUTE_NAME,
    query: {
      provider,
      return_to: sanitizeOAuthReturnTo(returnTo),
    },
  }
}

/** 用户确认后、真正跳离本站前的短暂等待（展示 spinner） */
export const OAUTH_REDIRECT_JUMP_DELAY_MS = 320
