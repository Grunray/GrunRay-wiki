import { useRouter } from 'vue-router'

import { siteLeaveRedirectRoute } from '@/config/siteLeaveRedirect'

/**
 * 外链离开本站：先进入 `/leave/redirect` 过渡页，用户确认后再打开目标 URL。
 * 友链卡片、特别友链等场景共用。
 */
export function useSiteLeaveRedirect() {
  const router = useRouter()

  function startExternalLeave(targetUrl: string, returnTo: string) {
    return router.push(siteLeaveRedirectRoute(targetUrl, returnTo))
  }

  return { startExternalLeave }
}
