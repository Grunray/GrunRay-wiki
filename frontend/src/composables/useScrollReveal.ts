import { nextTick, onUnmounted, type Ref } from 'vue'

import { gsap, registerGsapPlugins, ScrollTrigger } from '@/composables/gsap/registerGsap'
import { GSAP_DURATION_MED, GSAP_EASE_SPRING } from '@/composables/gsap/gsapTokens'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

type ScrollRevealOptions = {
  selector?: string
  y?: number
  once?: boolean
}

/**
 * 滚动进入视口时错落显现（ScrollTrigger.batch）。
 */
export function useScrollReveal(
  containerRef: Ref<HTMLElement | null | undefined>,
  options: ScrollRevealOptions = {},
) {
  const {
    selector = [
      '.markdown-body h2',
      '.markdown-body h3',
      '.markdown-body blockquote',
      '.markdown-body pre',
      '.markdown-body img',
      '.friends-section',
      '.about-profile section',
      '.about-profile .award-chip',
      '.about-timeline-item',
      '.message-item:nth-child(n+6)',
      '.toolbar + .timeline .timeline-item:nth-child(n+4)',
      '.project-block',
      '.blocks > *',
      '.xiqi-card:nth-child(n+5)',
      '.compose-section-title',
      '.post-card:nth-child(n+4)',
      '.latest-post-card',
      '.self-intro-box',
    ].join(', '),
    y = 32,
    once = true,
  } = options
  let ctx: gsap.Context | null = null

  async function bind() {
    ctx?.revert()
    ctx = null
    if (prefersReducedMotionMedia()) return

    await nextTick()
    const root = containerRef.value
    if (!root) return

    registerGsapPlugins()
    const targets = root.querySelectorAll(selector)
    if (!targets.length) return

    ctx = gsap.context(() => {
      gsap.set(targets, { autoAlpha: 0, y, filter: 'blur(4px)' })

      ScrollTrigger.batch(targets, {
        start: 'top 90%',
        once,
        onEnter: (batch) => {
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: GSAP_DURATION_MED,
            ease: GSAP_EASE_SPRING,
            stagger: 0.08,
            overwrite: true,
          })
        },
      })
    }, root)
  }

  function refresh() {
    ScrollTrigger.refresh()
  }

  onUnmounted(() => {
    ctx?.revert()
    ctx = null
  })

  return { bind, refresh }
}
