<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useI18n } from 'vue-i18n'

import AppImage from '@/components/ui/AppImage.vue'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'

const { t } = useI18n()

type MediaType = 'image' | 'gif' | 'video'
type MediaItem = {
  id: number
  url: string
  type: MediaType
  title?: string | null
  article_id?: number | null
  tags?: string[] | null
  created_at?: string
}

/** horizontal：首页封面的横向胶片带；默认纵向（右栏胶片柱） */
const props = withDefaults(defineProps<{ horizontal?: boolean }>(), { horizontal: false })
const horizontal = computed(() => props.horizontal)

const items = ref<MediaItem[]>([])
const loading = ref(false)
const error = ref('')
const speedSeconds = ref(20)
const viewerItem = ref<MediaItem | null>(null)
const filmRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
/** 无缝循环至少 2 组；单组窄于视口时再加组，避免宽屏右侧露白后突然接上 */
const repeatCount = ref(2)
const MAX_REPEAT = 24
const reducedMotion = ref(false)
const filmHovered = ref(false)
const shiftHeld = ref(false)
const hintRef = ref<HTMLElement | null>(null)
const hintVisible = computed(() => filmHovered.value && !viewerItem.value)
let loopObserver: ResizeObserver | null = null
let motionMql: MediaQueryList | null = null
let hintTween: gsap.core.Timeline | gsap.core.Tween | null = null
let measureQueued = false
let measuring = false

function syncReducedMotion() {
  reducedMotion.value = prefersReducedMotionMedia()
}

