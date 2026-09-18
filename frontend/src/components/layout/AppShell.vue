<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import {
  captureToolbarFlipSlots,
  playToolbarFlipAfterRemove,
  playToolbarFlipBeforeReveal,
} from '@/composables/useHeaderToolbarLayoutShift'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useMobileShell } from '@/composables/useMobileShell'
import { useNavScrollCompact } from '@/composables/useNavScrollCompact'
import { stampPageEnterPlay } from '@/composables/usePageEnterAnimation'
import { persistLocale } from '@/i18n'
import '@/styles/nav-toolbar.css'

import ChevronUpNavIcon from '@/components/icons/ChevronUpNavIcon.vue'
import MenuNavIcon from '@/components/icons/MenuNavIcon.vue'
import MusicNavIcon from '@/components/icons/MusicNavIcon.vue'
import PhotoBgNavIcon from '@/components/icons/PhotoBgNavIcon.vue'
import SnailNavIcon from '@/components/icons/SnailNavIcon.vue'
import TrailNavIcon from '@/components/icons/TrailNavIcon.vue'
import FpsNavIcon from '@/components/icons/FpsNavIcon.vue'

import BackToTop from './BackToTop.vue'
import FooterGrunRayPanel from './FooterGrunRayPanel.vue'
import ScrollProgress from './ScrollProgress.vue'
import SiteNav from './SiteNav.vue'
import ThemeDayNightToggle from './ThemeDayNightToggle.vue'
import PhotoBgBlurAdjuster, { type PhotoBgBlurAnchorRect } from './PhotoBgBlurAdjuster.vue'
import EdKicker from '@/components/editorial/EdKicker.vue'

import { useMotionPerformanceHint } from '@/composables/useMotionPerformanceHint'
import { useUiStore } from '@/stores/ui'
import type { MotionPreference } from '@/composables/useMotionPolicy'

const CursorTrail = defineAsyncComponent(() => import('./CursorTrail.vue'))
const FpsMeter = defineAsyncComponent(() => import('./FpsMeter.vue'))

const { t, locale } = useI18n()
const route = useRoute()
const ui = useUiStore()
const { musicPlayerMinimized, musicPlayerPlaying, photoBackgroundEnabled } = storeToRefs(ui)
const { hintOpen: motionHintOpen, dismissHint, acceptHint } = useMotionPerformanceHint()
const { isMobileShell, acquireScrollLock, releaseScrollLock } = useMobileShell()
const { compact: navCompactScroll } = useNavScrollCompact()
/** 手机壳层强制横条，禁用滚动收成胶囊 */
const navCompact = computed(() =>
  isMobileShell.value || ui.motionCut ? false : navCompactScroll.value,
)

const mobileNavOpen = ref(false)
const drawerRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)

function closeMobileNav() {
  mobileNavOpen.value = false
}

useFocusTrap(drawerRef, mobileNavOpen)

function skipToMain(event: MouseEvent) {
  event.preventDefault()
  const el = mainRef.value
  if (!el) return
  el.focus({ preventScroll: true })
  el.scrollIntoView({ block: 'start' })
}

function toggleMobileNav() {
  mobileNavOpen.value = !mobileNavOpen.value
}

watch(mobileNavOpen, (open) => {
  document.documentElement.classList.toggle('mobile-nav-open', open)
  if (open) acquireScrollLock('nav-drawer')
  else releaseScrollLock('nav-drawer')
  if (open) {
    document.addEventListener('keydown', onDocKeydown)
  } else if (!overflowOpen.value) {
    document.removeEventListener('keydown', onDocKeydown)
  }
})

watch(isMobileShell, (mobile) => {
  if (!mobile) closeMobileNav()
})

const musicNavPlayingAnimated = computed(
  () => musicPlayerMinimized.value && musicPlayerPlaying.value && !ui.motionCut,
)

/** 播放器展开或正在播放时，音乐按钮固定在顶栏；否则收进溢出面板 */
const showMusicInBar = computed(
  () => !musicPlayerMinimized.value || musicPlayerPlaying.value,
)

const localeBtnTitle = computed(() =>
  locale.value === 'zh' ? t('nav.localeTitleEn') : t('nav.localeTitleZh'),
)

const photoBgTipOn = computed(
  () => `${t('nav.photoBgOn')} · ${t('nav.photoBgBlurHint')}`,
)
const photoBgTipOff = computed(
  () => `${t('nav.photoBgOff')} · ${t('nav.photoBgBlurHint')}`,
)

const photoBlurAdjusterOpen = ref(false)
const photoBlurAnchorRect = ref<PhotoBgBlurAnchorRect | null>(null)

function openPhotoBlurAdjuster(ev: MouseEvent) {
  ev.preventDefault()
  ev.stopPropagation()
  const el = ev.currentTarget
  if (!(el instanceof HTMLElement)) return
  photoBlurAnchorRect.value = el.getBoundingClientRect()
  photoBlurAdjusterOpen.value = true
}

function closePhotoBlurAdjuster() {
  photoBlurAdjusterOpen.value = false
}


const overflowOpen = ref(false)
const overflowWrapRef = ref<HTMLElement | null>(null)
const overflowPanelRef = ref<HTMLElement | null>(null)
const headerRightRef = ref<HTMLElement | null>(null)
/** 顶栏工具收进溢出后：溢出按钮先切到「音乐已展开未播放」配色，再播出现弹跳，最后还原 */
const overflowTriggerCueMusicOpen = ref(false)
const overflowTriggerCuePop = ref(false)

/** 顶栏槽位 FLIP：before-leave 拍快照，after-leave 播放位移 */
let toolbarFlipSnap: ReturnType<typeof captureToolbarFlipSlots> | null = null
let overflowToolbarCueTimer: ReturnType<typeof window.setTimeout> | null = null

function onToolbarBeforeLeave() {
  toolbarFlipSnap = captureToolbarFlipSlots(headerRightRef.value)
}

function finishOverflowToolbarCue() {
  overflowTriggerCuePop.value = false
  overflowTriggerCueMusicOpen.value = false
  if (overflowToolbarCueTimer != null) {
    window.clearTimeout(overflowToolbarCueTimer)
    overflowToolbarCueTimer = null
  }
}

