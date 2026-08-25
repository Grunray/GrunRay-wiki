import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  onMounted,
  onUnmounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * 方案 D：题录区滚出视口顶之后，侧栏淡入并稳定展示（不再随正文滚动半露半隐）。
 * 侧栏是视口 overlay，不改 app-main 宽度、不给正文加 margin。
 */
const WIDE_MQ = '(min-width: 1280px)'
const REVEAL_DURATION = 0.42

export function useDetailScrollSidebar(
  foldZone: Ref<HTMLElement | null>,
  opts: {
    contentKey?: MaybeRefOrGetter<string>
  } = {},
) {
  const progress = ref(0)
  const wideEnough = ref(false)

  let mm: ReturnType<typeof gsap.matchMedia> | undefined
  let refreshTimer = 0
  let revealTween: gsap.core.Tween | null = null
  let activeTrigger: ScrollTrigger | null = null
  const tweenState = { p: 0 }

  function applyProgress(p: number) {
    const clamped = gsap.utils.clamp(0, 1, p)
    tweenState.p = clamped
    progress.value = clamped
  }

  function tweenProgress(to: number, immediate = false) {
    revealTween?.kill()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (immediate || reduced) {
      applyProgress(to)
      return
    }
    revealTween = gsap.to(tweenState, {
      p: to,
      duration: REVEAL_DURATION,
      ease: 'power2.out',
      onUpdate: () => applyProgress(tweenState.p),
    })
  }

  function teardown() {
    window.clearTimeout(refreshTimer)
    revealTween?.kill()
    revealTween = null
    activeTrigger?.kill()
    activeTrigger = null
    mm?.revert()
    mm = undefined
    wideEnough.value = false
    applyProgress(0)
  }

  function setup() {
    window.clearTimeout(refreshTimer)
    revealTween?.kill()
    revealTween = null
    activeTrigger?.kill()
    activeTrigger = null
    mm?.revert()
    mm = undefined
    applyProgress(0)

    const trigger = foldZone.value
    if (!trigger) {
      wideEnough.value = false
      return
    }

    mm = gsap.matchMedia()
    mm.add(WIDE_MQ, () => {
      wideEnough.value = true

      activeTrigger = ScrollTrigger.create({
        trigger,
        start: 'bottom top',
        invalidateOnRefresh: true,
        onEnter: () => tweenProgress(1),
        onLeaveBack: () => tweenProgress(0),
      })

      ScrollTrigger.refresh()
      if (activeTrigger.isActive) {
        tweenProgress(1, true)
      }

      return () => {
        wideEnough.value = false
        revealTween?.kill()
        revealTween = null
        activeTrigger?.kill()
        activeTrigger = null
        applyProgress(0)
      }
    })

    if (!window.matchMedia(WIDE_MQ).matches) {
      wideEnough.value = false
    }
  }

  function scheduleSetup() {
    window.clearTimeout(refreshTimer)
    refreshTimer = window.setTimeout(setup, 50)
  }

  onMounted(() => {
    scheduleSetup()
  })

  onUnmounted(() => {
    teardown()
  })

  onBeforeRouteLeave(() => {
    applyProgress(0)
    teardown()
  })

  watch(
    () => [foldZone.value, toValue(opts.contentKey ?? '')] as const,
    () => {
      scheduleSetup()
    },
    { flush: 'post' },
  )

  return { progress, wideEnough }
}
