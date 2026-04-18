<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { apiGet } from '@/api/http'

/** 与 FilmFeed 全屏预览 (z-index:120) 错开 */
const Z_PLAYER = 85

const STORAGE_POS = 'musicPlayer.position'
const STORAGE_PLAYING = 'musicPlayer.playing'
const STORAGE_TIME = 'musicPlayer.currentTime'
const STORAGE_TRACK_INDEX = 'musicPlayer.trackIndex'
const STORAGE_VOLUME = 'musicPlayer.volume'
/** 无本地记录时的默认音量（10%） */
const DEFAULT_VOLUME = 0.1

const titleLine = '音乐运动员(bushi'

type MusicTrack = {
  id: number
  url: string
  title: string | null
  artist: string | null
  duration_sec: number | null
  post_id: number | null
  tags: string[]
  sort_order: number
}

type MusicTracksApi = { code: number; data: MusicTrack[]; message?: string }

const pos = ref({ x: 0, y: 0 })
const isPlaying = ref(false)
const audioRef = ref<HTMLAudioElement | null>(null)
const loadHint = ref('正在加载曲目…')

const tracks = ref<MusicTrack[]>([])
const currentIndex = ref(0)
const playbackCurrent = ref(0)
const playbackDuration = ref(0)
const volume = ref(DEFAULT_VOLUME)
const volumePanelOpen = ref(false)

const volumeIconTier = computed(() => {
  const v = volume.value
  if (v <= 0.001) return 'mute' as const
  if (v < 0.34) return 'low' as const
  if (v < 0.67) return 'med' as const
  return 'high' as const
})

let dragging = false
let dragOffsetX = 0
let dragOffsetY = 0

function defaultPosition() {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200
  const h = typeof window !== 'undefined' ? window.innerHeight : 800
  return { x: Math.max(16, w - 300), y: Math.max(16, h - 200) }
}

function clampPos(x: number, y: number) {
  const pad = 8
  const elW = volumePanelOpen.value ? 280 + 10 + 172 : 280
  const elH = 288
  const maxX = Math.max(pad, window.innerWidth - elW - pad)
  const maxY = Math.max(pad, window.innerHeight - elH - pad)
  return {
    x: Math.min(maxX, Math.max(pad, x)),
    y: Math.min(maxY, Math.max(pad, y)),
  }
}

function loadPosition() {
  try {
    const raw = localStorage.getItem(STORAGE_POS)
    if (raw) {
      const p = JSON.parse(raw) as { x?: number; y?: number }
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        const c = clampPos(p.x, p.y)
        pos.value = c
        return
      }
    }
  } catch {
    /* ignore */
  }
  pos.value = defaultPosition()
}

function savePosition() {
  localStorage.setItem(STORAGE_POS, JSON.stringify(pos.value))
}

function loadPlaying() {
  isPlaying.value = localStorage.getItem(STORAGE_PLAYING) === '1'
}

function savePlaying() {
  localStorage.setItem(STORAGE_PLAYING, isPlaying.value ? '1' : '0')
}

function loadTrackIndex(maxIdx: number): number {
  try {
    const raw = localStorage.getItem(STORAGE_TRACK_INDEX)
    if (raw == null) return 0
    const i = Number.parseInt(raw, 10)
    if (!Number.isFinite(i) || maxIdx < 0) return 0
    return Math.min(maxIdx, Math.max(0, i))
  } catch {
    return 0
  }
}

function saveTrackIndex() {
  try {
    localStorage.setItem(STORAGE_TRACK_INDEX, String(currentIndex.value))
  } catch {
    /* ignore */
  }
}

function loadVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_VOLUME)
    if (raw == null) return DEFAULT_VOLUME
    const n = Number.parseFloat(raw)
    if (!Number.isFinite(n)) return DEFAULT_VOLUME
    return Math.min(1, Math.max(0, n))
  } catch {
    return DEFAULT_VOLUME
  }
}