function onOverflowCuePopAnimationEnd(ev: AnimationEvent) {
  if (ev.target !== ev.currentTarget) return
  if (!ev.animationName.includes('nav-overflow-trigger-cue-pop')) return
  finishOverflowToolbarCue()
}

async function runOverflowToolbarCueAfterToolbarLeave() {
  if (overflowToolbarCueTimer != null) {
    window.clearTimeout(overflowToolbarCueTimer)
    overflowToolbarCueTimer = null
  }
  overflowTriggerCuePop.value = false
  overflowTriggerCueMusicOpen.value = false
  await nextTick()

  if (ui.motionCut) {
    overflowTriggerCueMusicOpen.value = true
    overflowToolbarCueTimer = window.setTimeout(() => {
      overflowTriggerCueMusicOpen.value = false
      overflowToolbarCueTimer = null
    }, 220)
    return
  }

  overflowTriggerCueMusicOpen.value = true
  await nextTick()
  await new Promise<void>((r) => requestAnimationFrame(() => r()))
  await new Promise<void>((r) => requestAnimationFrame(() => r()))
  overflowTriggerCuePop.value = true
  overflowToolbarCueTimer = window.setTimeout(() => {
    finishOverflowToolbarCue()
  }, 640)
}

function onToolbarAfterLeave() {
  const snap = toolbarFlipSnap
  toolbarFlipSnap = null
  if (!snap?.size) return
  void playToolbarFlipAfterRemove(snap, headerRightRef.value, ui.motionCut)
  void runOverflowToolbarCueAfterToolbarLeave()
}

/** 从面板打开功能：先窄布局测距 → 幽灵占位测宽 → FLIP（不含新按钮）→ 再挂载并播出现 */
const deferPhotoBar = ref(false)
const deferTrailBar = ref(false)
const deferMusicBar = ref(false)
const photoBarGhost = ref(false)
const photoBarEnterKey = ref(0)
const photoBarSpringPop = ref(false)
const trailBarGhost = ref(false)
const trailBarEnterKey = ref(0)
const trailBarSpringPop = ref(false)
const musicBarGhost = ref(false)
const musicBarEnterKey = ref(0)
const musicBarSpringPop = ref(false)

function closeNavOverflow() {
  overflowOpen.value = false
}

function toggleNavOverflow() {
  overflowOpen.value = !overflowOpen.value
}

useFocusTrap(overflowPanelRef, overflowOpen)

function onDocPointerDown(ev: PointerEvent) {
  const el = overflowWrapRef.value
  if (!el || !overflowOpen.value) return
  if (!el.contains(ev.target as Node)) closeNavOverflow()
}

function onDocKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') {
    closeNavOverflow()
    closeMobileNav()
  }
}

watch(overflowOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onDocPointerDown, true)
    document.addEventListener('keydown', onDocKeydown)
  } else {
    document.removeEventListener('pointerdown', onDocPointerDown, true)
    if (!mobileNavOpen.value) {
      document.removeEventListener('keydown', onDocKeydown)
    }
  }
})

watch(
  () => route.path,
  () => {
    closeNavOverflow()
    closeMobileNav()
  },
)

function onMusicNavClick() {
  closeNavOverflow()
  if (musicPlayerMinimized.value) {
    ui.expandMusicPlayer()
  } else {
    ui.setMusicPlayerMinimized(true)
  }
}

function onSplashNavClick() {
  ui.requestSplashWoniuReplay()
}

const isHomeRoute = computed(() => route.name === 'home')

/** 仅「首页 → 非首页」递增，触发小头像 remount；配合 appear 才播放首次挂载动画 */
const miniAvatarPopKey = ref(0)
/** 仅离开首页时为 true，避免冷启动直达内页也播 appear */
const miniAvatarAppearEnter = ref(false)
watch(isHomeRoute, (isHome, wasHome) => {
  if (isHome) {
    miniAvatarAppearEnter.value = false
    return
  }
  if (wasHome === true) {
    miniAvatarAppearEnter.value = true
    miniAvatarPopKey.value += 1
  }
})

/** 切入首页时顶栏左侧「弹」一下，避免占位切换生硬 */
const headerLeftSettlePop = ref(false)

watch(isHomeRoute, async (isHome, wasHome) => {
  if (!isHome || wasHome === true) return
  if (ui.motionCut) return
  headerLeftSettlePop.value = false
  await nextTick()
  headerLeftSettlePop.value = true
  window.setTimeout(() => {
    headerLeftSettlePop.value = false
  }, 500)
})

/**
 * 容器布局跟随「正在显示的页面」而非 route 本身。
 * 否则 out-in 转场时 route 一变就立刻切换 .app-main 的 max-width（960px ↔ 全宽），
 * 旧页内容会先被塞进新宽度（向内收缩 / 向左平移）再淡出 —— 即「先移动后转场」。
 * 改为只在新页 enter 时更新（见 onRouteEnter），leave 期间保持旧布局。
 */
const displayedLayout = ref(route.meta.appMainLayout)
const appMainClasses = computed(() => ({
  'app-main--full-viewport': displayedLayout.value === 'full-viewport',
}))

let mql: MediaQueryList | null = null

