<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

import { useFpsMeter } from '@/composables/useFpsMeter'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const ui = useUiStore()
const { fpsMeterEnabled } = storeToRefs(ui)
const { fps, onePercentLow, grade } = useFpsMeter(fpsMeterEnabled)

const fpsText = computed(() => (fps.value > 0 ? String(fps.value) : '—'))
const onePercentText = computed(() =>
  onePercentLow.value == null ? '—' : String(onePercentLow.value),
)

function hideMeter() {
  ui.fpsMeterEnabled = false
}
</script>

<template>
  <button
    type="button"
    class="fps-meter card"
    :class="`fps-meter--${grade}`"
    :title="t('nav.fpsHide')"
    :aria-label="t('nav.fpsLive', { fps: fpsText, p1: onePercentText })"
    @click="hideMeter"
  >
    <span class="fps-meter__k">FPS</span>
    <span class="fps-meter__v">{{ fpsText }}</span>
    <span class="fps-meter__p1">
      <span class="fps-meter__v">{{ onePercentText }}</span><span class="fps-meter__p1-unit">(1%L)</span>
    </span>
  </button>
</template>

<style scoped>
.fps-meter {
  position: fixed;
  right: 1.1rem;
  bottom: 1.1rem;
  z-index: 70;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin: 0;
  padding: 0.38rem 0.62rem;
  border: 1px solid var(--glass-nav-border);
  background: var(--glass-nav-bg);
  backdrop-filter: blur(var(--glass-nav-blur)) saturate(125%);
  -webkit-backdrop-filter: blur(var(--glass-nav-blur)) saturate(125%);
  box-shadow: 0 6px 20px -8px rgb(0 0 0 / 0.28);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.35;
  letter-spacing: 0.02em;
  cursor: pointer;
  user-select: none;
  text-align: left;
}

.fps-meter:hover {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--glass-nav-border));
}

.fps-meter:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}

.fps-meter__k {
  color: var(--color-text-muted);
  font-weight: 500;
}

.fps-meter__v {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.fps-meter__p1 {
  display: inline-flex;
  align-items: baseline;
  gap: 0;
}

.fps-meter__p1-unit {
  color: var(--color-text-muted);
  font-weight: 500;
}

.fps-meter--good .fps-meter__p1 .fps-meter__v {
  color: var(--color-accent);
}

.fps-meter--fair .fps-meter__p1 .fps-meter__v {
  color: var(--color-text);
}

.fps-meter--stutter .fps-meter__p1 .fps-meter__v {
  color: color-mix(in srgb, #b54a3c 72%, var(--color-text));
}

@media (max-width: 480px) {
  .fps-meter {
    right: 0.8rem;
    bottom: 0.8rem;
    padding: 0.36rem 0.5rem;
    min-width: 0;
  }
}
</style>
