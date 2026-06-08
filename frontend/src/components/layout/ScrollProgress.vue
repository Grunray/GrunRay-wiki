<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'

/**
 * 顶部滚动进度条：液态玻璃绿渐变细线，scaleX 随页面滚动 0→1。
 * 实时计算（每帧用当前页面高度），并减去底部 footer 揭开预留区，
 * 使「滚到内容底」即为 100%——避免：
 *   1) footer 预留滚动区把总长算大，导致到内容底还不满；
 *   2) 异步内容（如博客正文）加载后总高变化、ScrollTrigger 不刷新导致提前满。
 * GSAP quickTo 平滑跟随。
 */
const barRef = ref<HTMLElement | null>(null)
let setScaleX: ((value: number) => void) | null = null
let rafId = 0

function computeProgress(): number {
  const root = document.documentElement
  const reveal = parseFloat(getComputedStyle(root).getPropertyValue('--footer-reveal-space')) || 0
  const max = root.scrollHeight - window.innerHeight - reveal
  if (max <= 0) return 0
  return Math.min(1, Math.max(0, window.scrollY / max))
}

function update() {
  rafId = 0
  setScaleX?.(computeProgress())
}

function requestUpdate() {
  if (rafId) return
  rafId = requestAnimationFrame(update)
}

onMounted(() => {
  if (!barRef.value) return
  setScaleX = gsap.quickTo(barRef.value, 'scaleX', { duration: 0.3, ease: 'power3.out' })
  update()
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate, { passive: true })
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('scroll', requestUpdate)
  window.removeEventListener('resize', requestUpdate)
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
