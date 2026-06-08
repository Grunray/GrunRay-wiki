<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import 'gsap/ScrollTrigger'

/**
 * 顶部滚动进度条：液态玻璃绿渐变细线，scaleX 随页面滚动 0→1。
 * 用 ScrollTrigger scrub 平滑跟随；gsap.context 统一在卸载时 revert（含 ScrollTrigger）。
 */
const barRef = ref<HTMLElement | null>(null)
let ctx: ReturnType<typeof gsap.context> | undefined

onMounted(() => {
  if (!barRef.value) return
  ctx = gsap.context(() => {
    gsap.fromTo(
      barRef.value,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        transformOrigin: 'left center',
        scrollTrigger: {
          start: 0,
          end: 'max',
          scrub: 0.3,
        },
      },
    )
  })
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div class="scroll-progress" aria-hidden="true">
    <span ref="barRef" class="scroll-progress__bar" />
  </div>
</template>

<style scoped>
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 65;
  pointer-events: none;
}

.scroll-progress__bar {
  display: block;
  height: 100%;
  width: 100%;
  transform: scaleX(0);
  transform-origin: left center;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-accent) 70%, transparent),
    var(--color-accent) 52%,
    color-mix(in srgb, var(--color-accent) 80%, #19d3ff)
  );
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-accent) 55%, transparent);
}
</style>
