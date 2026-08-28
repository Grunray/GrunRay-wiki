import { onBeforeMount, onMounted, onUnmounted, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useUiStore } from '@/stores/ui'
import { applyPhotoBackgroundBlur } from '@/theme/photoBackgroundBlur'

const HOME_HERO_PAGE_ATTR = 'homeHeroPage'
const STAGE_COVERED_ATTR = 'homeStageCovered'

/** 0.5px 阶，避免每帧改 filter:blur 打满 GPU */
const BLUR_QUANT_STEPS = 2

/**
 * 首页 Hero 重排：测量 peek / 导航高度，滚动时把照片背景 blur
 * 从 0 插值到用户设定值；离页恢复。不新建 backdrop-filter 层。
 *
 * 导航占位只在展开态锁一次（resize 且非 compact 才重测），避免 compact 动画
 * 把首屏从文档流里顶下去，快滑回顶时「向下弹一下」。
 *
 * 滚动帧只用缓存的文档偏移 + scrollY，同量化值不写 CSS 变量。
 */
export function useHomeHeroRelayout(opts: {
  peekRef: Ref<HTMLElement | null>
  scrollLayerRef: Ref<HTMLElement | null>
}) {
  const ui = useUiStore()
  const { photoBackgroundEnabled, photoBackgroundBlurPx, prefersReducedMotion } = storeToRefs(ui)

  let raf = 0
  let peekObserver: ResizeObserver | null = null
  let lockedNavOffset: number | null = null
  let layerDocTop = 0
  let viewportH = 0
  let lastWrittenBlurCss = ''
  let stageCovered = false

  function navEl(): HTMLElement | null {
    const nav = document.querySelector('.glass-nav-sticky-wrap')
    return nav instanceof HTMLElement ? nav : null
  }

  function navOffsetPx(): number {
    const nav = navEl()
    if (!nav) return 64
    if (isNavCompact()) {
      return lockedNavOffset ?? 64
    }
    const inner = nav.querySelector('.glass-nav-inner')
    const cs = getComputedStyle(nav)
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
    const innerH =
      inner instanceof HTMLElement ? inner.getBoundingClientRect().height : nav.getBoundingClientRect().height
    return Math.ceil(innerH + padY)
  }

  function isNavCompact(): boolean {
    const nav = navEl()
    return !!nav && nav.dataset.navCompact === 'true'
  }

  function applyNavLock() {
    if (lockedNavOffset === null) return
    document.documentElement.style.setProperty('--home-nav-offset', `${lockedNavOffset}px`)
  }

  /** 仅在尚未锁定、或窗口 resize / 展开态时写入。compact 时不取样，避免把矮胶囊锁成首页导航高度。 */
  function lockNavOffset(optsLock?: { forceIfExpanded?: boolean }) {
    const compact = isNavCompact()
    if (compact && lockedNavOffset === null) return
    const live = navOffsetPx()
    if (lockedNavOffset === null) {
      lockedNavOffset = live
    } else if (optsLock?.forceIfExpanded && !compact) {
      lockedNavOffset = live
    }
    applyNavLock()
  }

  function measurePeek() {
    const peek = opts.peekRef.value
    if (!peek) return
    const peekHeight = Math.ceil(peek.getBoundingClientRect().height)
    const root = document.documentElement
    root.style.setProperty('--cover-peek-height', `${peekHeight}px`)
    root.style.setProperty('--cover-lift', `${-peekHeight}px`)
  }

  function cacheScrollLayout() {
    viewportH = document.documentElement.clientHeight
    const scrollLayer = opts.scrollLayerRef.value
    if (!scrollLayer) return
    layerDocTop = scrollLayer.getBoundingClientRect().top + window.scrollY
  }

  function measureCoverPeek() {
    lockNavOffset({ forceIfExpanded: true })
    measurePeek()
    cacheScrollLayout()
    syncScrollDriven()
  }

  function onResize() {
    lockNavOffset({ forceIfExpanded: true })
    measurePeek()
    cacheScrollLayout()
    syncScrollDriven()
  }

  function restoreUserBlur() {
    lastWrittenBlurCss = ''
    applyPhotoBackgroundBlur(photoBackgroundBlurPx.value)
  }

  function quantizeBlurPx(px: number): number {
    return Math.round(px * BLUR_QUANT_STEPS) / BLUR_QUANT_STEPS
  }

  function writeHeroBlur(px: number) {
    const css = `${quantizeBlurPx(px)}px`
    if (css === lastWrittenBlurCss) return
    lastWrittenBlurCss = css
    document.documentElement.style.setProperty('--page-photo-bg-blur', css)
  }

  function scrollLayerViewportTop(): number {
    return layerDocTop - window.scrollY
  }

  function blurProgress(top: number): number {
    const start = viewportH * 0.92
    const end = viewportH * 0.42
    const span = start - end || 1
    return Math.min(1, Math.max(0, (start - top) / span))
  }

  function updatePhotoBgBlur(top: number) {
    if (!photoBackgroundEnabled.value || prefersReducedMotion.value) {
      return
    }
    writeHeroBlur(photoBackgroundBlurPx.value * blurProgress(top))
  }

  /**
   * 纸面已盖住 sticky 首屏 → 跳过子树绘制。
   * 盖住：paper.top 落到导航下缘以下；恢复：还差一截才露出来时提前开画，避免回顶闪空白。
   */
  function updateStageCovered(top: number) {
    const nav = lockedNavOffset ?? 64
    const coverBelow = nav - 8
    const uncoverAbove = nav - 32
    let next = stageCovered
    if (stageCovered) {
      if (top > uncoverAbove) next = false
    } else if (top <= coverBelow) {
      next = true
    }
    if (next === stageCovered) return
    stageCovered = next
    const root = document.documentElement
    if (next) root.dataset[STAGE_COVERED_ATTR] = 'true'
    else delete root.dataset[STAGE_COVERED_ATTR]
  }

  function syncScrollDriven() {
    const top = scrollLayerViewportTop()
    updatePhotoBgBlur(top)
    updateStageCovered(top)
  }

  function onScroll() {
    if (raf) return
    raf = window.requestAnimationFrame(() => {
      raf = 0
      syncScrollDriven()
    })
  }

  function markPage() {
    document.documentElement.dataset[HOME_HERO_PAGE_ATTR] = 'true'
  }

  function unmarkPage() {
    const root = document.documentElement
    delete root.dataset[HOME_HERO_PAGE_ATTR]
    delete root.dataset[STAGE_COVERED_ATTR]
    root.style.removeProperty('--cover-peek-height')
    root.style.removeProperty('--cover-lift')
    root.style.removeProperty('--home-nav-offset')
    lockedNavOffset = null
    lastWrittenBlurCss = ''
    stageCovered = false
    restoreUserBlur()
  }

  function observeChrome() {
    const peek = opts.peekRef.value
    if (peek && typeof ResizeObserver !== 'undefined') {
      peekObserver = new ResizeObserver(() => {
        measurePeek()
        cacheScrollLayout()
        syncScrollDriven()
      })
      peekObserver.observe(peek)
    }
  }

  onBeforeMount(() => {
    markPage()
    if (photoBackgroundEnabled.value && !prefersReducedMotion.value) {
      lastWrittenBlurCss = '0px'
      document.documentElement.style.setProperty('--page-photo-bg-blur', '0px')
    }
  })

  onMounted(() => {
    lockNavOffset({ forceIfExpanded: true })
    measurePeek()
    cacheScrollLayout()
    syncScrollDriven()
    observeChrome()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    requestAnimationFrame(() => {
      lockNavOffset({ forceIfExpanded: true })
      cacheScrollLayout()
      syncScrollDriven()
    })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    peekObserver?.disconnect()
    if (raf) window.cancelAnimationFrame(raf)
    unmarkPage()
  })

  watch([photoBackgroundEnabled, photoBackgroundBlurPx], (curr, prev) => {
    const enabled = curr[0]
    const prevEnabled = prev?.[0]
    if (!enabled) {
      restoreUserBlur()
      syncScrollDriven()
      return
    }
    if (prevEnabled === false && enabled) {
      lastWrittenBlurCss = ''
    }
    cacheScrollLayout()
    syncScrollDriven()
  })

  watch(prefersReducedMotion, (reduced) => {
    if (reduced) restoreUserBlur()
    else lastWrittenBlurCss = ''
    syncScrollDriven()
  })

  return { measureCoverPeek }
}
