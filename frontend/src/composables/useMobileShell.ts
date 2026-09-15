import { inject, onMounted, onUnmounted, provide, ref, watch, type InjectionKey, type Ref } from 'vue'

import { useUiStore } from '@/stores/ui'

/** 全站手机壳层统一断点（顶栏汉堡 / 工具强制关 / footer 仅 ICP / 碎念 sheet） */
export const MOBILE_SHELL_MQ = '(max-width: 768px)'

export type MobileShellApi = {
  isMobileShell: Ref<boolean>
  acquireScrollLock: (id: string) => void
  releaseScrollLock: (id: string) => void
}

export const MOBILE_SHELL_KEY: InjectionKey<MobileShellApi> = Symbol('mobileShell')

type ToolSnapshot = {
  photo: boolean
  trail: boolean
  fps: boolean
  musicMinimized: boolean
}

function readMobileShellMatch(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(MOBILE_SHELL_MQ).matches
}

function writeDocFlag(on: boolean) {
  if (typeof document === 'undefined') return
  if (on) document.documentElement.dataset.mobileShell = 'true'
  else delete document.documentElement.dataset.mobileShell
}

function syncBodyOverflow(locked: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('mobile-shell-locked', locked)
  document.body.style.overflow = locked ? 'hidden' : ''
}

/**
 * 手机壳层：matchMedia(768) + 强制关掉右侧工具（回桌面恢复快照）+ 滚动锁。
 * 只在 AppShell 调用一次，并 provide；其它处用 `injectMobileShell()`。
 */
export function useMobileShell(): MobileShellApi {
  const ui = useUiStore()
  const isMobileShell = ref(readMobileShellMatch())
  let mql: MediaQueryList | null = null
  let snapshot: ToolSnapshot | null = null
  const scrollLocks = new Set<string>()

  writeDocFlag(isMobileShell.value)

  function acquireScrollLock(id: string) {
    scrollLocks.add(id)
    syncBodyOverflow(true)
  }

  function releaseScrollLock(id: string) {
    scrollLocks.delete(id)
    if (scrollLocks.size === 0) syncBodyOverflow(false)
  }

  function lockTools() {
    if (snapshot) return
    snapshot = {
      photo: ui.photoBackgroundEnabled,
      trail: ui.cursorTrailEnabled,
      fps: ui.fpsMeterEnabled,
      musicMinimized: ui.musicPlayerMinimized,
    }
    ui.setPhotoBackgroundEnabled(false)
    ui.setCursorTrailEnabled(false)
    ui.setFpsMeterEnabled(false)
    ui.setMusicPlayerMinimized(true)
  }

  function unlockTools() {
    if (!snapshot) return
    ui.setPhotoBackgroundEnabled(snapshot.photo)
    ui.setCursorTrailEnabled(snapshot.trail)
    ui.setFpsMeterEnabled(snapshot.fps)
    ui.setMusicPlayerMinimized(snapshot.musicMinimized)
    snapshot = null
  }

  function sync(matches: boolean) {
    isMobileShell.value = matches
    writeDocFlag(matches)
    if (matches) lockTools()
    else {
      unlockTools()
      scrollLocks.clear()
      syncBodyOverflow(false)
    }
  }

  function onChange(ev: MediaQueryListEvent) {
    sync(ev.matches)
  }

  onMounted(() => {
    mql = window.matchMedia(MOBILE_SHELL_MQ)
    sync(mql.matches)
    mql.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', onChange)
    mql = null
    unlockTools()
    scrollLocks.clear()
    syncBodyOverflow(false)
    writeDocFlag(false)
  })

  watch(
    () =>
      [
        ui.photoBackgroundEnabled,
        ui.cursorTrailEnabled,
        ui.fpsMeterEnabled,
        ui.musicPlayerMinimized,
      ] as const,
    () => {
      if (!isMobileShell.value) return
      if (ui.photoBackgroundEnabled) ui.setPhotoBackgroundEnabled(false)
      if (ui.cursorTrailEnabled) ui.setCursorTrailEnabled(false)
      if (ui.fpsMeterEnabled) ui.setFpsMeterEnabled(false)
      if (!ui.musicPlayerMinimized) ui.setMusicPlayerMinimized(true)
    },
  )

  const api: MobileShellApi = { isMobileShell, acquireScrollLock, releaseScrollLock }
  provide(MOBILE_SHELL_KEY, api)
  return api
}

/** AppShell 以外读取壳层。未 provide 时退回 matchMedia（不锁工具）。 */
export function injectMobileShell(): MobileShellApi {
  const injected = inject(MOBILE_SHELL_KEY, null)
  if (injected) return injected

  const isMobileShell = ref(readMobileShellMatch())
  return {
    isMobileShell,
    acquireScrollLock: () => {},
    releaseScrollLock: () => {},
  }
}
