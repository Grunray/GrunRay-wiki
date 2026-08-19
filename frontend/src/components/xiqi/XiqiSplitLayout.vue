<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useI18n } from 'vue-i18n'

import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'
import { FOOTER_REFRESH_EVENT, setXiqiSplitFooterLock } from '@/composables/useXiqiSplitFooter'

const selectedKey = defineModel<string | null>('selectedKey', { default: null })
const emit = defineEmits<{
  detailClosed: []
}>()

defineProps<{
  detailTitle?: string
}>()

const { t } = useI18n()

const splitMainRef = ref<HTMLElement | null>(null)
/** 控制分栏布局（含 footer 锁定）；关闭详情后需等过渡结束再解除 */
const layoutSplit = ref(false)
/** 详情 leave 过渡期间保持右侧轨道展开，避免面板被裁切 */
const detailLeaving = ref(false)

const isOpen = computed(() => selectedKey.value !== null)
/** 详情轨道：打开期间与离场期间都保持展开，避免离场时布局把面板拽成 fixed 浮层 */
const detailRailOpen = computed(() => isOpen.value || detailLeaving.value)

const SPLIT_LAYOUT_MS = 580
const MAIN_INNER_FLIP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'
const PAPER_EASE = 'power3.out'
const PAPER_FOLD_EASE = 'power2.in'

/**
 * 分栏会把 html/body 锁成 overflow:hidden（窗口 scrollY 被钳成 0）。
 * 打开前记下窗口滚动；关闭时按「打开时的窗口位置 + 分栏期间主栏多滚的距离」还原。
 */
let windowScrollBeforeSplit = 0
let panelScrollAfterOpen = 0
let detailTween: gsap.core.Timeline | gsap.core.Tween | null = null
let tweenSafetyTimer = 0

function killDetailTween() {
  detailTween?.kill()
  detailTween = null
  if (tweenSafetyTimer) {
    window.clearTimeout(tweenSafetyTimer)
    tweenSafetyTimer = 0
  }
}

function isMobileSplit() {
  return window.matchMedia('(max-width: 768px)').matches
}

/** 桌面从分栏折缝向右揭开；窄屏从列表下方向下收起。p=1 全遮，p=0 全开。 */
function clipAt(progress: number) {
  const v = Math.max(0, Math.min(1, progress)) * 100
  return isMobileSplit() ? `inset(0% 0% ${v}% 0%)` : `inset(0% ${v}% 0% 0%)`
}

function finishPanelTween(
  panel: HTMLElement,
  done: () => void,
  finished: { v: boolean },
  opts: { clearClip: boolean },
) {
  if (finished.v) return
  finished.v = true
  killDetailTween()
  if (opts.clearClip) panel.style.clipPath = ''
  panel.style.willChange = ''
  done()
}

function onDetailEnter(el: Element, done: () => void) {
  const panel = el as HTMLElement
  killDetailTween()
  const finished = { v: false }
  const finish = () => finishPanelTween(panel, done, finished, { clearClip: true })

  if (prefersReducedMotionMedia()) {
    gsap.set(panel, { autoAlpha: 1, x: 0, y: 0, clearProps: 'clipPath,transform,opacity' })
    finish()
    return
  }

  const title = panel.querySelector('.xiqi-detail-title')
  const closeBtn = panel.querySelector('.xiqi-detail-close')
  const spine = panel.querySelector('.xiqi-detail-spine')
  const clip = { p: 1 }

  gsap.set(panel, { autoAlpha: 1, x: 0, y: 0 })
  if (spine) gsap.set(spine, { scaleY: 1 })
  panel.style.willChange = 'clip-path'
  panel.style.clipPath = clipAt(1)

  const tl = gsap.timeline({
    defaults: { ease: PAPER_EASE },
    onComplete: finish,
  })
  detailTween = tl

  /* 栏宽实际是 snap（auto 无法插值），揭开从第一帧开始，正文靠 clip 露出 */
  tl.to(
    clip,
    {
      p: 0,
      duration: 0.7,
      onUpdate: () => {
        panel.style.clipPath = clipAt(clip.p)
      },
    },
    0,
  )
  if (title) {
    tl.fromTo(title, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.36 }, 0.22)
  }
  if (closeBtn) {
    tl.fromTo(closeBtn, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.3 }, 0.26)
  }

  tweenSafetyTimer = window.setTimeout(finish, 1200)
}