async function loadMedia() {
  loading.value = true
  error.value = ''
  try {
    const q = new URLSearchParams({
      page: '1',
      size: '50',
    })
    const res = await fetch(`/api/media/list/filmfeed?${q.toString()}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { code: number; data: MediaItem[]; message: string }
    if (json.code !== 0) throw new Error(json.message || '加载失败')
    items.value = json.data ?? []
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

const loopItems = computed(() => {
  if (!items.value.length) return []
  const copies: MediaItem[] = []
  for (let i = 0; i < repeatCount.value; i++) copies.push(...items.value)
  return copies
})

function scheduleMeasureLoopCopies() {
  if (measureQueued) return
  measureQueued = true
  requestAnimationFrame(() => {
    measureQueued = false
    measureLoopCopies()
  })
}

function measureLoopCopies() {
  if (reducedMotion.value || measuring) return
  const film = filmRef.value
  const track = trackRef.value
  const n = items.value.length
  if (!film || !track || !n) return
  const viewport = horizontal.value ? film.clientWidth : film.clientHeight
  const total = horizontal.value ? track.scrollWidth : track.scrollHeight
  const setSize = total / repeatCount.value
  if (viewport < 1 || setSize < 1) return
  /* 布局未完成时格宽会接近 0，ceil(viewport/setSize) 会冲到 MAX_REPEAT，
   * 再叠加 :key 整轨重挂载就会把 Chrome/Edge 打满。未就绪时先不改副本数。 */
  const minSet = horizontal.value
    ? n * Math.max(48, track.clientHeight * 0.45)
    : n * 80
  if (setSize < minSet) return
  const needed = Math.min(MAX_REPEAT, Math.max(2, Math.ceil(viewport / setSize) + 1))
  if (needed === repeatCount.value) return
  measuring = true
  repeatCount.value = needed
  void nextTick(() => {
    measuring = false
  })
}

function openViewer(item: MediaItem) {
  viewerItem.value = item
}

function closeViewer() {
  viewerItem.value = null
}

/** Shift + 滚轮调速度；普通滚轮不拦截，避免首页横幅 hijack 整页滚动 */
function onWheel(e: WheelEvent) {
  shiftHeld.value = e.shiftKey
  if (!e.shiftKey) return
  e.preventDefault()
  const delta = e.deltaY * 0.02
  speedSeconds.value = Math.min(40, Math.max(6, speedSeconds.value + delta))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeViewer()
  if (e.key === 'Shift' && filmHovered.value) shiftHeld.value = true
}

watch([items, trackRef], async () => {
  await nextTick()
  scheduleMeasureLoopCopies()
})

watch(hintVisible, (show) => {
  playHint(show)
})

onMounted(() => {
  loadMedia()
  syncReducedMotion()
  motionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionMql.addEventListener('change', syncReducedMotion)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onShiftKeyup)
  loopObserver = new ResizeObserver(() => scheduleMeasureLoopCopies())
  if (filmRef.value) loopObserver.observe(filmRef.value)
  gsap.set(hintRef.value, { autoAlpha: 0, y: -12, x: 10, scale: 0.94 })
})

function playHint(show: boolean) {
  const el = hintRef.value
  if (!el) return
  hintTween?.kill()
  const lines = el.querySelectorAll('.film-wheel-hint-line')
  if (reducedMotion.value) {
    gsap.set(el, { autoAlpha: show ? 1 : 0, y: 0, x: 0, scale: 1 })
    gsap.set(lines, { autoAlpha: 1, y: 0 })
    return
  }
  if (show) {
    hintTween = gsap.timeline({ defaults: { ease: 'power3.out' } })
    hintTween.fromTo(
      el,
      { autoAlpha: 0, y: -14, x: 12, scale: 0.94 },
      { autoAlpha: 1, y: 0, x: 0, scale: 1, duration: 0.48, transformOrigin: '100% 0%' },
    )
    hintTween.fromTo(
      lines,
      { autoAlpha: 0, y: -8 },
      { autoAlpha: 1, y: 0, duration: 0.34, stagger: 0.1 },
      0.06,
    )
  } else {
    hintTween = gsap.to(el, {
      autoAlpha: 0,
      y: -8,
      x: 6,
      scale: 0.97,
      duration: 0.28,
      ease: 'power2.in',
      transformOrigin: '100% 0%',
    })
  }
}

function onShiftKeyup(e: KeyboardEvent) {
  if (e.key === 'Shift') shiftHeld.value = false
}

onBeforeUnmount(() => {
  hintTween?.kill()
  hintTween = null
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('keyup', onShiftKeyup)
  motionMql?.removeEventListener('change', syncReducedMotion)
  motionMql = null
  loopObserver?.disconnect()
  loopObserver = null
})
</script>

<template>
  <div
    class="film-container"
    :class="{ 'film-container--horizontal': horizontal, 'film-container--shift': shiftHeld }"
    @wheel="onWheel"
    @mouseenter="filmHovered = true"
    @mouseleave="filmHovered = false; shiftHeld = false"
  >
    <p
      ref="hintRef"
      class="film-wheel-hint"
      role="status"
      aria-live="polite"
      :aria-hidden="hintVisible ? 'false' : 'true'"
    >
      <span class="film-wheel-hint-line">{{ t('filmFeed.wheelHintScroll') }}</span>
      <span class="film-wheel-hint-line film-wheel-hint-sub">{{ t('filmFeed.wheelHintShift') }}</span>
    </p>
    <div ref="filmRef" class="film">
      <div class="film-edge-overlay top" />
      <div class="film-edge-overlay bottom" />
      <div class="holes">
        <div v-for="n in 10" :key="`l-${n}`" class="hole" />
      </div>
      <div class="holes right">
        <div v-for="n in 10" :key="`r-${n}`" class="hole" />
      </div>

      <div
        v-if="loopItems.length"
        ref="trackRef"
        class="track"
        :class="{ paused: !!viewerItem || reducedMotion, 'track--reduced': reducedMotion }"
        :style="{ animationDuration: `${speedSeconds}s`, '--film-repeat': repeatCount }"
      >
        <div v-for="(item, idx) in loopItems" :key="`f-${idx}-${item.id}`" class="frame" @click="openViewer(item)">
          <video v-if="item.type === 'video'" :src="item.url" muted loop playsinline preload="metadata" />
          <AppImage v-else :src="item.url" :alt="item.title || 'media'" :ratio="horizontal ? '' : '4/5'" />
        </div>
      </div>

      <div v-else class="status-box">
        <div v-if="loading" class="film-skel" aria-busy="true" aria-label="加载中">
          <div v-for="n in 4" :key="n" class="frame sk-frame ui-skeleton" />
        </div>
        <p v-else-if="error">加载失败：{{ error }}</p>
        <p v-else>暂无媒体数据</p>
      </div>
    </div>

    <div v-if="viewerItem" class="viewer active" @click="closeViewer">
      <div class="viewer-content" @click.stop>
        <video v-if="viewerItem.type === 'video'" :src="viewerItem.url" controls autoplay />
        <img v-else :src="viewerItem.url" :alt="viewerItem.title || 'media'" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.film-container {
  position: relative;
  height: 100%;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 悬停时提示：滚轮滚页面（纵向），Shift+滚轮在此调胶片速度 */
  cursor: ns-resize;
}

.film-wheel-hint {
  position: absolute;
  top: 0.55rem;
  right: 0.65rem;
  z-index: 22;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.14rem;
  margin: 0;
  max-width: min(16rem, 46vw);
  padding: 0.42rem 0.62rem 0.44rem 0.7rem;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  line-height: 1.4;
  color: #2b2823;
  text-align: right;
  border-radius: var(--radius-sm);
  border: 1px solid rgb(43 40 35 / 16%);
  border-left: 2px solid var(--color-accent);
  background: rgb(250 248 241 / 0.94);
  box-shadow:
    var(--shadow-card),
    0 10px 22px -16px rgb(12 16 13 / 0.45);
  pointer-events: none;
  visibility: hidden;
}

.film-wheel-hint-line {
  display: block;
}

.film-wheel-hint-sub {
  color: #6e675b;
  font-size: 0.72rem;
  letter-spacing: 0.03em;
}

.film-container--shift {
  cursor: ew-resize;
}

.film-container--horizontal.film-container--shift {
  cursor: ew-resize;
}

.film {
  position: relative;
  height: 100%;
  background: color-mix(in srgb, var(--glass-card-bg) 84%, transparent);
  backdrop-filter: blur(calc(var(--glass-blur) * 0.85)) saturate(122%);
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) * 0.85)) saturate(122%);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.film-edge-overlay {
  position: absolute;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 9;
  pointer-events: none;
  backdrop-filter: blur(calc(var(--glass-blur) * 1.3)) saturate(135%) brightness(1.01);
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) * 1.3)) saturate(135%) brightness(1.01);
}

.film-edge-overlay.top {
  top: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--glass-card-bg) 76%, transparent) 0%,
    color-mix(in srgb, var(--glass-card-bg) 48%, transparent) 36%,
    rgb(17 17 17 / 0.38) 68%,
    rgb(17 17 17 / 0) 100%
  );
  -webkit-mask-image: linear-gradient(to bottom, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 0.82) 36%, rgb(0 0 0 / 0) 100%);
  mask-image: linear-gradient(to bottom, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 0.82) 36%, rgb(0 0 0 / 0) 100%);
  border-bottom: 1px solid color-mix(in srgb, var(--glass-card-border) 85%, transparent);
}

.film-edge-overlay.bottom {
  bottom: 0;
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--glass-card-bg) 76%, transparent) 0%,
    color-mix(in srgb, var(--glass-card-bg) 48%, transparent) 36%,
    rgb(17 17 17 / 0.38) 68%,
    rgb(17 17 17 / 0) 100%
  );
  -webkit-mask-image: linear-gradient(to top, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 0.82) 36%, rgb(0 0 0 / 0) 100%);
  mask-image: linear-gradient(to top, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 0.82) 36%, rgb(0 0 0 / 0) 100%);
  border-top: 1px solid color-mix(in srgb, var(--glass-card-border) 85%, transparent);
}

.holes {
  position: absolute;
  left: 0;
  top: 0;
  width: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 8px 0;
  z-index: 2;
}

.holes.right {
  left: auto;
  right: 0;
}

.hole {
  width: 11px;
  height: 14px;
  margin: auto;
  background: color-mix(in srgb, var(--color-text) 36%, white);
  border-radius: 2px;
  opacity: 0.62;
}

.track {
  position: absolute;
  width: calc(100% - 54px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 0;
  animation: scroll linear infinite;
}

.track.paused {
  animation-play-state: paused;
}

.track.track--reduced {
  animation: none;
}

@keyframes scroll {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(calc(-100% / var(--film-repeat, 2)));
  }
}

.frame {
  width: 100%;
  min-height: 180px;
  border: 1px solid color-mix(in srgb, var(--glass-card-border) 92%, white);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: color-mix(in srgb, var(--color-bg-surface) 84%, #0f1418);
  cursor: zoom-in;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 22px -16px rgb(0 0 0 / 0.48);
  transition:
    transform 0.25s ease,
    filter 0.25s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}

.track:hover .frame {
  filter: blur(1.2px) saturate(0.88) brightness(0.88);
  transform: scale(0.985);
}

.track:hover .frame:hover {
  filter: none;
  transform: scale(1.045);
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--glass-card-border));
  box-shadow:
    0 14px 34px -18px rgb(0 0 0 / 0.6),
    0 0 0 1px color-mix(in srgb, var(--color-accent) 28%, transparent);
  z-index: 2;
}

.frame img,
.frame video {
  width: 100%;
  height: auto;
  max-height: 340px;
  object-fit: contain;
  display: block;
}

.status-box {
  width: calc(100% - 54px);
  margin-top: 1rem;
  border: 1px dashed color-mix(in srgb, var(--glass-card-border) 88%, transparent);
  color: var(--color-text-muted);
  text-align: center;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--glass-card-bg) 78%, transparent);
  border-radius: var(--radius-sm);
}

.film-skel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 0;
  text-align: left;
}

.film-skel .sk-frame {
  cursor: default;
  pointer-events: none;
}

.viewer {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.84);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 120;
}

.viewer.active {
  opacity: 1;
  pointer-events: auto;
}

.viewer-content {
  max-width: min(92vw, 960px);
  max-height: 88vh;
}

.viewer-content img,
.viewer-content video {
  display: block;
  max-width: 100%;
  max-height: 88vh;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgb(0 0 0 / 0.6);
}

/* —— 横向胶片带（首页封面）：齿孔在上下，胶片水平滚动 —— */
.film-container--horizontal .film {
  min-height: 0;
  height: 100%;
}

.film-container--horizontal .film-edge-overlay {
  top: 0;
  bottom: 0;
  left: auto;
  right: auto;
  width: 56px;
  height: auto;
}

.film-container--horizontal .film-edge-overlay.top {
  left: 0;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--glass-card-bg) 76%, transparent) 0%,
    color-mix(in srgb, var(--glass-card-bg) 48%, transparent) 36%,
    rgb(17 17 17 / 0.38) 68%,
    rgb(17 17 17 / 0) 100%
  );
  -webkit-mask-image: linear-gradient(to right, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 0.82) 36%, rgb(0 0 0 / 0) 100%);
  mask-image: linear-gradient(to right, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 0.82) 36%, rgb(0 0 0 / 0) 100%);
  border-bottom: none;
  border-right: 1px solid color-mix(in srgb, var(--glass-card-border) 85%, transparent);
}

.film-container--horizontal .film-edge-overlay.bottom {
  right: 0;
  background: linear-gradient(
    to left,
    color-mix(in srgb, var(--glass-card-bg) 76%, transparent) 0%,
    color-mix(in srgb, var(--glass-card-bg) 48%, transparent) 36%,
    rgb(17 17 17 / 0.38) 68%,
    rgb(17 17 17 / 0) 100%
  );
  -webkit-mask-image: linear-gradient(to left, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 0.82) 36%, rgb(0 0 0 / 0) 100%);
  mask-image: linear-gradient(to left, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 0.82) 36%, rgb(0 0 0 / 0) 100%);
  border-top: none;
  border-left: 1px solid color-mix(in srgb, var(--glass-card-border) 85%, transparent);
}

.film-container--horizontal .holes {
  left: 0;
  right: 0;
  top: 0;
  bottom: auto;
  width: 100%;
  height: 20px;
  flex-direction: row;
  padding: 0 8px;
}

.film-container--horizontal .holes.right {
  top: auto;
  bottom: 0;
  left: 0;
  right: auto;
}

.film-container--horizontal .hole {
  width: 14px;
  height: 11px;
}

.film-container--horizontal .track {
  /* absolute 需显式定位：flex 静态位会把它贴到容器顶端，叠住上排齿孔 */
  top: 27px;
  left: 0;
  flex-direction: row;
  align-items: stretch;
  width: max-content;
  height: calc(100% - 54px);
  padding: 0 12px;
  gap: 14px;
  animation-name: scroll-x;
}

@keyframes scroll-x {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-100% / var(--film-repeat, 2)));
  }
}

.film-container--horizontal .frame {
  width: auto;
  height: 100%;
  min-height: 0;
  aspect-ratio: 4 / 5;
  flex: 0 0 auto;
}

.film-container--horizontal .frame :deep(.app-image) {
  width: 100%;
  height: 100%;
}

.film-container--horizontal .frame img,
.film-container--horizontal .frame video {
  width: 100%;
  height: 100%;
  max-height: none;
  object-fit: cover;
}

.film-container--horizontal .status-box {
  width: auto;
  min-width: min(78%, 30rem);
  margin: 1rem auto 0;
}

.film-container--horizontal .film-skel {
  flex-direction: row;
  align-items: stretch;
  height: 100%;
  padding: 0 12px;
}

.film-container--horizontal .film-skel .sk-frame {
  height: 100%;
  min-height: 0;
  aspect-ratio: 4 / 5;
  width: auto;
  flex: 0 0 auto;
}

@media (prefers-reduced-motion: reduce) {
  .film-wheel-hint {
    transform: none;
  }
}

/* 首页窄屏：父级 height:auto 时避免 height:100% 塌成 0 */
@media (max-width: 1100px) {
  .film-container:not(.film-container--horizontal),
  .film-container:not(.film-container--horizontal) .film {
    height: auto;
    min-height: min(52vh, 520px);
  }
}
</style>
