<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import type { AdminGuestMessage, GuestMessage, GuestMessageReply } from '@/content/data/mockMessages'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useOAuthRedirect } from '@/composables/useOAuthRedirect'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import {
  createMessage,
  createReply,
  fetchAdminMessages,
  fetchMessageCaptcha,
  fetchMessages,
  blockMessageAuthor,
  deleteMessage,
  moderateMessage,
} from '@/services/messageApi'
import {
  fetchMessageAuthProviders,
  fetchMessageAuthUser,
  logoutMessageAuth,
  type MessageAuthProviders,
  type MessageAuthUser,
} from '@/services/messageAuth'
import MessageAvatarWithProvider from '@/components/message/MessageAvatarWithProvider.vue'
import '@/styles/page-enter-message.css'
import '@/styles/page-messages.css'

const MESSAGE_MAX_LEN = 500
const THREAD_FOLD = 2

type SortOrder = 'newest' | 'oldest'
type FeedTab = 'public' | 'pending'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { startOAuth } = useOAuthRedirect()

useSeoMeta(() => ({
  title: `${t('messages.title')} | ${SITE_NAME}`,
  description: t('messages.seoDescription'),
  path: route.path,
  type: 'website',
}))

const pageRoot = ref<HTMLElement | null>(null)
const enterPlayed = ref(false)

const messages = ref<GuestMessage[]>([])
const messagesLoading = ref(true)
const messagesTotal = ref(0)
const authUser = ref<MessageAuthUser | null>(null)
const authProviders = ref<MessageAuthProviders>({ github: false, google: false })
const authLoading = ref(true)
const oauthRedirectingProvider = ref<'github' | 'google' | null>(null)
const sortOrder = ref<SortOrder>('newest')
const feedTab = ref<FeedTab>('public')
const adminMessages = ref<AdminGuestMessage[]>([])
const adminTotal = ref(0)
const adminLoading = ref(false)
const openReplyId = ref<string | null>(null)
const replyDrafts = ref<Record<string, string>>({})
const replySubmittingId = ref<string | null>(null)
const moderationBusyId = ref<string | null>(null)
const expandedThreads = ref<Record<string, boolean>>({})

const isSiteOwner = computed(() => Boolean(authUser.value?.isSiteOwner))
const isSignedIn = computed(() => Boolean(authUser.value))

const content = ref('')
const captchaId = ref('')
const captchaQuestion = ref('')
const captchaAnswer = ref('')
const captchaLoading = ref(false)
const submitting = ref(false)
const submitToast = ref<string | null>(null)
let submitToastTimer: ReturnType<typeof window.setTimeout> | null = null

const contentLength = computed(() => content.value.length)

const socialProviders = computed(() => [
  { id: 'github' as const, label: t('messages.socialGithub'), enabled: authProviders.value.github },
  { id: 'google' as const, label: t('messages.socialGoogle'), enabled: authProviders.value.google },
])

function repliesOf(msg: GuestMessage): GuestMessageReply[] {
  return msg.replies ?? []
}

function identityLabel(item: { isOwner?: boolean; provider?: string | null }): string {
  if (item.isOwner) return t('messages.ownerBadge')
  if (item.provider === 'github') return 'GitHub'
  if (item.provider === 'google') return 'Google'
  return ''
}

function formatBylineDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

function bylineRest(item: { isOwner?: boolean; provider?: string | null; createdAt?: string }): string {
  const role = identityLabel(item)
  const date = item.createdAt ? formatBylineDate(item.createdAt) : ''
  const parts = [role, date].filter(Boolean)
  return parts.length ? ` · ${parts.join(' · ')}` : ''
}

function replyComposerKey(parentId: string, targetId?: string): string {
  return targetId ? `${parentId}::${targetId}` : parentId
}

function replyPrefixFor(target: GuestMessage | GuestMessageReply): string {
  const role = identityLabel(target)
  const name = role ? `${target.author} · ${role}` : target.author
  return t('messages.replyToPrefix', { name })
}

function visibleReplies(msg: GuestMessage): GuestMessageReply[] {
  const all = repliesOf(msg)
  if (expandedThreads.value[msg.id] || all.length <= THREAD_FOLD) return all
  return all.slice(0, THREAD_FOLD)
}

function hiddenReplyCount(msg: GuestMessage): number {
  return Math.max(0, repliesOf(msg).length - THREAD_FOLD)
}

