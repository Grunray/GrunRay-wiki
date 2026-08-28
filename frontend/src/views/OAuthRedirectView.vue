<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

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
import '@/styles/page-oauth-redirect.css'

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
  if (provider.value === 'github') return t('oauth.redirectGithub')
  if (provider.value === 'google') return t('oauth.redirectGoogle')
  return ''
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
    class="oauth-redirect-page"
    :class="{ 'oauth-redirect-error': invalid, 'oauth-redirect--busy': redirecting }"
    aria-live="polite"
  >
    <div class="oauth-redirect-card card">
      <p v-if="providerLabel && !invalid" class="oauth-redirect-kicker">
        {{ providerLabel }} · {{ t('oauth.redirectKicker') }}
      </p>
      <h1 class="oauth-redirect-title">{{ pageTitle }}</h1>
      <p class="oauth-redirect-lead">{{ leadText }}</p>

      <template v-if="!invalid">
        <div v-if="redirecting" class="oauth-redirect-spinner-wrap" aria-hidden="true">
          <div class="oauth-redirect-spinner" />
        </div>
        <p class="oauth-redirect-hint" role="status">{{ statusText }}</p>

        <div v-if="!redirecting" class="oauth-redirect-actions">
          <RouterLink class="btn-accent oauth-redirect-action-btn oauth-redirect-cancel" :to="returnTo">
            {{ t('oauth.redirectCancel') }}
          </RouterLink>
          <button type="button" class="btn-accent oauth-redirect-action-btn oauth-redirect-confirm" @click="onConfirm">
            {{ t('oauth.redirectConfirm', { provider: providerLabel }) }}
          </button>
        </div>
      </template>

      <RouterLink v-else class="oauth-redirect-back oauth-redirect-back--solo" :to="returnTo">
        {{ t('oauth.redirectBack') }}
      </RouterLink>
    </div>
  </section>
</template>