function saveVolume(v: number) {
  try {
    localStorage.setItem(STORAGE_VOLUME, String(v))
  } catch {
    /* ignore */
  }
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const s = Math.floor(sec % 60)
  const m = Math.floor(sec / 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const progressPct = computed(() => {
  const d = playbackDuration.value
  const c = playbackCurrent.value
  if (!d || !Number.isFinite(d) || d <= 0) return 0
  return Math.min(100, Math.max(0, (c / d) * 100))
})

const trackCountLabel = computed(() => {
  const n = tracks.value.length
  if (n === 0) return ''
  return `第 ${currentIndex.value + 1} / ${n} 首`
})

const canPrevTrack = computed(() => tracks.value.length > 0 && currentIndex.value > 0)
const canNextTrack = computed(
  () => tracks.value.length > 0 && currentIndex.value < tracks.value.length - 1,
)

function onPrevTrack() {
  if (!canPrevTrack.value) return
  void loadTrackAtIndex(currentIndex.value - 1, isPlaying.value, true)
}

function onNextTrack() {
  if (!canNextTrack.value) return
  void loadTrackAtIndex(currentIndex.value + 1, isPlaying.value, true)
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
  savePlaying()
  const el = audioRef.value
  if (el?.src) {
    if (isPlaying.value) void el.play().catch(() => {})
    else el.pause()
  }
}

function saveCurrentTime() {
  const el = audioRef.value
  if (!el?.src) return
  try {
    localStorage.setItem(STORAGE_TIME, String(el.currentTime || 0))
  } catch {
    /* ignore */
  }
}

let timeSaveTimer: ReturnType<typeof setTimeout> | null = null
function onAudioTimeUpdate() {
  const el = audioRef.value
  if (el) {
    playbackCurrent.value = el.currentTime || 0
    const d = el.duration
    playbackDuration.value = Number.isFinite(d) && d > 0 ? d : 0
  }
  if (timeSaveTimer != null) return
  timeSaveTimer = window.setTimeout(() => {
    timeSaveTimer = null
    saveCurrentTime()
  }, 2000)
}

function onAudioPause() {
  saveCurrentTime()
}

function onLoadedMetadata() {
  const el = audioRef.value
  if (!el) return
  const d = el.duration
  playbackDuration.value = Number.isFinite(d) && d > 0 ? d : 0
}

function seekFromClientX(clientX: number, rail: HTMLElement) {
  const el = audioRef.value
  const d = playbackDuration.value
  if (!el || !d || !Number.isFinite(d) || d <= 0) return
  const rect = rail.getBoundingClientRect()
  if (rect.width <= 0) return
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  el.currentTime = ratio * d
  playbackCurrent.value = el.currentTime
  saveCurrentTime()
}

let progressRailEl: HTMLElement | null = null

function detachProgressPointerListeners() {
  window.removeEventListener('pointermove', onProgressPointerMove)
  window.removeEventListener('pointerup', onProgressPointerUp)
  window.removeEventListener('pointercancel', onProgressPointerUp)
}

function onProgressPointerMove(e: PointerEvent) {
  if (!progressRailEl) return
  seekFromClientX(e.clientX, progressRailEl)
}

function onProgressPointerUp(e: PointerEvent) {
  const rail = progressRailEl
  if (rail) {
    try {
      rail.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }
  progressRailEl = null
  detachProgressPointerListeners()
  saveCurrentTime()
}

function onProgressPointerDown(e: PointerEvent) {
  if (e.button !== 0 || !tracks.value.length) return
  const hit = e.currentTarget as HTMLElement
  const rail = hit.querySelector('.floating-music__progress-rail') as HTMLElement | null
  if (!rail) return
  e.stopPropagation()
  progressRailEl = rail
  try {
    rail.setPointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
  seekFromClientX(e.clientX, rail)
  window.addEventListener('pointermove', onProgressPointerMove)
  window.addEventListener('pointerup', onProgressPointerUp)
  window.addEventListener('pointercancel', onProgressPointerUp)
}

function toggleVolumePanel() {
  volumePanelOpen.value = !volumePanelOpen.value
  void nextTick(() => {
    pos.value = clampPos(pos.value.x, pos.value.y)
    savePosition()
  })
}

function onVolumeInput(e: Event) {
  const t = e.target as HTMLInputElement
  const v = Number.parseFloat(t.value)
  const next = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME
  volume.value = next
  const el = audioRef.value
  if (el) el.volume = next
  saveVolume(next)
}

function onAudioEnded() {
  const list = tracks.value
  if (list.length === 0) return
  if (currentIndex.value < list.length - 1) {
    void loadTrackAtIndex(currentIndex.value + 1, true, true)
  } else {
    isPlaying.value = false
    savePlaying()
    playbackCurrent.value = 0
    const el = audioRef.value
    if (el) el.currentTime = 0
    saveCurrentTime()
  }
}

/**
 * @param resetTime 为 true 时从 0 秒起播（切歌）；为 false 时尝试恢复 localStorage 记录
 */
async function loadTrackAtIndex(index: number, autoplay: boolean, resetTime: boolean) {
  const list = tracks.value
  const el = audioRef.value
  if (!el || list.length === 0 || index < 0 || index >= list.length) return

  const track = list[index]
  currentIndex.value = index
  saveTrackIndex()

  const wasSrc = el.src
  el.src = track.url
  if (wasSrc !== el.src) el.load()

  playbackDuration.value =
    track.duration_sec != null && track.duration_sec > 0 ? track.duration_sec : 0

  if (resetTime) {
    el.currentTime = 0
    playbackCurrent.value = 0
  } else {
    try {
      const t = localStorage.getItem(STORAGE_TIME)
      if (t != null) {
        const sec = Number.parseFloat(t) || 0
        el.currentTime = sec
        playbackCurrent.value = sec
      } else {
        el.currentTime = 0
        playbackCurrent.value = 0
      }
    } catch {
      el.currentTime = 0
      playbackCurrent.value = 0
    }
  }

  const meta = [track.title, track.artist].filter(Boolean).join(' · ')
  loadHint.value = meta || '已从后端加载曲目'

  if (autoplay) {
    isPlaying.value = true
    savePlaying()
    try {
      await el.play()
    } catch {
      isPlaying.value = false
      savePlaying()
    }
  }
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  /** 勿 preventDefault：会抑制兼容层 mousemove，导致仅监听 mousemove 的光标拖尾在拖拽时停摆 */
  dragging = true
  dragOffsetX = e.clientX - pos.value.x
  dragOffsetY = e.clientY - pos.value.y
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  const next = clampPos(e.clientX - dragOffsetX, e.clientY - dragOffsetY)
  pos.value = next
}

function detachDragListeners() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function onPointerUp() {
  if (dragging) savePosition()
  dragging = false
  detachDragListeners()
}

function onResize() {
  pos.value = clampPos(pos.value.x, pos.value.y)
  savePosition()
}

const playerStyle = computed(() => ({
  left: `${pos.value.x}px`,
  top: `${pos.value.y}px`,
  zIndex: Z_PLAYER,
}))

onMounted(async () => {
  loadPosition()
  loadPlaying()
  volume.value = loadVolume()
  window.addEventListener('resize', onResize)

  try {
    const res = await apiGet<MusicTracksApi>('/api/music/tracks?size=50')
    const list = Array.isArray(res.data) ? res.data : []
    const el = audioRef.value
    if (list.length > 0 && el) {
      tracks.value = list
      el.volume = volume.value
      el.addEventListener('timeupdate', onAudioTimeUpdate)
      el.addEventListener('pause', onAudioPause)
      el.addEventListener('loadedmetadata', onLoadedMetadata)
      el.addEventListener('ended', onAudioEnded)

      const idx = loadTrackIndex(list.length - 1)
      await loadTrackAtIndex(idx, isPlaying.value, false)
    } else {
      loadHint.value = '暂无曲目：将 mp3 放入 backend/import/music 后执行导入脚本'
    }
  } catch {
    loadHint.value = '曲目列表加载失败（请确认后端与数据库已迁移）'
  }
})

onBeforeUnmount(() => {
  detachProgressPointerListeners()
  progressRailEl = null
  const el = audioRef.value
  el?.removeEventListener('timeupdate', onAudioTimeUpdate)
  el?.removeEventListener('pause', onAudioPause)
  el?.removeEventListener('loadedmetadata', onLoadedMetadata)
  el?.removeEventListener('ended', onAudioEnded)
  if (timeSaveTimer != null) {
    clearTimeout(timeSaveTimer)
    timeSaveTimer = null
  }
  saveCurrentTime()
  window.removeEventListener('resize', onResize)
  detachDragListeners()
})
</script>

<template>
  <div class="floating-music__shell" :style="playerStyle">
    <div class="floating-music" role="region" aria-label="音乐播放器">
    <div class="floating-music__drag" @pointerdown="onPointerDown">
      <p class="floating-music__title" lang="en">{{ titleLine }}</p>
      <span class="floating-music__drag-hint">拖动</span>
    </div>
    <div class="floating-music__track-head">
      <p class="floating-music__track-name">{{ loadHint }}</p>
      <span v-if="trackCountLabel" class="floating-music__count">{{ trackCountLabel }}</span>
    </div>
    <div class="floating-music__transport">
      <div class="floating-music__transport-main">
        <button
          type="button"
          class="floating-music__skip"
          :disabled="!canPrevTrack"
          aria-label="上一首"
          @click.stop="onPrevTrack"
        >
          ⏮
        </button>
        <button
          type="button"
          class="floating-music__play"
          :aria-pressed="isPlaying ? 'true' : 'false'"
          :aria-label="isPlaying ? '暂停' : '播放'"
          @click.stop="togglePlay"
        >
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <button
          type="button"
          class="floating-music__skip"
          :disabled="!canNextTrack"
          aria-label="下一首"
          @click.stop="onNextTrack"
        >
          ⏭
        </button>
      </div>
      <button
        type="button"
        class="floating-music__vol-btn"
        :class="{ 'is-open': volumePanelOpen }"
        :aria-expanded="volumePanelOpen ? 'true' : 'false'"
        aria-controls="music-volume-popover"
        aria-label="音量"
        @click.stop="toggleVolumePanel"
      >
        <svg
          v-if="volumeIconTier === 'high'"
          class="floating-music__vol-icon"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M10,30 L30,30 L60,10 L60,90 L30,70 L10,70 Z" />
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            d="M75,35 A20,20 0 0 1 75,65"
          />
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            d="M85,25 A30,30 0 0 1 85,75"
          />
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            d="M95,15 A40,40 0 0 1 95,85"
          />
        </svg>
        <svg
          v-else-if="volumeIconTier === 'med'"
          class="floating-music__vol-icon"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M10,30 L30,30 L60,10 L60,90 L30,70 L10,70 Z" />
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            d="M75,35 A20,20 0 0 1 75,65"
          />
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            d="M85,25 A30,30 0 0 1 85,75"
          />
        </svg>
        <svg
          v-else-if="volumeIconTier === 'low'"
          class="floating-music__vol-icon"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M10,30 L30,30 L60,10 L60,90 L30,70 L10,70 Z" />
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            d="M75,35 A20,20 0 0 1 75,65"
          />
        </svg>
        <svg v-else class="floating-music__vol-icon" viewBox="0 0 100 100" aria-hidden="true">
          <path fill="currentColor" d="M10,30 L30,30 L60,10 L60,90 L30,70 L10,70 Z" />
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            stroke-linecap="round"
            d="M70 30 L90 70 M90 30 L70 70"
          />
        </svg>
      </button>
    </div>
    <div v-if="tracks.length" class="floating-music__progress-wrap" aria-label="播放进度，可拖动或点击">
      <div class="floating-music__time-row">
        <span>{{ formatTime(playbackCurrent) }}</span>
        <span>{{ formatTime(playbackDuration) }}</span>
      </div>
      <div class="floating-music__progress-hit" @pointerdown.stop="onProgressPointerDown">
        <div class="floating-music__progress-rail">
          <div class="floating-music__progress-fill" :style="{ width: `${progressPct}%` }" />
          <div class="floating-music__progress-thumb" :style="{ left: `${progressPct}%` }" />
        </div>
      </div>
    </div>
    <audio ref="audioRef" class="floating-music__audio" preload="metadata" />
    </div>
    <aside
      v-show="volumePanelOpen"
      id="music-volume-popover"
      class="floating-music__volume-popover"
      aria-label="音量调节"
      @pointerdown.stop
      @click.stop
    >
      <div class="floating-music__volume-popover-inner">
        <span class="floating-music__volume-label" aria-hidden="true">音量</span>
        <input
          class="floating-music__volume-range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          aria-label="音量滑块"
          @input="onVolumeInput"
        />
        <span class="floating-music__volume-value">{{ Math.round(volume * 100) }}%</span>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.floating-music__shell {
  position: fixed;
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  pointer-events: none;
}

.floating-music__shell > * {
  pointer-events: auto;
}

.floating-music {
  position: relative;
  flex-shrink: 0;
  width: min(280px, calc(100vw - 32px));
  padding: 0.75rem 0.9rem 0.65rem;
  cursor: default;
  user-select: none;
  isolation: isolate;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-card-border);
  background: var(--glass-card-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%) brightness(1.02);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%) brightness(1.02);
  box-shadow: var(--shadow-card);
}

.floating-music__drag {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  cursor: grab;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-card-border) 88%, transparent);
}