function toggleThread(id: string) {
  expandedThreads.value = { ...expandedThreads.value, [id]: !expandedThreads.value[id] }
}

function showSubmitToast(text: string) {
  submitToast.value = text
  if (submitToastTimer !== null) window.clearTimeout(submitToastTimer)
  submitToastTimer = window.setTimeout(() => {
    submitToast.value = null
    submitToastTimer = null
  }, 2800)
}

async function loadMessages() {
  messagesLoading.value = true
  try {
    const data = await fetchMessages({ sort: sortOrder.value, page: 1, size: 50 })
    messages.value = data.items.map((m) => ({ ...m, replies: m.replies ?? [] }))
    messagesTotal.value = data.total
  } catch {
    messages.value = []
    messagesTotal.value = 0
    showSubmitToast(t('messages.loadError'))
  } finally {
    messagesLoading.value = false
  }
}

async function loadAdminMessages() {
  adminLoading.value = true
  try {
    const data = await fetchAdminMessages({
      status: 'pending',
      sort: sortOrder.value,
      page: 1,
      size: 50,
    })
    adminMessages.value = data.items
    adminTotal.value = data.total
  } catch {
    adminMessages.value = []
    adminTotal.value = 0
    showSubmitToast(t('messages.adminLoadError'))
  } finally {
    adminLoading.value = false
  }
}

async function loadActiveFeed() {
  if (feedTab.value === 'pending' && isSiteOwner.value) {
    await loadAdminMessages()
  } else {
    await loadMessages()
  }
}

function openReply(parentId: string, target?: GuestMessage | GuestMessageReply) {
  const key = replyComposerKey(parentId, target && 'id' in target && target.id !== parentId ? target.id : undefined)
  openReplyId.value = key
  const prefix = target && target.id !== parentId ? replyPrefixFor(target) : ''
  const current = replyDrafts.value[key] ?? ''
  if (prefix && !current.startsWith(prefix)) {
    replyDrafts.value = { ...replyDrafts.value, [key]: prefix }
  } else if (!(key in replyDrafts.value)) {
    replyDrafts.value = { ...replyDrafts.value, [key]: '' }
  }
}

function closeReply(key: string) {
  if (openReplyId.value === key) openReplyId.value = null
  const next = { ...replyDrafts.value }
  delete next[key]
  replyDrafts.value = next
}

async function onSubmitReply(parent: GuestMessage, key: string) {
  const text = (replyDrafts.value[key] || '').trim()
  if (!text) {
    showSubmitToast(t('messages.contentRequired'))
    return
  }
  replySubmittingId.value = key
  try {
    const updated = await createReply(parent.id, { content: text })
    const idx = messages.value.findIndex((m) => m.id === parent.id)
    if (idx >= 0) {
      messages.value[idx] = { ...updated, replies: updated.replies ?? [] }
    }
    closeReply(key)
    showSubmitToast(t('messages.replySuccess'))
  } catch (e) {
    const err = e as Error & { status?: number }
    if (err.status === 429) {
      showSubmitToast(t('messages.rateLimited'))
    } else {
      showSubmitToast(err.message || t('messages.replyFailed'))
    }
  } finally {
    replySubmittingId.value = null
  }
}

async function onModerate(msg: AdminGuestMessage, action: 'approve' | 'reject') {
  moderationBusyId.value = msg.id
  try {
    await moderateMessage(msg.id, action)
    adminMessages.value = adminMessages.value.filter((m) => m.id !== msg.id)
    adminTotal.value = Math.max(0, adminTotal.value - 1)
    if (action === 'approve') {
      await loadMessages()
    }
    showSubmitToast(
      action === 'approve' ? t('messages.moderationApproved') : t('messages.moderationRejected'),
    )
  } catch (e) {
    const err = e as Error & { status?: number }
    showSubmitToast(err.message || t('messages.moderationFailed'))
  } finally {
    moderationBusyId.value = null
  }
}

async function onDeleteMessage(msg: GuestMessage | AdminGuestMessage) {
  if (!window.confirm(t('messages.deleteConfirm'))) return
  moderationBusyId.value = msg.id
  try {
    await deleteMessage(msg.id)
    messages.value = messages.value.filter((m) => m.id !== msg.id)
    messagesTotal.value = Math.max(0, messagesTotal.value - 1)
    adminMessages.value = adminMessages.value.filter((m) => m.id !== msg.id)
    adminTotal.value = Math.max(0, adminTotal.value - 1)
    showSubmitToast(t('messages.deleteSuccess'))
  } catch (e) {
    const err = e as Error & { status?: number }
    showSubmitToast(err.message || t('messages.deleteFailed'))
  } finally {
    moderationBusyId.value = null
  }
}

