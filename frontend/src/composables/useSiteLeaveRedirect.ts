import { useRouter } from 'vue-router'

import { siteLeaveRedirectRoute } from '@/config/siteLeaveRedirect'
import { openExternalLeaveConfirm } from '@/leave/openExternalLeaveConfirm'

/**
 * 外链离开本站：同步开空白标签注入确认 UI；弹窗被拦时回退 `/leave/redirect`。
 * 友链、推荐访问链、程序化调用与全局点击守卫共用。
 */
export function useSiteLeaveRedirect() {
  const router = useRouter()

  function startExternalLeave(targetUrl: string, returnTo: string) {
    if (openExternalLeaveConfirm(targetUrl, returnTo)) return Promise.resolve()
    return router.push(siteLeaveRedirectRoute(targetUrl, returnTo))
  }

  return { startExternalLeave }
}
