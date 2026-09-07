<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { copyTextToClipboard } from '@/composables/useCopyToClipboard'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { getFriendsApplySiteProfile } from '@/config/friendsSiteProfile'
import { SITE_NAME } from '@/config/site'
import {
  fetchFriendCaptcha,
  fetchFriendsSiteProfile,
  submitFriendApplication,
  type FriendsSiteProfile,
} from '@/services/friendsApi'
import { siteFaviconUrl } from '@/utils/siteFavicon'
import '@/styles/page-enter-friends.css'
import '@/styles/page-friends.css'

const SITE_URL_MAX = 512
const NAME_MAX = 64
const DESC_MAX = 200
const EMAIL_MAX = 128
const AVATAR_MAX = 512

const { t } = useI18n()
const route = useRoute()

useSeoMeta(() => ({
  title: `${t('friends.applyTitle')} | ${SITE_NAME}`,
  description: t('friends.applySeoDescription'),
  path: route.path,
  type: 'website',
}))

const pageRoot = ref<HTMLElement | null>(null)
const localProfile = getFriendsApplySiteProfile()
const siteProfile = ref<FriendsSiteProfile>({
  title: localProfile.title,
  url: localProfile.url,
  logo: localProfile.logo,
  description: '',
})

const siteName = ref('')
const siteUrl = ref('')
const avatarUrl = ref('')
const description = ref('')
const contactEmail = ref('')

const submitting = ref(false)
const submitToast = ref<string | null>(null)
let submitToastTimer: ReturnType<typeof window.setTimeout> | null = null
const formError = ref<string | null>(null)
const copiedKey = ref<string | null>(null)
let copyTimer: ReturnType<typeof window.setTimeout> | null = null

const captchaId = ref('')
const captchaQuestion = ref('')
const captchaAnswer = ref('')
const captchaLoading = ref(false)

const previewAvatar = computed(() => {
  const explicit = avatarUrl.value.trim()
  if (explicit) return explicit
  const url = siteUrl.value.trim()
  if (!url) return ''
  return siteFaviconUrl(url, 128)
})

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validate(): string | null {
  const name = siteName.value.trim()
  const url = siteUrl.value.trim()
  const desc = description.value.trim()
  const email = contactEmail.value.trim()
  const avatar = avatarUrl.value.trim()

  if (!name) return t('friends.applyErrorName')
  if (name.length > NAME_MAX) return t('friends.applyErrorNameLen', { max: NAME_MAX })
  if (!url) return t('friends.applyErrorUrl')
  if (!isValidUrl(url)) return t('friends.applyErrorUrlInvalid')
  if (url.length > SITE_URL_MAX) return t('friends.applyErrorUrlLen', { max: SITE_URL_MAX })
  if (!desc) return t('friends.applyErrorDesc')
  if (desc.length > DESC_MAX) return t('friends.applyErrorDescLen', { max: DESC_MAX })
  if (!email) return t('friends.applyErrorEmail')
  if (!isValidEmail(email)) return t('friends.applyErrorEmailInvalid')
  if (email.length > EMAIL_MAX) return t('friends.applyErrorEmailLen', { max: EMAIL_MAX })
  if (avatar && avatar.length > AVATAR_MAX) return t('friends.applyErrorAvatarLen', { max: AVATAR_MAX })
  if (avatar && !isValidUrl(avatar)) return t('friends.applyErrorAvatarInvalid')
  return null
}

function showSubmitToast(text: string) {
  submitToast.value = text
  if (submitToastTimer !== null) window.clearTimeout(submitToastTimer)
  submitToastTimer = window.setTimeout(() => {
    submitToast.value = null
    submitToastTimer = null
  }, 4500)
}

async function copyFact(key: string, text: string) {
  const ok = await copyTextToClipboard(text)
  if (!ok) return
  copiedKey.value = key
  if (copyTimer !== null) window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copiedKey.value = null
    copyTimer = null
  }, 1600)
}

