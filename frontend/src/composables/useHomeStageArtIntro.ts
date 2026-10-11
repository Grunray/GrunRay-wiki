/**
 * 首页底层图开屏 · 方案 D「墨起扇鸣」编排（原型 designed/home-stage-intro/ 为规格）。
 *
 * 时序（勿凭感觉重调）：
 *   一段 0→1.9s   354 path 自扇轴起笔描绘（WAAPI stroke-dashoffset）
 *   二段 1.95s 起 .stage-intro--inked：扫扇 0→1（rAF 写内联 clip-path，P4）
 *                 + 光束 133°→157° + base 淡入（CSS transition）+ 描绘层淡出
 *   3.25s         描绘层 display:none（撤场）
 *   3.4s 起       环境态（wash 呼吸 / 整图漂浮，纯 CSS，仅 full 档）
 *
 * 排雷（MERGE.md）：
 *   P1  预隐藏只挂 .stage-intro--armed；任何失败分支 = 不武装 = 静态现状
 *   P2  首访蜗牛在播时等 ui.splashWoniuActive 落幕后接描绘
 *   P5  播放中途切主题：提前 inked + 直接撤描绘层（错色线稿不留）
 *   P7  计时器 / WAAPI / rAF 全部可清理
 *   P8  仅 isMotionFull() 播；非 full 档视觉兜底在 page-home-stage-intro.css
 *   P9  每个标签页会话只播一次（sessionStorage）；再进首页直接静态
 *   P10 仅「首次挂载即在场」才武装；照片背景后挂载不补播
 *   P12 221KB 线稿仅 full + 关照片背景 + 首页且本会话未播过才 fetch，1.5s 超时回退静态
 */
import { nextTick, onUnmounted, ref, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  HOME_STAGE_ART_WEDGE_DERIVED,
  homeStageArtWedgeClipPath,
  wedgeClipPathAt,
} from '@/composables/homeStageArtWedge'
import { isMotionFull } from '@/composables/useMotionPolicy'
import { useUiStore } from '@/stores/ui'

const LINE_ART_URL = '/art/polonia_sandoren_line.svg'
const FETCH_TIMEOUT_MS = 1500
/** 本标签页已播过开屏。关标签即失效，不写入 localStorage。 */
const SESSION_KEY = 'grunray_home_stage_intro_v1'

function hasPlayedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markPlayedThisSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* 隐私模式或配额：当次照播，下次再试 */
  }
}

const INKED_AT = 1950
const HIDE_DRAW_AT = 3250
const SWEEP_START = 2000
const SWEEP_DUR = 1000
const BEAM_START = 2050
const BEAM_DUR = 1050
const RAF_END = 3150

/** cubic-bezier(x1,y1,x2,y2) 求值（x→y），牛顿迭代 + 二分回退 */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t
  const sy = (t: number) => ((ay * t + by) * t + cy) * t
  const sdx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (x: number): number => {
    let t = x
    for (let i = 0; i < 8; i += 1) {
      const err = sx(t) - x
      if (Math.abs(err) < 1e-6) return sy(t)
      const d = sdx(t)
      if (Math.abs(d) < 1e-6) break
      t -= err / d
    }
    let lo = 0
    let hi = 1
    t = x
    for (let i = 0; i < 24; i += 1) {
      const v = sx(t)
      if (Math.abs(v - x) < 1e-6) break
      if (v < x) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return sy(t)
  }
}

const EASE_SWEEP = cubicBezier(0.22, 1, 0.36, 1) // var(--ease-out)
const EASE_BEAM = cubicBezier(0, 0, 0.58, 1) // CSS ease-out
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

interface DrawItem {
  el: SVGPathElement
  len: number
  delay: number
  dur: number
}

