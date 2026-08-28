<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import {
  captureToolbarFlipSlots,
  playToolbarFlipAfterRemove,
  playToolbarFlipBeforeReveal,
} from '@/composables/useHeaderToolbarLayoutShift'
import { useNavScrollCompact } from '@/composables/useNavScrollCompact'
import { persistLocale } from '@/i18n'
import '@/styles/nav-toolbar.css'

import ChevronUpNavIcon from '@/components/icons/ChevronUpNavIcon.vue'
import MusicNavIcon from '@/components/icons/MusicNavIcon.vue'
import PhotoBgNavIcon from '@/components/icons/PhotoBgNavIcon.vue'
import SnailNavIcon from '@/components/icons/SnailNavIcon.vue'
import TrailNavIcon from '@/components/icons/TrailNavIcon.vue'
import FpsNavIcon from '@/components/icons/FpsNavIcon.vue'

import BackToTop from './BackToTop.vue'
import CursorTrail from './CursorTrail.vue'
import FpsMeter from './FpsMeter.vue'
import FooterGrunRayPanel from './FooterGrunRayPanel.vue'
import ScrollProgress from './ScrollProgress.vue'
import SiteNav from './SiteNav.vue'
import ThemeDayNightToggle from './ThemeDayNightToggle.vue'
import PhotoBgBlurAdjuster, { type PhotoBgBlurAnchorRect } from './PhotoBgBlurAdjuster.vue'

import { useUiStore } from '@/stores/ui'

const { t, locale } = useI18n()
const route = useRoute()
const ui = useUiStore()
const { musicPlayerMinimized, musicPlayerPlaying, photoBackgroundEnabled } = storeToRefs(ui)
const { compact: navCompact } = useNavScrollCompact()

const musicNavPlayingAnimated = computed(
  () => musicPlayerMinimized.value && musicPlayerPlaying.value && !ui.prefersReducedMotion,
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

  if (ui.prefersReducedMotion) {
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
  void playToolbarFlipAfterRemove(snap, headerRightRef.value, ui.prefersReducedMotion)
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

function onDocPointerDown(ev: PointerEvent) {
  const el = overflowWrapRef.value
  if (!el || !overflowOpen.value) return
  if (!el.contains(ev.target as Node)) closeNavOverflow()
}

function onDocKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') closeNavOverflow()
}

watch(overflowOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onDocPointerDown, true)
    document.addEventListener('keydown', onDocKeydown)
  } else {
    document.removeEventListener('pointerdown', onDocPointerDown, true)
    document.removeEventListener('keydown', onDocKeydown)
  }
})

watch(
  () => route.fullPath,
  () => {
    closeNavOverflow()
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
  if (ui.prefersReducedMotion) return
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
  ui.prefersReducedMotion ? { enter: 100, leave: 90 } : { enter: 440, leave: 260 },
)

/** 幽灵占位时跳过 Transition 的 enter，避免与 FLIP 后的一次性 spring 叠两次 */
const photoToolbarTransitionMs = computed(() =>
  photoBarGhost.value
    ? { enter: 0, leave: ui.prefersReducedMotion ? 90 : 260 }
    : navToolbarTransitionMs.value,
)
const trailToolbarTransitionMs = computed(() =>
  trailBarGhost.value
    ? { enter: 0, leave: ui.prefersReducedMotion ? 90 : 260 }
    : navToolbarTransitionMs.value,
)
const musicToolbarTransitionMs = computed(() =>
  musicBarGhost.value
    ? { enter: 0, leave: ui.prefersReducedMotion ? 90 : 260 }
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
  if (ui.prefersReducedMotion) {
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
  if (ui.prefersReducedMotion) return

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
    ui.prefersReducedMotion,
    new Set(['photo']),
  )
  photoBarGhost.value = false
  await nextTick()
  if (!ui.prefersReducedMotion) photoBarSpringPop.value = true
}

function startTrailFromPanel() {
  if (ui.prefersReducedMotion) {
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
  if (ui.prefersReducedMotion) return

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
    ui.prefersReducedMotion,
    new Set(['trail']),
  )
  trailBarGhost.value = false
  await nextTick()
  if (!ui.prefersReducedMotion) trailBarSpringPop.value = true
}

function startMusicFromPanel() {
  if (ui.prefersReducedMotion) {
    closeNavOverflow()
    onMusicNavClick()
    return
  }
  musicPanelBtnVisible.value = false
}

async function commitMusicFromPanel() {
  musicPanelBtnVisible.value = true
  closeNavOverflow()
  if (ui.prefersReducedMotion) {
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
      ui.prefersReducedMotion,
      new Set(['music']),
    )
    musicBarGhost.value = false
    await nextTick()
    if (!ui.prefersReducedMotion) musicBarSpringPop.value = true
  }
}