function onDetailLeave(el: Element, done: () => void) {
  const panel = el as HTMLElement
  killDetailTween()
  const finished = { v: false }
  const finish = () => finishPanelTween(panel, done, finished, { clearClip: false })

  if (prefersReducedMotionMedia()) {
    finish()
    return
  }

  const spine = panel.querySelector('.xiqi-detail-spine')
  const clip = { p: 0 }

  gsap.set(panel, { autoAlpha: 1, x: 0, y: 0 })
  panel.style.willChange = 'clip-path'
  panel.style.clipPath = clipAt(0)

  const tl = gsap.timeline({
    defaults: { ease: PAPER_FOLD_EASE },
    onComplete: finish,
  })
  detailTween = tl

  tl.to(
    clip,
    {
      p: 1,
      duration: 0.42,
      onUpdate: () => {
        panel.style.clipPath = clipAt(clip.p)
      },
    },
    0,
  )
  if (spine) {
    tl.to(spine, { scaleY: 0, duration: 0.32 }, 0)
  }

  tweenSafetyTimer = window.setTimeout(finish, 800)
}

function getMainInner(): HTMLElement | null {
  return splitMainRef.value?.querySelector('.xiqi-split-main-inner') ?? null
}

/** 整页滚动时，主栏内容已向下滚动的距离 */
function measureMainScrollOffset(): number {
  const inner = getMainInner()
  if (!inner) return 0
  const innerDocTop = inner.getBoundingClientRect().top + window.scrollY
  return Math.max(0, window.scrollY - innerDocTop)
}

function restoreMainPanelScroll(offset: number) {
  const main = splitMainRef.value
  if (!main) return
  main.scrollTop = offset
}

function readPanelScroll(): number {
  return splitMainRef.value?.scrollTop ?? 0
}

function restoreWindowY(targetY: number) {
  window.scrollTo({ top: Math.max(0, targetY), behavior: 'auto' })
}

async function afterSplitLayout() {
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function clearMainInnerFlipStyles(inner: HTMLElement) {
  inner.style.transition = ''
  inner.style.transform = ''
}

/** 分栏开关时主栏 FLIP：只补水平位移。竖直方向用滚动还原，Y-FLIP 会把列表拽回顶部。 */
function flipMainInnerAfterLayout(before: DOMRect | null) {
  const inner = getMainInner()
  if (!inner || !before || prefersReducedMotionMedia()) return

  const after = inner.getBoundingClientRect()
  const dx = before.left - after.left
  if (Math.abs(dx) < 0.5) return

  clearMainInnerFlipStyles(inner)
  inner.style.transform = `translate(${dx}px, 0px)`

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      inner.style.transition = `transform ${SPLIT_LAYOUT_MS}ms ${MAIN_INNER_FLIP_EASING}`
      inner.style.transform = ''

      const onEnd = (ev: TransitionEvent) => {
        if (ev.target !== inner || ev.propertyName !== 'transform') return
        inner.removeEventListener('transitionend', onEnd)
        clearMainInnerFlipStyles(inner)
      }
      inner.addEventListener('transitionend', onEnd)
    })
  })
}

function closeDetail() {
  selectedKey.value = null
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    closeDetail()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
})

