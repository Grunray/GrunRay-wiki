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
 * 方案 D：题录区滚出视口顶之后，侧栏才开始淡入。
 * 侧栏是视口 overlay，不改 app-main 宽度、不给正文加 margin。
 */
const WIDE_MQ = '(min-width: 1280px)'
const REVEAL_SPAN_PX = 220

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

  function applyProgress(p: number) {
    progress.value = gsap.utils.clamp(0, 1, p)
  }

  function teardown() {
    window.clearTimeout(refreshTimer)
    mm?.revert()
    mm = undefined
    wideEnough.value = false
    applyProgress(0)
  }

  function setup() {
    window.clearTimeout(refreshTimer)
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
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ScrollTrigger.create({
        trigger,
        start: 'bottom top',
        end: `+=${REVEAL_SPAN_PX}`,
        invalidateOnRefresh: true,
        ...(reduced
          ? {
              onEnter: () => applyProgress(1),
              onLeaveBack: () => applyProgress(0),
            }
          : {
              scrub: 0.5,
              onUpdate: (self) => applyProgress(self.progress),
              onLeaveBack: () => applyProgress(0),
            }),
      })
      ScrollTrigger.refresh()
      return () => {
        wideEnough.value = false
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
