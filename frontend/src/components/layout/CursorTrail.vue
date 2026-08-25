<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { useMoonlitCursor } from '@/composables/useMoonlitCursor'
import { useUiStore } from '@/stores/ui'

import '@/styles/cursor-trail.css'

const ui = useUiStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const pointerFine = ref(false)

let pointerMq: MediaQueryList | null = null

function syncPointerFine() {
  pointerFine.value = pointerMq?.matches ?? window.matchMedia('(pointer: fine)').matches
}

const enabled = computed(() => ui.cursorTrailActive && pointerFine.value)

useMoonlitCursor(canvasRef, enabled)

onMounted(() => {
  pointerMq = window.matchMedia('(pointer: fine)')
  syncPointerFine()
  pointerMq.addEventListener('change', syncPointerFine)
})

onUnmounted(() => {
  pointerMq?.removeEventListener('change', syncPointerFine)
  pointerMq = null
})
</script>

<template>
  <Teleport to="body">
    <canvas
      v-if="enabled"
      ref="canvasRef"
      class="cursor-trail-canvas"
      aria-hidden="true"
    />
  </Teleport>
</template>
