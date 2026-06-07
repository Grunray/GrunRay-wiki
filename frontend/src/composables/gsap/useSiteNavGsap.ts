import { nextTick, onMounted, onUnmounted, type Ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { breathLoop } from '@/composables/gsap/gsapMotion'
import { gsap, registerGsapPlugins } from '@/composables/gsap/registerGsap'
import { GSAP_EASE_SMOOTH, GSAP_EASE_SPRING } from '@/composables/gsap/gsapTokens'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

/** 主导航：激活呼吸 + 下拉 stagger + 链接悬停弹性 */
export function useSiteNavGsap(navRef: Ref<HTMLElement | null | undefined>) {
  const route = useRoute()
  const cleanups: Array<() => void> = []
  let dropdownCtx: gsap.Context | null = null
  let observer: MutationObserver | null = null
  let root: HTMLElement | null = null

  function clearBreath() {
    while (cleanups.length) cleanups.pop()?.()
  }

  function syncBreath() {
    clearBreath()
    if (prefersReducedMotionMedia()) return
    if (!root) return
    registerGsapPlugins()
    root.querySelectorAll<HTMLElement>('.link.active, .group-trigger.active').forEach((el) => {
      cleanups.push(breathLoop(el, 1.04))
      gsap.to(el.querySelector('.leaf-glow'), {
        autoAlpha: 0.85,
        scale: 1.2,
        duration: 1.6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
    })
  }

  function animateDropdownItems(container: HTMLElement) {
    dropdownCtx?.revert()
    if (prefersReducedMotionMedia()) return
    const items = container.querySelectorAll<HTMLElement>('.dropdown-item')
    if (!items.length) return
    registerGsapPlugins()
    dropdownCtx = gsap.context(() => {
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 14, x: -10, scale: 0.96 },
        {
          autoAlpha: 1,
          y: 0,
          x: 0,
          scale: 1,
          duration: 0.48,
          stagger: 0.06,
          ease: GSAP_EASE_SPRING,
          delay: 0.06,
        },
      )
    }, container)
  }

  function bindLinkHover() {
    if (!root || prefersReducedMotionMedia()) return
    root.querySelectorAll<HTMLElement>('.link, .group-trigger').forEach((link) => {
      link.addEventListener('pointerenter', () => {
        gsap.to(link, {
          y: -3,
          scale: 1.02,
          duration: 0.35,
          ease: GSAP_EASE_SPRING,
          overwrite: 'auto',
        })
        const icon = link.querySelector('.link-icon')
        if (icon) {
          gsap.to(icon, { rotation: -4, y: -1, duration: 0.35, ease: GSAP_EASE_SMOOTH })
        }
      })
      link.addEventListener('pointerleave', () => {
        gsap.to(link, { y: 0, scale: 1, duration: 0.4, ease: GSAP_EASE_SMOOTH, overwrite: 'auto' })
        const icon = link.querySelector('.link-icon')
        if (icon) gsap.to(icon, { rotation: 0, y: 0, duration: 0.4, ease: GSAP_EASE_SMOOTH })
      })
    })
  }

  onMounted(() => {
    root = navRef.value ?? null
    if (!root) return

    observer = new MutationObserver(() => {
      const panel = root?.querySelector<HTMLElement>('.nav-group-dropdown-enter-active')
      if (panel) animateDropdownItems(panel)
      syncBreath()
    })

    observer.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
    })

    bindLinkHover()
    watch(() => route.path, () => nextTick(syncBreath), { immediate: true })
  })

  onUnmounted(() => {
    observer?.disconnect()
    clearBreath()
    dropdownCtx?.revert()
    root = null
  })
}
