import { gsap } from '@/composables/gsap/registerGsap'
import { GSAP_EASE_SPRING } from '@/composables/gsap/gsapTokens'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

function resolveFeedRoot(root: unknown): HTMLElement | null {
  if (!root) return null
  if (root instanceof HTMLElement) return root
  if (typeof root === 'object' && '$el' in root) {
    const el = (root as { $el?: unknown }).$el
    return el instanceof HTMLElement ? el : null
  }
  return null
}

/** 喜气/碎念列表筛选后卡片错落刷新 */
export function animateXiqiFeedFilter(root: unknown) {
  const el = resolveFeedRoot(root)
  if (!el || prefersReducedMotionMedia()) return
  const cards = el.querySelectorAll<HTMLElement>('.xiqi-card, .xiqi-feed-item, .xiqi-feed > li')
  if (!cards.length) return
  gsap.fromTo(
    cards,
    { autoAlpha: 0, y: 18, scale: 0.96, rotation: () => gsap.utils.random(-2, 2) },
    {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      rotation: 0,
      duration: 0.52,
      stagger: { each: 0.045, from: 'start' },
      ease: GSAP_EASE_SPRING,
      overwrite: 'auto',
    },
  )
}
