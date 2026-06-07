import { gsap, registerGsapPlugins } from '@/composables/gsap/registerGsap'
import { GSAP_EASE_SMOOTH } from '@/composables/gsap/gsapTokens'

/** 主题切换径向扩散 */
export function playThemeRippleGsap(
  diskEl: HTMLElement,
  onDone?: () => void,
): gsap.core.Timeline {
  registerGsapPlugins()
  const size = Math.hypot(window.innerWidth, window.innerHeight) * 2.4
  gsap.set(diskEl, {
    width: 0,
    height: 0,
    autoAlpha: 0,
    filter: 'brightness(1) blur(0px)',
  })
  return gsap
    .timeline({ onComplete: onDone })
    .to(diskEl, {
      autoAlpha: 0.95,
      filter: 'brightness(1.18) blur(0px)',
      duration: 0.08,
      ease: 'power2.out',
    })
    .to(
      diskEl,
      {
        width: size,
        height: size,
        autoAlpha: 0,
        filter: 'brightness(1.02) blur(3px)',
        duration: 0.62,
        ease: GSAP_EASE_SMOOTH,
      },
      0.06,
    )
}