.floating-music__drag:active {
  cursor: grabbing;
}

.floating-music__title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    'PingFang SC',
    'Microsoft YaHei',
    'Noto Sans SC',
    sans-serif;
  font-size: clamp(0.56rem, 1.05vw, 0.78rem);
  font-weight: 600;
  font-style: normal;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: var(--color-text-muted);
}

.floating-music__drag-hint {
  flex-shrink: 0;
  font-size: 0.65rem;
  color: var(--color-text-muted);
  opacity: 0.75;
}

.floating-music__track-head {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto;
  gap: 0.2rem 0;
  margin-top: 0.55rem;
  min-width: 0;
}

.floating-music__track-name {
  grid-row: 1;
  grid-column: 1;
  margin: 0;
  min-width: 0;
  font-family: 'Playfair Display', 'Averia Gruesa Libre', Georgia, 'Times New Roman', serif;
  font-size: clamp(0.76rem, 2.0vw, 1.05rem);
  font-weight: 500;
  font-style: italic;
  line-height: 1.3;
  letter-spacing: 0.02em;
  color: var(--color-text);
}

.floating-music__count {
  grid-row: 2;
  grid-column: 1;
  justify-self: end;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
  line-height: 1.2;
}

.floating-music__transport {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.55rem;
  min-height: 2.35rem;
}

