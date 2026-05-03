<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useNavScrollCompact } from '@/composables/useNavScrollCompact'
import { persistLocale } from '@/i18n'

import MusicNavIcon from '@/components/icons/MusicNavIcon.vue'
import SnailNavIcon from '@/components/icons/SnailNavIcon.vue'
import TrailNavIcon from '@/components/icons/TrailNavIcon.vue'

import CursorTrail from './CursorTrail.vue'
import SiteNav from './SiteNav.vue'
import ThemeDayNightToggle from './ThemeDayNightToggle.vue'

import { useUiStore } from '@/stores/ui'

const { t, locale } = useI18n()
const ui = useUiStore()
const { musicPlayerMinimized, musicPlayerPlaying } = storeToRefs(ui)
const { compact: navCompact } = useNavScrollCompact()

const musicNavPlayingAnimated = computed(
  () => musicPlayerMinimized.value && musicPlayerPlaying.value && !ui.prefersReducedMotion,
)

function onMusicNavClick() {
  if (musicPlayerMinimized.value) {
    ui.expandMusicPlayer()
  } else {
    ui.setMusicPlayerMinimized(true)
  }
}

function onSplashNavClick() {
  ui.requestSplashWoniuReplay()
}
const route = useRoute()
const appMainClasses = computed(() => ({
  'app-main--full-viewport': route.meta.appMainLayout === 'full-viewport',
}))

let mql: MediaQueryList | null = null

function syncMotion() {
  ui.setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

function toggleLocale() {
  persistLocale(locale.value === 'zh' ? 'en' : 'zh')
}

function toggleCursorTrail() {
  ui.cursorTrailEnabled = !ui.cursorTrailEnabled
}

onMounted(() => {
  syncMotion()
  mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  mql.addEventListener('change', syncMotion)
})

onUnmounted(() => {
  mql?.removeEventListener('change', syncMotion)
})
</script>

<template>
  <div class="abstract-grid-bg" aria-hidden="true" />
  <div class="app-root">
    <header class="glass-nav-sticky-wrap" :data-nav-compact="navCompact ? 'true' : 'false'">
      <div class="glass-nav-inner">
        <div class="header-inner">
        <div class="header-left">
          <RouterLink to="/" class="brand">GrunRay</RouterLink>
          <SiteNav />
        </div>
        <div class="header-right">
          <ThemeDayNightToggle class="header-theme-toggle" />
          <button
            type="button"
            class="trail-toggle"
            :class="{ 'is-active': ui.cursorTrailEnabled }"
            :aria-pressed="ui.cursorTrailEnabled ? 'true' : 'false'"
            :title="ui.cursorTrailEnabled ? t('nav.trailOff') : t('nav.trailOn')"
            :aria-label="ui.cursorTrailEnabled ? t('nav.trailOff') : t('nav.trailOn')"
            @click="toggleCursorTrail"
          >
            <span class="trail-toggle-icon" aria-hidden="true">
              <TrailNavIcon />
            </span>
          </button>
          <button
            type="button"
            class="music-nav-btn"
            :class="{
              'music-nav-btn--playing': musicNavPlayingAnimated,
              'music-nav-btn--idle': musicPlayerMinimized && !musicPlayerPlaying,
              'music-nav-btn--open': !musicPlayerMinimized,
            }"
            :aria-expanded="musicPlayerMinimized ? 'false' : 'true'"
            :title="musicPlayerMinimized ? t('nav.musicExpand') : t('nav.musicCollapse')"
            :aria-label="musicPlayerMinimized ? t('nav.musicExpand') : t('nav.musicCollapse')"
            @click="onMusicNavClick"
          >
            <span class="music-nav-btn-icon" aria-hidden="true">
              <MusicNavIcon />
            </span>
          </button>
          <button
            type="button"
            class="splash-nav-btn"
            :title="t('splash.replayTitle')"
            :aria-label="t('splash.replayLabel')"
            @click="onSplashNavClick"
          >
            <span class="splash-nav-btn-icon" aria-hidden="true">
              <SnailNavIcon />
            </span>
          </button>
          <button type="button" class="locale-btn" :aria-label="t('ui.locale')" @click="toggleLocale">
            {{ locale === 'zh' ? 'EN' : '中文' }}
          </button>
          <span v-if="ui.prefersReducedMotion" class="hint">{{ t('ui.cursorTrail') }} — 系统减少动效</span>
        </div>
      </div>
      </div>
    </header>

    <main class="app-main" :class="appMainClasses">
      <RouterView />
    </main>

    <footer class="footer">
      <small>Vue 3 · 数据驱动布局 · 设计见 <code>designed/site-design-spec.md</code></small>
    </footer>

    <CursorTrail />
  </div>
</template>

<style scoped>
.header-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem 1.25rem;
  min-width: 0;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.85rem;
  margin-left: auto;
  flex-shrink: 0;
}

