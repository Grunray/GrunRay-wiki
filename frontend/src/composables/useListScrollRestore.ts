import { nextTick, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'

import { PAGE_ENTER_PLAY_CLASS } from '@/composables/usePageEnterAnimation'

export type ListScrollName = 'blog' | 'projects'

const RETURN_PREFIX = 'grunray-list-return:v1:'
const SCROLL_PREFIX = 'grunray-list-scroll:v1:'

const DETAIL_NAMES: Record<ListScrollName, readonly string[]> = {
  blog: ['post-detail'],
  projects: ['project-detail', 'project-notes'],
}

const FALLBACK: Record<ListScrollName, string> = {
  blog: '/blog',
  projects: '/projects',
}

interface SavedScroll {
  fullPath: string
  y: number
}

function readSession(key: string): string | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* ignore quota */
  }
}

function removeSession(key: string) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** 详情页「返回列表」：带离开时的 query，没有则回干净列表。 */
export function readListReturnPath(name: ListScrollName): string {
  const raw = readSession(RETURN_PREFIX + name)?.trim()
  const fallback = FALLBACK[name]
  if (!raw) return fallback
  if (raw === fallback || raw.startsWith(`${fallback}?`)) return raw
  return fallback
}

function writeLeaveSnapshot(name: ListScrollName, fullPath: string, y: number) {
  writeSession(RETURN_PREFIX + name, fullPath)
  writeSession(
    SCROLL_PREFIX + name,
    JSON.stringify({ fullPath, y: Math.max(0, Math.round(y)) } satisfies SavedScroll),
  )
}

function takeSavedY(name: ListScrollName, fullPath: string): number | null {
  const raw = readSession(SCROLL_PREFIX + name)
  removeSession(SCROLL_PREFIX + name)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as SavedScroll
    if (data.fullPath !== fullPath) return null
    if (!Number.isFinite(data.y) || data.y < 0) return null
    return data.y
  } catch {
    return null
  }
}

/**
 * 列表 → 详情 → 返回：按 fullPath 还原 scrollY，避免不同筛选 / 列表串位。
 * 还原时跳过入场动画（时间线未 play 会一直 opacity:0）。
 */
export function useListScrollRestore(name: ListScrollName) {
  const route = useRoute()
  const pendingY = takeSavedY(name, route.fullPath)
  const skipEnter = pendingY != null
  let restored = false

  onBeforeRouteLeave((to) => {
    if (!DETAIL_NAMES[name].includes(String(to.name))) return
    writeLeaveSnapshot(name, route.fullPath, window.scrollY)
  })

  function markListResumed(root: HTMLElement | null | undefined) {
    if (!root) return
    root.classList.add(PAGE_ENTER_PLAY_CLASS, 'page-enter--resume')
  }

  async function restoreAfterPaint() {
    if (restored || pendingY == null) return
    restored = true
    await nextTick()
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    window.scrollTo({ top: Math.min(pendingY, max), behavior: 'auto' })
  }

  onBeforeUnmount(() => {
    restored = true
  })

  return { skipEnter, markListResumed, restoreAfterPaint }
}

export function isListReturnNavigation(
  toName: unknown,
  fromName: unknown,
): boolean {
  if (toName === 'blog' && fromName === 'post-detail') return true
  if (toName === 'projects' && (fromName === 'project-detail' || fromName === 'project-notes')) {
    return true
  }
  return false
}