function syncMotion() {
  ui.setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

function toggleLocale() {
  closeNavOverflow()
  persistLocale(locale.value === 'zh' ? 'en' : 'zh')
}

function toggleCursorTrail() {
  ui.cursorTrailEnabled = !ui.cursorTrailEnabled
}

function toggleFpsMeter() {
  ui.fpsMeterEnabled = !ui.fpsMeterEnabled
}

const motionChoices: { id: MotionPreference; labelKey: 'motionAuto' | 'motionReduced' | 'motionFull' }[] = [
  { id: 'auto', labelKey: 'motionAuto' },
  { id: 'reduced', labelKey: 'motionReduced' },
  { id: 'full', labelKey: 'motionFull' },
]

function setMotionPreference(preference: MotionPreference) {
  ui.setMotionPreference(preference)
}

/** 面板内按钮先播「消失」再改状态，顶栏再「出现」；回退到仅面板时重置为可再次挂载 */
const photoPanelBtnVisible = ref(true)
const trailPanelBtnVisible = ref(true)
const musicPanelBtnVisible = ref(true)

watch(photoBackgroundEnabled, (on) => {
  if (!on) {
    photoPanelBtnVisible.value = true
    deferPhotoBar.value = false
    photoBarGhost.value = false
    photoBarSpringPop.value = false
  }
})

watch(
  () => ui.cursorTrailEnabled,
  (on) => {
    if (!on) {
      trailPanelBtnVisible.value = true
      deferTrailBar.value = false
      trailBarGhost.value = false
      trailBarSpringPop.value = false
    }
  },
)

watch(showMusicInBar, (on) => {
  if (!on) {
    musicPanelBtnVisible.value = true
    deferMusicBar.value = false
    musicBarGhost.value = false
    musicBarSpringPop.value = false
  }
})

const navToolbarTransitionMs = computed(() =>
  ui.motionCut ? { enter: 100, leave: 90 } : { enter: 440, leave: 260 },
)

/** 幽灵占位时跳过 Transition 的 enter，避免与 FLIP 后的一次性 spring 叠两次 */
const photoToolbarTransitionMs = computed(() =>
  photoBarGhost.value
    ? { enter: 0, leave: ui.motionCut ? 90 : 260 }
    : navToolbarTransitionMs.value,
)
const trailToolbarTransitionMs = computed(() =>
  trailBarGhost.value
    ? { enter: 0, leave: ui.motionCut ? 90 : 260 }
    : navToolbarTransitionMs.value,
)
const musicToolbarTransitionMs = computed(() =>
  musicBarGhost.value
    ? { enter: 0, leave: ui.motionCut ? 90 : 260 }
    : navToolbarTransitionMs.value,
)

function onToolbarSlotSpringEnd(ev: AnimationEvent, slot: 'photo' | 'trail' | 'music') {
  if (ev.target !== ev.currentTarget) return
  if (ev.animationName !== 'nav-toolbar-tool-btn-pop') return
  if (slot === 'photo') photoBarSpringPop.value = false
  else if (slot === 'trail') trailBarSpringPop.value = false
  else musicBarSpringPop.value = false
}

function startPhotoFromPanel() {
  if (ui.motionCut) {
    ui.togglePhotoBackground()
    closeNavOverflow()
    return
  }
  photoPanelBtnVisible.value = false
}

async function commitPhotoFromPanel() {
  photoPanelBtnVisible.value = true
  closeNavOverflow()
  ui.togglePhotoBackground()
  if (ui.motionCut) return

  deferPhotoBar.value = true
  await nextTick()
  const narrow = captureToolbarFlipSlots(headerRightRef.value)
  deferPhotoBar.value = false
  photoBarGhost.value = true
  photoBarEnterKey.value += 1
  await nextTick()
  const wide = captureToolbarFlipSlots(headerRightRef.value)
  await playToolbarFlipBeforeReveal(
    narrow,
    wide,
    headerRightRef.value,
    ui.motionCut,
    new Set(['photo']),
  )
  photoBarGhost.value = false
  await nextTick()
  if (!ui.motionCut) photoBarSpringPop.value = true
}

function startTrailFromPanel() {
  if (ui.motionCut) {
    toggleCursorTrail()
    closeNavOverflow()
    return
  }
  trailPanelBtnVisible.value = false
}

async function commitTrailFromPanel() {
  trailPanelBtnVisible.value = true
  closeNavOverflow()
  toggleCursorTrail()
  if (ui.motionCut) return

  deferTrailBar.value = true
  await nextTick()
  const narrow = captureToolbarFlipSlots(headerRightRef.value)
  deferTrailBar.value = false
  trailBarGhost.value = true
  trailBarEnterKey.value += 1
  await nextTick()
  const wide = captureToolbarFlipSlots(headerRightRef.value)
  await playToolbarFlipBeforeReveal(
    narrow,
    wide,
    headerRightRef.value,
    ui.motionCut,
    new Set(['trail']),
  )
  trailBarGhost.value = false
  await nextTick()
  if (!ui.motionCut) trailBarSpringPop.value = true
}

function startMusicFromPanel() {
  if (ui.motionCut) {
    closeNavOverflow()
    onMusicNavClick()
    return
  }
  musicPanelBtnVisible.value = false
}

async function commitMusicFromPanel() {
  musicPanelBtnVisible.value = true
  closeNavOverflow()
  if (ui.motionCut) {
    if (musicPlayerMinimized.value) ui.expandMusicPlayer()
    return
  }

  if (musicPlayerMinimized.value) {
    deferMusicBar.value = true
    await nextTick()
    const narrow = captureToolbarFlipSlots(headerRightRef.value)
    ui.expandMusicPlayer()
    await nextTick()
    deferMusicBar.value = false
    musicBarGhost.value = true
    musicBarEnterKey.value += 1
    await nextTick()
    const wide = captureToolbarFlipSlots(headerRightRef.value)
    await playToolbarFlipBeforeReveal(
      narrow,
      wide,
      headerRightRef.value,
      ui.motionCut,
      new Set(['music']),
    )
    musicBarGhost.value = false
    await nextTick()
    if (!ui.motionCut) musicBarSpringPop.value = true
  }
}

onMounted(() => {
  syncMotion()
  mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  mql.addEventListener('change', syncMotion)
})

watch(
  () => ui.motionCut,
  async (cut) => {
    if (!cut) return
    await nextTick()
    stampPageEnterPlay(mainRef.value)
  },
)

onUnmounted(() => {
  mql?.removeEventListener('change', syncMotion)
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onDocKeydown)
  document.documentElement.classList.remove('mobile-nav-open')
  releaseScrollLock('nav-drawer')
  if (overflowToolbarCueTimer != null) {
    window.clearTimeout(overflowToolbarCueTimer)
    overflowToolbarCueTimer = null
  }
  overflowTriggerCuePop.value = false
  overflowTriggerCueMusicOpen.value = false
})

/** 路由跳转转场（GSAP 驱动 Vue Transition，:css=false）：离开淡出上移、进入淡入浮起；尊重 reduced-motion */
function finishJsRouteTransition(el: Element, done: () => void) {
  gsap.killTweensOf(el)
  if (el.isConnected) {
    gsap.set(el, { clearProps: 'transform,opacity,visibility' })
  }
  requestAnimationFrame(() => done())
}