async function onBlockAuthor(msg: GuestMessage | AdminGuestMessage) {
  if (msg.isOwner) return
  if (!window.confirm(t('messages.blockConfirm'))) return
  moderationBusyId.value = msg.id
  try {
    await blockMessageAuthor(msg.id)
    await loadActiveFeed()
    showSubmitToast(t('messages.blockSuccess'))
  } catch (e) {
    const err = e as Error & { status?: number }
    showSubmitToast(err.message || t('messages.blockFailed'))
  } finally {
    moderationBusyId.value = null
  }
}

async function refreshCaptcha() {
  captchaLoading.value = true
  try {
    const c = await fetchMessageCaptcha()
    captchaId.value = c.captchaId
    captchaQuestion.value = c.question
    captchaAnswer.value = ''
  } catch {
    captchaId.value = ''
    captchaQuestion.value = ''
    showSubmitToast(t('messages.captchaInvalid'))
  } finally {
    captchaLoading.value = false
  }
}

async function loadAuthState() {
  authLoading.value = true
  try {
    authProviders.value = await fetchMessageAuthProviders()
    authUser.value = await fetchMessageAuthUser()
    if (authUser.value) {
      await refreshCaptcha()
      if (authUser.value.isSiteOwner) {
        try {
          const pending = await fetchAdminMessages({ status: 'pending', page: 1, size: 1 })
          adminTotal.value = pending.total
        } catch {
          adminTotal.value = 0
        }
      }
    }
  } catch {
    authProviders.value = { github: false, google: false }
    authUser.value = null
  } finally {
    authLoading.value = false
  }
}

function onSocialLogin(provider: 'github' | 'google') {
  const row = socialProviders.value.find((p) => p.id === provider)
  if (!row?.enabled) {
    showSubmitToast(t('messages.socialNotConfigured'))
    return
  }
  if (oauthRedirectingProvider.value) return
  oauthRedirectingProvider.value = provider
  void startOAuth(provider, route.fullPath)
}

async function onLogout() {
  try {
    await logoutMessageAuth()
    authUser.value = null
    content.value = ''
    captchaId.value = ''
    captchaQuestion.value = ''
    captchaAnswer.value = ''
  } catch {
    showSubmitToast(t('messages.socialLoginFailed'))
  }
}

function clearAuthQuery() {
  const q = { ...route.query }
  let changed = false
  for (const key of ['auth', 'auth_error']) {
    if (key in q) {
      delete q[key]
      changed = true
    }
  }
  if (changed) void router.replace({ path: route.path, query: q })
}

async function handleAuthCallbackQuery() {
  if (route.query.auth === 'success') {
    await loadAuthState()
    showSubmitToast(t('messages.socialLoginSuccess'))
    clearAuthQuery()
    return
  }
  const err = route.query.auth_error
  if (typeof err === 'string' && err) {
    showSubmitToast(t('messages.socialLoginFailed'))
    clearAuthQuery()
  }
}

async function onSubmit() {
  if (!authUser.value) {
    showSubmitToast(t('messages.loginRequired'))
    return
  }
  const text = content.value.trim()
  if (!text) {
    showSubmitToast(t('messages.contentRequired'))
    return
  }
  if (!captchaId.value || !captchaAnswer.value.trim()) {
    showSubmitToast(t('messages.captchaRequired'))
    return
  }

  submitting.value = true
  try {
    const created = await createMessage({
      content: text,
      captchaId: captchaId.value,
      captchaAnswer: captchaAnswer.value.trim(),
    })
    content.value = ''
    if (created) {
      if (sortOrder.value === 'newest') {
        messages.value = [{ ...created, replies: created.replies ?? [] }, ...messages.value]
        messagesTotal.value += 1
      } else {
        await loadMessages()
      }
      showSubmitToast(t('messages.submitSuccess'))
    } else {
      showSubmitToast(t('messages.submitPending'))
    }
    await refreshCaptcha()
  } catch (e) {
    const err = e as Error & { status?: number }
    const msg = err.message || t('messages.formIncomplete')
    showSubmitToast(err.status === 429 ? t('messages.rateLimited') : msg)
    await refreshCaptcha()
  } finally {
    submitting.value = false
  }
}