function copyLabel(key: string): string {
  return copiedKey.value === key ? t('friends.copyDone') : t('friends.copy')
}

async function refreshCaptcha() {
  captchaLoading.value = true
  try {
    const c = await fetchFriendCaptcha()
    captchaId.value = c.captchaId
    captchaQuestion.value = c.question
    captchaAnswer.value = ''
  } catch {
    captchaId.value = ''
    captchaQuestion.value = ''
    formError.value = t('messages.captchaInvalid')
  } finally {
    captchaLoading.value = false
  }
}

async function onSubmit() {
  formError.value = null
  const err = validate()
  if (err) {
    formError.value = err
    showSubmitToast(err)
    return
  }
  if (!captchaId.value || !captchaAnswer.value.trim()) {
    const captchaErr = t('messages.captchaRequired')
    formError.value = captchaErr
    showSubmitToast(captchaErr)
    return
  }

  submitting.value = true
  try {
    const message = await submitFriendApplication({
      siteName: siteName.value.trim(),
      siteUrl: siteUrl.value.trim(),
      avatarUrl: avatarUrl.value.trim() || undefined,
      description: description.value.trim(),
      contactEmail: contactEmail.value.trim(),
      captchaId: captchaId.value,
      captchaAnswer: captchaAnswer.value.trim(),
    })
    siteName.value = ''
    siteUrl.value = ''
    avatarUrl.value = ''
    description.value = ''
    contactEmail.value = ''
    showSubmitToast(message || t('friends.applySuccess'))
    await refreshCaptcha()
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('friends.applySubmitFailed')
    const limited = (e as Error & { status?: number }).status === 429
    formError.value = msg
    showSubmitToast(limited ? t('friends.applyRateLimited') : msg)
    await refreshCaptcha()
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const profile = await fetchFriendsSiteProfile()
    siteProfile.value = profile
  } catch {
    /* keep local title/url/logo */
  }
  await refreshCaptcha()
  await playPageEnter(pageRoot.value)
})
</script>