function onRouteLeave(el: Element, done: () => void) {
  if (ui.motionCut || !el.isConnected) {
    finishJsRouteTransition(el, done)
    return
  }
  gsap.to(el, { autoAlpha: 0, y: -10, duration: 0.26, ease: 'power2.in', onComplete: done })
}

function onRouteEnter(el: Element, done: () => void) {
  // 新页进入时才切换容器布局（此刻旧页 leave 已结束），避免转场前的宽度突变
  displayedLayout.value = route.meta.appMainLayout
  if (ui.motionCut || !el.isConnected) {
    finishJsRouteTransition(el, done)
    return
  }
  gsap.from(el, {
    autoAlpha: 0,
    y: 16,
    duration: 0.46,
    ease: 'power3.out',
    clearProps: 'transform,opacity,visibility',
    onComplete: done,
  })
}
</script>

<template>
  <div class="abstract-grid-bg" aria-hidden="true" />
  <FooterGrunRayPanel />
  <div class="app-root">
    <a class="skip-link" href="#main" @click="skipToMain">{{ t('nav.skipToMain') }}</a>
    <!-- 须先于 RouterView 挂上，避免详情页 Teleport 找不到目标 -->
    <div id="detail-scroll-rail-host" class="detail-scroll-rail-host" />
    <ScrollProgress />
    <div class="app-page-cover">
    <header class="glass-nav-sticky-wrap" :data-nav-compact="navCompact ? 'true' : 'false'">
      <div class="glass-nav-inner">
        <div class="header-inner">
        <div class="header-left">
          <div
            class="header-brand-row"
            :class="{ 'header-brand-row--settle-pop': headerLeftSettlePop && !ui.motionCut }"
          >
            <template v-if="!isHomeRoute">
              <Transition
                name="header-brand-mini-avatar"
                :appear="miniAvatarAppearEnter"
                type="animation"
              >
                <span
                  :key="miniAvatarPopKey"
                  class="header-brand-mini-avatar-wrap"
                  aria-hidden="true"
                >
                  <img
                    src="/favicon.jpg"
                    alt=""
                    width="28"
                    height="28"
                    class="header-brand-mini-avatar"
                  />
                </span>
              </Transition>
            </template>
            <span v-else class="header-brand-mini-avatar-slot" aria-hidden="true" />
            <RouterLink to="/" class="brand">GrunRay</RouterLink>
          </div>
          <SiteNav v-if="!isMobileShell" />
        </div>
        <div ref="headerRightRef" class="header-right">
          <div class="header-toolbar-capsule">
            <div class="header-toolbar-slot" data-toolbar-flip="theme">
              <ThemeDayNightToggle class="header-theme-toggle" />
            </div>
            <span class="header-toolbar-capsule__divider" aria-hidden="true" />
            <!-- 三个圆形工具共用一个 flex 子项，避免各自占位时与 header-right 的 gap 叠成「假空白」 -->
            <div v-if="!isMobileShell" class="header-toolbar-cluster">
            <div class="header-toolbar-slot-contents">
              <Transition
                name="nav-toolbar-tool"
                :duration="photoToolbarTransitionMs"
                @before-leave="onToolbarBeforeLeave"
                @after-leave="onToolbarAfterLeave"
              >
                <button
                  v-if="photoBackgroundEnabled && !deferPhotoBar"
                  :key="photoBarEnterKey"
                  type="button"
                  class="photo-bg-nav-btn is-active"
                  :class="{
                    'toolbar-shift-ghost': photoBarGhost,
                    'toolbar-slot-spring-pop': photoBarSpringPop,
                  }"
                  data-toolbar-flip="photo"
                  aria-pressed="true"
                  :data-nav-tip="photoBgTipOff"
                  :aria-label="t('nav.photoBgOff')"
                  @animationend="onToolbarSlotSpringEnd($event, 'photo')"
                  @contextmenu="openPhotoBlurAdjuster"
                  @click="ui.togglePhotoBackground()"
                >
                  <span class="photo-bg-nav-btn-icon" aria-hidden="true">
                    <PhotoBgNavIcon />
                  </span>
                  <span class="nav-pill-grow-line" aria-hidden="true" />
                </button>
              </Transition>
            </div>
            <div class="header-toolbar-slot-contents">
              <Transition
                name="nav-toolbar-tool"
                :duration="trailToolbarTransitionMs"
                @before-leave="onToolbarBeforeLeave"
                @after-leave="onToolbarAfterLeave"
              >
                <button
                  v-if="ui.cursorTrailEnabled && !deferTrailBar"
                  :key="trailBarEnterKey"
                  type="button"
                  class="trail-toggle is-active"
                  :class="{
                    'toolbar-shift-ghost': trailBarGhost,
                    'toolbar-slot-spring-pop': trailBarSpringPop,
                  }"
                  data-toolbar-flip="trail"
                  aria-pressed="true"
                  :data-nav-tip="t('nav.trailOff')"
                  :aria-label="t('nav.trailOff')"
                  @animationend="onToolbarSlotSpringEnd($event, 'trail')"
                  @click="toggleCursorTrail"
                >
                  <span class="trail-toggle-icon" aria-hidden="true">
                    <TrailNavIcon />
                  </span>
                  <span class="nav-pill-grow-line" aria-hidden="true" />
                </button>
              </Transition>
            </div>
            <div class="header-toolbar-slot-contents">
              <Transition
                name="nav-toolbar-tool"
                :duration="musicToolbarTransitionMs"
                @before-leave="onToolbarBeforeLeave"
                @after-leave="onToolbarAfterLeave"
              >
                <button
                  v-if="showMusicInBar && !deferMusicBar"
                  :key="musicBarEnterKey"
                  type="button"
                  class="music-nav-btn"
                  :class="{
                    'music-nav-btn--playing': musicNavPlayingAnimated,
                    'music-nav-btn--idle': musicPlayerMinimized && !musicPlayerPlaying,
                    'music-nav-btn--open': !musicPlayerMinimized,
                    'toolbar-shift-ghost': musicBarGhost,
                    'toolbar-slot-spring-pop': musicBarSpringPop,
                  }"
                  data-toolbar-flip="music"
                  :aria-expanded="musicPlayerMinimized ? 'false' : 'true'"
                  :data-nav-tip="musicPlayerMinimized ? t('nav.musicExpand') : t('nav.musicCollapse')"
                  :aria-label="musicPlayerMinimized ? t('nav.musicExpand') : t('nav.musicCollapse')"
                  @animationend="onToolbarSlotSpringEnd($event, 'music')"
                  @click="onMusicNavClick"
                >
                  <span class="music-nav-btn-icon" aria-hidden="true">
                    <MusicNavIcon />
                  </span>
                  <span class="nav-pill-grow-line" aria-hidden="true" />
                </button>
              </Transition>
            </div>
            </div>
            <span v-if="!isMobileShell" class="header-toolbar-capsule__divider" aria-hidden="true" />
            <div class="header-toolbar-slot" data-toolbar-flip="locale">
              <button
                type="button"
                class="locale-nav-btn"
                :data-nav-tip="localeBtnTitle"
                :aria-label="t('ui.locale')"
                @click="toggleLocale"
              >
                <span class="locale-nav-btn-label" aria-hidden="true">{{ locale === 'zh' ? 'EN' : '中' }}</span>
                <span class="nav-pill-grow-line" aria-hidden="true" />
              </button>
            </div>
            <template v-if="isMobileShell">
              <span class="header-toolbar-capsule__divider" aria-hidden="true" />
              <div class="header-toolbar-slot">
                <button
                  type="button"
                  class="mobile-nav-trigger"
                  :class="{ 'is-open': mobileNavOpen }"
                  :aria-expanded="mobileNavOpen ? 'true' : 'false'"
                  aria-controls="mobile-nav-drawer"
                  :data-nav-tip="mobileNavOpen ? t('nav.mobileMenuClose') : t('nav.mobileMenuOpen')"
                  :aria-label="mobileNavOpen ? t('nav.mobileMenuClose') : t('nav.mobileMenuOpen')"
                  @click="toggleMobileNav"
                >
                  <span class="mobile-nav-trigger-icon" aria-hidden="true">
                    <MenuNavIcon />
                  </span>
                  <span class="nav-pill-grow-line" aria-hidden="true" />
                </button>
              </div>
            </template>
          </div>
          <div
            v-if="!isMobileShell"
            ref="overflowWrapRef"
            class="nav-overflow-wrap header-toolbar-slot"
            data-toolbar-flip="overflow"
          >
            <button
              type="button"
              class="nav-overflow-trigger"
              :class="{
                'is-open': overflowOpen,
                'nav-overflow-trigger--cue-music-open': overflowTriggerCueMusicOpen,
                'nav-overflow-trigger--cue-pop': overflowTriggerCuePop,
              }"
              :aria-expanded="overflowOpen ? 'true' : 'false'"
              aria-controls="nav-overflow-panel"
              :data-nav-tip="overflowOpen ? t('nav.overflowHide') : t('nav.overflowShow')"
              :aria-label="t('nav.overflowLabel')"
              @animationend="onOverflowCuePopAnimationEnd"
              @click="toggleNavOverflow"
            >
              <span class="nav-overflow-trigger-icon" aria-hidden="true">
                <ChevronUpNavIcon :open="overflowOpen" />
              </span>
              <span class="nav-pill-grow-line" aria-hidden="true" />
            </button>
            <Transition name="nav-overflow-panel">
              <div
                v-show="overflowOpen"
                id="nav-overflow-panel"
                ref="overflowPanelRef"
                class="nav-overflow-panel card-overflow-visible"
                :role="overflowOpen ? 'dialog' : undefined"
                :aria-modal="overflowOpen ? 'true' : undefined"
                :aria-hidden="overflowOpen ? undefined : 'true'"
                :aria-label="t('nav.overflowRegion')"
              >
                <div class="nav-overflow-panel-tools">
                <Transition
                  name="nav-toolbar-tool"
                  :duration="navToolbarTransitionMs"
                  @after-leave="commitPhotoFromPanel"
                >
                  <button
                    v-if="!photoBackgroundEnabled && photoPanelBtnVisible"
                    type="button"
                    class="photo-bg-nav-btn"
                    aria-pressed="false"
                    :data-nav-tip="photoBgTipOn"
                    :aria-label="t('nav.photoBgOn')"
                    @contextmenu="openPhotoBlurAdjuster"
                    @click="startPhotoFromPanel"
                  >
                    <span class="photo-bg-nav-btn-icon" aria-hidden="true">
                      <PhotoBgNavIcon />
                    </span>
                    <span class="nav-pill-grow-line" aria-hidden="true" />
                  </button>
                </Transition>
                <Transition
                  name="nav-toolbar-tool"
                  :duration="navToolbarTransitionMs"
                  @after-leave="commitTrailFromPanel"
                >
                  <button
                    v-if="!ui.cursorTrailEnabled && trailPanelBtnVisible"
                    type="button"
                    class="trail-toggle"
                    aria-pressed="false"
                    :data-nav-tip="t('nav.trailOn')"
                    :aria-label="t('nav.trailOn')"
                    @click="startTrailFromPanel"
                  >
                    <span class="trail-toggle-icon" aria-hidden="true">
                      <TrailNavIcon />
                    </span>
                    <span class="nav-pill-grow-line" aria-hidden="true" />
                  </button>
                </Transition>
                <Transition
                  name="nav-toolbar-tool"
                  :duration="navToolbarTransitionMs"
                  @after-leave="commitMusicFromPanel"
                >
                  <button
                    v-if="!showMusicInBar && musicPanelBtnVisible"
                    type="button"
                    class="music-nav-btn music-nav-btn--idle"
                    aria-expanded="false"
                    :data-nav-tip="t('nav.musicExpand')"
                    :aria-label="t('nav.musicExpand')"
                    @click="startMusicFromPanel"
                  >
                    <span class="music-nav-btn-icon" aria-hidden="true">
                      <MusicNavIcon />
                    </span>
                    <span class="nav-pill-grow-line" aria-hidden="true" />
                  </button>
                </Transition>
                <button
                  type="button"
                  class="fps-nav-btn"
                  :class="{ 'is-active': ui.fpsMeterEnabled }"
                  :aria-pressed="ui.fpsMeterEnabled ? 'true' : 'false'"
                  :data-nav-tip="ui.fpsMeterEnabled ? t('nav.fpsOff') : t('nav.fpsOn')"
                  :aria-label="ui.fpsMeterEnabled ? t('nav.fpsOff') : t('nav.fpsOn')"
                  @click="toggleFpsMeter"
                >
                  <span class="fps-nav-btn-icon" aria-hidden="true">
                    <FpsNavIcon />
                  </span>
                  <span class="nav-pill-grow-line" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="splash-nav-btn"
                  :data-nav-tip="t('splash.replayTitle')"
                  :aria-label="t('splash.replayLabel')"
                  @click="closeNavOverflow(); onSplashNavClick()"
                >
                  <span class="splash-nav-btn-icon" aria-hidden="true">
                    <SnailNavIcon />
                  </span>
                  <span class="nav-pill-grow-line" aria-hidden="true" />
                </button>
                </div>
                <div class="nav-overflow-motion">
                  <EdKicker :en="t('nav.motionKickerEn')" :zh="t('nav.motionKickerZh')" />
                  <div
                    class="nav-overflow-motion-actions"
                    role="radiogroup"
                    :aria-label="t('nav.motionGroup')"
                  >
                    <button
                      v-for="choice in motionChoices"
                      :key="choice.id"
                      type="button"
                      class="ed-action"
                      :class="{ 'is-current': ui.motionPreference === choice.id }"
                      :aria-pressed="ui.motionPreference === choice.id ? 'true' : 'false'"
                      @click="setMotionPreference(choice.id)"
                    >
                      {{ t(`nav.${choice.labelKey}`) }}
                    </button>
                  </div>
                  <p v-if="ui.prefersReducedMotion" class="nav-overflow-motion-hint">
                    {{ t('nav.motionSystemReduce') }}
                  </p>
                </div>
              </div>
            </Transition>
            <div
              v-if="motionHintOpen"
              class="nav-motion-hint card-overflow-visible"
              role="status"
              :aria-label="t('nav.motionHintRegion')"
            >
              <EdKicker :en="t('nav.motionHintKickerEn')" :zh="t('nav.motionHintKickerZh')" />
              <p class="nav-motion-hint-body">{{ t('nav.motionHintBody') }}</p>
              <div class="nav-motion-hint-actions">
                <button type="button" class="ed-action" @click="acceptHint">
                  {{ t('nav.motionHintAccept') }}
                </button>
                <button type="button" class="ed-action" @click="dismissHint">
                  {{ t('nav.motionHintDismiss') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </header>

    <Teleport to="body">
      <Transition name="mobile-nav-backdrop">
        <div
          v-if="isMobileShell && mobileNavOpen"
          class="mobile-nav-backdrop"
          aria-hidden="true"
          @click="closeMobileNav"
        />
      </Transition>
      <Transition name="mobile-nav-drawer">
        <aside
          v-if="isMobileShell && mobileNavOpen"
          id="mobile-nav-drawer"
          ref="drawerRef"
          class="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          :aria-label="t('nav.mobileMenuRegion')"
        >
          <header class="mobile-nav-drawer-head">
            <EdKicker :en="t('nav.mobileMenuKickerEn')" :zh="t('nav.mobileMenuKickerZh')" />
            <button
              type="button"
              class="mobile-nav-drawer-close"
              :aria-label="t('nav.mobileMenuClose')"
              @click="closeMobileNav"
            >
              {{ t('xiqi.close') }}
            </button>
          </header>
          <SiteNav variant="drawer" @navigate="closeMobileNav" />
        </aside>
      </Transition>
    </Teleport>

    <main id="main" ref="mainRef" class="app-main" tabindex="-1" :class="appMainClasses">
      <RouterView v-slot="{ Component }">
        <Transition :css="false" mode="out-in" @enter="onRouteEnter" @leave="onRouteLeave">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>
    </div>

    <CursorTrail v-if="ui.cursorTrailActive" />
    <BackToTop />
    <FpsMeter v-if="ui.fpsMeterEnabled" />
    <PhotoBgBlurAdjuster
      :open="photoBlurAdjusterOpen"
      :anchor-rect="photoBlurAnchorRect"
      @close="closePhotoBlurAdjuster"
    />
  </div>
</template>

<style scoped>
.skip-link {
  position: fixed;
  left: 0.75rem;
  top: 0.75rem;
  z-index: 400;
  padding: 0.42rem 0.7rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 0.88rem;
  text-decoration: none;
  transform: translateY(calc(-100% - 1.5rem));
}

.skip-link:focus,
.skip-link:focus-visible {
  transform: none;
}

.header-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
}

.header-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem 0.85rem;
  min-width: 0;
  flex: 1;
}

