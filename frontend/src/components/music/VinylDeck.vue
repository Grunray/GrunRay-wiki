<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

const props = defineProps<{
  playing: boolean
  hasPrev: boolean
  hasNext: boolean
}>()

const emit = defineEmits<{
  toggle: []
  prev: []
  next: []
  'slide-start': [dir: 'prev' | 'next']
}>()

const trackRef = ref<HTMLElement | null>(null)
const isAnimating = ref(false)
const animOffset = ref('0px')
/** 切歌归位后，中央唱片先保持侧碟色调再渐变至全黑 */
const centerDimmed = ref(false)
let pendingDir: 'prev' | 'next' | null = null

const prefersReducedMotion = computed(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

function onArmClick() {
  emit('toggle')
}

async function finishSlide() {
  const dir = pendingDir
  pendingDir = null
  isAnimating.value = false
  if (dir === 'prev') emit('prev')
  else if (dir === 'next') emit('next')
  await nextTick()
  animOffset.value = '0px'
  centerDimmed.value = true
  await nextTick()
  requestAnimationFrame(() => {
    centerDimmed.value = false
  })
}

function runSlide(dir: 'prev' | 'next') {
  emit('slide-start', dir)
  if (prefersReducedMotion.value) {
    if (dir === 'prev') emit('prev')
    else emit('next')
    return
  }
  pendingDir = dir
  isAnimating.value = true
  animOffset.value = dir === 'next' ? 'calc(-1 * var(--slot-width))' : 'var(--slot-width)'
}

function goPrev() {
  if (!props.hasPrev || isAnimating.value) return
  runSlide('prev')
}

function goNext() {
  if (!props.hasNext || isAnimating.value) return
  runSlide('next')
}

function onTrackTransitionEnd(e: TransitionEvent) {
  if (!isAnimating.value || e.propertyName !== 'transform') return
  if (e.target !== trackRef.value) return
  void finishSlide()
}

defineExpose({ goPrev, goNext })
</script>

<template>
  <div class="vinyl-stage" aria-live="polite">
    <button
      type="button"
      class="vinyl-arm-wrap"
      :class="{ 'is-playing': playing }"
      :aria-label="playing ? '暂停' : '播放'"
      :aria-pressed="playing ? 'true' : 'false'"
      @click.stop="onArmClick"
    >
      <svg
        class="vinyl-arm-svg"
        viewBox="0 0 100 130"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="86" cy="17" r="10.5" fill="#f8fafc" />
        <path
          d="M86 27.5 Q54 46 24 102 L20 106"
          stroke="#f8fafc"
          stroke-width="5.5"
          stroke-linecap="round"
          fill="none"
        />
        <rect x="10" y="102" width="20" height="14" rx="2" fill="#f8fafc" />
        <rect x="14" y="116" width="4" height="8" rx="1" fill="#cbd5e1" />
      </svg>
    </button>

    <div class="vinyl-stage__window">
      <div
        ref="trackRef"
        class="vinyl-track"
        :class="{ 'is-animating': isAnimating }"
        :style="{ '--anim-offset': animOffset }"
        @transitionend="onTrackTransitionEnd"
      >
        <div class="vinyl-slot">
          <button
            v-if="hasPrev"
            type="button"
            class="vinyl-disc-btn vinyl-disc-btn--side"
            aria-label="上一首"
            @click.stop="goPrev"
          >
            <div class="vinyl-platter-outer" aria-hidden="true">
              <div class="vinyl-record vinyl-record--side">
                <div class="vinyl-grooves" />
                <div class="vinyl-label-sparkle">
                  <div class="vinyl-diamond-inner" />
                </div>
              </div>
            </div>
          </button>
          <div v-else class="vinyl-slot__spacer" aria-hidden="true" />
        </div>

        <div class="vinyl-slot vinyl-slot--current" :class="{ 'is-peek-tone': centerDimmed }">
          <div class="vinyl-platter-outer" aria-hidden="true">
            <div
              class="vinyl-record"
              :class="{
                'is-playing': playing,
                'vinyl-record--side': centerDimmed,
              }"
            >
              <div class="vinyl-grooves" />
              <div class="vinyl-label-sparkle">
                <div class="vinyl-diamond-inner" />
              </div>
            </div>
          </div>
        </div>

        <div class="vinyl-slot">
          <button
            v-if="hasNext"
            type="button"
            class="vinyl-disc-btn vinyl-disc-btn--side"
            aria-label="下一首"
            @click.stop="goNext"
          >
            <div class="vinyl-platter-outer" aria-hidden="true">
              <div class="vinyl-record vinyl-record--side">
                <div class="vinyl-grooves" />
                <div class="vinyl-label-sparkle">
                  <div class="vinyl-diamond-inner" />
                </div>
              </div>
            </div>
          </button>
          <div v-else class="vinyl-slot__spacer" aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vinyl-stage {
  --vinyl-platter: #3d2a14;
  --vs: 1.72;
  --disc-size: calc(2.65rem * var(--vs));
  --slot-width: calc(4.65rem * var(--vs));
  --arm-height: calc(2.35rem * var(--vs));
  position: relative;
  width: min(15rem, 90%);
  margin-inline: auto;
  min-height: calc(var(--disc-size) + var(--arm-height) * 0.55 + 1.1rem);
  padding: calc(var(--arm-height) * 0.48) 0 0.45rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-card-border);
  background: linear-gradient(
    165deg,
    var(--color-bg-surface) 0%,
    var(--color-bg-elevated) 55%,
    var(--color-reading-bg) 100%
  );
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.vinyl-stage__window {
  width: 100%;
  overflow: hidden;
}

