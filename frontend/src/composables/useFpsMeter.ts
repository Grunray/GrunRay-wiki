import { onUnmounted, ref, watch, type Ref } from 'vue'

export type FpsGrade = 'stutter' | 'fair' | 'good'

const SAMPLE_CAP = 512
const WINDOW_MS = 3000
const UPDATE_MS = 1000
/** 切后台回来的超长帧不进 1%L */
const MAX_FRAME_MS = 1000

function percentileLowFps(frameMs: number[]): number | null {
  if (frameMs.length < 40) return null
  const sorted = frameMs.slice().sort((a, b) => b - a)
  const take = Math.max(1, Math.ceil(sorted.length * 0.01))
  let sum = 0
  for (let i = 0; i < take; i++) sum += sorted[i]
  const avg = sum / take
  if (!(avg > 0)) return null
  return Math.round(1000 / avg)
}

function gradeOf(fpsNow: number, p1: number | null): FpsGrade {
  const worst = p1 == null ? fpsNow : Math.min(fpsNow, p1)
  if (worst <= 20) return 'stutter'
  if (worst <= 40) return 'fair'
  return 'good'
}

/**
 * 瞬时 FPS = 近 1s 的 rAF 次数；1%L = 近 3s 最慢 1% 帧时间的倒数（游戏 overlay 口径）。
 * 只应在监视开启时挂载；卸载即停循环。
 */
export function useFpsMeter(enabled: Ref<boolean>) {
  const fps = ref(0)
  const onePercentLow = ref<number | null>(null)
  const grade = ref<FpsGrade>('good')

  let raf = 0
  let lastTs = 0
  let framesInBucket = 0
  let bucketStart = 0

  const dts = new Float64Array(SAMPLE_CAP)
  const stamps = new Float64Array(SAMPLE_CAP)
  let write = 0
  let filled = 0

  function resetSamples() {
    write = 0
    filled = 0
    lastTs = 0
    framesInBucket = 0
    bucketStart = 0
  }

  function pushSample(now: number, dt: number) {
    dts[write] = dt
    stamps[write] = now
    write = (write + 1) % SAMPLE_CAP
    if (filled < SAMPLE_CAP) filled++
  }

  function samplesInWindow(now: number): number[] {
    const out: number[] = []
    const start = (write - filled + SAMPLE_CAP) % SAMPLE_CAP
    for (let i = 0; i < filled; i++) {
      const idx = (start + i) % SAMPLE_CAP
      if (now - stamps[idx] <= WINDOW_MS) out.push(dts[idx])
    }
    return out
  }

  function tick(ts: number) {
    if (!enabled.value) {
      raf = 0
      return
    }
    if (document.hidden) {
      lastTs = 0
      raf = window.requestAnimationFrame(tick)
      return
    }

    if (lastTs > 0) {
      const dt = ts - lastTs
      if (dt > 0 && dt < MAX_FRAME_MS) {
        pushSample(ts, dt)
        framesInBucket++
      }
    }
    lastTs = ts

    if (bucketStart === 0) bucketStart = ts
    if (ts - bucketStart >= UPDATE_MS) {
      const instant = Math.round((framesInBucket * 1000) / Math.max(1, ts - bucketStart))
      const p1 = percentileLowFps(samplesInWindow(ts))
      fps.value = instant
      onePercentLow.value = p1
      grade.value = gradeOf(instant, p1)
      framesInBucket = 0
      bucketStart = ts
    }

    raf = window.requestAnimationFrame(tick)
  }

  function start() {
    if (raf) return
    resetSamples()
    raf = window.requestAnimationFrame(tick)
  }

  function stop() {
    if (raf) window.cancelAnimationFrame(raf)
    raf = 0
    lastTs = 0
  }

  watch(
    enabled,
    (on) => {
      if (on) start()
      else stop()
    },
    { immediate: true },
  )

  onUnmounted(stop)

  return { fps, onePercentLow, grade }
}
