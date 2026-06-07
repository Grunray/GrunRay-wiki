<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { triggerRoutePageEnter } from '@/composables/gsap/pageEnterOrchestrator'
import {
  getRouteContentTarget,
  registerRouteTransitionHandlers,
  routeTransitionLabel,
  setRouteTransitionPhase,
} from '@/composables/gsap/routeTransitionController'
import { gsap, registerGsapPlugins } from '@/composables/gsap/registerGsap'
import {
  GSAP_DURATION_MED,
  GSAP_EASE_SMOOTH,
  GSAP_EASE_SMOOTH_IN_OUT,
  GSAP_EASE_SPRING,
} from '@/composables/gsap/gsapTokens'
import { splitTextToSpans } from '@/composables/gsap/gsapMotion'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'
import '@/styles/route-transition.css'

registerGsapPlugins()

const PANEL_COUNT = 9
const panels = Array.from({ length: PANEL_COUNT }, (_, i) => i)

const PANEL_STAGGER = 0.042
const PANEL_TRAVEL = GSAP_DURATION_MED + 0.22
/** 中心面板合拢完成时刻 ≈ 首帧 + travel */
const PANELS_COVERED_AT = PANEL_TRAVEL
/** 文案在幕帘基本合拢后出现 */
const LABEL_IN_AT = PANELS_COVERED_AT - 0.08
const BADGE_IN_AT = LABEL_IN_AT - 0.1

/** 文案退场时长；幕帘在文案完全消失后再开始拉开 */
const LABEL_OUT_DURATION = 0.52
const PANEL_OPEN_AT = LABEL_OUT_DURATION + 0.08

const rootRef = ref<HTMLElement | null>(null)
const backdropRef = ref<HTMLElement | null>(null)
const labelWrapRef = ref<HTMLElement | null>(null)
const labelRef = ref<HTMLElement | null>(null)
const flashRef = ref<HTMLElement | null>(null)
const scanRef = ref<HTMLElement | null>(null)
const badgeRef = ref<HTMLElement | null>(null)

let activeTimeline: gsap.core.Timeline | null = null
let labelChars: HTMLElement[] = []
let scanTween: gsap.core.Tween | null = null

function killActive() {
  activeTimeline?.kill()
  activeTimeline = null
  scanTween?.kill()
  scanTween = null
}

function splitLabel() {
  const label = labelRef.value
  if (!label) {
    labelChars = []
    return
  }
  delete label.dataset.gsapSplit
  labelChars = splitTextToSpans(label, 'route-curtain__char')
}

watch(routeTransitionLabel, () => {
  splitLabel()
})

function primeLabelHidden() {
  if (labelWrapRef.value) {
    gsap.set(labelWrapRef.value, { autoAlpha: 0, scale: 0.92, filter: 'blur(10px)' })
  }
  if (labelChars.length) {
    gsap.set(labelChars, {
      autoAlpha: 0,
      y: 28,
      scale: 0.55,
      rotationX: -68,
      transformOrigin: '50% 100%',
      filter: 'blur(8px)',
    })
  }
}

function startScanLoop() {
  scanTween?.kill()
  const scan = scanRef.value
  if (!scan) return
  gsap.set(scan, { yPercent: -120, autoAlpha: 0.28 })
  scanTween = gsap.to(scan, {
    yPercent: 220,
    duration: 1.35,
    ease: 'none',
    repeat: -1,
  })
}

function stopScanLoop() {
  scanTween?.kill()
  scanTween = null
  if (scanRef.value) gsap.set(scanRef.value, { autoAlpha: 0 })
}

function resetIdle() {
  killActive()
  stopScanLoop()
  setRouteTransitionPhase('idle')

  const root = rootRef.value
  const panelsEls = root?.querySelectorAll<HTMLElement>('.route-curtain__panel')
  const lines = root?.querySelectorAll<HTMLElement>('.route-curtain__line')
  if (panelsEls?.length) {
    gsap.set(panelsEls, { yPercent: 115, skewX: 0, scaleY: 1, scaleX: 1, filter: 'blur(0px)' })
  }
  if (lines?.length) gsap.set(lines, { scaleX: 0 })
  primeLabelHidden()
  if (badgeRef.value) gsap.set(badgeRef.value, { autoAlpha: 0, scale: 0.6, y: 0 })
  if (flashRef.value) gsap.set(flashRef.value, { autoAlpha: 0, scale: 1 })
  if (backdropRef.value) gsap.set(backdropRef.value, { autoAlpha: 0, backdropFilter: 'blur(0px)' })
  if (root) {
    root.dataset.state = 'idle'
    gsap.set(root, { pointerEvents: 'none', autoAlpha: 0 })
  }
  const content = getRouteContentTarget()
  if (content) gsap.set(content, { scale: 1, autoAlpha: 1, y: 0, rotation: 0, filter: 'blur(0px)' })
}

