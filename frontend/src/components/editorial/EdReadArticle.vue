<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import EdTone from '@/components/editorial/EdTone.vue'
import { useMarkdownCodeCopy } from '@/composables/useMarkdownCodeCopy'

const props = defineProps<{
  tone: string
  toneLabel: string
  datetime: string
  timeLabel: string
  title?: string
  bodyHtml?: string | null
  excerpt?: string
  loading?: boolean
  loadingLabel?: string
}>()

const { t } = useI18n()
const markdownRef = ref<HTMLElement | null>(null)
const showHtml = computed(() => Boolean(props.bodyHtml) && !props.loading)
const showLoading = computed(() => Boolean(props.loading && props.loadingLabel))
const htmlKey = computed(() => (showHtml.value ? props.bodyHtml ?? '' : ''))
const codeCopyLabels = computed(() => ({
  copy: t('post.copyCode'),
  copyDone: t('post.copyCodeDone'),
}))

useMarkdownCodeCopy(markdownRef, codeCopyLabels, htmlKey)
</script>

<template>
  <article class="ed-read-article">
    <header class="ed-read-head">
      <p class="row-meta">
        <EdTone :tone="tone">{{ toneLabel }}</EdTone>
        ·
        <time :datetime="datetime">{{ timeLabel }}</time>
      </p>
    </header>
    <h2 v-if="title" class="ed-read-title">{{ title }}</h2>
    <p v-if="showLoading" class="ed-read-body habitat-empty">{{ loadingLabel }}</p>
    <div
      v-else-if="showHtml"
      ref="markdownRef"
      class="ed-read-body ed-read-body--html prose body-markdown markdown-reading"
      v-html="bodyHtml"
    />
    <p v-else class="ed-read-body ed-read-body--excerpt">{{ excerpt }}</p>
    <p v-if="$slots.link" class="ed-read-link">
      <slot name="link" />
    </p>
  </article>
</template>
