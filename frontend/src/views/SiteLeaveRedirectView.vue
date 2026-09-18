<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'

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
const router = useRouter()

const pageRoot = ref<HTMLElement | null>(null)
const confirmBtnRef = ref<HTMLButtonElement | null>(null)
const backLinkRef = ref<ComponentPublicInstance | null>(null)
const failStatusRef = ref<HTMLElement | null>(null)
const invalid = ref(false)
const leaving = ref(false)
const closeFailed = ref(false)
let leaveTimer: ReturnType<typeof window.setTimeout> | null = null

const targetUrl = computed(() => sanitizeExternalLeaveUrl(route.query.url))
const returnTo = computed(() => sanitizeSiteLeaveReturnTo(
  typeof route.query.return_to === 'string' ? route.query.return_to : undefined,
))
/** 新标签打开的出站确认：取消改为关页，而不是返回原页 */
const isTabLeave = computed(() => route.query.tab === '1')

const hostLabel = computed(() => targetUrl.value ? externalLeaveHost(targetUrl.value) : '')

const leadText = computed(() => {
  if (invalid.value) return t('leave.redirectInvalid')
  if (!hostLabel.value) return ''
  return t('leave.redirectLead')
})

const statusText = computed(() => {
  if (invalid.value || !hostLabel.value) return ''
  if (leaving.value) return t('leave.redirectProceeding', { host: hostLabel.value })
  if (isTabLeave.value) return t('leave.tabHint')
  return t('leave.redirectHint')
})

const pageTitle = computed(() => (
  leaving.value ? t('leave.redirectTitleProceeding') : t('leave.redirectTitle')
))

const cancelLabel = computed(() => (
  isTabLeave.value ? t('leave.tabCancel') : t('leave.redirectCancel')
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
  if (!url || leaving.value || closeFailed.value) return
  leaving.value = true
  scheduleExternalJump(url)
}

function onCancelClose() {
  if (leaving.value || closeFailed.value) return
  window.close()
  window.setTimeout(() => {
    if (window.closed) return
    closeFailed.value = true
  }, 120)
}

function onCancelNavigate() {
  if (leaving.value || closeFailed.value) return
  void router.push(returnTo.value)
}

function onLeaveKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (leaving.value) return
  event.preventDefault()
  if (invalid.value) {
    void router.push(returnTo.value)
    return
  }
  if (isTabLeave.value) {
    onCancelClose()
    return
  }
  onCancelNavigate()
}

function focusHost(target: unknown) {
  if (target instanceof HTMLElement) {
    target.focus()
    return
  }
  if (target && typeof target === 'object' && '$el' in target) {
    const el = (target as ComponentPublicInstance).$el
    if (el instanceof HTMLElement) el.focus()
  }
}

onMounted(async () => {
  if (!targetUrl.value) invalid.value = true
  await playPageEnter(pageRoot.value)
  document.addEventListener('keydown', onLeaveKeydown)
  await nextTick()
  if (invalid.value) {
    focusHost(backLinkRef.value)
    return
  }
  confirmBtnRef.value?.focus()
})

watch(closeFailed, async (failed) => {
  if (!failed) return
  await nextTick()
  failStatusRef.value?.focus()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onLeaveKeydown)
  if (leaveTimer !== null) window.clearTimeout(leaveTimer)
})
</script>

<template>
  <section
    ref="pageRoot"
    class="leave-page"
    :class="{
      'leave-page--error': invalid,
      'leave-page--busy': leaving,
      'leave-page--close-failed': closeFailed,
    }"
  >
    <h1 class="h">{{ pageTitle }}</h1>

    <div class="ed-filter">
      <EdKicker :en="t('leave.kickerLeaveEn')" :zh="t('leave.kickerLeaveZh')" />
      <p class="leave-hint">{{ leadText }}</p>
      <p v-if="hostLabel && !invalid" class="leave-host">{{ hostLabel }}</p>

      <template v-if="!invalid">
        <p class="leave-hint" role="status">{{ statusText }}</p>
        <div v-if="!leaving && !closeFailed" class="leave-actions">
          <button
            v-if="isTabLeave"
            type="button"
            class="ed-action ghost"
            @click="onCancelClose"
          >
            {{ cancelLabel }}
          </button>
          <RouterLink
            v-else
            class="ed-action ghost"
            :to="returnTo"
          >
            {{ cancelLabel }}
          </RouterLink>
          <button ref="confirmBtnRef" type="button" class="ed-action" @click="onConfirm">
            {{ t('leave.redirectConfirm') }}
          </button>
        </div>
        <p
          v-if="closeFailed"
          ref="failStatusRef"
          class="leave-close-failed"
          tabindex="-1"
          role="status"
          aria-live="assertive"
        >
          {{ t('leave.tabCloseFailed') }}
        </p>
      </template>

      <p v-else class="leave-actions">
        <RouterLink ref="backLinkRef" class="ed-action" :to="returnTo">{{ t('leave.redirectBack') }}</RouterLink>
      </p>
    </div>
  </section>
</template>