watch(
  isOpen,
  async (open) => {
    const main = splitMainRef.value
    const beforeRect = getMainInner()?.getBoundingClientRect() ?? null

    if (open) {
      const alreadySplit = layoutSplit.value
      if (!alreadySplit) {
        /* 必须赶在 footer lock / overflow:hidden 之前：二者都会把 scrollY 钳成 0 */
        windowScrollBeforeSplit = window.scrollY
      }
      detailLeaving.value = false
      setXiqiSplitFooterLock(true)
      if (alreadySplit) return
      const listOffset = measureMainScrollOffset()
      layoutSplit.value = true
      if (!main) return
      await nextTick()
      restoreMainPanelScroll(listOffset)
      flipMainInnerAfterLayout(beforeRect)
      await afterSplitLayout()
      restoreMainPanelScroll(listOffset)
      panelScrollAfterOpen = readPanelScroll()
      return
    }

    if (!open && layoutSplit.value) {
      /* 必须赶在 leave 那帧渲染前：否则轨道先收窄，clip 折回会被 overflow 裁掉 */
      detailLeaving.value = true
    }
  },
  { flush: 'pre' },
)

async function onDetailAfterLeave() {
  if (isOpen.value) {
    detailLeaving.value = false
    return
  }

  const extraPanelScroll = readPanelScroll() - panelScrollAfterOpen
  const targetY = Math.max(0, windowScrollBeforeSplit + extraPanelScroll)
  const inner = getMainInner()
  const beforeRect = inner?.getBoundingClientRect() ?? null
  if (inner) clearMainInnerFlipStyles(inner)

  layoutSplit.value = false
  detailLeaving.value = false
  setXiqiSplitFooterLock(false, { deferRefresh: true })

  const restore = () => {
    if (!isOpen.value) restoreWindowY(targetY)
  }
  window.addEventListener(FOOTER_REFRESH_EVENT, restore, { once: true })

  await nextTick()
  if (isOpen.value) return
  restore()
  flipMainInnerAfterLayout(beforeRect)
  requestAnimationFrame(() => {
    restore()
    requestAnimationFrame(restore)
  })
  emit('detailClosed')
  windowScrollBeforeSplit = 0
  panelScrollAfterOpen = 0
}

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  killDetailTween()
  const inner = getMainInner()
  if (inner) clearMainInnerFlipStyles(inner)
  layoutSplit.value = false
  detailLeaving.value = false
  windowScrollBeforeSplit = 0
  panelScrollAfterOpen = 0
  setXiqiSplitFooterLock(false)
})
</script>

<template>
  <section class="xiqi-page" :class="{ 'xiqi-page--split': layoutSplit }">
    <div
      class="xiqi-split"
      :class="{
        'xiqi-split--open': detailRailOpen && layoutSplit,
        'xiqi-split--detail-leaving': detailLeaving && !layoutSplit,
      }"
    >
      <div ref="splitMainRef" class="xiqi-split-main">
        <div class="xiqi-split-main-inner">
          <slot />
        </div>
      </div>

      <div
        class="xiqi-split-detail-rail"
        :class="{ 'xiqi-split-detail-rail--open': detailRailOpen }"
      >
        <Transition
          :css="false"
          @enter="onDetailEnter"
          @leave="onDetailLeave"
          @after-leave="onDetailAfterLeave"
        >
          <aside
            v-if="isOpen"
            class="xiqi-split-detail card card-glass-dense"
            role="complementary"
            :aria-label="detailTitle || t('xiqi.detailPanel')"
          >
            <span class="xiqi-detail-spine" aria-hidden="true" />
            <header class="xiqi-detail-head">
              <p v-if="detailTitle" class="xiqi-detail-title">{{ detailTitle }}</p>
              <button
                type="button"
                class="xiqi-detail-close"
                :aria-label="t('xiqi.closeDetail')"
                @click="closeDetail"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </header>
            <div class="xiqi-detail-body">
              <slot name="detail" />
            </div>
          </aside>
        </Transition>
      </div>
    </div>
  </section>
</template>