.floating-music__transport-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.floating-music__skip {
  flex-shrink: 0;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  border: 1px solid var(--glass-card-border);
  background: color-mix(in srgb, var(--glass-card-bg) 88%, transparent);
  color: var(--color-text);
  font-size: 0.72rem;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.floating-music__skip:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--glass-card-border));
  color: var(--color-accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-accent) 28%, transparent);
}

.floating-music__skip:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.floating-music__play {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: 1px solid var(--glass-card-border);
  background: color-mix(in srgb, var(--glass-card-bg) 88%, transparent);
  color: var(--color-text);
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.floating-music__play:hover {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--glass-card-border));
  color: var(--color-accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-accent) 28%, transparent);
}

.floating-music__progress-wrap {
  margin-top: 0.45rem;
}

.floating-music__time-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.floating-music__progress-hit {
  padding: 0.55rem 0 0.35rem;
  margin: -0.35rem 0 -0.15rem;
  cursor: pointer;
}

.floating-music__progress-rail {
  position: relative;
  height: 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-border) 55%, transparent);
}

.floating-music__progress-fill {
  height: 100%;
  width: 0%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-accent-muted), var(--color-accent));
  pointer-events: none;
  transition: width 0.12s linear;
}

.floating-music__progress-thumb {
  position: absolute;
  top: 50%;
  left: 0%;
  z-index: 1;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--glass-card-border);
  background: color-mix(in srgb, var(--glass-card-bg) 92%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-accent) 18%, transparent),
    0 0 10px color-mix(in srgb, var(--color-accent) 28%, transparent);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.floating-music__vol-btn {
  position: absolute;
  top: 50%;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--glass-card-border);
  background: color-mix(in srgb, var(--glass-card-bg) 88%, transparent);
  color: var(--color-text);
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.floating-music__vol-btn:hover {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--glass-card-border));
  color: var(--color-accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-accent) 28%, transparent);
}

.floating-music__vol-btn.is-open {
  border-color: color-mix(in srgb, var(--color-accent) 55%, var(--glass-card-border));
  color: var(--color-accent);
}

.floating-music__vol-icon {
  display: block;
  width: 1.05rem;
  height: 1.05rem;
}

.floating-music__volume-popover {
  flex-shrink: 0;
  width: min(172px, calc(100vw - 40px));
  padding: 0.65rem 0.75rem 0.7rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-card-border);
  background: var(--glass-card-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%) brightness(1.02);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%) brightness(1.02);
  box-shadow: var(--shadow-card);
}

.floating-music__volume-popover-inner {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.45rem;
}

.floating-music__volume-label {
  flex-shrink: 0;
  font-size: 0.65rem;
  color: var(--color-text-muted);
}

.floating-music__volume-range {
  width: 100%;
  min-width: 0;
  height: 0.35rem;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.floating-music__volume-value {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  width: 2.25rem;
  text-align: right;
}

.floating-music__audio {
  display: none;
}
</style>
