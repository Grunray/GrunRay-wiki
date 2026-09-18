import { onMounted, onUnmounted, ref } from 'vue'

import { useUiStore } from '@/stores/ui'

const STORAGE_DISMISS = 'ui.motionHintDismissed'
const IDLE_MS = 8000
const SAMPLE_MS = 8000
const GAP_MS = 1200
const LONG_FRAME_MS = 50
const MAX_FRAME_MS = 1000
const LONG_NEED = 8
const LONG_NEED_LOW_END = 5
const FPS_RATIO = 0.65

type NavigatorHints = Navigator & {
  deviceMemory?: number
  getBattery?: () => Promise<{ charging: boolean; level: number }>
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_DISMISS) === '1'
  } catch {
    return false
  }
}

function persistDismissed(): void {
  try {
    localStorage.setItem(STORAGE_DISMISS, '1')
  } catch {
    /* ignore */
  }
}

function isLowEndHint(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as NavigatorHints
  const cores = nav.hardwareConcurrency
  const mem = nav.deviceMemory
  return (typeof cores === 'number' && cores > 0 && cores <= 4) || (typeof mem === 'number' && mem > 0 && mem <= 4)
}

async function batterySaverHint(): Promise<boolean> {
  const nav = navigator as NavigatorHints
  if (typeof nav.getBattery !== 'function') return false
  try {
    const battery = await nav.getBattery()
    return !battery.charging && battery.level <= 0.2
  } catch {
    return false
  }
}

/**
 * 进站短窗采样（DESIGN §9 附件）。默认不挂 rAF；两轮可见异常才出气泡。
 * 不改档；同意由调用方写入 REDUCED。
 */
export function useMotionPerformanceHint() {
  const ui = useUiStore()
  const hintOpen = ref(false)

  let idleTimer = 0
  let gapTimer = 0
  let raf = 0
  let loafObserver: PerformanceObserver | null = null
  let stopped = false
  let loafLong = 0
  let batteryWeight = false

  function cancelRaf() {
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  function stopLoaf() {
    loafObserver?.disconnect()
    loafObserver = null
  }

  function teardown() {
    stopped = true
    if (idleTimer) window.clearTimeout(idleTimer)
    if (gapTimer) window.clearTimeout(gapTimer)
    idleTimer = 0
    gapTimer = 0
    cancelRaf()
    stopLoaf()
  }

  function shouldSkip(): boolean {
    if (stopped) return true
    if (hintOpen.value) return true
    if (readDismissed()) return true
    if (ui.motionLevel !== 'full') return true
    if (ui.fpsMeterEnabled) return true
    if (document.visibilityState !== 'visible') return true
    return false
  }

  function startLoaf() {
    loafLong = 0
    stopLoaf()
    if (typeof PerformanceObserver === 'undefined') return
    const supported = PerformanceObserver.supportedEntryTypes
    if (!supported?.includes('long-animation-frame')) return
    try {
      loafObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > LONG_FRAME_MS && entry.duration < MAX_FRAME_MS) loafLong += 1
        }
      })
      loafObserver.observe({ type: 'long-animation-frame', buffered: false })
    } catch {
      stopLoaf()
    }
  }

  function sampleOnce(): Promise<boolean> {
    return new Promise((resolve) => {
      if (shouldSkip()) {
        resolve(false)
        return
      }
      const frames: number[] = []
      let last = 0
      const started = performance.now()
      startLoaf()

      const tick = (now: number) => {
        if (shouldSkip()) {
          cancelRaf()
          stopLoaf()
          resolve(false)
          return
        }
        if (last > 0) {
          const dt = now - last
          if (dt > 0 && dt < MAX_FRAME_MS) frames.push(dt)
        }
        last = now
        if (now - started >= SAMPLE_MS) {
          cancelRaf()
          const longFromLoaf = loafLong
          stopLoaf()
          resolve(isAbnormal(frames, longFromLoaf))
          return
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
  }

  function isAbnormal(frameMs: number[], extraLong: number): boolean {
    if (frameMs.length < 40) return false
    const longNeed = isLowEndHint() || batteryWeight ? LONG_NEED_LOW_END : LONG_NEED
    const longCount = frameMs.filter((ms) => ms > LONG_FRAME_MS).length + extraLong
    const mean = frameMs.reduce((sum, ms) => sum + ms, 0) / frameMs.length
    const avgFps = mean > 0 ? 1000 / mean : 0
    const sorted = frameMs.slice().sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)] ?? 16.7
    const refreshHz = median > 0 ? Math.min(240, Math.max(50, Math.round(1000 / median))) : 60
    return avgFps < refreshHz * FPS_RATIO && longCount >= longNeed
  }

  function showHint() {
    if (shouldSkip()) return
    hintOpen.value = true
  }

  async function runProbe() {
    if (shouldSkip()) return
    batteryWeight = await batterySaverHint()
    if (shouldSkip()) return
    const first = await sampleOnce()
    if (!first || shouldSkip()) return
    await new Promise<void>((resolve) => {
      gapTimer = window.setTimeout(() => {
        gapTimer = 0
        resolve()
      }, GAP_MS)
    })
    if (shouldSkip()) return
    const second = await sampleOnce()
    if (!second || shouldSkip()) return
    showHint()
  }

  function dismissHint() {
    hintOpen.value = false
    persistDismissed()
    teardown()
  }

  function acceptHint() {
    hintOpen.value = false
    ui.setMotionPreference('reduced')
    persistDismissed()
    teardown()
  }

  onMounted(() => {
    if (shouldSkip()) return
    idleTimer = window.setTimeout(() => {
      idleTimer = 0
      void runProbe()
    }, IDLE_MS)
  })

  onUnmounted(() => {
    teardown()
  })

  return { hintOpen, dismissHint, acceptHint }
}
