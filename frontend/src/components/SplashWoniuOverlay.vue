<script setup lang="ts">
/**
 * 纸上来信开屏：时间轴在 `public/splash-editorial/`（独立页 + iframe）。
 * 「已看过」记在 localStorage（跨标签、OAuth 整页回跳仍跳过）；顶栏重播走 replay tick，不读这个键。
 * 不再做蜗牛头像飞入。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { useUiStore } from '@/stores/ui'

const STORAGE_KEY = 'grunray_splash_editorial_v1'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()

const visible = ref(false)
const leaving = ref(false)
const iframeKey = ref(0)
const splashIframeRef = ref<HTMLIFrameElement | null>(null)
let splashTimer = 0
let leaveTimer = 0
let frameRaf = 0
let lastFrameKey = ''
const frameQuery = ref('')

function captureFrameQuery() {
  const frame = homeLayoutFrame()
  if (!frame) {
    frameQuery.value = ''
    return
  }
  const q = new URLSearchParams()
  if (frame.width >= 8 && frame.height >= 8) {
    q.set('ft', String(Math.round(frame.top)))
    q.set('fl', String(Math.round(frame.left)))
    q.set('fw', String(Math.round(frame.width)))
    q.set('fh', String(Math.round(frame.height)))
    q.set('fsrc', frame.src)
  }
  const copy = frame.copy
  if (copy) {
    q.set('ct', String(Math.round(copy.top)))
    q.set('cl', String(Math.round(copy.left)))
    q.set('cw', String(Math.round(copy.width)))
    q.set('ch', String(Math.round(copy.height)))
    q.set('pt', String(Math.round(copy.padTop)))
    q.set('pr', String(Math.round(copy.padRight)))
    q.set('pb', String(Math.round(copy.padBottom)))
    q.set('pl', String(Math.round(copy.padLeft)))
  }
  frameQuery.value = q.toString()
}

function homeArtFrame() {
  const img = document.querySelector<HTMLImageElement>('.home-spread-art img')
  if (!img) return null
  const rect = img.getBoundingClientRect()
  if (rect.width < 8 || rect.height < 8) return null
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    src: img.currentSrc || img.getAttribute('src') || '',
  }
}

function homeCopyFrame() {
  const el = document.querySelector<HTMLElement>('.home-spread-copy')
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width < 8 || rect.height < 8) return null
  const cs = getComputedStyle(el)
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    padTop: parseFloat(cs.paddingTop) || 0,
    padRight: parseFloat(cs.paddingRight) || 0,
    padBottom: parseFloat(cs.paddingBottom) || 0,
    padLeft: parseFloat(cs.paddingLeft) || 0,
  }
}

function homeLayoutFrame() {
  const art = homeArtFrame()
  const copy = homeCopyFrame()
  if (!art && !copy) return null
  return {
    top: art?.top ?? 0,
    left: art?.left ?? 0,
    width: art?.width ?? 0,
    height: art?.height ?? 0,
    src: art?.src ?? '',
    copy,
  }
}

function postHomeFrame(force = false) {
  const frame = homeLayoutFrame()
  if (!frame || !visible.value) return
  const copy = frame.copy
  const key = [
    frame.top, frame.left, frame.width, frame.height, frame.src,
    copy?.top, copy?.left, copy?.width, copy?.height,
    copy?.padTop, copy?.padRight, copy?.padBottom, copy?.padLeft,
  ].join('|')
  if (!force && key === lastFrameKey) return
  lastFrameKey = key
  splashIframeRef.value?.contentWindow?.postMessage({ type: 'grunray-splash-frame', frame }, '*')
}

function onSplashLoad() {
  lastFrameKey = ''
  postHomeFrame(true)
}

function syncHomeFrame() {
  window.cancelAnimationFrame(frameRaf)
  const loop = () => {
    if (!visible.value) return
    postHomeFrame()
    frameRaf = window.requestAnimationFrame(loop)
  }
  frameRaf = window.requestAnimationFrame(loop)
}

function armSplashTimeout() {
  window.clearTimeout(splashTimer)
  // 片子约 16 秒。播完会自己收；若重播后停在终帧，到点也揭开，避免盖住页面。
  splashTimer = window.setTimeout(() => {
    if (visible.value) dismiss()
  }, 20000)
}

const iframeSrc = computed(() => {
  const theme = ui.theme === 'dark' || ui.theme === 'abstract' ? ui.theme : 'light'
  const motion = ui.motionCut ? 'minimal' : 'full'
  const frame = frameQuery.value ? `&${frameQuery.value}` : ''
  return `/splash-editorial/index.html?theme=${theme}&motion=${motion}&play=${iframeKey.value}${frame}`
})

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

function hasSeen(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY))
  } catch {
    return false
  }
}

function queryValue(key: string): string {
  const fromRoute = route.query[key]
  if (typeof fromRoute === 'string' && fromRoute.length > 0) return fromRoute
  // 首屏 onMounted 时路由可能还停在空起点，整页回跳要以地址栏为准。
  return new URLSearchParams(window.location.search).get(key) ?? ''
}

function isOAuthReturn(): boolean {
  if (queryValue('auth') === 'success') return true
  return queryValue('auth_error').length > 0
}

function beginSplash() {
  window.clearTimeout(leaveTimer)
  leaving.value = false
  visible.value = true
  ui.setSplashWoniuActive(true)
  armSplashTimeout()
  syncHomeFrame()
}

function endSplash() {
  window.clearTimeout(leaveTimer)
  leaving.value = false
  visible.value = false
  window.cancelAnimationFrame(frameRaf)
  lastFrameKey = ''
  ui.setSplashWoniuActive(false)
}

function dismiss() {
  if (!visible.value || leaving.value) return
  window.clearTimeout(splashTimer)
  markSeen()
  if (ui.motionCut) {
    endSplash()
    return
  }
  /* 遮罩先淡出。章节文案先收掉，底下的导航、刊头、中缝、问候跟着透出来。 */
  leaving.value = true
  splashIframeRef.value?.contentWindow?.postMessage({ type: 'grunray-splash-handoff' }, '*')
  leaveTimer = window.setTimeout(() => {
    if (leaving.value) endSplash()
  }, 440)
}

