import { onUnmounted, type Ref, watch } from 'vue'

import { breathLoop } from '@/composables/gsap/gsapMotion'
import { gsap } from '@/composables/gsap/registerGsap'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

/** 顶栏音乐按钮播放中呼吸 + 图标脉冲 */
export function useMusicNavBreathGsap(
  headerRightRef: Ref<HTMLElement | null | undefined>,
  playing: Ref<boolean>,
) {
  let stopBreath: (() => void) | null = null
  let iconTween: gsap.core.Tween | null = null

  function clear() {
    stopBreath?.()
    stopBreath = null
    iconTween?.kill()
    iconTween = null
  }

  watch(
    [headerRightRef, playing],
    () => sync(),
    { flush: 'post' },
  )

  function sync() {
    clear()
    if (!playing.value || prefersReducedMotionMedia()) return
    const btn = headerRightRef.value?.querySelector<HTMLElement>('.music-nav-btn')
    if (!btn) return
    stopBreath = breathLoop(btn, 1.06)
    const icon = btn.querySelector('.music-nav-btn-icon')
    if (icon) {
      iconTween = gsap.to(icon, {
        scale: 1.12,
        rotation: -6,
        duration: 0.9,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
    }
  }

  onUnmounted(clear)
}
