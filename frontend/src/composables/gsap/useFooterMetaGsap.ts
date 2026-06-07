import { nextTick, onUnmounted, type Ref, watch } from 'vue'

import { gsap } from '@/composables/gsap/registerGsap'
import { GSAP_EASE_SPRING } from '@/composables/gsap/gsapTokens'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

/** 页脚 ICP 胶囊显现时错落弹出 */
export function useFooterMetaGsap(metaVisible: Ref<boolean>) {
  let ctx: gsap.Context | null = null

  watch(
    metaVisible,
    async (visible) => {
      ctx?.revert()
      ctx = null
      if (!visible || prefersReducedMotionMedia()) return
      await nextTick()
      const shell = document.querySelector<HTMLElement>(
        '[data-footer-meta-teleport] .footer-grunray-meta-bar__shell',
      )
      if (!shell) return
      const items = shell.querySelectorAll<HTMLElement>(
        '.footer-grunray-meta-col > *, .footer-grunray-meta-divider',
      )
      if (!items.length) return
      ctx = gsap.context(() => {
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 10, scale: 0.96 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.48,
            stagger: 0.05,
            ease: GSAP_EASE_SPRING,
            delay: 0.08,
          },
        )
      }, shell)
    },
    { flush: 'post' },
  )

  onUnmounted(() => {
    ctx?.revert()
  })
}
