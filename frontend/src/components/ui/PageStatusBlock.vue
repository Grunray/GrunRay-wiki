<script setup lang="ts">
/**
 * 列表 / 详情共用的空态与错误态（editorial：kicker + 标题 + 说明 + 可选重试）。
 * loading 优先用各页骨架；本组件仅作轻量文字 loading 兜底。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    kind: 'empty' | 'error' | 'loading'
    /** 主文案；缺省用 common.status.* */
    title?: string
    /** 次要说明 */
    description?: string
    /** 为 true 时展示重试按钮（通常仅 error） */
    retryable?: boolean
    retryLabel?: string
  }>(),
  {
    retryable: false,
  },
)

defineEmits<{
  retry: []
}>()

const { t } = useI18n()

const kickerEn = computed(() => {
  if (props.kind === 'error') return t('common.status.errorKickerEn')
  if (props.kind === 'loading') return t('common.status.loadingKickerEn')
  return t('common.status.emptyKickerEn')
})

const kickerZh = computed(() => {
  if (props.kind === 'error') return t('common.status.errorKickerZh')
  if (props.kind === 'loading') return t('common.status.loadingKickerZh')
  return t('common.status.emptyKickerZh')
})

const resolvedTitle = computed(() => {
  if (props.title) return props.title
  if (props.kind === 'error') return t('common.status.loadFailed')
  if (props.kind === 'loading') return t('common.status.loading')
  return t('common.status.emptyDefault')
})

const resolvedDescription = computed(() => {
  if (props.description !== undefined) return props.description
  if (props.kind === 'error') return t('common.status.loadFailedHint')
  return ''
})

const showRetry = computed(() => props.kind === 'error' && props.retryable)

const resolvedRetryLabel = computed(() => props.retryLabel || t('common.status.retry'))

const liveRole = computed(() => (props.kind === 'error' ? 'alert' : 'status'))
</script>

<template>
  <section class="page-status" :data-kind="kind" :role="liveRole">
    <p class="page-status-kicker ed-kicker">
      <span class="ed-en">{{ kickerEn }}</span>
      <span class="ed-mid" aria-hidden="true">·</span>
      <span class="ed-zh">{{ kickerZh }}</span>
    </p>
    <p class="page-status-title">{{ resolvedTitle }}</p>
    <p v-if="resolvedDescription" class="page-status-desc">{{ resolvedDescription }}</p>
    <button
      v-if="showRetry"
      type="button"
      class="ed-action page-status-retry"
      @click="$emit('retry')"
    >
      {{ resolvedRetryLabel }}
    </button>
  </section>
</template>
