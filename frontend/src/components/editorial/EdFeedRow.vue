<script setup lang="ts">
import AppImage from '@/components/ui/AppImage.vue'
import EdTone from '@/components/editorial/EdTone.vue'

defineProps<{
  imageUrl?: string | null
  imageAlt?: string
  tone: string
  toneLabel: string
  dateLabel: string
  title?: string
  body: string
  selected?: boolean
  expanded?: boolean
  enterIndex?: number
}>()
</script>

<template>
  <button
    type="button"
    class="ed-feed-row"
    :class="{
      'has-cover': Boolean(imageUrl),
      'is-on': selected,
    }"
    :style="{ '--enter-i': String(enterIndex ?? 0) }"
    :aria-expanded="expanded"
  >
    <span v-if="imageUrl" class="thumb">
      <AppImage :src="imageUrl" :alt="imageAlt || ''" :min-loader-ms="900" />
    </span>
    <span>
      <p class="row-meta">
        <EdTone :tone="tone">{{ toneLabel }}</EdTone>
        · {{ dateLabel }}
      </p>
      <p v-if="title" class="row-name">{{ title }}</p>
      <p class="row-body">{{ body }}</p>
    </span>
  </button>
</template>