export function useHomeStageArtIntro(options: { stackRef: Ref<HTMLElement | null> }) {
  const { stackRef } = options
  const ui = useUiStore()
  const { theme, splashWoniuActive } = storeToRefs(ui)

  /** v-html 注入的线稿 SVG（P6：只注入一次，播完 display:none 不拔节点） */
  const drawSvg = ref('')

  const timers: ReturnType<typeof setTimeout>[] = []
  const anims: Animation[] = []
  let rafId = 0
  let state: 'idle' | 'armed' | 'drawing' | 'done' = 'idle'
  let items: DrawItem[] = []
  let staticClip = ''
  let stopThemeWatch: (() => void) | null = null

  const doubleRaf = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

  function beamBackground(angleDeg: number): string {
    const apexX = HOME_STAGE_ART_WEDGE_DERIVED.apexPctX.toFixed(4)
    const apexY = HOME_STAGE_ART_WEDGE_DERIVED.apexPctY.toFixed(0)
    return (
      `conic-gradient(from ${angleDeg.toFixed(2)}deg at ${apexX}% ${apexY}%, ` +
      'transparent 0deg, rgb(255 248 230 / 0.8) 3.4deg, transparent 6.2deg)'
    )
  }

  function clearRunways() {
    timers.forEach((t) => clearTimeout(t))
    timers.length = 0
    anims.forEach((a) => {
      try {
        a.cancel()
      } catch {
        /* ignore */
      }
    })
    anims.length = 0
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
  }

  /** 写回与今天逐像素一致的静态终态（P4） */
  function restoreStatic(stack: HTMLElement) {
    const tint = stack.querySelector<HTMLElement>('.home-stage-art-tint')
    const wash = stack.querySelector<HTMLElement>('.home-stage-art-wash')
    if (tint) tint.style.clipPath = staticClip
    if (wash) wash.style.clipPath = staticClip
    const beam = stack.querySelector<HTMLElement>('.home-stage-art-beam')
    if (beam) beam.style.opacity = '0'
  }

  /** 中途切主题（P5）：二段未开始则提前 inked + 直接撤描绘层 */
  function finalizeEarly() {
    if (state !== 'drawing') return
    const stack = stackRef.value
    clearRunways()
    state = 'done'
    if (!stack) return
    for (const it of items) {
      it.el.style.strokeDasharray = ''
      it.el.style.strokeDashoffset = ''
    }
    restoreStatic(stack)
    stack.classList.add('stage-intro--inked')
    const draw = stack.querySelector<HTMLElement>('.home-stage-art-draw')
    if (draw) draw.style.display = 'none'
  }

  function startRaf(stack: HTMLElement, t0: number) {
    const tint = stack.querySelector<HTMLElement>('.home-stage-art-tint')
    const wash = stack.querySelector<HTMLElement>('.home-stage-art-wash')
    const beam = stack.querySelector<HTMLElement>('.home-stage-art-beam')
    const beamFrom = HOME_STAGE_ART_WEDGE_DERIVED.beamFromDeg
    const beamSpan = HOME_STAGE_ART_WEDGE_DERIVED.beamToDeg - HOME_STAGE_ART_WEDGE_DERIVED.beamFromDeg

    const tick = (now: number) => {
      const t = now - t0
      // 扫扇：2000→3000，ease-out
      const sp = clamp01((t - SWEEP_START) / SWEEP_DUR)
      const clip = sp >= 1 ? staticClip : wedgeClipPathAt(EASE_SWEEP(sp))
      if (tint) tint.style.clipPath = clip
      if (wash) wash.style.clipPath = clip
      // 光束：2050→3100，ease-out + 透明度包络 0→14%→82%→0
      const bq = clamp01((t - BEAM_START) / BEAM_DUR)
      if (beam) {
        if (bq <= 0 || bq >= 1) {
          if (bq >= 1) beam.style.opacity = '0'
        } else {
          const ang = beamFrom + beamSpan * EASE_BEAM(bq)
          const op = bq < 0.14 ? bq / 0.14 : bq <= 0.82 ? 1 : 1 - (bq - 0.82) / 0.18
          beam.style.background = beamBackground(ang)
          beam.style.opacity = op.toFixed(3)
        }
      }
      if (t < RAF_END) {
        rafId = requestAnimationFrame(tick)
      } else {
        restoreStatic(stack) // 终态与静态逐字符一致
        rafId = 0
      }
    }
    rafId = requestAnimationFrame(tick)
  }

  function play() {
    const stack = stackRef.value
    if (!stack || state !== 'armed') return
    state = 'drawing'
    markPlayedThisSession()
    const t0 = performance.now()
    // 一段：逐笔描绘（WAAPI）
    for (const it of items) {
      const anim = it.el.animate(
        [{ strokeDashoffset: it.len }, { strokeDashoffset: 0 }],
        {
          duration: it.dur,
          delay: it.delay,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards',
        },
      )
      anims.push(anim)
    }
    // 二段：inked（CSS 负责 base 淡入 / 描绘层淡出；rAF 负责扫扇 + 光束）
    timers.push(
      setTimeout(() => {
        stack.classList.add('stage-intro--inked')
      }, INKED_AT),
    )
    timers.push(
      setTimeout(() => {
        const draw = stack.querySelector<HTMLElement>('.home-stage-art-draw')
        if (draw) draw.style.display = 'none'
        state = 'done'
        stopThemeWatch?.()
      }, HIDE_DRAW_AT),
    )
    startRaf(stack, t0)
  }

  /** 量长度 + 按距扇轴排 delay，设 dashoffset 初值（线稿全隐待绘） */
  function prepareDrawItems(stack: HTMLElement) {
    const draw = stack.querySelector<HTMLElement>('.home-stage-art-draw')
    if (!draw) return false
    const paths = Array.from(draw.querySelectorAll('path'))
    if (!paths.length) return false
    const apex = { x: 1270.93, y: 0 }
    let maxDist = 1
    const measured = paths.map((el) => {
      let len = 0
      let cx = apex.x
      let cy = apex.y
      try {
        len = el.getTotalLength()
        const bb = el.getBBox()
        cx = bb.x + bb.width / 2
        cy = bb.y + bb.height / 2
      } catch {
        /* 忽略异常 path */
      }
      const dist = Math.hypot(cx - apex.x, cy - apex.y)
      if (dist > maxDist) maxDist = dist
      return { el, len, dist }
    })
    items = measured.map((m) => ({
      el: m.el,
      len: m.len,
      delay: (m.dist / maxDist) * 1100,
      dur: Math.min(340 + m.len * 0.35, 1050),
    }))
    for (const it of items) {
      it.el.style.strokeDasharray = String(it.len)
      it.el.style.strokeDashoffset = String(it.len)
    }
    return true
  }

  async function tryArmOnce() {
    if (state !== 'idle') return
    // P8/P9/P10/P12 门禁：full 档 + 本会话未播过 + 首次挂载即在场 + 关照片背景
    if (!isMotionFull()) return
    if (hasPlayedThisSession()) return
    const stack = stackRef.value
    if (!stack) return
    if (ui.photoBackgroundEnabled) return

    staticClip = homeStageArtWedgeClipPath()
    // P3：终态 clip 写 CSS 变量，非 full 档兜底用它压回（中途切档）
    stack.style.setProperty('--home-stage-wedge-clip', staticClip)

    // P12：线稿 fetch（1.5s 超时，失败静默回退静态）
    let text = ''
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
      const res = await fetch(LINE_ART_URL, { signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) return
      text = await res.text()
    } catch {
      return
    }
    const m = text.match(/<svg[\s\S]*<\/svg>/)
    if (!m) return
    drawSvg.value = m[0]

    await nextTick()
    await doubleRaf()
    const stackNow = stackRef.value
    if (!stackNow) return
    if (!prepareDrawItems(stackNow)) {
      drawSvg.value = ''
      return
    }

    // 武装：base 预隐藏（CSS）+ 扇形收到 0（JS 内联）+ 线稿初值已设
    const tint = stackNow.querySelector<HTMLElement>('.home-stage-art-tint')
    const wash = stackNow.querySelector<HTMLElement>('.home-stage-art-wash')
    const zeroClip = wedgeClipPathAt(0)
    if (tint) tint.style.clipPath = zeroClip
    if (wash) wash.style.clipPath = zeroClip
    stackNow.classList.add('stage-intro--armed')
    state = 'armed'

    // P5：播放中途切主题 → 提前收场
    stopThemeWatch = watch(theme, () => finalizeEarly())

    // P2：首访蜗牛在播 → 等落幕接描绘；否则直接播
    if (splashWoniuActive.value) {
      const stop = watch(splashWoniuActive, (active) => {
        if (!active) {
          stop()
          play()
        }
      })
    } else {
      play()
    }
  }

  onUnmounted(() => {
    // P7：全清
    stopThemeWatch?.()
    clearRunways()
    items = []
    state = 'idle'
  })

  return { drawSvg, tryArmOnce }
}
