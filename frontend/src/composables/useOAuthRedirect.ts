import { useRouter } from 'vue-router'

import { oauthRedirectRoute, type OAuthProvider } from '@/config/oauthRedirect'

/**
 * 社交登录统一入口：先进入 `/auth/redirect` 过渡页，再跳后端 OAuth。
 * 留言、友链等场景共用。
 */
export function useOAuthRedirect() {
  const router = useRouter()

  function startOAuth(provider: OAuthProvider, returnTo: string) {
    return router.push(oauthRedirectRoute(provider, returnTo))
  }

  return { startOAuth }
}