function animateLabelIn(tl: gsap.core.Timeline, at: number) {
  if (labelWrapRef.value) {
    tl.to(
      labelWrapRef.value,
      {
        autoAlpha: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.55,
        ease: GSAP_EASE_SMOOTH,
      },
      at,
    )
  }
  if (labelChars.length) {
    tl.to(
      labelChars,
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        rotationX: 0,
        filter: 'blur(0px)',
        duration: 0.62,
        stagger: { each: 0.026, from: 'center' },
        ease: GSAP_EASE_SPRING,
      },
      at + 0.04,
    )
  }
}

function animateLabelOut(tl: gsap.core.Timeline, at: number, onComplete?: () => void) {
  if (labelChars.length) {
    tl.to(
      labelChars,
      {
        autoAlpha: 0,
        y: -24,
        scale: 0.82,
        rotationX: 52,
        filter: 'blur(10px)',
        duration: LABEL_OUT_DURATION - 0.08,
        stagger: { each: 0.014, from: 'edges' },
        ease: 'power3.in',
      },
      at,
    )
  }
  if (labelWrapRef.value) {
    tl.to(
      labelWrapRef.value,
      {
        autoAlpha: 0,
        scale: 0.9,
        filter: 'blur(12px)',
        duration: LABEL_OUT_DURATION - 0.12,
        ease: 'power3.in',
      },
      at + 0.06,
    )
  }
  if (badgeRef.value) {
    tl.to(
      badgeRef.value,
      {
        autoAlpha: 0,
        scale: 0.75,
        y: -16,
        rotation: -8,
        duration: LABEL_OUT_DURATION - 0.18,
        ease: 'power3.in',
      },
      at,
    )
  }
  tl.call(() => onComplete?.(), undefined, at + LABEL_OUT_DURATION)
}

function playClose(): Promise<void> {
  if (prefersReducedMotionMedia()) return Promise.resolve()
  const root = rootRef.value
  if (!root) return Promise.resolve()

  killActive()
  splitLabel()
  primeLabelHidden()
  root.dataset.state = 'closing'
  setRouteTransitionPhase('closing')

  const panelEls = root.querySelectorAll<HTMLElement>('.route-curtain__panel')
  const lineEls = root.querySelectorAll<HTMLElement>('.route-curtain__line')

  return new Promise((resolve) => {
    gsap.set(root, { pointerEvents: 'auto', autoAlpha: 1 })
    gsap.set(panelEls, {
      yPercent: 115,
      skewX: (i) => (i % 2 === 0 ? -6 : 6),
      scaleY: (i) => 1.06 + (i % 3) * 0.02,
      scaleX: (i) => 0.88 + (i % 2) * 0.04,
      filter: 'blur(6px)',
    })
    gsap.set(lineEls, { scaleX: 0, transformOrigin: 'center center' })
    if (badgeRef.value) gsap.set(badgeRef.value, { autoAlpha: 0, scale: 0.45, rotation: -10, y: 8 })

    const content = getRouteContentTarget()
    if (content) {
      gsap.to(content, {
        scale: 0.97,
        autoAlpha: 0.35,
        y: 8,
        rotation: 0.25,
        filter: 'blur(5px)',
        duration: 0.48,
        ease: GSAP_EASE_SMOOTH_IN_OUT,
      })
    }

    startScanLoop()

    activeTimeline = gsap.timeline({
      defaults: { ease: GSAP_EASE_SMOOTH_IN_OUT },
      onComplete: () => {
        root.dataset.state = 'covered'
        setRouteTransitionPhase('covered')
        activeTimeline = null
        resolve()
      },
    })

    if (backdropRef.value) {
      activeTimeline.to(
        backdropRef.value,
        {
          autoAlpha: 1,
          backdropFilter: 'blur(14px)',
          duration: 0.42,
          ease: GSAP_EASE_SMOOTH,
        },
        0,
      )
    }

    activeTimeline.to(
      panelEls,
      {
        yPercent: 0,
        skewX: 0,
        scaleY: 1,
        scaleX: 1,
        filter: 'blur(0px)',
        duration: PANEL_TRAVEL,
        stagger: { each: PANEL_STAGGER, from: 'center' },
        ease: 'power4.inOut',
      },
      0,
    )

    if (badgeRef.value) {
      activeTimeline.to(
        badgeRef.value,
        { autoAlpha: 1, scale: 1, rotation: 0, y: 0, duration: 0.55, ease: GSAP_EASE_SPRING },
        BADGE_IN_AT,
      )
    }

    activeTimeline.to(
      lineEls,
      { scaleX: 1, duration: 0.42, stagger: 0.06, ease: GSAP_EASE_SMOOTH },
      LABEL_IN_AT - 0.02,
    )

    if (flashRef.value) {
      activeTimeline.fromTo(
        flashRef.value,
        { autoAlpha: 0.5, scale: 0.88 },
        { autoAlpha: 0, scale: 1.18, duration: 0.55, ease: 'power2.out' },
        LABEL_IN_AT,
      )
    }

    animateLabelIn(activeTimeline, LABEL_IN_AT)
  })
}

