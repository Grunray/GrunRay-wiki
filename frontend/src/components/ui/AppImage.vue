<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'

import SnailNavIcon from '@/components/icons/SnailNavIcon.vue'

/**
 * 图片懒加载 + GSAP 蜗牛爬行加载动画。针对服务器慢、图片加载慢的场景：
 * - 加载中：液态玻璃绿色占位 + 蜗牛(SnailNavIcon)沿地面/黏液线缓缓爬行
 * - 加载完成（占位至少展示 minLoaderMs 防闪）：GSAP 淡入
 * - 加载失败：若提供 fallbackSrc 则回退到兜底图（避免破图/404）；否则降级
 * - 只用 opacity 淡入以兼容外层视差/object-fit 等样式；尊重 reduced-motion
 */
const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    minLoaderMs?: number
    eager?: boolean
    /** 主图加载失败时回退的兜底图（如本地 public 图） */
    fallbackSrc?: string
    /** 宽高比（如 '16/10'）：用于自适应高度容器，给占位/图一个稳定高度，避免塌陷或滚动抖动 */
    ratio?: string
  }>(),
  { alt: '', minLoaderMs: 600, eager: false, fallbackSrc: '', ratio: '' },
)

const rootRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const phRef = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'loaded' | 'error'>('loading')
/** 实际加载的 src：主图失败时切到 fallbackSrc */
const currentSrc = ref(props.src)

let ctx: ReturnType<typeof gsap.context> | undefined
let mountedAt = 0
let revealed = false
let reduced = false
let triedFallback = false

watch(
  () => props.src,
  (v) => {
    currentSrc.value = v
    triedFallback = false
  },
)

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
  // 主图失败 → 回退兜底图（仅尝试一次），避免破图/404
  if (props.fallbackSrc && !triedFallback && currentSrc.value !== props.fallbackSrc) {
    triedFallback = true
    currentSrc.value = props.fallbackSrc
    return
  }
  status.value = 'error'
  ctx?.revert()
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  mountedAt = performance.now()
  const root = rootRef.value
  if (!root) return
  ctx = gsap.context(() => {
    if (reduced) return
    const lane = root.querySelector('.app-image__snail-lane') as HTMLElement | null
    const snail = root.querySelector('.app-image__snail') as HTMLElement | null
    if (!snail) return
    // 蜗牛从左边界外缓缓爬到右边界外并循环（lane overflow:hidden，进出界不可见，无跳变感）
    gsap.fromTo(
      snail,
      { x: () => -(snail.offsetWidth || 40) },
      { x: () => lane?.offsetWidth ?? 180, duration: 3.8, ease: 'none', repeat: -1 },
    )
    // 爬行起伏
    gsap.to(snail, { y: -3, duration: 0.52, ease: 'sine.inOut', repeat: -1, yoyo: true })
  }, root)

  if (imgRef.value?.complete && imgRef.value.naturalWidth > 0) {
    onLoad()
  }
})

onUnmounted(() => ctx?.revert())
</script>

<template>
  <div
    ref="rootRef"
    class="app-image"
    :class="`app-image--${status}`"
    :style="ratio ? { aspectRatio: ratio, height: 'auto' } : undefined"
  >
    <img
      ref="imgRef"
      class="app-image__img"
      :src="currentSrc"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      @load="onLoad"
      @error="onError"
    />
    <div v-if="status !== 'loaded'" ref="phRef" class="app-image__ph" aria-hidden="true">
      <div class="app-image__snail-lane">
        <SnailNavIcon class="app-image__snail" :style="{ width: '2.4rem', height: '2.4rem' }" />
      </div>
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
  max-height: 100%;
  object-fit: cover;
  opacity: 0;
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

.app-image__snail-lane {
  position: relative;
  width: min(64%, 12rem);
  height: 3rem;
  overflow: hidden;
}

/* 地面 / 黏液痕迹线 */
.app-image__snail-lane::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.5rem;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--color-accent) 42%, transparent) 25%,
    color-mix(in srgb, var(--color-accent) 42%, transparent) 75%,
    transparent
  );
}

.app-image__snail {
  position: absolute;
  left: 0;
  bottom: 0.35rem;
  color: color-mix(in srgb, var(--color-accent) 88%, #19d3ff);
  filter: drop-shadow(0 1px 5px color-mix(in srgb, var(--color-accent) 45%, transparent));
  will-change: transform;
}
</style>
