<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  progress: number
  kicker: string
  title: string
  label: string
}>()

const p = computed(() => Math.min(1, Math.max(0, props.progress)))
const interactive = computed(() => p.value > 0.72)
const railStyle = computed(
  () =>
    ({
      '--rail-p': String(p.value),
      visibility: p.value < 0.02 ? 'hidden' : 'visible',
    }) as Record<string, string>,
)
</script>

<template>
  <Teleport defer to="#detail-scroll-rail-host">
    <aside
      class="detail-scroll-rail"
      :style="railStyle"
      :aria-hidden="p < 0.08"
      :aria-label="label"
    >
      <span class="detail-scroll-rail__spine" aria-hidden="true" />
      <div class="detail-scroll-rail__card" :class="{ 'is-interactive': interactive }">
        <p class="detail-scroll-rail__kicker">{{ kicker }}</p>
        <h2 class="detail-scroll-rail__title">{{ title }}</h2>
        <div class="detail-scroll-rail__body">
          <slot />
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<style scoped>
.detail-scroll-rail {
  --rail-width: 14.5rem;
  position: fixed;
  top: 5.85rem;
  /* 视口左侧悬浮，不占用 app-main 文档流 */
  left: max(0.85rem, env(safe-area-inset-left, 0px));
  width: var(--rail-width);
  z-index: 40;
  pointer-events: none;
  opacity: var(--rail-p, 0);
  transform: translate3d(
    calc((1 - var(--rail-p, 0)) * -16px),
    calc((1 - var(--rail-p, 0)) * 10px),
    0
  );
  will-change: opacity, transform;
}

.detail-scroll-rail__spine {
  position: absolute;
  left: 0;
  top: 0.85rem;
  bottom: 0.85rem;
  width: 2px;
  border-radius: 1px;
  background: var(--color-accent);
  opacity: 0.85;
  transform: scaleY(var(--rail-p, 0));
  transform-origin: top center;
  pointer-events: none;
}

.detail-scroll-rail__card {
  margin-left: 0.55rem;
  max-height: calc(100vh - 11rem);
  overflow: auto;
  padding: 0.9rem 1rem 1rem;
  border: 1px solid var(--glass-card-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--glass-card-bg) 94%, var(--color-bg-base));
  box-shadow:
    0 14px 40px rgb(43 40 35 / 11%),
    0 2px 8px rgb(43 40 35 / 6%);
}

.detail-scroll-rail__card.is-interactive {
  pointer-events: auto;
}

.detail-scroll-rail__kicker {
  margin: 0 0 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.detail-scroll-rail__title {
  margin: 0 0 0.55rem;
  font-family: var(--font-serif);
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.4;
}

.detail-scroll-rail__body :deep(.summary) {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--color-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-scroll-rail__body :deep(.tags) {
  margin: 0.65rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.detail-scroll-rail__body :deep(.meta) {
  display: grid;
  grid-template-columns: 4.2rem 1fr;
  gap: 0.25rem 0.65rem;
  margin: 0.7rem 0 0;
  padding: 0.55rem 0 0;
  border-top: 1px solid var(--color-border);
  font-size: 0.8rem;
}

.detail-scroll-rail__body :deep(.meta dt) {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.detail-scroll-rail__body :deep(.meta dd) {
  margin: 0;
}

.detail-scroll-rail__body :deep(.note),
.detail-scroll-rail__body :deep(.actions) {
  margin: 0.65rem 0 0;
  font-size: 0.82rem;
}

.detail-scroll-rail__body :deep(.actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.detail-scroll-rail__body :deep(.actions a) {
  display: inline-flex;
  align-items: center;
  min-height: 1.85rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 36%, var(--color-border));
  color: var(--color-accent);
  font-size: 0.8rem;
  text-decoration: none;
}

.detail-scroll-rail__body :deep(.actions a:hover) {
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-bg-surface));
  text-decoration: none;
}

.detail-scroll-rail__body :deep(a) {
  color: var(--color-accent);
  text-decoration: none;
}

.detail-scroll-rail__body :deep(a:hover) {
  text-decoration: underline;
}

@media (min-width: 1600px) {
  .detail-scroll-rail {
    left: max(
      0.85rem,
      calc((100vw - var(--app-main-max, 960px)) / 2 - var(--rail-width) - 1rem)
    );
  }
}

@media (max-width: 1279px) {
  .detail-scroll-rail {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-scroll-rail {
    transform: none;
    transition: opacity 0.2s ease;
  }

  .detail-scroll-rail__spine {
    transform: scaleY(1);
  }
}
</style>
