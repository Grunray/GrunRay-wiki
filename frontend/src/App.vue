<script setup lang="ts">
import { defineAsyncComponent, ref, watch } from 'vue'
import { RouterView } from 'vue-router'

import SplashWoniuOverlay from '@/components/SplashWoniuOverlay.vue'
import { MOBILE_SHELL_MQ } from '@/composables/useMobileShell'
import { useUiStore } from '@/stores/ui'

const FloatingMusicPlayer = defineAsyncComponent(
  () => import('@/components/music/FloatingMusicPlayer.vue'),
)

const ui = useUiStore()

function isMobileShellNow() {
  return window.matchMedia(MOBILE_SHELL_MQ).matches
}

/** 点开展开后才挂载；本会话收起只藏 UI，避免停播。窄屏壳层不挂。 */
const musicMounted = ref(!ui.musicPlayerMinimized && !isMobileShellNow())

watch(
  () => ui.musicPlayerMinimized,
  (minimized) => {
    if (!minimized && !isMobileShellNow()) musicMounted.value = true
  },
)
</script>

<template>
  <SplashWoniuOverlay />
  <RouterView />
  <FloatingMusicPlayer v-if="musicMounted" />
</template>
