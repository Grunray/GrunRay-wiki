import { onMounted, onUnmounted, type Ref, watch } from 'vue'

import { gsap, registerGsapPlugins } from '@/composables/gsap/registerGsap'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

/** 胶片竖向滚动（替代 CSS animation: scroll） */
export function useFilmFeedScroll(
  trackRef: Ref<HTMLElement | null | undefined>,
  speedSeconds: Ref<number>,
  paused: Ref<boolean>,
) {
  let tween: gsap.core.Tween | null = null
  let observer: MutationObserver | null = null

  function rebuild() {
    tween?.kill()
    tween = null
    if (prefersReducedMotionMedia() || paused.value) return
    const track = trackRef.value
    if (!track || !track.children.length) return

    registerGsapPlugins()
    const distance = track.scrollHeight / 2
    if (distance <= 0) return
    gsap.set(track, { y: 0 })
    tween = gsap.to(track, {
      y: -distance,
      duration: speedSeconds.value,
      ease: 'none',
      repeat: -1,
    })
  }

  onMounted(() => {
    watch([speedSeconds, paused, trackRef], rebuild, { immediate: true, flush: 'post' })
    watch(
      trackRef,
      (track) => {
        observer?.disconnect()
        observer = null
        if (!track) return
        observer = new MutationObserver(() => rebuild())
        observer.observe(track, { childList: true, subtree: true })
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    tween?.kill()
    observer?.disconnect()
  })

  return { rebuild }
}
