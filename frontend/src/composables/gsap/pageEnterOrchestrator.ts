import { ref } from 'vue'

import { waitForPaint } from '@/composables/gsap/gsapMotion'
import { playPageEnter } from '@/composables/usePageEnterAnimation'

import { getRouteContentTarget } from './routeTransitionController'

/** 路由转场已 arm，等待幕帘文案消失后由调度器触发入场 */
export const routePageEnterArmed = ref(false)

let registeredRoot: HTMLElement | null = null

const PAGE_ENTER_ROOT_SELECTOR = [
  '[data-page-enter-root]',
  '.home-layout',
  '.blog-page',
  '.projects-page',
  '.friends-page',
  '.friends-apply-page',
  '.message-page',
  '.xiqi-page',
  '.post-detail-article',
  '.project-detail',
  '.compose-page',
  '.project-notes-page',
  '.nav-placeholder-page',
].join(', ')

export function armRoutePageEnter() {
  routePageEnterArmed.value = true
  registeredRoot = null
}

export function disarmRoutePageEnter() {
  routePageEnterArmed.value = false
}

export function registerPageEnterRoot(el: HTMLElement | null | undefined) {
  if (el) registeredRoot = el
}

export function unregisterPageEnterRoot(el: HTMLElement | null | undefined) {
  if (el && registeredRoot === el) registeredRoot = null
}

export function findPageEnterRootInMain(): HTMLElement | null {
  const main = getRouteContentTarget()
  if (!main) return null
  return main.querySelector<HTMLElement>(PAGE_ENTER_ROOT_SELECTOR)
}

function resolvePageEnterRoot(): HTMLElement | null {
  if (registeredRoot?.isConnected) return registeredRoot
  registeredRoot = null
  return findPageEnterRootInMain()
}

/**
 * 等待页面 root 挂载后播放入场（RouterView 异步渲染时需要重试）。
 */
export async function schedulePageEnter(maxAttempts = 48, intervalMs = 50): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await waitForPaint()
    const root = resolvePageEnterRoot()
    if (root) {
      await playPageEnter(root, { fromOrchestrator: true })
      return true
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, intervalMs)
    })
  }
  return false
}

/** 幕帘文案完全消失后调用 */
export async function triggerRoutePageEnter() {
  routePageEnterArmed.value = false
  await schedulePageEnter()
}
