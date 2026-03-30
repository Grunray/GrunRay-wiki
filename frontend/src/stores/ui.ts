import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import type { ThemeId } from '@/types/content'

const STORAGE_THEME = 'ui.theme'
const STORAGE_CURSOR = 'ui.cursorTrail'

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

  return {
    theme,
    cursorTrailEnabled,
    prefersReducedMotion,
    cursorTrailActive,
    setTheme,
    setReducedMotion,
  }
})
