import { onUnmounted, type Ref, watch } from 'vue'

import { gsap } from '@/composables/gsap/registerGsap'
import { GSAP_EASE_SMOOTH, GSAP_EASE_SPRING } from '@/composables/gsap/gsapTokens'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

/** 黑胶唱臂播放/暂停摆动 */
export function useVinylTonearmGsap(
  armRef: Ref<HTMLElement | null | undefined>,
  playing: Ref<boolean>,
) {
  let tween: gsap.core.Tween | null = null

  watch(
    playing,
    (on) => {
      tween?.kill()
      const el = armRef.value
      if (!el || prefersReducedMotionMedia()) return
      gsap.set(el, { rotation: -40, transformOrigin: '82% 13%' })
      tween = gsap.to(el, {
        rotation: on ? 6 : -40,
        duration: on ? 0.88 : 0.62,
        ease: on ? GSAP_EASE_SPRING : GSAP_EASE_SMOOTH,
      })
    },
    { immediate: true },
  )

  onUnmounted(() => {
    tween?.kill()
  })
}
