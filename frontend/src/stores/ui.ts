import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import type { ThemeId } from '@/types/content'
import { setPageCorruptState } from '@/theme/pageCorruptState'
import {
  applyPhotoBackgroundBlur,
  readPhotoBackgroundBlur,
  STORAGE_PHOTO_BG_BLUR,
  clampPhotoBackgroundBlur,
} from '@/theme/photoBackgroundBlur'
import { preloadCurrentPhotoBg } from '@/theme/pagePhotoBackgrounds'

const STORAGE_THEME = 'ui.theme'
const STORAGE_THEME_ABSTRACT_UNLOCKED = 'ui.themeAbstractUnlocked'
const STORAGE_CURSOR = 'ui.cursorTrail'
const STORAGE_FPS_METER = 'ui.fpsMeter'
/** 音乐面板是否收起：'1' 收起（关闭 UI），'0' 展开；无键时默认展开（UI 卡片可见） */
const STORAGE_MUSIC_MINIMIZED = 'ui.musicPlayerMinimized'

function readMusicPlayerMinimized(): boolean {
  const v = localStorage.getItem(STORAGE_MUSIC_MINIMIZED)
  if (v === '0') return false
  if (v === '1') return true
  // 无显式偏好：窄屏首次默认收起，避免浮动播放器遮挡手机首屏内容（桌面仍默认展开）
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
    return true
  }
  return false
}

const STORAGE_PHOTO_BG = 'ui.photoBackground'

/** 无键或非法值时默认开启全屏图片背景；仅显式 '0' 为关 */
function readPhotoBackground(): boolean {
  const v = localStorage.getItem(STORAGE_PHOTO_BG)
  if (v === '0') return false
  if (v === '1') return true
  return true
}

function applyPhotoBgToDocument(enabled: boolean) {
  if (enabled) {
    document.documentElement.dataset.photoBg = 'true'
    // 刚开启背景：触发当前页背景图的加载动画（光晕呼吸 + blur-up）
    preloadCurrentPhotoBg()
  } else {
    delete document.documentElement.dataset.photoBg
  }
}

function readAbstractUnlocked(): boolean {
  return localStorage.getItem(STORAGE_THEME_ABSTRACT_UNLOCKED) === '1'
}

/** 浅/深公开；abstract 仅彩蛋解锁后持久化 */
function readTheme(): ThemeId {
  const v = localStorage.getItem(STORAGE_THEME)
  if (v === 'dark') return 'dark'
  if (v === 'abstract' && readAbstractUnlocked()) return 'abstract'
  if (v === 'abstract') {
    localStorage.setItem(STORAGE_THEME, 'light')
    return 'light'
  }
  return 'light'
}

