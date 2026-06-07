<script setup lang="ts">
import gsap from 'gsap'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

import { GSAP_EASE_SMOOTH } from '@/composables/gsap/gsapTokens'
import { useUiStore } from '@/stores/ui'

import '@/styles/cursor-trail.css'

const props = withDefaults(
  defineProps<{
    text?: string
  }>(),
  { text: 'GrunRay' },
)

const ui = useUiStore()
const rootRef = ref<HTMLElement | null>(null)

const chars = computed(() => props.text.split(''))

let moveHandler: ((e: PointerEvent) => void) | null = null
let quickTos: gsap.QuickToFunc[] = []
let rotTos: gsap.QuickToFunc[] = []
let lastX = 0
let lastY = 0

function teardown() {
  if (moveHandler) {
    window.removeEventListener('pointermove', moveHandler)
    moveHandler = null
  }
  const el = rootRef.value
  if (el) {
    gsap.killTweensOf(el.querySelectorAll('.cursor-trail__char'))
  }
  quickTos = []
  rotTos = []
}

function bindTrail() {
  teardown()
  if (!ui.cursorTrailActive) return
  const el = rootRef.value
  if (!el) return
  const arr = Array.from(el.querySelectorAll('.cursor-trail__char')) as HTMLElement[]
  if (!arr.length) return

  quickTos = arr.map((node) =>
    gsap.quickTo(node, 'x', { duration: 0.45, ease: GSAP_EASE_SMOOTH }),
  )
  const yTos = arr.map((node) =>
    gsap.quickTo(node, 'y', { duration: 0.45, ease: GSAP_EASE_SMOOTH }),
  )
  rotTos = arr.map((node) =>
    gsap.quickTo(node, 'rotation', { duration: 0.35, ease: GSAP_EASE_SMOOTH }),
  )

  moveHandler = (e: PointerEvent) => {
    if (!e.isPrimary) return
    const vx = e.clientX - lastX
    const vy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    const tilt = gsap.utils.clamp(-18, 18, vx * 0.8)

    arr.forEach((node, i) => {
      const lag = i * 7
      quickTos[i](e.clientX + lag)
      yTos[i](e.clientY - lag * 0.4)
      rotTos[i](tilt + i * 2)
      gsap.to(node, {
        scale: 1 + Math.min(0.15, Math.hypot(vx, vy) * 0.008),
        duration: 0.2,
        overwrite: 'auto',
      })
    })
  }
  window.addEventListener('pointermove', moveHandler, { passive: true })
}

watch(
  () => ui.cursorTrailActive,
  async (active) => {
    if (!active) {
      teardown()
      return
    }
    await nextTick()
    bindTrail()
  },
  { flush: 'post', immediate: true },
)

watch(rootRef, async () => {
  if (!ui.cursorTrailActive) return
  await nextTick()
  bindTrail()
})

onUnmounted(() => {
  teardown()
})

function charStyle(i: number) {
  return {
    '--i': String(i + 1),
    left: `${i * 0.6}em`,
    filter: `hue-rotate(${i * 12}deg)`,
  } as Record<string, string>
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.cursorTrailActive" class="cursor-trail-layer" aria-hidden="true">
      <div ref="rootRef" class="cursor-trail">
        <span
          v-for="(char, i) in chars"
          :key="i"
          class="cursor-trail__char"
          :style="charStyle(i)"
        >
          {{ char === ' ' ? '\u00a0' : char }}
        </span>
      </div>
    </div>
  </Teleport>
</template>