function playOpen(onReveal?: () => void): Promise<void> {
  if (prefersReducedMotionMedia()) {
    resetIdle()
    onReveal?.()
    return Promise.resolve()
  }

  const root = rootRef.value
  if (!root) {
    onReveal?.()
    return Promise.resolve()
  }

  killActive()
  root.dataset.state = 'opening'
  setRouteTransitionPhase('opening')

  const panelEls = root.querySelectorAll<HTMLElement>('.route-curtain__panel')
  const lineEls = root.querySelectorAll<HTMLElement>('.route-curtain__line')
  const content = getRouteContentTarget()

  return new Promise((resolve) => {
    activeTimeline = gsap.timeline({
      defaults: { ease: GSAP_EASE_SMOOTH_IN_OUT },
      onComplete: () => {
        resetIdle()
        onReveal?.()
        resolve()
      },
    })

    activeTimeline.to(
      lineEls,
      { scaleX: 0, duration: 0.28, stagger: 0.03, ease: 'power2.inOut' },
      0,
    )

    animateLabelOut(activeTimeline, 0, () => {
      setRouteTransitionPhase('revealed')
      if (content) {
        gsap.set(content, {
          scale: 1,
          autoAlpha: 1,
          y: 0,
          rotation: 0,
          filter: 'blur(0px)',
          clearProps: 'transform',
        })
      }
      void triggerRoutePageEnter()
    })

    if (backdropRef.value) {
      activeTimeline.to(
        backdropRef.value,
        { autoAlpha: 0, backdropFilter: 'blur(0px)', duration: 0.38 },
        PANEL_OPEN_AT - 0.04,
      )
    }

    activeTimeline.to(
      panelEls,
      {
        yPercent: -115,
        skewX: (i) => (i % 2 === 0 ? 7 : -7),
        scaleY: (i) => 1 + (i % 2) * 0.04,
        scaleX: (i) => 0.94 + (i % 3) * 0.02,
        filter: 'blur(4px)',
        duration: PANEL_TRAVEL,
        stagger: { each: PANEL_STAGGER, from: 'edges' },
        ease: 'power4.inOut',
      },
      PANEL_OPEN_AT,
    )

    if (flashRef.value) {
      activeTimeline.fromTo(
        flashRef.value,
        { autoAlpha: 0.28, scale: 1.02 },
        { autoAlpha: 0, scale: 1.32, duration: 0.48 },
        PANEL_OPEN_AT + 0.06,
      )
    }

    activeTimeline.call(() => stopScanLoop(), undefined, PANEL_OPEN_AT + 0.1)
  })
}

onMounted(() => {
  resetIdle()
  splitLabel()
  registerRouteTransitionHandlers({ playClose, playOpen, forceReset: resetIdle })
})

onUnmounted(() => {
  killActive()
  stopScanLoop()
  registerRouteTransitionHandlers(null)
  setRouteTransitionPhase('idle')
})
</script>

<template>
  <div ref="rootRef" class="route-curtain" data-state="idle" aria-hidden="true">
    <div ref="backdropRef" class="route-curtain__backdrop" aria-hidden="true" />
    <div class="route-curtain__panels">
      <span
        v-for="i in panels"
        :key="i"
        class="route-curtain__panel"
        :style="{ '--panel-i': String(i) }"
      >
        <span class="route-curtain__panel-inner" aria-hidden="true" />
      </span>
    </div>
    <div class="route-curtain__lines" aria-hidden="true">
      <span class="route-curtain__line route-curtain__line--top" />
      <span class="route-curtain__line route-curtain__line--bottom" />
    </div>
    <div ref="scanRef" class="route-curtain__scan" aria-hidden="true" />
    <div ref="flashRef" class="route-curtain__flash" aria-hidden="true" />
    <span ref="badgeRef" class="route-curtain__badge">nav</span>
    <div ref="labelWrapRef" class="route-curtain__label-wrap">
      <p ref="labelRef" class="route-curtain__label">{{ routeTransitionLabel }}</p>
    </div>
  </div>
</template>