.vinyl-track {
  --anim-offset: 0px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  width: calc(var(--slot-width) * 3);
  margin-left: calc(50% - var(--slot-width) * 1.5);
  transform: translateX(var(--anim-offset));
  will-change: transform;
}

.vinyl-track.is-animating {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.vinyl-slot {
  flex: 0 0 var(--slot-width);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: var(--disc-size);
}

.vinyl-slot__spacer {
  width: var(--disc-size);
  height: var(--disc-size);
  flex-shrink: 0;
  pointer-events: none;
}

.vinyl-disc-btn {
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  line-height: 0;
}

.vinyl-disc-btn--side {
  position: relative;
  opacity: 0.82;
  transition:
    opacity 0.2s ease,
    filter 0.2s ease,
    transform 0.2s ease;
}

.vinyl-disc-btn--side::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: calc(-5px * var(--vs));
  width: calc(var(--disc-size) * 0.72);
  height: calc(8px * var(--vs));
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse, rgb(0 0 0 / 0.34) 0%, transparent 72%);
  filter: blur(calc(2px * var(--vs)));
  pointer-events: none;
}

.vinyl-disc-btn--side::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

.vinyl-slot:first-child .vinyl-disc-btn--side::after {
  box-shadow:
    inset calc(10px * var(--vs)) 0 calc(14px * var(--vs)) rgb(0 0 0 / 0.42),
    inset 0 0 calc(18px * var(--vs)) rgb(0 0 0 / 0.18);
}

.vinyl-slot:last-child .vinyl-disc-btn--side::after {
  box-shadow:
    inset calc(-10px * var(--vs)) 0 calc(14px * var(--vs)) rgb(0 0 0 / 0.42),
    inset 0 0 calc(18px * var(--vs)) rgb(0 0 0 / 0.18);
}

.vinyl-disc-btn--side .vinyl-platter-outer {
  box-shadow:
    0 calc(5px * var(--vs)) calc(12px * var(--vs)) rgb(0 0 0 / 0.4),
    0 calc(2px * var(--vs)) calc(5px * var(--vs)) rgb(0 0 0 / 0.26),
    inset 0 1px calc(3px * var(--vs)) rgb(255 255 255 / 0.05);
}

.vinyl-slot:first-child .vinyl-disc-btn--side .vinyl-platter-outer {
  box-shadow:
    calc(3px * var(--vs)) calc(5px * var(--vs)) calc(12px * var(--vs)) rgb(0 0 0 / 0.44),
    calc(1px * var(--vs)) calc(2px * var(--vs)) calc(5px * var(--vs)) rgb(0 0 0 / 0.28),
    inset 0 1px calc(3px * var(--vs)) rgb(255 255 255 / 0.05);
}

.vinyl-slot:last-child .vinyl-disc-btn--side .vinyl-platter-outer {
  box-shadow:
    calc(-3px * var(--vs)) calc(5px * var(--vs)) calc(12px * var(--vs)) rgb(0 0 0 / 0.44),
    calc(-1px * var(--vs)) calc(2px * var(--vs)) calc(5px * var(--vs)) rgb(0 0 0 / 0.28),
    inset 0 1px calc(3px * var(--vs)) rgb(255 255 255 / 0.05);
}

.vinyl-disc-btn--side:hover {
  opacity: 1;
  filter: brightness(1.06);
  transform: translateY(calc(-1px * var(--vs)));
}

.vinyl-disc-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

