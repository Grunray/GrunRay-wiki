import { nextTick, watch, type Ref } from 'vue'

import { popIn } from '@/composables/gsap/gsapMotion'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

/** ref 为 true 时对目标元素播放弹跳入场 */
export function useGsapPopTrigger(
  fired: Ref<boolean>,
  resolveEl: () => HTMLElement | null | undefined,
) {
  watch(fired, async (on) => {
    if (!on || prefersReducedMotionMedia()) return
    await nextTick()
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    popIn(resolveEl() ?? null)
  })
}
