import router from '@/router'
import {
  isExternalHttpUrl,
  sanitizeExternalLeaveUrl,
  siteLeaveRedirectRoute,
} from '@/config/siteLeaveRedirect'

import { openExternalLeaveConfirm } from './openExternalLeaveConfirm'

function resolveAnchor(event: Event): HTMLAnchorElement | null {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  for (const node of path) {
    if (node instanceof HTMLAnchorElement && node.hasAttribute('href')) return node
  }
  const el = event.target
  if (!(el instanceof Element)) return null
  return el.closest('a[href]')
}

function onDocumentClick(event: MouseEvent) {
  if (event.defaultPrevented) return
  if (event.button !== 0) return

  const anchor = resolveAnchor(event)
  if (!anchor) return
  if (anchor.hasAttribute('download')) return
  if (anchor.dataset.externalLeave === 'skip') return

  const href = anchor.getAttribute('href')
  if (!href || !isExternalHttpUrl(href)) return

  const absolute = sanitizeExternalLeaveUrl(new URL(href, window.location.href).href)
  if (!absolute) return

  event.preventDefault()
  event.stopImmediatePropagation()

  if (openExternalLeaveConfirm(absolute, router.currentRoute.value.fullPath)) return

  void router.push(siteLeaveRedirectRoute(absolute, router.currentRoute.value.fullPath))
}

/** 捕获阶段拦截外链；可重复调用（HMR 先卸再挂）。弹窗被拦时回退 `/leave/redirect`。 */
export function installExternalLeaveClickGuard() {
  if (typeof document === 'undefined') return
  document.removeEventListener('click', onDocumentClick, true)
  document.addEventListener('click', onDocumentClick, true)
}

installExternalLeaveClickGuard()

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    installExternalLeaveClickGuard()
  })
}
