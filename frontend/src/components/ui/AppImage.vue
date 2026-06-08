<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'

/**
 * 图片懒加载 + GSAP 加载动画。针对服务器慢、图片加载慢的场景：
 * - 加载中：液态玻璃绿色占位 + GSAP 扫光(shimmer) + 脉冲点(dots)
 * - 加载完成（且占位至少展示 minLoaderMs，防极快加载闪烁）：GSAP 淡入图片
 * - 加载失败：停动画、降级显示
 * 只用 opacity 做淡入，不碰 transform —— 兼容外层对 <img> 的视差/object-fit 等全局样式。
 * 尊重 prefers-reduced-motion。
 */
const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    /** 占位最小展示时长(ms)，避免极快加载时 loader 闪烁，慢网下完整呈现 */
    minLoaderMs?: number
    /** 首屏大图用 eager，列表/折叠区用默认 lazy */
    eager?: boolean
  }>(),
  { alt: '', minLoaderMs: 600, eager: false },
)

const rootRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const phRef = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'loaded' | 'error'>('loading')

let ctx: ReturnType<typeof gsap.context> | undefined
let mountedAt = 0
let revealed = false
let reduced = false

function reveal() {
  if (revealed) return
  revealed = true
  const img = imgRef.value
  const ph = phRef.value
  if (reduced || !img) {
    if (img) gsap.set(img, { autoAlpha: 1 })
    status.value = 'loaded'
    return
  }
  const tl = gsap.timeline({ onComplete: () => { status.value = 'loaded' } })
  if (ph) tl.to(ph, { autoAlpha: 0, duration: 0.45, ease: 'power2.out' }, 0)
  tl.fromTo(img, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, 0)
}

function onLoad() {
  const elapsed = mountedAt ? performance.now() - mountedAt : props.minLoaderMs
  window.setTimeout(reveal, Math.max(0, props.minLoaderMs - elapsed))
}

function onError() {
  if (revealed) return
  status.value = 'error'
  ctx?.revert()
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  mountedAt = performance.now()
  const root = rootRef.value
  if (!root) return
  ctx = gsap.context(() => {
    if (!reduced) {
      gsap.fromTo(
        '.app-image__shimmer',
        { xPercent: -130 },
        { xPercent: 130, duration: 1.25, ease: 'power1.inOut', repeat: -1 },
      )
      gsap.to('.app-image__dots i', {
        scale: 1.35,
        opacity: 1,
        duration: 0.62,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.15, from: 'start' },
      })
    }
  }, root)

  // 已缓存（complete）直接进入 reveal 流程
  if (imgRef.value?.complete && imgRef.value.naturalWidth > 0) {
    onLoad()
  }
})

onUnmounted(() => ctx?.revert())
</script>

<template>
  <div ref="rootRef" class="app-image" :class="`app-image--${status}`">
    <img
      ref="imgRef"
      class="app-image__img"
      :src="src"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      @load="onLoad"
      @error="onError"
    />
    <div v-if="status !== 'loaded'" ref="phRef" class="app-image__ph" aria-hidden="true">
      <span class="app-image__shimmer" />
      <span class="app-image__dots"><i /><i /><i /></span>
    </div>
  </div>
</template>

<style scoped>
.app-image {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-image__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0; /* 由 GSAP 淡入；reduced-motion / error 下置 1 */
}

.app-image--error .app-image__img {
  opacity: 1;
}

.app-image__ph {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-accent) 18%, var(--color-bg-surface)) 0%,
    color-mix(in srgb, var(--color-accent) 7%, var(--color-bg-elevated)) 100%
  );
}

.app-image--error .app-image__ph {
  display: none;
}

.app-image__shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 38%,
    color-mix(in srgb, #fff 40%, transparent) 50%,
    transparent 62%
  );
  pointer-events: none;
}

.app-image__dots {
  position: relative;
  display: inline-flex;
  gap: 0.42rem;
}

.app-image__dots i {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-accent) 85%, #19d3ff);
  opacity: 0.45;
  box-shadow: 0 0 8px color-mix(in srgb, var(--color-accent) 55%, transparent);
}
</style>
