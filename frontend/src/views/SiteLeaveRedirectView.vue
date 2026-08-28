<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import {
  externalLeaveHost,
  sanitizeExternalLeaveUrl,
  sanitizeSiteLeaveReturnTo,
  SITE_LEAVE_JUMP_DELAY_MS,
} from '@/config/siteLeaveRedirect'
import { SITE_NAME } from '@/config/site'
import '@/styles/page-oauth-redirect.css'

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
  return t('leave.redirectLead', { host: hostLabel.value })
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
    class="oauth-redirect-page"
    :class="{ 'oauth-redirect-error': invalid, 'oauth-redirect--busy': leaving }"
    aria-live="polite"
  >
    <div class="oauth-redirect-card card">
      <p v-if="hostLabel && !invalid" class="oauth-redirect-kicker">
        {{ hostLabel }} · {{ t('leave.redirectKicker') }}
      </p>
      <h1 class="oauth-redirect-title">{{ pageTitle }}</h1>
      <p class="oauth-redirect-lead">{{ leadText }}</p>

      <template v-if="!invalid">
        <div v-if="leaving" class="oauth-redirect-spinner-wrap" aria-hidden="true">
          <div class="oauth-redirect-spinner" />
        </div>
        <p class="oauth-redirect-hint" role="status">{{ statusText }}</p>

        <div v-if="!leaving" class="oauth-redirect-actions">
          <RouterLink class="btn-accent oauth-redirect-action-btn oauth-redirect-cancel" :to="returnTo">
            {{ t('leave.redirectCancel') }}
          </RouterLink>
          <button type="button" class="btn-accent oauth-redirect-action-btn oauth-redirect-confirm" @click="onConfirm">
            {{ t('leave.redirectConfirm') }}
          </button>
        </div>
      </template>

      <RouterLink v-else class="oauth-redirect-back oauth-redirect-back--solo" :to="returnTo">
        {{ t('leave.redirectBack') }}
      </RouterLink>
    </div>
  </section>
</template>