.vinyl-platter-outer {
  width: var(--disc-size);
  height: var(--disc-size);
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 40%,
    #5a3d1a 0%,
    var(--vinyl-platter) 55%,
    #1a1108 100%
  );
  box-shadow:
    0 calc(4px * var(--vs)) calc(10px * var(--vs)) rgb(0 0 0 / 0.35),
    inset 0 1px calc(3px * var(--vs)) rgb(255 255 255 / 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: box-shadow 0.48s cubic-bezier(0.4, 0, 0.2, 1);
}

.vinyl-slot--current.is-peek-tone .vinyl-platter-outer {
  box-shadow:
    0 calc(5px * var(--vs)) calc(12px * var(--vs)) rgb(0 0 0 / 0.4),
    0 calc(2px * var(--vs)) calc(5px * var(--vs)) rgb(0 0 0 / 0.26),
    inset 0 1px calc(3px * var(--vs)) rgb(255 255 255 / 0.05);
}

.vinyl-record {
  width: calc(2.45rem * var(--vs));
  height: calc(2.45rem * var(--vs));
  border-radius: 50%;
  background: radial-gradient(circle, #151515 0%, #0a0a0a 55%, #050505 100%);
  box-shadow:
    inset 0 0 0 2px rgb(255 255 255 / 0.04),
    0 0 0 1px rgb(0 0 0 / 0.6);
  position: relative;
  animation: vinyl-spin 2.9s linear infinite paused;
  transition:
    filter 0.48s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.48s cubic-bezier(0.4, 0, 0.2, 1);
}

.vinyl-record--side {
  animation: none;
  filter: saturate(0.92) brightness(0.93);
  box-shadow:
    inset 0 0 0 2px rgb(255 255 255 / 0.03),
    0 0 0 1px rgb(0 0 0 / 0.62),
    0 calc(2px * var(--vs)) calc(6px * var(--vs)) rgb(0 0 0 / 0.35);
}

.vinyl-slot--current .vinyl-record.is-playing {
  animation-play-state: running;
}

@keyframes vinyl-spin {
  to {
    transform: rotate(360deg);
  }
}

.vinyl-grooves {
  position: absolute;
  inset: calc(3px * var(--vs));
  border-radius: 50%;
  pointer-events: none;
  background: repeating-radial-gradient(
    circle at 50% 50%,
    transparent 0 2px,
    rgb(255 255 255 / 0.045) 2px 3px
  );
  mask: radial-gradient(circle, transparent 26%, #000 27%);
  -webkit-mask: radial-gradient(circle, transparent 26%, #000 27%);
}

.vinyl-label-sparkle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(0.72rem * var(--vs));
  height: calc(0.72rem * var(--vs));
  margin: calc(-0.36rem * var(--vs)) 0 0 calc(-0.36rem * var(--vs));
  border-radius: 50%;
  overflow: hidden;
  background:
    radial-gradient(circle at 30% 25%, rgb(255 255 255 / 0.98) 0%, transparent 28%),
    conic-gradient(from 40deg, #f1f5f9, #cbd5e1, #f8fafc, #94a3b8, #e2e8f0, #f1f5f9);
  box-shadow: inset 0 1px 2px rgb(255 255 255 / 0.95), 0 0 0 1px rgb(255 255 255 / 0.42);
}

.vinyl-diamond-inner {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(0.32rem * var(--vs));
  height: calc(0.32rem * var(--vs));
  transform: translate(-50%, -50%) rotate(45deg);
  background: linear-gradient(145deg, rgb(255 255 255 / 0.98) 0%, rgb(148 163 184 / 0.88) 100%);
  border: 1px solid rgb(255 255 255 / 0.55);
}

.vinyl-arm-wrap {
  position: absolute;
  z-index: 5;
  top: calc(var(--arm-height) * 0.02);
  left: 50%;
  margin-left: calc(var(--disc-size) * 0.08);
  width: calc(1.85rem * var(--vs));
  height: var(--arm-height);
  padding: 0;
  border: none;
  background: transparent;
  transform-origin: 82% 13%;
  transform: rotate(-40deg);
  transition: transform 0.88s cubic-bezier(0.33, 1.15, 0.52, 1);
  filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.35));
  cursor: pointer;
}

.vinyl-arm-wrap.is-playing {
  transform: rotate(6deg);
}

.vinyl-arm-wrap:hover {
  filter: drop-shadow(0 2px 6px rgb(0 0 0 / 0.45)) brightness(1.06);
}

.vinyl-arm-wrap:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

.vinyl-arm-svg {
  display: block;
  width: 100%;
  height: auto;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .vinyl-record,
  .vinyl-arm-wrap,
  .vinyl-track.is-animating {
    animation: none !important;
    transition: none !important;
  }
}
</style>
