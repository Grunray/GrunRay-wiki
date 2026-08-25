<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AppImage from '@/components/ui/AppImage.vue'
import { prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'
import { sanitizeMediaUrl } from '@/utils/mediaUrl'

const props = defineProps<{
  src: string
  alt: string
}>()

const { t } = useI18n()

const LENS_ZOOM = 2.4
const WIDE_MQ = '(min-width: 1100px)'
const MIN_VIEWER_SCALE = 0.45
const MAX_VIEWER_SCALE = 4

const figRef = ref<HTMLElement | null>(null)
const viewerOpen = ref(false)
const hovered = ref(false)
const reducedMotion = ref(false)
const wideEnough = ref(false)
const pointer = ref({ x: 0.5, y: 0.5 })
const viewerScale = ref(1)
const viewerPan = ref({ x: 0, y: 0 })
const dragging = ref(false)

const safeSrc = computed(() => sanitizeMediaUrl(props.src))

const showHoverPreview = computed(
  () => hovered.value && wideEnough.value && !reducedMotion.value && !viewerOpen.value,
)

const lensImgStyle = computed(() => ({
  transform: `scale(${LENS_ZOOM})`,
  transformOrigin: `${pointer.value.x * 100}% ${pointer.value.y * 100}%`,
}))

const viewerImageStyle = computed(() => ({
  transform: `translate(${viewerPan.value.x}px, ${viewerPan.value.y}px) scale(${viewerScale.value})`,
}))

let hideTimer = 0
let motionMql: MediaQueryList | null = null
let wideMql: MediaQueryList | null = null
let dragAnchor = { mx: 0, my: 0, px: 0, py: 0 }

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function syncReducedMotion() {
  reducedMotion.value = prefersReducedMotionMedia()
}

function syncWide() {
  wideEnough.value = wideMql?.matches ?? false
}

function updatePointer(clientX: number, clientY: number) {
  const el = figRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return
  pointer.value = {
    x: clamp((clientX - rect.left) / rect.width, 0, 1),
    y: clamp((clientY - rect.top) / rect.height, 0, 1),
  }
}

function onFigureEnter(e: MouseEvent) {
  if (reducedMotion.value || !wideEnough.value) return
  window.clearTimeout(hideTimer)
  hovered.value = true
  updatePointer(e.clientX, e.clientY)
}

function onFigureMove(e: MouseEvent) {
  if (!hovered.value || reducedMotion.value || !wideEnough.value) return
  updatePointer(e.clientX, e.clientY)
}

function onFigureLeave() {
  hideTimer = window.setTimeout(() => {
    hovered.value = false
  }, 120)
}

function onLensEnter() {
  window.clearTimeout(hideTimer)
}

function onLensLeave() {
  hovered.value = false
}

function resetViewerTransform() {
  viewerScale.value = 1
  viewerPan.value = { x: 0, y: 0 }
  dragging.value = false
}

function openViewer() {
  hovered.value = false
  resetViewerTransform()
  viewerOpen.value = true
}

function closeViewer() {
  viewerOpen.value = false
  resetViewerTransform()
}

function onViewerWheel(e: WheelEvent) {
  if (!viewerOpen.value) return
  e.preventDefault()
  const step = e.deltaY > 0 ? -0.14 : 0.14
  viewerScale.value = clamp(viewerScale.value + step, MIN_VIEWER_SCALE, MAX_VIEWER_SCALE)
}

function onViewerPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  dragging.value = true
  dragAnchor = {
    mx: e.clientX,
    my: e.clientY,
    px: viewerPan.value.x,
    py: viewerPan.value.y,
  }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onViewerPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  viewerPan.value = {
    x: dragAnchor.px + (e.clientX - dragAnchor.mx),
    y: dragAnchor.py + (e.clientY - dragAnchor.my),
  }
}

function onViewerPointerUp(e: PointerEvent) {
  dragging.value = false
  const el = e.currentTarget as HTMLElement
  if (el.hasPointerCapture(e.pointerId)) {
    el.releasePointerCapture(e.pointerId)
  }
}

function onFigureKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openViewer()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeViewer()
}

