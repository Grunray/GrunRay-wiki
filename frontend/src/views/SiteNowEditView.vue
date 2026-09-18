<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import EdKicker from '@/components/editorial/EdKicker.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { fetchMessageAuthUser } from '@/services/messageAuth'
import { fetchSiteNow, saveSiteNow } from '@/services/siteNowApi'
import { ownerFacingMessage } from '@/utils/publicErrorMessage'
import '@/styles/page-enter-legal.css'
import '@/styles/page-site-now.css'

const { t } = useI18n()
const route = useRoute()

useSeoMeta(() => ({
  title: `${t('siteNow.title')} | ${SITE_NAME}`,
  description: t('siteNow.seoDescription'),
  path: route.path,
  type: 'website',
  robots: 'noindex, nofollow',
}))

const pageRoot = ref<HTMLElement | null>(null)
const authLoading = ref(true)
const isSiteOwner = ref(false)
const loading = ref(false)
const saving = ref(false)
const doing = ref('')
const reading = ref('')
const message = ref('')
const error = ref('')

async function loadStatus() {
  loading.value = true
  error.value = ''
  try {
    const status = await fetchSiteNow()
    doing.value = status.doing ?? ''
    reading.value = status.reading ?? ''
  } catch (e) {
    error.value = ownerFacingMessage(e, t('common.status.ownerActionFailed'))
  } finally {
    loading.value = false
  }
}

async function onSave() {
  if (saving.value) return
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    const status = await saveSiteNow({
      doing: doing.value.trim(),
      reading: reading.value.trim(),
    })
    doing.value = status.doing ?? ''
    reading.value = status.reading ?? ''
    message.value = t('siteNow.saveSuccess')
  } catch (e) {
    error.value = ownerFacingMessage(e, t('common.status.ownerActionFailed'))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const user = await fetchMessageAuthUser()
    isSiteOwner.value = Boolean(user?.isSiteOwner)
  } catch {
    isSiteOwner.value = false
  } finally {
    authLoading.value = false
  }
  if (isSiteOwner.value) {
    await loadStatus()
  }
  await playPageEnter(pageRoot.value)
})
</script>

<template>
  <article ref="pageRoot" class="site-now-page">
    <p class="site-now-back">
      <RouterLink to="/">← {{ t('siteNow.backHome') }}</RouterLink>
    </p>
    <h1 class="h">{{ t('siteNow.title') }}</h1>

    <p v-if="authLoading" class="site-now-hint" role="status">{{ t('common.status.loading') }}</p>

    <div v-else-if="!isSiteOwner" class="ed-filter">
      <EdKicker :en="t('siteNow.kickerGateEn')" :zh="t('siteNow.kickerGateZh')" />
      <p class="site-now-hint">{{ t('siteNow.loginRequired') }}</p>
      <p class="site-now-actions">
        <RouterLink class="ed-action" to="/messages">{{ t('siteNow.goLogin') }}</RouterLink>
      </p>
    </div>

    <template v-else>
      <div class="ed-filter">
        <EdKicker :en="t('siteNow.kickerEditEn')" :zh="t('siteNow.kickerEditZh')" />
        <p class="site-now-hint">{{ t('siteNow.subtitle') }}</p>
      </div>

      <p v-if="loading" class="site-now-hint" role="status">{{ t('common.status.loading') }}</p>

      <form v-else class="site-now-form" @submit.prevent="onSave">
        <label class="ed-search">
          {{ t('siteNow.fieldDoing') }}
          <input
            v-model="doing"
            type="text"
            maxlength="200"
            :placeholder="t('home.nowDoing')"
            :aria-label="t('siteNow.fieldDoing')"
          />
        </label>
        <label class="ed-search">
          {{ t('siteNow.fieldReading') }}
          <input
            v-model="reading"
            type="text"
            maxlength="200"
            :placeholder="t('home.nowReading')"
            :aria-label="t('siteNow.fieldReading')"
          />
        </label>
        <p class="site-now-note">{{ t('siteNow.clearHint') }}</p>
        <div class="site-now-actions">
          <button type="submit" class="ed-action" :disabled="saving">
            {{ saving ? t('siteNow.saving') : t('siteNow.save') }}
          </button>
          <RouterLink class="ed-action" to="/">{{ t('siteNow.previewHome') }}</RouterLink>
        </div>
        <p v-if="message" class="site-now-ok" role="status">{{ message }}</p>
        <p v-if="error" class="site-now-err" role="alert">{{ error }}</p>
      </form>
    </template>
  </article>
</template>
