import { onMounted, onUnmounted, type Ref, watch } from 'vue'

import { gsap, registerGsapPlugins } from '@/composables/gsap/registerGsap'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

/** 黑胶唱片旋转（替代 CSS vinyl-spin） */
export function useVinylSpin(recordRef: Ref<HTMLElement | null | undefined>, playing: Ref<boolean>) {
  let tween: gsap.core.Tween | null = null

  function sync() {
    tween?.kill()
    tween = null
    const el = recordRef.value
    if (!el || !playing.value || prefersReducedMotionMedia()) return
    registerGsapPlugins()
    tween = gsap.to(el, { rotation: '+=360', duration: 2.9, ease: 'none', repeat: -1 })
  }

  onMounted(() => {
    watch(playing, sync, { immediate: true })
  })

  onUnmounted(() => {
    tween?.kill()
  })
}