<template>
  <section ref="pageRoot" class="friends-apply-page">
    <p class="friends-back">
      <RouterLink to="/friends">← {{ t('friends.title') }}</RouterLink>
    </p>
    <h1 class="h">{{ t('friends.applyTitle') }}</h1>

    <div class="ed-filter">
      <p class="ed-kicker">
        <span class="ed-en">{{ t('friends.kickerFactsEn') }}</span>
        <span class="ed-mid" aria-hidden="true">·</span>
        <span class="ed-zh">{{ t('friends.kickerFactsZh') }}</span>
      </p>
      <p class="friends-hint">{{ t('friends.applyIntro') }}</p>
      <ul class="friends-fact-list">
        <li>
          <p class="friends-fact-label">{{ t('friends.applyFieldName') }}</p>
          <p class="friends-fact-value">{{ siteProfile.title }}</p>
          <button type="button" class="ed-action ghost" @click="copyFact('title', siteProfile.title)">
            {{ copyLabel('title') }}
          </button>
        </li>
        <li>
          <p class="friends-fact-label">{{ t('friends.applyFieldUrl') }}</p>
          <p class="friends-fact-value">{{ siteProfile.url }}</p>
          <button type="button" class="ed-action ghost" @click="copyFact('url', siteProfile.url)">
            {{ copyLabel('url') }}
          </button>
        </li>
        <li>
          <p class="friends-fact-label">{{ t('friends.applyFieldAvatar') }}</p>
          <div class="friends-fact-logo">
            <img
              class="friends-icon-thumb"
              :src="siteProfile.logo"
              :alt="siteProfile.title"
              width="40"
              height="40"
              loading="lazy"
            />
            <p class="friends-fact-value">{{ siteProfile.logo }}</p>
          </div>
          <button type="button" class="ed-action ghost" @click="copyFact('logo', siteProfile.logo)">
            {{ copyLabel('logo') }}
          </button>
        </li>
        <li>
          <p class="friends-fact-label">{{ t('friends.applyFieldDesc') }}</p>
          <p class="friends-fact-value">{{ t('friends.applyNoticeBio') }}</p>
          <button
            type="button"
            class="ed-action ghost"
            @click="copyFact('bio', t('friends.applyNoticeBio'))"
          >
            {{ copyLabel('bio') }}
          </button>
        </li>
      </ul>
    </div>

    <form class="friends-compose" @submit.prevent="onSubmit">
      <p class="ed-kicker">
        <span class="ed-en">{{ t('friends.kickerApplyEn') }}</span>
        <span class="ed-mid" aria-hidden="true">·</span>
        <span class="ed-zh">{{ t('friends.kickerApplyZh') }}</span>
      </p>
      <h2 id="friends-apply-form-heading" class="friends-visually-hidden">{{ t('friends.applyFormTitle') }}</h2>

      <label class="ed-search">
        {{ t('friends.applyFieldName') }}
        <input
          v-model="siteName"
          type="text"
          name="siteName"
          :maxlength="NAME_MAX"
          :placeholder="t('friends.applyFieldNamePh')"
          autocomplete="organization"
        />
      </label>

      <label class="ed-search">
        {{ t('friends.applyFieldUrl') }}
        <input
          v-model="siteUrl"
          type="url"
          name="siteUrl"
          :maxlength="SITE_URL_MAX"
          :placeholder="t('friends.applyFieldUrlPh')"
          autocomplete="url"
        />
      </label>

      <label class="ed-search">
        {{ t('friends.applyFieldAvatar') }}
        <input
          v-model="avatarUrl"
          type="url"
          name="avatarUrl"
          :maxlength="AVATAR_MAX"
          :placeholder="t('friends.applyFieldAvatarPh')"
        />
      </label>

      <div v-if="previewAvatar" class="friends-icon-preview">
        <img
          :src="previewAvatar"
          :alt="siteName || t('friends.applyPreviewAlt')"
          width="48"
          height="48"
          loading="lazy"
        />
        <p>{{ t('friends.applyAvatarHint') }}</p>
      </div>

      <label class="friends-bio-field">
        {{ t('friends.applyFieldDesc') }}
        <textarea
          v-model="description"
          name="description"
          class="friends-bio"
          rows="3"
          :maxlength="DESC_MAX"
          :placeholder="t('friends.applyFieldDescPh')"
        />
      </label>

      <label class="ed-search">
        {{ t('friends.applyFieldEmail') }}
        <input
          v-model="contactEmail"
          type="email"
          name="contactEmail"
          :maxlength="EMAIL_MAX"
          :placeholder="t('friends.applyFieldEmailPh')"
          autocomplete="email"
        />
      </label>

      <p v-if="formError" class="friends-error" role="alert">{{ formError }}</p>

      <div class="friends-compose-meta">
        <label class="friends-captcha-field">
          <span>{{ t('messages.captchaLabel') }}</span>
          <span>{{ captchaQuestion || '…' }}</span>
          <input
            v-model="captchaAnswer"
            type="text"
            inputmode="numeric"
            class="friends-captcha-input"
            :placeholder="t('messages.captchaPlaceholder')"
            :disabled="captchaLoading || submitting"
            autocomplete="off"
          />
        </label>
        <button
          type="button"
          class="friends-text-btn"
          :disabled="captchaLoading || submitting"
          @click="refreshCaptcha"
        >
          {{ t('messages.captchaRefresh') }}
        </button>
      </div>

      <div class="friends-compose-foot">
        <button type="submit" class="ed-action" :disabled="submitting || captchaLoading">
          {{ submitting ? t('friends.applySubmitting') : t('friends.applySubmit') }}
        </button>
        <p class="friends-policy">{{ t('friends.applyPolicy') }}</p>
      </div>

      <Transition name="friends-toast-fade">
        <p v-if="submitToast" class="friends-submit-toast" role="status">{{ submitToast }}</p>
      </Transition>
    </form>
  </section>
</template>
