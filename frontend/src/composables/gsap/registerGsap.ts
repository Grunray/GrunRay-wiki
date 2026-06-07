import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { GSAP_DURATION_MED, GSAP_EASE_SMOOTH } from './gsapTokens'

let registered = false

/** 应用级注册 GSAP 插件与默认 tween 参数（仅执行一次） */
export function registerGsapPlugins(): typeof gsap {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger)
    gsap.defaults({
      duration: GSAP_DURATION_MED,
      ease: GSAP_EASE_SMOOTH,
    })
    registered = true
  }
  return gsap
}

export { gsap, ScrollTrigger }
