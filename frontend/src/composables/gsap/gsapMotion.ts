import { nextTick } from 'vue'

import {
  GSAP_DURATION_MED,
  GSAP_DURATION_SLOW,
  GSAP_EASE_SMOOTH,
  GSAP_EASE_SPRING,
} from './gsapTokens'
import { gsap } from './registerGsap'

export { GSAP_DURATION_MED, GSAP_DURATION_SLOW, GSAP_EASE_SMOOTH, GSAP_EASE_SPRING }

export async function waitForPaint(): Promise<void> {
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/** 将文本拆成逐字 span，返回字符节点 */
export function splitTextToSpans(
  el: HTMLElement | null,
  className = 'gsap-char',
): HTMLElement[] {
  if (!el) return []
  if (el.dataset.gsapSplit === '1') {
    return Array.from(el.querySelectorAll<HTMLElement>(`.${className}`))
  }
  const text = el.textContent ?? ''
  el.textContent = ''
  el.dataset.gsapSplit = '1'
  const frag = document.createDocumentFragment()
  const chars: HTMLElement[] = []
  text.split('').forEach((ch) => {
    const span = document.createElement('span')
    span.className = className
    span.style.display = 'inline-block'
    span.textContent = ch === ' ' ? '\u00a0' : ch
    frag.appendChild(span)
    chars.push(span)
  })
  el.appendChild(frag)
  return chars
}

export function staggerUp(
  targets: gsap.TweenTarget,
  opts: { y?: number; delay?: number; stagger?: number; duration?: number; blur?: number } = {},
) {
  const { y = 18, delay = 0, stagger = 0.06, duration = GSAP_DURATION_MED, blur = 0 } = opts
  if (!gsap.utils.toArray(targets).length) return
  gsap.fromTo(
    targets,
    { autoAlpha: 0, y, filter: blur ? `blur(${blur}px)` : 'none' },
    {
      autoAlpha: 1,
      y: 0,
      filter: 'blur(0px)',
      duration,
      ease: GSAP_EASE_SMOOTH,
      stagger,
      delay,
    },
  )
}

export function staggerFromLeft(
  targets: gsap.TweenTarget,
  opts: { x?: number; delay?: number; stagger?: number; duration?: number } = {},
) {
  const { x = -16, delay = 0, stagger = 0.08, duration = GSAP_DURATION_MED } = opts
  if (!gsap.utils.toArray(targets).length) return
  gsap.fromTo(
    targets,
    { autoAlpha: 0, x },
    { autoAlpha: 1, x: 0, duration, ease: GSAP_EASE_SMOOTH, stagger, delay },
  )
}

/** 导航/按钮出现弹跳 */
export function popIn(el: Element | null | undefined, scale = 1.08) {
  if (!el) return
  gsap.fromTo(
    el,
    { scale: 0.76, autoAlpha: 0, rotation: -4 },
    { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.52, ease: GSAP_EASE_SPRING },
  )
  gsap.fromTo(
    el,
    { scale },
    { scale: 1, duration: 0.32, ease: GSAP_EASE_SMOOTH, delay: 0.14 },
  )
}

/** 无限呼吸循环 */
export function breathLoop(el: Element | null | undefined, scale = 1.04) {
  if (!el) return () => {}
  const tween = gsap.to(el, {
    scale,
    duration: 2.2,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  })
  return () => tween.kill()
}

/** 轻柔上下漂浮 */
export function floatLoop(el: Element | null | undefined, y = 6, duration = 3.2) {
  if (!el) return () => {}
  const tween = gsap.to(el, {
    y: `+=${y}`,
    duration,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  })
  return () => tween.kill()
}

/** Toast / 轻提示弹出 */
export function toastPop(el: Element | null | undefined, onDone?: () => void) {
  if (!el) {
    onDone?.()
    return
  }
  gsap.fromTo(
    el,
    { autoAlpha: 0, y: 12, scale: 0.94 },
    {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.42,
      ease: GSAP_EASE_SPRING,
      onComplete: onDone,
    },
  )
}

export function toastHide(el: Element | null | undefined, onDone?: () => void) {
  if (!el) {
    onDone?.()
    return
  }
  gsap.to(el, {
    autoAlpha: 0,
    y: -8,
    scale: 0.96,
    duration: 0.28,
    ease: 'power2.in',
    onComplete: onDone,
  })
}

/** FLIP 位移归位（分栏等布局突变） */
export function flipTranslate(
  el: Element | null | undefined,
  dx: number,
  dy: number,
  duration = 0.58,
) {
  if (!el || (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) return
  gsap.fromTo(
    el,
    { x: dx, y: dy },
    { x: 0, y: 0, duration, ease: GSAP_EASE_SMOOTH, clearProps: 'transform' },
  )
}

/** 面板自侧滑入（详情抽屉等） */
export function panelSlideIn(
  el: Element | null | undefined,
  opts: { fromX?: number; onDone?: () => void } = {},
) {
  const { fromX = 40, onDone } = opts
  if (!el) {
    onDone?.()
    return
  }
  const tl = gsap.timeline({ onComplete: onDone })
  tl.fromTo(
    el,
    { x: fromX, autoAlpha: 0, scale: 0.97, filter: 'blur(10px)' },
    { x: 0, autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.62, ease: GSAP_EASE_SPRING },
  )
  const kids = el.querySelectorAll('.xiqi-detail-body > *, .compose-preview > *')
  if (kids.length) {
    tl.from(
      kids,
      { autoAlpha: 0, y: 14, stagger: 0.06, duration: 0.48, ease: GSAP_EASE_SMOOTH },
      '-=0.32',
    )
  }
}

export function panelSlideOut(
  el: Element | null | undefined,
  opts: { toX?: number; onDone?: () => void } = {},
) {
  const { toX = 28, onDone } = opts
  if (!el) {
    onDone?.()
    return
  }
  gsap.to(el, {
    x: toX,
    autoAlpha: 0,
    scale: 0.98,
    filter: 'blur(6px)',
    duration: 0.36,
    ease: 'power2.in',
    onComplete: onDone,
  })
}

/** 故障抖动 */
export function glitchShake(el: Element | null | undefined, intensity = 6) {
  if (!el) return
  gsap.fromTo(
    el,
    { x: 0 },
    {
      x: () => gsap.utils.random(-intensity, intensity),
      duration: 0.06,
      repeat: 5,
      yoyo: true,
      ease: 'none',
      onComplete: () => {
        gsap.set(el, { x: 0 })
      },
    },
  )
}
