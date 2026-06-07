import { onMounted, onUnmounted, type Ref } from 'vue'

import { gsap, registerGsapPlugins } from '@/composables/gsap/registerGsap'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

const MAGNET_STRENGTH = 0.22
const MAGNET_MAX = 7

/**
 * 导航链接轻微磁吸：鼠标靠近时链接向指针偏移，离开回弹。
 */
export function useNavLinkMagnet(navRootRef: Ref<HTMLElement | null | undefined>) {
  let ctx: gsap.Context | null = null

  onMounted(() => {
    if (prefersReducedMotionMedia()) return
    const root = navRootRef.value
    if (!root) return

    registerGsapPlugins()
    const links = root.querySelectorAll<HTMLElement>('.link, .group-trigger, .dropdown-item')
    if (!links.length) return

    ctx = gsap.context(() => {
      const onMove = (ev: PointerEvent) => {
        if (!ev.isPrimary) return
        const { clientX, clientY } = ev
        links.forEach((el) => {
          const rect = el.getBoundingClientRect()
          const cx = rect.left + rect.width / 2
          const cy = rect.top + rect.height / 2
          const dx = clientX - cx
          const dy = clientY - cy
          const dist = Math.hypot(dx, dy)
          const influence = Math.max(0, 1 - dist / 120)
          const ox = gsap.utils.clamp(-MAGNET_MAX, MAGNET_MAX, dx * MAGNET_STRENGTH * influence)
          const oy = gsap.utils.clamp(-MAGNET_MAX, MAGNET_MAX, dy * MAGNET_STRENGTH * influence)
          gsap.to(el, { x: ox, y: oy, duration: 0.35, overwrite: 'auto' })
        })
      }

      const onLeave = () => {
        gsap.to(links, { x: 0, y: 0, duration: 0.5, ease: 'power3.out', overwrite: true })
      }

      root.addEventListener('pointermove', onMove, { passive: true })
      root.addEventListener('pointerleave', onLeave)

      return () => {
        root.removeEventListener('pointermove', onMove)
        root.removeEventListener('pointerleave', onLeave)
      }
    }, root)
  })

  onUnmounted(() => {
    ctx?.revert()
    ctx = null
  })
}
