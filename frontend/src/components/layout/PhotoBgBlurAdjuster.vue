<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import {
  PHOTO_BG_BLUR_DEFAULT,
  PHOTO_BG_BLUR_MAX,
  PHOTO_BG_BLUR_MIN,
} from '@/theme/photoBackgroundBlur'
import { useUiStore } from '@/stores/ui'

export type PhotoBgBlurAnchorRect = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

const props = defineProps<{
  open: boolean
  anchorRect: PhotoBgBlurAnchorRect | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const ui = useUiStore()
const { photoBackgroundBlurPx } = storeToRefs(ui)

const panelRef = ref<HTMLElement | null>(null)
let dismissListenersBound = false
let dismissBindTimer: ReturnType<typeof window.setTimeout> | null = null

const PANEL_WIDTH = 248

const panelStyle = computed(() => {
  const rect = props.anchorRect
  if (!rect) return { visibility: 'hidden' as const }

  const margin = 12
  const maxLeft = Math.max(margin, window.innerWidth - PANEL_WIDTH - margin)
  const left = Math.min(Math.max(rect.right - PANEL_WIDTH, margin), maxLeft)
  const top = rect.bottom + 8

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${PANEL_WIDTH}px`,
  }
})

function onPointerDown(ev: PointerEvent) {
  if (ev.button !== 0) return
  const panel = panelRef.value
  if (!panel) return
  if (panel.contains(ev.target as Node)) return
  emit('close')
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') emit('close')
}

function bindDismissListeners() {
  if (dismissListenersBound) return
  dismissListenersBound = true
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('keydown', onKeydown)
}

function unbindDismissListeners() {
  if (!dismissListenersBound) return
  dismissListenersBound = false
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
}

watch(
  () => props.open,
  (open) => {
    if (dismissBindTimer != null) {
      window.clearTimeout(dismissBindTimer)
      dismissBindTimer = null
    }
    if (open) {
      // 避免同一次右键的 pointer 事件立刻触发「点外关闭」
      dismissBindTimer = window.setTimeout(() => {
        dismissBindTimer = null
        if (props.open) bindDismissListeners()
      }, 0)
    } else {
      unbindDismissListeners()
    }
  },
)

onUnmounted(() => {
  if (dismissBindTimer != null) window.clearTimeout(dismissBindTimer)
  unbindDismissListeners()
})

function onInput(ev: Event) {
  const value = Number((ev.target as HTMLInputElement).value)
  ui.setPhotoBackgroundBlur(value)
}

function resetBlur() {
  ui.setPhotoBackgroundBlur(PHOTO_BG_BLUR_DEFAULT)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="photo-bg-blur-popover">
      <div
        v-if="open && anchorRect"
        ref="panelRef"
        class="photo-bg-blur-popover card card-glass-dense"
        role="dialog"
        :aria-label="t('nav.photoBgBlurTitle')"
        :style="panelStyle"
        @click.stop
        @contextmenu.prevent
      >
        <div class="photo-bg-blur-popover__head">
          <span class="photo-bg-blur-popover__title">{{ t('nav.photoBgBlurTitle') }}</span>
          <button type="button" class="photo-bg-blur-popover__reset" @click="resetBlur">
            {{ t('nav.photoBgBlurReset') }}
          </button>
        </div>
        <label class="photo-bg-blur-popover__row">
          <span class="photo-bg-blur-popover__label">{{ t('nav.photoBgBlurAmount') }}</span>
          <span class="photo-bg-blur-popover__value" aria-live="polite">
            {{ photoBackgroundBlurPx }}px
          </span>
        </label>
        <input
          class="photo-bg-blur-popover__range"
          type="range"
          :min="PHOTO_BG_BLUR_MIN"
          :max="PHOTO_BG_BLUR_MAX"
          step="1"
          :value="photoBackgroundBlurPx"
          :aria-valuemin="PHOTO_BG_BLUR_MIN"
          :aria-valuemax="PHOTO_BG_BLUR_MAX"
          :aria-valuenow="photoBackgroundBlurPx"
          :aria-label="t('nav.photoBgBlurAmount')"
          @input="onInput"
        />
        <p class="photo-bg-blur-popover__hint">{{ t('nav.photoBgBlurPopoverHint') }}</p>
      </div>
    </Transition>
  </Teleport>
</template>
