import { onMounted, onUnmounted, type Ref } from 'vue'

import { gsap, registerGsapPlugins } from '@/composables/gsap/registerGsap'
import { GSAP_EASE_SPRING } from '@/composables/gsap/gsapTokens'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

/** 胶片帧悬停：轻微放大 + 亮度 */
export function useFilmFrameHover(containerRef: Ref<HTMLElement | null | undefined>) {
  let root: HTMLElement | null = null
  let active: HTMLElement | null = null

  const onOver = (ev: PointerEvent) => {
    const frame = (ev.target as HTMLElement).closest<HTMLElement>('.frame')
    if (!frame || !root?.contains(frame) || frame === active) return
    if (active) {
      gsap.to(active, { scale: 1, filter: 'brightness(1)', duration: 0.3 })
    }
    active = frame
    gsap.to(frame, {
      scale: 1.04,
      filter: 'brightness(1.08)',
      duration: 0.38,
      ease: GSAP_EASE_SPRING,
      overwrite: 'auto',
    })
  }

  const onOut = (ev: PointerEvent) => {
    const frame = (ev.target as HTMLElement).closest<HTMLElement>('.frame')
    if (!frame || frame !== active) return
    gsap.to(frame, { scale: 1, filter: 'brightness(1)', duration: 0.35 })
    active = null
  }

  onMounted(() => {
    if (prefersReducedMotionMedia()) return
    root = containerRef.value ?? null
    if (!root) return
    registerGsapPlugins()
    root.addEventListener('pointerover', onOver)
    root.addEventListener('pointerout', onOut)
  })

  onUnmounted(() => {
    root?.removeEventListener('pointerover', onOver)
    root?.removeEventListener('pointerout', onOut)
    if (active) gsap.set(active, { scale: 1, filter: 'brightness(1)' })
  })
}
