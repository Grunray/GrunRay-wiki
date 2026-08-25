<!--
  浅色 / 深色 / 隐藏配色（解锁后三档轮换）；扩散层 Teleport 到 body（z-index:0）。
-->
<template>
  <button
    ref="anchorRef"
    type="button"
    class="theme-nav-btn"
    :class="{
      'theme-nav-btn--light': ui.theme === 'light',
      'theme-nav-btn--dark': ui.theme === 'dark',
      'theme-nav-btn--abstract': ui.theme === 'abstract',
    }"
    :aria-label="themeHoverTitle"
    :data-nav-tip="themeHoverTitle"
    @click="toggle($event)"
    @keydown.enter.prevent="toggle()"
    @keydown.space.prevent="toggle()"
  >
    <span class="theme-nav-btn-icon" aria-hidden="true">
      <ThemeNavIcon :theme="ui.theme" />
    </span>
    <span class="nav-pill-grow-line" aria-hidden="true" />
  </button>

  <Teleport to="body">
    <div v-if="ripple.show" class="theme-toggle-ripple-root" aria-hidden="true">
      <div :key="ripple.key" class="theme-toggle-ripple-disk" :style="diskStyle" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ThemeNavIcon from '@/components/icons/ThemeNavIcon.vue'
import { useUiStore } from '@/stores/ui'
import { DARK_MODE_PAGE_BACKGROUND, LIGHT_MODE_PAGE_BACKGROUND } from '@/theme/pageBackgrounds'

const { t } = useI18n()
const ui = useUiStore()

const themeHoverTitle = computed(() => {
  if (ui.theme === 'abstract') return t('ui.themeTitleAbstract')
  if (ui.theme === 'dark') {
    return ui.abstractThemeUnlocked
      ? t('ui.themeTitleDarkUnlocked')
      : t('ui.themeTitleDark')
  }
  return t('ui.themeTitleLight')
})

const anchorRef = ref<HTMLElement | null>(null)

const ripple = reactive({
  show: false,
  key: 0,
  x: 0,
  y: 0,
  surface: 'light' as 'light' | 'dark',
})

const diskStyle = computed(() => ({
  '--ripple-x': `${ripple.x}px`,
  '--ripple-y': `${ripple.y}px`,
  background:
    ripple.surface === 'light' ? LIGHT_MODE_PAGE_BACKGROUND : DARK_MODE_PAGE_BACKGROUND,
}))

let rippleClearTimer: ReturnType<typeof setTimeout> | null = null

function playRippleFromAnchor(ev?: MouseEvent) {
  if (ui.prefersReducedMotion) return
  const el = anchorRef.value
  if (!el) return

  if (ev instanceof MouseEvent) {
    ripple.x = ev.clientX
    ripple.y = ev.clientY
  } else {
    const r = el.getBoundingClientRect()
    ripple.x = r.left + r.width / 2
    ripple.y = r.top + r.height / 2
  }
  ripple.surface = ui.theme === 'light' ? 'light' : 'dark'
  ripple.key += 1
  ripple.show = true

  if (rippleClearTimer) clearTimeout(rippleClearTimer)
  rippleClearTimer = setTimeout(() => {
    ripple.show = false
    rippleClearTimer = null
  }, 620)
}

watch(
  () => ui.prefersReducedMotion,
  (reduce) => {
    if (reduce) {
      ripple.show = false
      if (rippleClearTimer) {
        clearTimeout(rippleClearTimer)
        rippleClearTimer = null
      }
    }
  },
)

function toggle(ev?: MouseEvent) {
  ui.cycleTheme()
  playRippleFromAnchor(ev instanceof MouseEvent ? ev : undefined)
}
</script>

<!--
  扩散层在 #app 之下（z-index:0），透过透明 #app 与留白区可见，卡片/正文始终在上层。
-->
<style lang="css">
.theme-toggle-ripple-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.theme-toggle-ripple-disk {
  position: fixed;
  left: var(--ripple-x, 50%);
  top: var(--ripple-y, 50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  will-change: width, height, opacity, filter;
  animation: theme-toggle-ripple-pulse 0.55s ease-out forwards;
}

@keyframes theme-toggle-ripple-pulse {
  0% {
    width: 0;
    height: 0;
    opacity: 0;
    filter: brightness(1);
  }
  10% {
    opacity: 0.92;
    filter: brightness(1.14);
  }
  35% {
    opacity: 0.88;
    filter: brightness(1.08);
  }
  70% {
    opacity: 0.45;
    filter: brightness(1.02);
  }
  100% {
    width: 250vmax;
    height: 250vmax;
    opacity: 0;
    filter: brightness(1);
  }
}
</style>
