import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import type { ThemeId } from '@/types/content'

const STORAGE_THEME = 'ui.theme'
const STORAGE_CURSOR = 'ui.cursorTrail'
/** 音乐面板是否收起：'1' 收起（关闭 UI），'0' 展开；无键时默认展开（UI 卡片可见） */
const STORAGE_MUSIC_MINIMIZED = 'ui.musicPlayerMinimized'

function readMusicPlayerMinimized(): boolean {
  const v = localStorage.getItem(STORAGE_MUSIC_MINIMIZED)
  if (v === '0') return false
  if (v === '1') return true
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
  } else {
    delete document.documentElement.dataset.photoBg
  }
}

/** 当前仅开放浅/深；历史 `abstract` 读入时回落为浅色并写回存储 */
function readTheme(): ThemeId {
  const v = localStorage.getItem(STORAGE_THEME)
  if (v === 'dark') return 'dark'
  if (v === 'abstract') {
    localStorage.setItem(STORAGE_THEME, 'light')
    return 'light'
  }
  return 'light'
}

function applyThemeToDocument(theme: ThemeId) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light'
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeId>(readTheme())
  const cursorTrailEnabled = ref(localStorage.getItem(STORAGE_CURSOR) !== '0')
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

  watch(
    theme,
    (t) => {
      const persist = t === 'dark' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_THEME, persist)
      applyThemeToDocument(t)
    },
    { immediate: true },
  )

  watch(cursorTrailEnabled, (v) => {
    localStorage.setItem(STORAGE_CURSOR, v ? '1' : '0')
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

  const cursorTrailActive = computed(
    () => cursorTrailEnabled.value && !prefersReducedMotion.value,
  )

  function setReducedMotion(value: boolean) {
    prefersReducedMotion.value = value
  }

  /** 仅切换浅色 / 深色（抽象模式入口已隐藏） */
  function setTheme(t: ThemeId) {
    theme.value = t === 'dark' ? 'dark' : 'light'
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

  return {
    theme,
    cursorTrailEnabled,
    prefersReducedMotion,
    cursorTrailActive,
    musicPlayerMinimized,
    musicPlayerPlaying,
    splashWoniuReplayTick,
    splashAvatarHandoff,
    photoBackgroundEnabled,
    setTheme,
    setReducedMotion,
    expandMusicPlayer,
    setMusicPlayerMinimized,
    setMusicPlayerPlaying,
    requestSplashWoniuReplay,
    setSplashAvatarHandoff,
    togglePhotoBackground,
  }
})
