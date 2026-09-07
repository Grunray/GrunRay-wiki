<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import EdKicker from '@/components/editorial/EdKicker.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import {
  externalLeaveHost,
  sanitizeExternalLeaveUrl,
  sanitizeSiteLeaveReturnTo,
  SITE_LEAVE_JUMP_DELAY_MS,
} from '@/config/siteLeaveRedirect'
import { SITE_NAME } from '@/config/site'
import '@/styles/page-enter-leave.css'
import '@/styles/page-leave-redirect.css'

const { t } = useI18n()
const route = useRoute()

const pageRoot = ref<HTMLElement | null>(null)
const invalid = ref(false)
const leaving = ref(false)
let leaveTimer: ReturnType<typeof window.setTimeout> | null = null

const targetUrl = computed(() => sanitizeExternalLeaveUrl(route.query.url))
const returnTo = computed(() => sanitizeSiteLeaveReturnTo(
  typeof route.query.return_to === 'string' ? route.query.return_to : undefined,
))

const hostLabel = computed(() => targetUrl.value ? externalLeaveHost(targetUrl.value) : '')

const leadText = computed(() => {
  if (invalid.value) return t('leave.redirectInvalid')
  if (!hostLabel.value) return ''
  return t('leave.redirectLead')
})

const statusText = computed(() => {
  if (invalid.value || !hostLabel.value) return ''
  if (leaving.value) return t('leave.redirectProceeding', { host: hostLabel.value })
  return t('leave.redirectHint')
})

const pageTitle = computed(() => (
  leaving.value ? t('leave.redirectTitleProceeding') : t('leave.redirectTitle')
))

useSeoMeta(() => ({
  title: `${pageTitle.value} | ${SITE_NAME}`,
  description: leadText.value || t('leave.redirectHint'),
  path: route.path,
  type: 'website',
  robots: 'noindex, nofollow',
}))

function scheduleExternalJump(url: string) {
  leaveTimer = window.setTimeout(() => {
    window.location.href = url
  }, SITE_LEAVE_JUMP_DELAY_MS)
}

function onConfirm() {
  const url = targetUrl.value
  if (!url || leaving.value) return
  leaving.value = true
  scheduleExternalJump(url)
}

onMounted(async () => {
  if (!targetUrl.value) invalid.value = true
  await playPageEnter(pageRoot.value)
})

onUnmounted(() => {
  if (leaveTimer !== null) window.clearTimeout(leaveTimer)
})
</script>

<template>
  <section
    ref="pageRoot"
    class="leave-page"
    :class="{ 'leave-page--error': invalid, 'leave-page--busy': leaving }"
    aria-live="polite"
  >
    <h1 class="h">{{ pageTitle }}</h1>

    <div class="ed-filter">
      <EdKicker :en="t('leave.kickerLeaveEn')" :zh="t('leave.kickerLeaveZh')" />
      <p class="leave-hint">{{ leadText }}</p>
      <p v-if="hostLabel && !invalid" class="leave-host">{{ hostLabel }}</p>

      <template v-if="!invalid">
        <p class="leave-hint" role="status">{{ statusText }}</p>
        <div v-if="!leaving" class="leave-actions">
          <RouterLink class="ed-action ghost" :to="returnTo">{{ t('leave.redirectCancel') }}</RouterLink>
          <button type="button" class="ed-action" @click="onConfirm">
            {{ t('leave.redirectConfirm') }}
          </button>
        </div>
      </template>

      <p v-else class="leave-actions">
        <RouterLink class="ed-action" :to="returnTo">{{ t('leave.redirectBack') }}</RouterLink>
      </p>
    </div>
  </section>
</template>
