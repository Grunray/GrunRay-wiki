<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import CardCornerVine from './CardCornerVine.vue'

/** 首次 hover / focus 再挂载 SVG，避免长列表静止时重复 39 条 path */
const active = ref(false)
const anchor = ref<HTMLElement | null>(null)
let card: HTMLElement | null = null
let armRaf = 0

function armGrow() {
  if (!card) return
  /* 强制一次布局，确保未绘制态已上屏，再开 hover 生长过渡 */
  void card.offsetWidth
  card.classList.add('card-hover-g--vine-ready')
}

function activate() {
  if (active.value) return
  active.value = true
  void nextTick(() => {
    armRaf = requestAnimationFrame(() => {
      armRaf = requestAnimationFrame(armGrow)
    })
  })
}

onMounted(() => {
  card = (anchor.value?.closest('.card-hover-g') as HTMLElement | null) ?? null
  if (!card) return
  card.addEventListener('mouseenter', activate, { once: true })
  card.addEventListener('focusin', activate, { once: true })
})

onBeforeUnmount(() => {
  if (armRaf) cancelAnimationFrame(armRaf)
  if (!card) return
  card.classList.remove('card-hover-g--vine-ready')
  card.removeEventListener('mouseenter', activate)
  card.removeEventListener('focusin', activate)
})
</script>

<template>
  <span ref="anchor" class="card-corner-vine-lazy-anchor" aria-hidden="true" />
  <CardCornerVine v-if="active" />
</template>

<style scoped>
.card-corner-vine-lazy-anchor {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
</style>