watch(sortOrder, () => {
  void loadActiveFeed()
})

watch(feedTab, () => {
  void loadActiveFeed()
})

onMounted(async () => {
  await handleAuthCallbackQuery()
  await loadActiveFeed()
  if (!enterPlayed.value) {
    enterPlayed.value = true
    await playPageEnter(pageRoot.value)
  }
  if (route.query.auth !== 'success') {
    await loadAuthState()
  } else if (authUser.value) {
    await refreshCaptcha()
  }
})
</script>

<template>
  <section ref="pageRoot" class="message-page">
    <h1 class="h">{{ t('messages.title') }}</h1>

    <div class="ed-filter">
      <p class="ed-kicker">
        <span class="ed-en">{{ t('messages.kickerWriteEn') }}</span>
        <span class="ed-mid" aria-hidden="true">·</span>
        <span class="ed-zh">{{ t('messages.kickerWriteZh') }}</span>
      </p>

      <div v-if="!authUser" role="region" :aria-label="t('messages.socialLabel')" :aria-busy="oauthRedirectingProvider !== null">
        <p class="message-write-hint">{{ t('messages.writeHint') }}</p>
        <div class="message-actions">
          <button
            v-for="p in socialProviders"
            :key="p.id"
            type="button"
            class="ed-action"
            :disabled="authLoading || oauthRedirectingProvider !== null"
            :title="p.enabled ? undefined : t('messages.socialNotConfigured')"
            @click="onSocialLogin(p.id)"
          >
            <span v-if="oauthRedirectingProvider === p.id" class="message-social-btn-spinner" aria-hidden="true" />
            {{
              oauthRedirectingProvider === p.id
                ? p.id === 'github'
                  ? t('messages.socialRedirectingGithub')
                  : t('messages.socialRedirectingGoogle')
                : p.label
            }}
          </button>
        </div>
      </div>

      <form v-else class="message-compose" @submit.prevent="onSubmit">
        <div class="message-who">
          <MessageAvatarWithProvider
            :src="authUser.avatar_url"
            :alt="authUser.name"
            :fallback-letter="authUser.name"
            :provider="authUser.provider"
            size="sm"
          />
          <span class="message-who-name">{{ authUser.name }}</span>
          <button type="button" class="ed-action ghost" @click="onLogout">
            {{ t('messages.socialLogout') }}
          </button>
        </div>
        <label>
          <span class="visually-hidden">{{ t('messages.fieldContent') }}</span>
          <textarea
            v-model="content"
            name="content"
            rows="3"
            :maxlength="MESSAGE_MAX_LEN"
            :placeholder="t('messages.fieldContentPh')"
          />
        </label>
        <div class="message-compose-meta">
          <label class="message-captcha-field">
            <span>{{ t('messages.captchaLabel') }}</span>
            <span>{{ captchaQuestion || '…' }}</span>
            <input
              v-model="captchaAnswer"
              type="text"
              inputmode="numeric"
              class="message-captcha-input"
              :placeholder="t('messages.captchaPlaceholder')"
              :disabled="captchaLoading"
              autocomplete="off"
            />
          </label>
          <button type="button" class="message-text-btn" :disabled="captchaLoading" @click="refreshCaptcha">
            {{ t('messages.captchaRefresh') }}
          </button>
          <span class="message-count">{{ t('messages.charCount', { current: contentLength, max: MESSAGE_MAX_LEN }) }}</span>
        </div>
        <div class="message-compose-foot">
          <button type="submit" class="ed-action" :disabled="submitting || captchaLoading">
            {{ submitting ? t('messages.submitting') : t('messages.submit') }}
          </button>
          <p class="message-policy">{{ t('messages.contentPolicy') }}</p>
        </div>
      </form>

      <Transition name="message-toast-fade">
        <p v-if="submitToast" class="message-submit-toast" role="status">{{ submitToast }}</p>
      </Transition>
    </div>

    <header class="message-inbox-head">
      <p class="ed-kicker">
        <span class="ed-en">{{ t('messages.kickerInboxEn') }}</span>
        <span class="ed-mid" aria-hidden="true">·</span>
        <span class="ed-zh">{{ t('messages.kickerInboxZh') }}</span>
      </p>
      <div class="message-inbox-tools">
        <span>
          {{
            feedTab === 'pending'
              ? t('messages.adminFeedCount', { count: adminTotal })
              : t('messages.feedCount', { count: messagesTotal })
          }}
        </span>
        <button
          type="button"
          class="message-text-btn"
          :class="{ 'is-on': sortOrder === 'newest' }"
          @click="sortOrder = 'newest'"
        >
          {{ t('messages.sortNewest') }}
        </button>
        <button
          type="button"
          class="message-text-btn"
          :class="{ 'is-on': sortOrder === 'oldest' }"
          @click="sortOrder = 'oldest'"
        >
          {{ t('messages.sortOldest') }}
        </button>
        <template v-if="isSiteOwner">
          <button
            type="button"
            class="message-text-btn"
            :class="{ 'is-on': feedTab === 'public' }"
            @click="feedTab = 'public'"
          >
            {{ t('messages.feedTabPublic') }}
          </button>
          <button
            type="button"
            class="message-text-btn"
            :class="{ 'is-on': feedTab === 'pending' }"
            @click="feedTab = 'pending'"
          >
            {{ t('messages.feedTabPending') }}
            <template v-if="adminTotal > 0 && feedTab !== 'pending'"> {{ adminTotal }}</template>
          </button>
        </template>
      </div>
    </header>

    <ul v-if="feedTab === 'pending' && isSiteOwner" class="message-list">
      <li v-if="adminLoading" class="message-list-hint">{{ t('messages.loading') }}…</li>
      <li v-else-if="!adminMessages.length" class="message-list-hint">{{ t('messages.adminEmpty') }}</li>
      <li
        v-for="(msg, index) in adminMessages"
        :key="msg.id"
        class="message-row"
        :style="{ '--enter-i': String(index) }"
      >
        <div class="message-main">
          <MessageAvatarWithProvider
            :src="msg.avatarUrl"
            :alt="msg.author"
            :fallback-letter="msg.author"
            :provider="msg.provider"
            :fallback-hue="msg.avatarHue"
            size="sm"
          />
          <div class="message-body">
            <header class="message-byline">
              <span class="message-byline-name">{{ msg.author }}</span>
              <span class="message-byline-rest">{{ bylineRest(msg) }}</span>
              <span class="message-pending-mark">{{ t('messages.pendingBadge') }}</span>
            </header>
            <p class="message-content">{{ msg.content }}</p>
            <div class="message-row-actions">
              <button
                type="button"
                class="ed-action"
                :disabled="moderationBusyId === msg.id"
                @click="onModerate(msg, 'approve')"
              >
                {{ t('messages.moderationApprove') }}
              </button>
              <button
                type="button"
                class="ed-action danger"
                :disabled="moderationBusyId === msg.id"
                @click="onModerate(msg, 'reject')"
              >
                {{ t('messages.moderationReject') }}
              </button>
              <button
                v-if="!msg.isOwner"
                type="button"
                class="ed-action warn"
                :disabled="moderationBusyId === msg.id"
                @click="onBlockAuthor(msg)"
              >
                {{ t('messages.blockAuthor') }}
              </button>
              <button
                type="button"
                class="ed-action danger"
                :disabled="moderationBusyId === msg.id"
                @click="onDeleteMessage(msg)"
              >
                {{ t('messages.deleteMessage') }}
              </button>
            </div>
          </div>
        </div>
      </li>
    </ul>

    <ul v-else class="message-list">
      <li v-if="messagesLoading" class="message-list-hint">{{ t('messages.loading') }}…</li>
      <li v-else-if="!messages.length" class="message-list-hint">{{ t('messages.empty') }}</li>
      <li
        v-for="(msg, index) in messages"
        :key="msg.id"
        class="message-row"
        :style="{ '--enter-i': String(index) }"
      >
        <div class="message-main">
          <MessageAvatarWithProvider
            :src="msg.avatarUrl"
            :alt="msg.author"
            :fallback-letter="msg.author"
            :provider="msg.provider"
            :fallback-hue="msg.avatarHue"
            size="sm"
          />
          <div class="message-body">
            <header class="message-byline">
              <a
                v-if="msg.profileUrl"
                class="message-byline-name"
                :href="msg.profileUrl"
                target="_blank"
                rel="noopener noreferrer"
              >{{ msg.author }}</a>
              <span v-else class="message-byline-name">{{ msg.author }}</span>
              <span class="message-byline-rest">{{ bylineRest(msg) }}</span>
            </header>
            <p class="message-content">{{ msg.content }}</p>

            <div v-if="isSiteOwner" class="message-row-actions">
              <button
                v-if="!msg.isOwner"
                type="button"
                class="ed-action warn"
                :disabled="moderationBusyId === msg.id"
                @click="onBlockAuthor(msg)"
              >
                {{ t('messages.blockAuthor') }}
              </button>
              <button
                type="button"
                class="ed-action danger"
                :disabled="moderationBusyId === msg.id"
                @click="onDeleteMessage(msg)"
              >
                {{ t('messages.deleteMessage') }}
              </button>
            </div>

            <button
              v-if="isSignedIn && openReplyId !== replyComposerKey(msg.id)"
              type="button"
              class="message-reply-open"
              @click="openReply(msg.id, msg)"
            >
              {{ t('messages.replyToggle') }}
            </button>
            <div v-if="isSignedIn && openReplyId === replyComposerKey(msg.id)" class="message-reply-box">
              <textarea
                v-model="replyDrafts[replyComposerKey(msg.id)]"
                rows="2"
                :maxlength="MESSAGE_MAX_LEN"
                :placeholder="t('messages.replyPlaceholder')"
              />
              <div class="message-reply-box-actions">
                <button
                  type="button"
                  class="ed-action"
                  :disabled="replySubmittingId === replyComposerKey(msg.id)"
                  @click="onSubmitReply(msg, replyComposerKey(msg.id))"
                >
                  {{
                    replySubmittingId === replyComposerKey(msg.id)
                      ? t('messages.replySubmitting')
                      : t('messages.replySubmit')
                  }}
                </button>
                <button
                  type="button"
                  class="ed-action danger"
                  @click="closeReply(replyComposerKey(msg.id))"
                >
                  {{ t('messages.replyCancel') }}
                </button>
              </div>
            </div>

            <div v-if="repliesOf(msg).length" class="message-thread-wrap">
              <ol class="message-thread">
                <li v-for="reply in visibleReplies(msg)" :key="reply.id">
                  <MessageAvatarWithProvider
                    :src="reply.avatarUrl"
                    :alt="reply.author"
                    :fallback-letter="reply.author"
                    :provider="reply.provider"
                    size="xs"
                    :fallback-hue="42"
                  />
                  <div>
                    <p class="message-byline">
                      <a
                        v-if="reply.profileUrl"
                        class="message-byline-name"
                        :href="reply.profileUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                      >{{ reply.author }}</a>
                      <span v-else class="message-byline-name">{{ reply.author }}</span>
                      <span class="message-byline-rest">{{ bylineRest(reply) }}</span>
                    </p>
                    <blockquote class="message-pull">{{ reply.content }}</blockquote>
                    <button
                      v-if="isSignedIn && openReplyId !== replyComposerKey(msg.id, reply.id)"
                      type="button"
                      class="message-reply-open"
                      @click="openReply(msg.id, reply)"
                    >
                      {{ t('messages.replyToggle') }}
                    </button>
                    <div
                      v-if="isSignedIn && openReplyId === replyComposerKey(msg.id, reply.id)"
                      class="message-row-actions"
                    >
                      <div class="message-reply-box">
                        <textarea
                          v-model="replyDrafts[replyComposerKey(msg.id, reply.id)]"
                          rows="2"
                          :maxlength="MESSAGE_MAX_LEN"
                          :placeholder="t('messages.replyPlaceholder')"
                        />
                        <div class="message-reply-box-actions">
                          <button
                            type="button"
                            class="ed-action"
                            :disabled="replySubmittingId === replyComposerKey(msg.id, reply.id)"
                            @click="onSubmitReply(msg, replyComposerKey(msg.id, reply.id))"
                          >
                            {{
                              replySubmittingId === replyComposerKey(msg.id, reply.id)
                                ? t('messages.replySubmitting')
                                : t('messages.replySubmit')
                            }}
                          </button>
                          <button
                            type="button"
                            class="ed-action danger"
                            @click="closeReply(replyComposerKey(msg.id, reply.id))"
                          >
                            {{ t('messages.replyCancel') }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ol>
              <button
                v-if="hiddenReplyCount(msg) > 0"
                type="button"
                class="message-thread-fold"
                :class="{ 'is-expanded': expandedThreads[msg.id] }"
                :aria-expanded="Boolean(expandedThreads[msg.id])"
                @click="toggleThread(msg.id)"
              >
                <span class="message-thread-fold-chevron" aria-hidden="true" />
                <span>
                  {{
                    expandedThreads[msg.id]
                      ? t('messages.threadCollapse')
                      : t('messages.threadExpand')
                  }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
