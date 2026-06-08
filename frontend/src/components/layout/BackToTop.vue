<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useI18n } from 'vue-i18n'

import { useUiStore } from '@/stores/ui'

/**
 * 回到顶部浮钮：滚动超过 320px 时以 back.out 弹性出现，收起时缩回；点击平滑滚回顶部。
 * 放左下角，避开右下角的浮动音乐播放器。尊重 reduced-motion。
 */
const { t } = useI18n()
const ui = useUiStore()

const btnRef = ref<HTMLElement | null>(null)
const visible = ref(false)
let ctx: ReturnType<typeof gsap.context> | undefined

watch(visible, (v) => {
  const el = btnRef.value
  if (!el) return
  if (ui.prefersReducedMotion) {
    gsap.set(el, { autoAlpha: v ? 1 : 0, scale: 1, y: 0 })
    return
  }
  gsap.to(el, {
    autoAlpha: v ? 1 : 0,
    scale: v ? 1 : 0.6,
    y: v ? 0 : 14,
    duration: v ? 0.5 : 0.32,
    ease: v ? 'back.out(1.7)' : 'power2.in',
  })
})

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: ui.prefersReducedMotion ? 'auto' : 'smooth' })
}

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.set(btnRef.value, { autoAlpha: 0, scale: 0.6, y: 14 })
    ScrollTrigger.create({
      start: 320,
      end: 'max',
      onToggle: (self) => {
        visible.value = self.isActive
      },
    })
  })
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <button
    ref="btnRef"
    type="button"
    class="back-to-top"
    :title="t('nav.backToTop')"
    :aria-label="t('nav.backToTop')"
    @click="scrollToTop"
  >
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
      <path d="M12 19V7M6 13l6-6 6 6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  left: 1.1rem;
  bottom: 1.1rem;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border-radius: 999px;
  border: 1px solid var(--glass-nav-border);
  background: var(--glass-nav-bg);
  backdrop-filter: blur(var(--glass-nav-blur)) saturate(125%);
  -webkit-backdrop-filter: blur(var(--glass-nav-blur)) saturate(125%);
  color: var(--color-accent);
  cursor: pointer;
  visibility: hidden;
  box-shadow: 0 6px 20px -8px rgb(0 0 0 / 0.28);
  /* 显隐由 GSAP 接管 transform/opacity；这里只过渡发光相关属性，避免与 GSAP transform 冲突 */
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
}

.back-to-top:hover {
  color: var(--color-text);
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--glass-nav-border));
  background: color-mix(in srgb, var(--color-accent) 14%, var(--glass-nav-bg));
  box-shadow:
    0 8px 24px -8px rgb(0 0 0 / 0.3),
    0 0 14px color-mix(in srgb, var(--color-accent) 40%, transparent);
}

.back-to-top:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}

@media (max-width: 480px) {
  .back-to-top {
    left: 0.8rem;
    bottom: 0.8rem;
    width: 2.6rem;
    height: 2.6rem;
  }
}
</style>
