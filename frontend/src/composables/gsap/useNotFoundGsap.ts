import { type ComputedRef, onMounted, onUnmounted, type Ref } from 'vue'

import { glitchShake } from '@/composables/gsap/gsapMotion'
import { gsap, registerGsapPlugins } from '@/composables/gsap/registerGsap'
import { GSAP_EASE_SPRING } from '@/composables/gsap/gsapTokens'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

/** 404 页标题故障入场 + 周期性抖动 */
export function useNotFoundGsap(
  rootRef: Ref<HTMLElement | null | undefined>,
  glitchActive: ComputedRef<boolean>,
) {
  let interval: ReturnType<typeof setInterval> | null = null
  let ctx: gsap.Context | null = null

  onMounted(() => {
    if (prefersReducedMotionMedia()) return
    const root = rootRef.value
    if (!root) return
    registerGsapPlugins()

    ctx = gsap.context(() => {
      const title = root.querySelector('.not-found__title')
      const code = root.querySelector('.not-found__code')
      const actions = root.querySelector('.not-found__actions')
      if (code) {
        gsap.from(code, {
          autoAlpha: 0,
          scale: 1.4,
          filter: 'blur(8px)',
          duration: 0.55,
          ease: GSAP_EASE_SPRING,
        })
      }
      if (title) {
        gsap.from(title, {
          autoAlpha: 0,
          y: 20,
          rotation: -4,
          duration: 0.72,
          ease: GSAP_EASE_SPRING,
          delay: 0.08,
        })
      }
      if (actions) {
        gsap.from(actions.children, {
          autoAlpha: 0,
          y: 16,
          stagger: 0.08,
          duration: 0.5,
          delay: 0.28,
        })
      }
    }, root)

    interval = window.setInterval(() => {
      if (!glitchActive.value) return
      glitchShake(root.querySelector('.not-found__title'), 6)
      glitchShake(root.querySelector('.not-found__code'), 4)
    }, 2100)
  })

  onUnmounted(() => {
    if (interval) clearInterval(interval)
    ctx?.revert()
  })
}