function applyThemeToDocument(theme: ThemeId) {
  document.documentElement.dataset.theme = theme
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeId>(readTheme())
  const cursorTrailEnabled = ref(localStorage.getItem(STORAGE_CURSOR) !== '0')
  /** 帧率监视浮层；无键默认关，仅 `ui.fpsMeter=1` 才开 */
  const fpsMeterEnabled = ref(localStorage.getItem(STORAGE_FPS_METER) === '1')
  const prefersReducedMotion = ref(false)
  /** 音乐播放器是否收起（仅隐藏 UI，不卸载音频）；持久化，刷新后保持上次开/关 */
  const musicPlayerMinimized = ref(readMusicPlayerMinimized())
  /** 供顶栏 🎵 状态：是否与音频播放同步 */
  const musicPlayerPlaying = ref(false)
  /** 递增以触发开屏动画重播（供顶栏 🐌 等调用） */
  const splashWoniuReplayTick = ref(0)
  /** 开屏头像飞入首页时为 true，首页头像暂时隐藏避免叠影 */
  const splashAvatarHandoff = ref(false)
  /** 全屏图片背景（与 main.css 中 html[data-photo-bg] 联动） */
  const photoBackgroundEnabled = ref(readPhotoBackground())
  /** 图片背景常态模糊（px）；右键顶栏照片钮可调 */
  const photoBackgroundBlurPx = ref(readPhotoBackgroundBlur())
  /** 404 彩蛋：是否已解锁 abstract 配色 */
  const abstractThemeUnlocked = ref(readAbstractUnlocked())

  watch(
    theme,
    (t) => {
      localStorage.setItem(STORAGE_THEME, t)
      applyThemeToDocument(t)
    },
    { immediate: true },
  )

  watch(cursorTrailEnabled, (v) => {
    localStorage.setItem(STORAGE_CURSOR, v ? '1' : '0')
  })

  watch(fpsMeterEnabled, (v) => {
    localStorage.setItem(STORAGE_FPS_METER, v ? '1' : '0')
  })

  watch(musicPlayerMinimized, (m) => {
    localStorage.setItem(STORAGE_MUSIC_MINIMIZED, m ? '1' : '0')
  })

  watch(
    photoBackgroundEnabled,
    (v) => {
      localStorage.setItem(STORAGE_PHOTO_BG, v ? '1' : '0')
      applyPhotoBgToDocument(v)
    },
    { immediate: true },
  )

  watch(
    photoBackgroundBlurPx,
    (px) => {
      const blur = clampPhotoBackgroundBlur(px)
      localStorage.setItem(STORAGE_PHOTO_BG_BLUR, String(blur))
      applyPhotoBackgroundBlur(blur)
      if (blur !== px) photoBackgroundBlurPx.value = blur
    },
    { immediate: true },
  )

  const cursorTrailActive = computed(
    () => cursorTrailEnabled.value && !prefersReducedMotion.value,
  )

  function setReducedMotion(value: boolean) {
    prefersReducedMotion.value = value
  }

  /** 顶栏轮换：未解锁时浅/深；解锁后 浅 → 深 → 隐藏 → 浅 */
  function cycleTheme() {
    if (abstractThemeUnlocked.value) {
      if (theme.value === 'light') theme.value = 'dark'
      else if (theme.value === 'dark') theme.value = 'abstract'
      else theme.value = 'light'
      return
    }
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  /** 指定主题（abstract 需已解锁） */
  function setTheme(t: ThemeId) {
    if (t === 'abstract') {
      if (!abstractThemeUnlocked.value) return
      theme.value = 'abstract'
      return
    }
    theme.value = t === 'dark' ? 'dark' : 'light'
  }

  /** 404 彩蛋：解锁并应用 abstract 隐藏配色 */
  function unlockAbstractTheme() {
    abstractThemeUnlocked.value = true
    localStorage.setItem(STORAGE_THEME_ABSTRACT_UNLOCKED, '1')
    theme.value = 'abstract'
    setPageCorruptState(false)
  }

  function expandMusicPlayer() {
    musicPlayerMinimized.value = false
  }

  function setMusicPlayerMinimized(v: boolean) {
    musicPlayerMinimized.value = v
  }

  function setMusicPlayerPlaying(v: boolean) {
    musicPlayerPlaying.value = v
  }

  function requestSplashWoniuReplay() {
    splashWoniuReplayTick.value += 1
  }

  function setSplashAvatarHandoff(v: boolean) {
    splashAvatarHandoff.value = v
  }

  function togglePhotoBackground() {
    photoBackgroundEnabled.value = !photoBackgroundEnabled.value
  }

  function setPhotoBackgroundBlur(px: number) {
    photoBackgroundBlurPx.value = clampPhotoBackgroundBlur(px)
  }

  return {
    theme,
    cursorTrailEnabled,
    fpsMeterEnabled,
    prefersReducedMotion,
    cursorTrailActive,
    musicPlayerMinimized,
    musicPlayerPlaying,
    splashWoniuReplayTick,
    splashAvatarHandoff,
    photoBackgroundEnabled,
    photoBackgroundBlurPx,
    abstractThemeUnlocked,
    setTheme,
    cycleTheme,
    unlockAbstractTheme,
    setReducedMotion,
    expandMusicPlayer,
    setMusicPlayerMinimized,
    setMusicPlayerPlaying,
    requestSplashWoniuReplay,
    setSplashAvatarHandoff,
    togglePhotoBackground,
    setPhotoBackgroundBlur,
  }
})
