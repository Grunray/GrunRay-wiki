import { nextTick } from 'vue'

import { isMotionCut } from '@/composables/useMotionPolicy'

/** 与 page-enter-*.css 中规则对应 */
export const PAGE_ENTER_PLAY_CLASS = 'page-enter--play'

/** 运行时档不是 full（系统 reduce / 用户 REDUCED）。保留旧名以免散落调用全改。 */
export function prefersReducedMotionMedia(): boolean {
  return isMotionCut()
}

/** 双 rAF：在布局与子节点渲染后再加类，避免首帧丢动画 */
export async function playPageEnter(root: HTMLElement | null | undefined): Promise<void> {
  if (!root) return
  /* REDUCED/MINIMAL 仍要打 play 类：page-enter CSS 靠它从预隐藏里放出内容，只是不播时长 */
  if (prefersReducedMotionMedia()) {
    root.classList.add(PAGE_ENTER_PLAY_CLASS)
    return
  }
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.add(PAGE_ENTER_PLAY_CLASS)
        resolve()
      })
    })
  })
}

export function resetPageEnter(root: HTMLElement | null | undefined): void {
  root?.classList.remove(PAGE_ENTER_PLAY_CLASS)
}

/**
 * 同步移除类、强制 reflow、再加回类，用于重启 CSS animation。
 * 避免 reset + await play 之间出现一帧「无动画类」导致内容全显闪烁。
 */
export function restartPageEnter(root: HTMLElement | null | undefined): void {
  if (!root) return
  if (prefersReducedMotionMedia()) {
    root.classList.add(PAGE_ENTER_PLAY_CLASS)
    return
  }
  root.classList.remove(PAGE_ENTER_PLAY_CLASS)
  void root.offsetWidth
  root.classList.add(PAGE_ENTER_PLAY_CLASS)
}

/** 当前页若还停在入场预隐藏，REDUCED 切换时立刻放出 */
export function stampPageEnterPlay(scope: ParentNode | null | undefined): void {
  if (!scope) return
  const page = scope.querySelector<HTMLElement>(
    [
      '.home-layout',
      '.blog-page',
      '.projects-page',
      '.message-page',
      '.friends-page',
      '.friends-apply-page',
      '.friends-admin-page',
      '.post-detail-article',
      '.project-detail',
      '.legal-page',
      '.compose-ed-page',
      '.design-page',
      '.xiqi-page',
      '.habitat-page',
      '.leave-page',
      '.oauth-page',
      '.about-page',
    ].join(', '),
  )
  page?.classList.add(PAGE_ENTER_PLAY_CLASS)
}
