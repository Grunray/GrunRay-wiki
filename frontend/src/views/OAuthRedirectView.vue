<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import EdKicker from '@/components/editorial/EdKicker.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import {
  OAUTH_REDIRECT_JUMP_DELAY_MS,
  buildOAuthApiStartUrl,
  parseOAuthProvider,
  sanitizeOAuthReturnTo,
  type OAuthProvider,
} from '@/config/oauthRedirect'
import { SITE_NAME } from '@/config/site'
import '@/styles/page-enter-leave.css'
import '@/styles/page-leave-redirect.css'

const { t } = useI18n()
const route = useRoute()

const pageRoot = ref<HTMLElement | null>(null)
const invalid = ref(false)
const redirecting = ref(false)
let redirectTimer: ReturnType<typeof window.setTimeout> | null = null

const provider = computed(() => parseOAuthProvider(route.query.provider))
const returnTo = computed(() => sanitizeOAuthReturnTo(
  typeof route.query.return_to === 'string' ? route.query.return_to : undefined,
))

const providerLabel = computed(() => {
  if (provider.value === 'github') return 'GitHub'
  if (provider.value === 'google') return 'Google'
  return ''
})

const leadText = computed(() => {
  if (invalid.value) return t('oauth.redirectInvalid')
  if (!providerLabel.value) return ''
  return t('oauth.redirectLead')
})

const statusText = computed(() => {
  if (invalid.value || !providerLabel.value) return ''
  if (redirecting.value) {
    return t('oauth.redirectProceeding', { provider: providerLabel.value })
  }
  return t('oauth.redirectHint')
})

const pageTitle = computed(() => (
  redirecting.value ? t('oauth.redirectTitleProceeding') : t('oauth.redirectTitle')
))

useSeoMeta(() => ({
  title: `${pageTitle.value} | ${SITE_NAME}`,
  description: leadText.value || t('oauth.redirectHint'),
  path: route.path,
  type: 'website',
  robots: 'noindex, nofollow',
}))

function scheduleOAuthJump(p: OAuthProvider, back: string) {
  redirectTimer = window.setTimeout(() => {
    window.location.href = buildOAuthApiStartUrl(p, back)
  }, OAUTH_REDIRECT_JUMP_DELAY_MS)
}

function onConfirm() {
  const p = provider.value
  if (!p || redirecting.value) return
  redirecting.value = true
  scheduleOAuthJump(p, returnTo.value)
}

onMounted(async () => {
  if (!provider.value) invalid.value = true
  await playPageEnter(pageRoot.value)
})

onUnmounted(() => {
  if (redirectTimer !== null) window.clearTimeout(redirectTimer)
})
</script>

<template>
  <section
    ref="pageRoot"
    class="oauth-page"
    :class="{ 'oauth-page--error': invalid, 'oauth-page--busy': redirecting }"
    aria-live="polite"
  >
    <h1 class="h">{{ pageTitle }}</h1>

    <div class="ed-filter">
      <EdKicker :en="t('oauth.kickerAuthEn')" :zh="t('oauth.kickerAuthZh')" />
      <p class="leave-hint">{{ leadText }}</p>
      <p v-if="providerLabel && !invalid" class="leave-host">{{ providerLabel }}</p>

      <template v-if="!invalid">
        <p class="leave-hint" role="status">{{ statusText }}</p>
        <div v-if="!redirecting" class="leave-actions">
          <RouterLink class="ed-action ghost" :to="returnTo">{{ t('oauth.redirectCancel') }}</RouterLink>
          <button type="button" class="ed-action" @click="onConfirm">
            {{ t('oauth.redirectConfirm') }}
          </button>
        </div>
      </template>

      <p v-else class="leave-actions">
        <RouterLink class="ed-action" :to="returnTo">{{ t('oauth.redirectBack') }}</RouterLink>
      </p>
    </div>
  </section>
</template>