.brand {
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--color-text);
  text-decoration: none;
  flex-shrink: 0;
  transition: font-size 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.brand:hover {
  color: var(--color-accent);
  text-decoration: none;
}

.glass-nav-sticky-wrap[data-nav-compact='true'] .brand {
  font-size: 1.05rem;
}

.trail-toggle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--glass-nav-border);
  background: color-mix(in srgb, var(--glass-nav-bg) 76%, #8a8a8a);
  color: #8d9298;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.trail-toggle:hover {
  transform: scale(1.08);
  border-color: color-mix(in srgb, var(--color-accent) 42%, var(--glass-nav-border));
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-accent) 35%, transparent);
}

.trail-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  transition: filter 0.2s ease, transform 0.2s ease;
}

.trail-toggle:hover .trail-toggle-icon {
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--color-accent) 55%, transparent));
  transform: scale(1.03);
}

.trail-toggle.is-active {
  color: #fff6cf;
  border-color: color-mix(in srgb, var(--color-accent) 55%, var(--glass-nav-border));
  background: linear-gradient(135deg, #8f7cff 0%, #4fc3ff 46%, #7fffd0 100%);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent),
    0 0 14px color-mix(in srgb, var(--color-accent) 45%, transparent);
}

.trail-toggle.is-active .trail-toggle-icon {
  filter:
    drop-shadow(0 0 6px color-mix(in srgb, var(--color-accent) 80%, white))
    drop-shadow(0 0 14px color-mix(in srgb, var(--color-accent) 58%, transparent));
}

.music-nav-btn,
.splash-nav-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--glass-nav-border);
  background: color-mix(in srgb, var(--glass-nav-bg) 76%, #8a8a8a);
  color: #8d9298;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.music-nav-btn:hover,
.splash-nav-btn:hover {
  transform: scale(1.08);
  border-color: color-mix(in srgb, var(--color-accent) 42%, var(--glass-nav-border));
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-accent) 35%, transparent);
}

.splash-nav-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  transition: filter 0.2s ease, transform 0.2s ease;
}

.splash-nav-btn:hover .splash-nav-btn-icon {
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--color-accent) 50%, transparent));
  transform: scale(1.06);
}

.music-nav-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  transition: filter 0.2s ease, transform 0.2s ease;
}

.music-nav-btn:hover .music-nav-btn-icon {
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--color-accent) 50%, transparent));
}

.music-nav-btn--idle {
  color: #7a7f85;
  opacity: 0.82;
}

.music-nav-btn--open {
  color: var(--color-text-muted);
  border-color: color-mix(in srgb, var(--color-accent) 28%, var(--glass-nav-border));
  background: color-mix(in srgb, var(--glass-nav-bg) 82%, transparent);
}

.music-nav-btn--playing {
  color: #fff6cf;
  border-color: color-mix(in srgb, var(--color-accent) 55%, var(--glass-nav-border));
  background: linear-gradient(135deg, #8f7cff 0%, #4fc3ff 46%, #7fffd0 100%);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent),
    0 0 14px color-mix(in srgb, var(--color-accent) 45%, transparent);
  animation: music-nav-breathe 1.15s ease-in-out infinite;
}

.music-nav-btn--playing .music-nav-btn-icon {
  animation: music-nav-icon-pulse 1.15s ease-in-out infinite;
}

@keyframes music-nav-icon-pulse {
  0%,
  100% {
    transform: translateY(0);
    filter: drop-shadow(0 0 5px color-mix(in srgb, var(--color-accent) 65%, white));
  }
  50% {
    transform: translateY(-1px);
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--color-accent) 70%, transparent));
  }
}

@keyframes music-nav-breathe {
  0%,
  100% {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-accent) 32%, transparent),
      0 0 12px color-mix(in srgb, var(--color-accent) 38%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-accent) 46%, transparent),
      0 0 20px color-mix(in srgb, var(--color-accent) 55%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .music-nav-btn--playing {
    animation: none;
  }

  .music-nav-btn--playing .music-nav-btn-icon {
    animation: none;
  }

  .music-nav-btn:hover,
  .splash-nav-btn:hover {
    transform: none;
  }
}

.locale-btn {
  border: 1px solid var(--glass-nav-border);
  background: color-mix(in srgb, var(--glass-nav-bg) 80%, transparent);
  color: var(--color-text);
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
  font-size: 0.78rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.locale-btn:hover {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--glass-nav-border));
  color: var(--color-accent);
}

.hint {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  max-width: 10rem;
  line-height: 1.3;
}

@media (max-width: 720px) {
  .header-right {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }
}

.footer {
  text-align: center;
  padding: 1.5rem;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}
</style>

<style>
/* 顶栏内主题开关：紧凑态略缩小（class 会合并到 ThemeDayNightToggle 根节点） */
.glass-nav-sticky-wrap[data-nav-compact='true'] .theme-daynight-embed.header-theme-toggle {
  transform: scale(0.92);
  transform-origin: center center;
}
</style>
