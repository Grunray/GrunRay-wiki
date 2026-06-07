import {
  detectPageEnterPreset,
  primePageEnterHidden,
  revealPageEnterFallback,
} from '@/composables/gsap/pageEnterPresets'
import { registerPageEnterRoot } from '@/composables/gsap/pageEnterOrchestrator'
import { killPageEnterGsap, runPageEnterGsap } from '@/composables/gsap/runPageEnterGsap'
import { waitForPaint } from '@/composables/gsap/gsapMotion'
import {
  isRouteTransitionBusy,
  waitForPageEnterGate,
} from '@/composables/gsap/routeTransitionController'

/** 标记页面已完成 GSAP 入场（供样式/逻辑判断） */
export const PAGE_ENTER_PLAY_CLASS = 'page-enter--play'

export type PlayPageEnterOptions = {
  /** 由调度器触发（跳过 armed defer） */
  fromOrchestrator?: boolean
}

export function prefersReducedMotionMedia(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export async function playPageEnter(
  root: HTMLElement | null | undefined,
  options: PlayPageEnterOptions = {},
): Promise<void> {
  if (!root) return

  if (root.classList.contains(PAGE_ENTER_PLAY_CLASS)) return

  if (prefersReducedMotionMedia()) {
    root.classList.add(PAGE_ENTER_PLAY_CLASS)
    return
  }

  root.dataset.pageEnterRoot = ''
  registerPageEnterRoot(root)

  await waitForPaint()

  const preset = detectPageEnterPreset(root)
  if (!preset) {
    root.classList.add(PAGE_ENTER_PLAY_CLASS)
    return
  }

  primePageEnterHidden(root, preset)

  if (isRouteTransitionBusy() && !options.fromOrchestrator) {
    await waitForPageEnterGate()
    await waitForPaint()
  }

  try {
    const ctx = runPageEnterGsap(root, preset)
    if (!ctx) revealPageEnterFallback(root)
    root.classList.add(PAGE_ENTER_PLAY_CLASS)
  } catch (err) {
    console.error('[page-enter]', preset, err)
    revealPageEnterFallback(root)
    root.classList.add(PAGE_ENTER_PLAY_CLASS)
  }
}

export function resetPageEnter(root: HTMLElement | null | undefined): void {
  if (!root) return
  killPageEnterGsap(root)
  root.classList.remove(PAGE_ENTER_PLAY_CLASS)
}

export async function restartPageEnter(root: HTMLElement | null | undefined): Promise<void> {
  if (!root) return
  resetPageEnter(root)
  await playPageEnter(root, { fromOrchestrator: true })
}
