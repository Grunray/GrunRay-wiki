import { onMounted, onUnmounted, type Ref } from 'vue'

import { gsap, registerGsapPlugins } from '@/composables/gsap/registerGsap'
import { GSAP_EASE_SMOOTH, GSAP_EASE_SPRING } from '@/composables/gsap/gsapTokens'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

type Options = {
  selector?: string
}

function resetCard(card: HTMLElement) {
  gsap.to(card, {
    y: 0,
    scale: 1,
    rotationX: 0,
    rotationY: 0,
    boxShadow: '0 1px 4px rgb(51 79 82 / 10%)',
    duration: 0.42,
    ease: GSAP_EASE_SMOOTH,
    overwrite: 'auto',
  })
}

/**
 * 卡片悬停：抬升 + 轻微 3D 倾斜（随指针在卡片内位置变化）。
 */
export function useCardHoverLift(
  containerRef: Ref<HTMLElement | null | undefined>,
  options: Options = {},
) {
  const {
    selector = '.timeline-card, .friend-card, .friends-special-card, .xiqi-card, .latest-post-card, .card.item',
  } = options
  let activeEl: HTMLElement | null = null
  let root: HTMLElement | null = null

  const onOver = (ev: PointerEvent) => {
    const card = (ev.target as HTMLElement).closest<HTMLElement>(selector)
    if (!card || !root?.contains(card) || card === activeEl) return
    if (activeEl) resetCard(activeEl)
    activeEl = card
    gsap.to(card, {
      y: -6,
      scale: 1.018,
      boxShadow: '0 14px 32px rgb(51 79 82 / 16%)',
      duration: 0.38,
      ease: GSAP_EASE_SPRING,
      overwrite: 'auto',
    })
  }

  const onMove = (ev: PointerEvent) => {
    if (!activeEl) return
    const rect = activeEl.getBoundingClientRect()
    const px = (ev.clientX - rect.left) / rect.width - 0.5
    const py = (ev.clientY - rect.top) / rect.height - 0.5
    gsap.to(activeEl, {
      rotationY: px * 7,
      rotationX: -py * 5,
      transformPerspective: 900,
      duration: 0.28,
      ease: GSAP_EASE_SMOOTH,
      overwrite: 'auto',
    })
  }

  const onOut = (ev: PointerEvent) => {
    const card = (ev.target as HTMLElement).closest<HTMLElement>(selector)
    if (!card || card !== activeEl) return
    resetCard(card)
    activeEl = null
  }

  onMounted(() => {
    if (prefersReducedMotionMedia()) return
    root = containerRef.value ?? null
    if (!root) return

    registerGsapPlugins()
    root.addEventListener('pointerover', onOver)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerout', onOut)
  })

  onUnmounted(() => {
    if (root) {
      root.removeEventListener('pointerover', onOver)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerout', onOut)
    }
    if (activeEl) resetCard(activeEl)
    activeEl = null
    root = null
  })
}