.header-left :deep(.nav.nav--shell) {
  flex: 1;
  min-width: 0;
}

@keyframes header-brand-row-settle-pop {
  0% {
    transform: translateX(-6px) scale(0.99);
    opacity: 0.94;
  }
  58% {
    transform: translateX(2px) scale(1.006);
    opacity: 1;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

.header-brand-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.65rem 1.25rem;
  flex-shrink: 0;
  min-width: 0;
}

.header-brand-row--settle-pop {
  animation: header-brand-row-settle-pop 0.46s cubic-bezier(0.34, 1.25, 0.46, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .header-brand-row--settle-pop {
    animation: none;
  }
}

/* 小头像进入：独立 keyframes，避免被父级 transform 盖掉观感 */
@keyframes header-brand-mini-pop-in {
  0% {
    opacity: 0;
    transform: scale(0.35) translateY(12px);
  }
  40% {
    opacity: 1;
    transform: scale(1.14) translateY(-5px);
  }
  64% {
    transform: scale(0.94) translateY(2px);
  }
  84% {
    transform: scale(1.03) translateY(-0.5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.header-brand-mini-avatar-slot {
  display: block;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
}

.header-brand-mini-avatar-wrap {
  display: block;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
  box-shadow: 0 1px 4px color-mix(in srgb, #000 12%, transparent);
}

.header-brand-mini-avatar {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.header-brand-mini-avatar-enter-active,
.header-brand-mini-avatar-appear-active {
  animation: header-brand-mini-pop-in 0.62s cubic-bezier(0.2, 1, 0.32, 1) both;
}

.header-brand-mini-avatar-enter-from,
.header-brand-mini-avatar-appear-from {
  opacity: 0;
}

.header-brand-mini-avatar-leave-active {
  transition: opacity 0.2s ease, transform 0.24s ease;
}

.header-brand-mini-avatar-leave-to {
  opacity: 0;
  transform: scale(0.82);
}

@media (prefers-reduced-motion: reduce) {
  .header-brand-mini-avatar-enter-active,
  .header-brand-mini-avatar-appear-active {
    animation: none;
    transition: opacity 0.15s ease;
  }

  .header-brand-mini-avatar-enter-from,
  .header-brand-mini-avatar-appear-from,
  .header-brand-mini-avatar-leave-to {
    transform: none;
  }
}

.header-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem 0.5rem;
  margin-left: auto;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .glass-nav-inner {
    padding: 0.42rem 0.85rem;
  }

  /* 手机壳：单行「品牌 | 主题 · 语言 · 汉堡」 */
  .header-inner {
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.45rem 0.5rem;
  }

  .header-left {
    display: flex;
    flex: 1;
    min-width: 0;
  }

  .header-brand-row {
    flex: 0 1 auto;
    width: auto;
    justify-content: flex-start;
  }

  .header-right {
    width: auto;
    margin-left: auto;
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: 0.35rem 0.4rem;
  }

  .header-right .hint {
    display: none;
  }
}

.mobile-nav-backdrop {
  position: fixed;
  inset: 0;
  z-index: 210;
  background: color-mix(in srgb, var(--color-bg-base) 22%, rgb(0 0 0 / 44%));
}

.mobile-nav-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 220;
  display: flex;
  flex-direction: column;
  width: min(21rem, calc(100vw - 2.25rem));
  padding: calc(0.7rem + env(safe-area-inset-top, 0px)) 0.95rem
    calc(1.1rem + env(safe-area-inset-bottom, 0px));
  overflow: auto;
  overscroll-behavior: contain;
  background: var(--color-bg-base);
  border-left: 1px solid var(--color-border);
  box-shadow: -16px 0 48px rgb(0 0 0 / 16%);
}

.mobile-nav-drawer-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--color-border);
}

.mobile-nav-drawer-head :deep(.ed-kicker) {
  margin: 0;
}

.mobile-nav-drawer-close {
  min-height: 44px;
  padding: 0 0.15rem;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-family: var(--font-serif);
  font-size: 0.92rem;
  cursor: pointer;
}

.mobile-nav-drawer-close:hover,
.mobile-nav-drawer-close:focus-visible {
  color: var(--color-accent);
}

.mobile-nav-backdrop-enter-active,
.mobile-nav-backdrop-leave-active {
  transition: opacity 0.22s ease;
}

.mobile-nav-backdrop-enter-from,
.mobile-nav-backdrop-leave-to {
  opacity: 0;
}

.mobile-nav-drawer-enter-active,
.mobile-nav-drawer-leave-active {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.mobile-nav-drawer-enter-from,
.mobile-nav-drawer-leave-to {
  transform: translateX(104%);
}

@media (prefers-reduced-motion: reduce) {
  .mobile-nav-backdrop-enter-active,
  .mobile-nav-backdrop-leave-active,
  .mobile-nav-drawer-enter-active,
  .mobile-nav-drawer-leave-active {
    transition: none;
  }
}

.header-toolbar-slot {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}

.header-toolbar-cluster {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.04rem;
  min-width: 0;
}

.header-toolbar-slot-contents {
  display: contents;
}

/* 幽灵占位：参与 flex 宽度，避免 FLIP 结束后再插入流内按钮导致整行二次重排 */
.header-toolbar-cluster .toolbar-shift-ghost {
  flex-shrink: 0;
  width: 2rem;
  height: 1.72rem;
  visibility: hidden;
  pointer-events: none;
}

/* FLIP 后一次性「出现」弹跳（与 nav-toolbar-tool enter 同曲线，且不二次 remount） */
.toolbar-slot-spring-pop.photo-bg-nav-btn,
.toolbar-slot-spring-pop.trail-toggle,
.toolbar-slot-spring-pop.music-nav-btn {
  animation: nav-toolbar-tool-btn-pop 0.44s cubic-bezier(0.22, 1, 0.32, 1) both;
  transform-origin: center center;
}

@media (prefers-reduced-motion: reduce) {
  .toolbar-slot-spring-pop.photo-bg-nav-btn,
  .toolbar-slot-spring-pop.trail-toggle,
  .toolbar-slot-spring-pop.music-nav-btn {
    animation: none;
  }
}

.nav-overflow-wrap {
  position: relative;
  flex-shrink: 0;
  overflow: visible;
}

.nav-overflow-trigger.nav-overflow-trigger--cue-music-open {
  color: var(--color-accent);
  background-color: transparent;
  border-color: transparent;
  box-shadow: none;
}

.nav-overflow-trigger--cue-pop {
  animation: nav-overflow-trigger-cue-pop 0.56s cubic-bezier(0.22, 1, 0.32, 1) both;
  transform-origin: center center;
}

@keyframes nav-overflow-trigger-cue-pop {
  0% {
    transform: scale(0);
    opacity: 0.9;
  }
  58% {
    transform: scale(1.12);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-overflow-trigger--cue-pop {
    animation: none;
  }
}

.nav-overflow-trigger-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.nav-overflow-panel,
.nav-motion-hint {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 60;
  min-width: 13.5rem;
  padding: 0.65rem 0.7rem;
  pointer-events: auto;
  overflow: visible;
  background: var(--color-bg-surface);
  border: none;
  border-radius: var(--radius-md);
  box-shadow:
    0 -1px 0 var(--color-border),
    0 1px 0 var(--color-border);
}

.nav-motion-hint {
  z-index: 70;
  width: min(13.5rem, calc(100vw - 2rem));
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.42rem;
}

.nav-overflow-panel-tools [data-nav-tip]:hover,
.nav-overflow-panel-tools [data-nav-tip]:focus-visible {
  z-index: 2;
}

.nav-overflow-panel-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.nav-overflow-motion {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.42rem;
  margin-top: 0.7rem;
  padding-top: 0.62rem;
  border-top: 1px solid var(--color-border);
}

.nav-overflow-motion :deep(.ed-kicker),
.nav-motion-hint :deep(.ed-kicker) {
  margin: 0;
}

.nav-overflow-motion-actions,
.nav-motion-hint-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem 0.95rem;
}

.nav-overflow-motion .ed-action,
.nav-motion-hint .ed-action {
  appearance: none;
  padding: 0;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
  border-radius: 0;
  background: transparent;
  color: var(--color-accent);
  font-family: var(--font-serif);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
}

.nav-overflow-motion .ed-action.is-current {
  color: var(--color-text);
  border-bottom-color: var(--color-text);
}

.nav-overflow-motion .ed-action:hover,
.nav-motion-hint .ed-action:hover {
  border-bottom-color: var(--color-accent);
}

.nav-overflow-motion-hint,
.nav-motion-hint-body {
  margin: 0;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  line-height: 1.45;
  text-align: right;
}

.nav-motion-hint-body {
  color: var(--color-text);
  font-family: var(--font-serif);
  font-size: 0.95rem;
  line-height: 1.5;
  width: 100%;
}

.nav-overflow-wrap:has(.nav-overflow-panel:not([aria-hidden='true'])) .nav-motion-hint {
  right: calc(100% + 0.45rem);
}

/* 面板整体：从顶栏/触发器一侧落入，收起时回到上方（视觉上的「从 header-right 进出」） */
.nav-overflow-panel-enter-active {
  transition:
    opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-overflow-panel-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.24s ease;
}

.nav-overflow-panel-enter-from,
.nav-overflow-panel-leave-to {
  opacity: 0;
  transform: translateY(-0.55rem) translateX(0.35rem) scale(0.94);
  transform-origin: top right;
}

.nav-overflow-panel-enter-to,
.nav-overflow-panel-leave-from {
  opacity: 1;
  transform: translateY(0) translateX(0) scale(1);
  transform-origin: top right;
}

/* 顶栏 / 溢出面板：整颗按钮「出现」overshoot 回弹；「消失」向中心收缩 */
@keyframes nav-toolbar-tool-btn-pop {
  0% {
    transform: scale(0);
    opacity: 0.92;
  }
  58% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes nav-toolbar-tool-btn-out {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0);
    opacity: 0;
  }
}

.nav-toolbar-tool-enter-active.photo-bg-nav-btn,
.nav-toolbar-tool-enter-active.trail-toggle,
.nav-toolbar-tool-enter-active.music-nav-btn {
  animation: nav-toolbar-tool-btn-pop 0.44s cubic-bezier(0.22, 1, 0.32, 1) both;
  transform-origin: center center;
}

.nav-toolbar-tool-leave-active.photo-bg-nav-btn,
.nav-toolbar-tool-leave-active.trail-toggle,
.nav-toolbar-tool-leave-active.music-nav-btn {
  animation: nav-toolbar-tool-btn-out 0.26s cubic-bezier(0.45, 0, 0.75, 0.45) both;
  transform-origin: center center;
}

@media (prefers-reduced-motion: reduce) {
  .nav-overflow-panel-enter-active,
  .nav-overflow-panel-leave-active {
    transition: opacity 0.12s ease;
  }

  .nav-overflow-panel-enter-from,
  .nav-overflow-panel-leave-to {
    transform: none;
  }

  .nav-toolbar-tool-enter-active.photo-bg-nav-btn,
  .nav-toolbar-tool-enter-active.trail-toggle,
  .nav-toolbar-tool-enter-active.music-nav-btn {
    animation: none;
    transition: opacity 0.12s ease;
  }

  .nav-toolbar-tool-leave-active.photo-bg-nav-btn,
  .nav-toolbar-tool-leave-active.trail-toggle,
  .nav-toolbar-tool-leave-active.music-nav-btn {
    animation: none;
    transition: opacity 0.1s ease;
  }

  .nav-toolbar-tool-enter-from.photo-bg-nav-btn,
  .nav-toolbar-tool-enter-from.trail-toggle,
  .nav-toolbar-tool-enter-from.music-nav-btn,
  .nav-toolbar-tool-leave-to.photo-bg-nav-btn,
  .nav-toolbar-tool-leave-to.trail-toggle,
  .nav-toolbar-tool-leave-to.music-nav-btn {
    opacity: 0;
  }
}

:global(html[data-motion='reduced']) .nav-overflow-panel-enter-active,
:global(html[data-motion='minimal']) .nav-overflow-panel-enter-active,
:global(html[data-motion='reduced']) .nav-overflow-panel-leave-active,
:global(html[data-motion='minimal']) .nav-overflow-panel-leave-active {
  transition: opacity 0.12s ease;
}

:global(html[data-motion='reduced']) .nav-overflow-panel-enter-from,
:global(html[data-motion='minimal']) .nav-overflow-panel-enter-from,
:global(html[data-motion='reduced']) .nav-overflow-panel-leave-to,
:global(html[data-motion='minimal']) .nav-overflow-panel-leave-to {
  transform: none;
}

.brand {
  font-weight: 700;
  font-size: 1.08rem;
  color: var(--color-text);
  text-decoration: none;
  flex-shrink: 0;
  transition: font-size 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.brand:hover {
  color: var(--color-accent);
  text-decoration: none;
}

.glass-nav-sticky-wrap[data-nav-compact='true'] .brand {
  font-size: 1rem;
}

.hint {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  max-width: 10rem;
  line-height: 1.3;
}

/* 顶栏窄屏布局已统一到上方 max-width:768px 段 */

</style>

<style>
/* 顶栏内主题按钮：紧凑态略缩小 */
.glass-nav-sticky-wrap[data-nav-compact='true'] .header-theme-toggle.theme-nav-btn {
  padding: 0.32rem 0.46rem;
  min-height: 1.62rem;
}
</style>