function onMessage(ev: MessageEvent) {
  if (ev.data?.type !== 'grunray-splash-complete') return
  const play = ev.data.play
  if (play != null && String(play) !== String(iframeKey.value)) return
  dismiss()
}

function onKeydown(event: KeyboardEvent) {
  if (!visible.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    dismiss()
    return
  }
  if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
  const target = event.target
  if (target instanceof Element && target.closest('button, a, input, select, textarea')) return
  event.preventDefault()
  splashIframeRef.value?.contentWindow?.postMessage({ type: 'grunray-splash-toggle' }, '*')
}

watch(
  () => ui.splashWoniuReplayTick,
  (tick) => {
    if (tick <= 0) return
    captureFrameQuery()
    iframeKey.value = tick
    beginSplash()
  },
)

watch(
  () => ui.theme,
  (theme) => {
    if (!visible.value) return
    splashIframeRef.value?.contentWindow?.postMessage(
      { type: 'grunray-splash-theme', theme },
      '*',
    )
  },
)

onMounted(() => {
  window.addEventListener('message', onMessage)
  window.addEventListener('keydown', onKeydown)
  if (ui.motionCut) return
  if (hasSeen()) return
  if (isOAuthReturn()) {
    markSeen()
    return
  }
  markSeen()
  captureFrameQuery()
  beginSplash()
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
  window.removeEventListener('keydown', onKeydown)
  window.clearTimeout(splashTimer)
  window.clearTimeout(leaveTimer)
  window.cancelAnimationFrame(frameRaf)
  if (visible.value) ui.setSplashWoniuActive(false)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="splash-woniu"
      :class="{ 'is-leaving': leaving }"
      role="dialog"
      aria-modal="true"
      aria-label="开屏"
    >
      <button type="button" class="splash-woniu__skip" @click="dismiss">
        {{ t('splash.skip') }}
      </button>
      <iframe
        ref="splashIframeRef"
        :key="iframeKey"
        class="splash-woniu__frame"
        :src="iframeSrc"
        title="开屏动画"
        referrerpolicy="no-referrer"
        @load="onSplashLoad"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.splash-woniu {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100dvh;
  padding: 0;
  margin: 0;
  background: var(--color-bg-base);
  transition: opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.splash-woniu.is-leaving {
  opacity: 0;
  pointer-events: none;
}

.splash-woniu__skip {
  position: absolute;
  top: max(12px, env(safe-area-inset-top, 0px));
  right: max(12px, env(safe-area-inset-right, 0px));
  z-index: 1;
  padding: 8px 14px;
  border-radius: var(--radius-md, 10px);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  font-size: 14px;
  cursor: pointer;
}

.splash-woniu__skip:hover {
  color: var(--color-text);
  border-color: var(--color-accent-muted);
}

.splash-woniu__frame {
  flex: 1 1 auto;
  align-self: stretch;
  width: 100%;
  height: 100%;
  min-height: 100%;
  border: 0;
  background: transparent;
}
</style>