onMounted(() => {
  syncReducedMotion()
  motionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionMql.addEventListener('change', syncReducedMotion)
  wideMql = window.matchMedia(WIDE_MQ)
  syncWide()
  wideMql.addEventListener('change', syncWide)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.clearTimeout(hideTimer)
  motionMql?.removeEventListener('change', syncReducedMotion)
  wideMql?.removeEventListener('change', syncWide)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <figure
    ref="figRef"
    class="gallery-fig"
    tabindex="0"
    role="button"
    :aria-label="t('projects.galleryOpenFull')"
    @mouseenter="onFigureEnter"
    @mousemove="onFigureMove"
    @mouseleave="onFigureLeave"
    @click="openViewer"
    @keydown="onFigureKeydown"
  >
    <AppImage :src="safeSrc" :alt="alt" ratio="16/10" />
    <span class="gallery-fig-hint">{{ t('projects.galleryOpenFull') }}</span>
  </figure>

  <Teleport to="body">
    <aside
      v-if="showHoverPreview"
      class="gallery-magnifier"
      :aria-label="t('projects.galleryPreviewKicker')"
      @mouseenter="onLensEnter"
      @mouseleave="onLensLeave"
    >
      <p class="gallery-magnifier__kicker">{{ t('projects.galleryPreviewKicker') }}</p>
      <div class="gallery-magnifier__viewport">
        <img
          :src="safeSrc"
          :alt="alt"
          class="gallery-magnifier__img"
          :style="lensImgStyle"
          draggable="false"
        />
      </div>
      <p v-if="alt" class="gallery-magnifier__caption">{{ alt }}</p>
      <p class="gallery-magnifier__note">{{ t('projects.galleryOpenFull') }}</p>
    </aside>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="viewerOpen"
      class="gallery-viewer"
      role="dialog"
      aria-modal="true"
      :aria-label="alt || t('projects.galleryPreviewKicker')"
      @click="closeViewer"
      @wheel="onViewerWheel"
    >
      <div class="gallery-viewer__toolbar" @click.stop>
        <p class="gallery-viewer__hint">{{ t('projects.galleryViewerHint') }}</p>
        <button type="button" class="gallery-viewer__close" @click="closeViewer">
          {{ t('projects.galleryClose') }}
        </button>
      </div>
      <div
        class="gallery-viewer__stage"
        :class="{ 'is-dragging': dragging }"
        @pointerdown="onViewerPointerDown"
        @pointermove="onViewerPointerMove"
        @pointerup="onViewerPointerUp"
        @pointercancel="onViewerPointerUp"
        @click.stop
      >
        <img :src="safeSrc" :alt="alt" :style="viewerImageStyle" draggable="false" />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gallery-fig {
  margin: 0;
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
  cursor: crosshair;
  outline: none;
}

.gallery-fig:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.gallery-fig-hint {
  position: absolute;
  right: 0.55rem;
  bottom: 0.5rem;
  padding: 0.22rem 0.48rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: #f4f1e8;
  background: rgb(12 16 13 / 72%);
  border-radius: var(--radius-sm);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.gallery-fig:hover .gallery-fig-hint,
.gallery-fig:focus-visible .gallery-fig-hint {
  opacity: 1;
}

.gallery-magnifier {
  position: fixed;
  top: 5.5rem;
  right: max(0.85rem, env(safe-area-inset-right, 0px));
  width: min(26rem, 34vw);
  z-index: 50;
  padding: 0.95rem 1.05rem 1.05rem;
  border: 1px solid var(--glass-card-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--glass-card-bg) 94%, var(--color-bg-base));
  box-shadow:
    0 16px 44px rgb(43 40 35 / 12%),
    0 2px 10px rgb(43 40 35 / 6%);
  pointer-events: auto;
  animation: gallery-magnifier-in 0.22s ease both;
}

.gallery-magnifier__kicker {
  margin: 0 0 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.gallery-magnifier__viewport {
  width: 100%;
  aspect-ratio: 16 / 10;
  min-height: 14rem;
  max-height: min(58vh, 34rem);
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-surface);
}

.gallery-magnifier__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: transform;
}

.gallery-magnifier__caption {
  margin: 0.55rem 0 0;
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--color-text);
}

.gallery-magnifier__note {
  margin: 0.35rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.gallery-viewer {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgb(0 0 0 / 0.92);
  animation: gallery-viewer-in 0.22s ease both;
  overflow: hidden;
}

.gallery-viewer__toolbar {
  position: absolute;
  top: max(0.85rem, env(safe-area-inset-top, 0px));
  right: max(0.85rem, env(safe-area-inset-right, 0px));
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.55rem;
  pointer-events: none;
}

.gallery-viewer__hint {
  margin: 0;
  padding: 0.48rem 0.82rem;
  font-family: var(--font-mono);
  font-size: 0.84rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  line-height: 1.45;
  color: var(--color-accent);
  text-align: right;
  background: color-mix(in srgb, var(--color-accent) 10%, rgb(12 16 13 / 68%));
  border: 1px solid color-mix(in srgb, var(--color-accent) 38%, rgb(244 241 232 / 18%));
  border-radius: var(--radius-sm);
  max-width: min(18rem, 42vw);
}

.gallery-viewer__close {
  padding: 0.42rem 0.82rem;
  border: 1px solid color-mix(in srgb, #c44 45%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, #c44 14%, rgb(12 16 13 / 62%));
  color: color-mix(in srgb, #c44 88%, #f4f1e8);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  pointer-events: auto;
}

.gallery-viewer__close:hover {
  border-color: color-mix(in srgb, #c44 68%, transparent);
  background: color-mix(in srgb, #c44 24%, rgb(12 16 13 / 78%));
  color: color-mix(in srgb, #c44 72%, #fff);
}

.gallery-viewer__stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.gallery-viewer__stage.is-dragging {
  cursor: grabbing;
}

.gallery-viewer__stage.is-dragging img {
  transition: none;
}

.gallery-viewer__stage img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transform-origin: center center;
  transition: transform 0.12s ease-out;
  will-change: transform;
  user-select: none;
  -webkit-user-drag: none;
}

@keyframes gallery-magnifier-in {
  from {
    opacity: 0;
    transform: translateX(14px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes gallery-viewer-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gallery-magnifier,
  .gallery-viewer {
    animation: none;
  }

  .gallery-fig-hint {
    transition: none;
    opacity: 1;
  }

  .gallery-viewer__stage img {
    transition: none;
  }
}
</style>