onMounted(() => {
  syncMotion()
  mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  mql.addEventListener('change', syncMotion)
})

onUnmounted(() => {
  mql?.removeEventListener('change', syncMotion)
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onDocKeydown)
  if (overflowToolbarCueTimer != null) {
    window.clearTimeout(overflowToolbarCueTimer)
    overflowToolbarCueTimer = null
  }
  overflowTriggerCuePop.value = false
  overflowTriggerCueMusicOpen.value = false
})

/** 路由跳转转场（GSAP 驱动 Vue Transition，:css=false）：离开淡出上移、进入淡入浮起；尊重 reduced-motion */
function onRouteLeave(el: Element, done: () => void) {
  if (ui.prefersReducedMotion) {
    done()
    return
  }
  gsap.to(el, { autoAlpha: 0, y: -10, duration: 0.26, ease: 'power2.in', onComplete: done })
}

function onRouteEnter(el: Element, done: () => void) {
  // 新页进入时才切换容器布局（此刻旧页 leave 已结束），避免转场前的宽度突变
  displayedLayout.value = route.meta.appMainLayout
  if (ui.prefersReducedMotion) {
    done()
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
            :class="{ 'header-brand-row--settle-pop': headerLeftSettlePop && !ui.prefersReducedMotion }"
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
          <SiteNav />
        </div>
        <div ref="headerRightRef" class="header-right">
          <div class="header-toolbar-capsule">
            <div class="header-toolbar-slot" data-toolbar-flip="theme">
              <ThemeDayNightToggle class="header-theme-toggle" />
            </div>
            <span class="header-toolbar-capsule__divider" aria-hidden="true" />
            <!-- 三个圆形工具共用一个 flex 子项，避免各自占位时与 header-right 的 gap 叠成「假空白」 -->
            <div class="header-toolbar-cluster">
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
            <span class="header-toolbar-capsule__divider" aria-hidden="true" />
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
          </div>
          <div ref="overflowWrapRef" class="nav-overflow-wrap header-toolbar-slot" data-toolbar-flip="overflow">
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
                class="nav-overflow-panel card card-overflow-visible"
                role="region"
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
              </div>
            </Transition>
          </div>
          <span v-if="ui.prefersReducedMotion" class="hint">{{ t('ui.cursorTrailReduced') }}</span>
        </div>
      </div>
      </div>
    </header>

    <main class="app-main" :class="appMainClasses">
      <RouterView v-slot="{ Component }">
        <Transition :css="false" mode="out-in" @enter="onRouteEnter" @leave="onRouteLeave">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>
    </div>

    <CursorTrail />
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
    padding: 0.5rem 0.85rem;
  }

  /* 顶栏两行：第一行「品牌 + 工具」分列两端，第二行导航整行居中，省去纵向三层堆叠的高度 */
  .header-inner {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem 0.5rem;
  }

  /* 解散 header-left 盒子，让品牌行与导航各自参与 header-inner 的换行排布 */
  .header-left {
    display: contents;
  }

  .header-brand-row {
    order: 0;
    flex: 0 1 auto;
    width: auto;
    justify-content: flex-start;
  }

  .header-right {
    order: 1;
    width: auto;
    margin-left: auto;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.4rem 0.45rem;
  }

  .header-right .hint {
    display: none;
  }

  /* 导航：强制换到第二行，整行居中；放不下时换行（不可用 overflow，否则会裁掉分组下拉） */
  .header-left :deep(.nav.nav--shell) {
    order: 2;
    flex: 1 0 100%;
    width: 100%;
    max-width: 100%;
    justify-content: center;
    flex-wrap: wrap;
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
  color: #6fad87;
  border-color: rgb(180 210 192 / 55%);
  background-color: rgb(204 229 213 / 42%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 75%),
    0 4px 14px rgb(170 205 185 / 15%);
  transition:
    border-color 0.34s ease,
    background-color 0.34s ease,
    color 0.34s ease,
    box-shadow 0.34s ease;
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

.nav-overflow-panel {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 60;
  min-width: 9rem;
  padding: 0.65rem 0.7rem;
  pointer-events: auto;
  overflow: visible;
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
