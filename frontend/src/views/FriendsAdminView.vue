<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import {
  fetchAdminFriends,
  patchAdminFriend,
  type AdminFriendLink,
  type FriendAdminStatusFilter,
  type FriendLinkStatus,
  type FriendModerationAction,
} from '@/services/friendsApi'
import { fetchMessageAuthUser } from '@/services/messageAuth'
import { resolveFriendAvatar } from '@/utils/siteFavicon'
import '@/styles/page-enter-friends.css'
import '@/styles/page-friends.css'

type AdminTab = FriendAdminStatusFilter

const { t } = useI18n()
const route = useRoute()

useSeoMeta(() => ({
  title: `${t('friends.adminTitle')} | ${SITE_NAME}`,
  description: t('friends.adminSeoDescription'),
  path: route.path,
  type: 'website',
  robots: 'noindex, nofollow',
}))

const pageRoot = ref<HTMLElement | null>(null)
const authLoading = ref(true)
const isSiteOwner = ref(false)
const adminTab = ref<AdminTab>('all')
const items = ref<AdminFriendLink[]>([])
const total = ref(0)
const listLoading = ref(false)
const busyId = ref<string | null>(null)
const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof window.setTimeout> | null = null

const drafts = ref<Record<string, {
  name: string
  url: string
  description: string
  avatarUrl: string
  contactEmail: string
  sortOrder: string
}>>({})

const statusTabs: AdminTab[] = ['all', 'pending', 'published', 'hidden', 'rejected']

function showToast(text: string) {
  toast.value = text
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = null
    toastTimer = null
  }, 4200)
}

function statusLabel(status: FriendLinkStatus): string {
  const map: Record<FriendLinkStatus, string> = {
    0: t('friends.adminStatusPending'),
    1: t('friends.adminStatusPublished'),
    2: t('friends.adminStatusHidden'),
    3: t('friends.adminStatusRejected'),
  }
  return map[status] ?? String(status)
}

function statusBadgeClass(status: FriendLinkStatus): string {
  const map: Record<FriendLinkStatus, string> = {
    0: 'friends-admin-status-badge--pending',
    1: 'friends-admin-status-badge--published',
    2: 'friends-admin-status-badge--hidden',
    3: 'friends-admin-status-badge--rejected',
  }
  return map[status] ?? ''
}

function showGroupDivider(index: number): boolean {
  if (adminTab.value !== 'all' || index <= 0) return false
  return items.value[index - 1]?.status !== items.value[index]?.status
}

function previewAvatarFor(itemId: string): string {
  const draft = drafts.value[itemId]
  if (!draft) return ''
  return resolveFriendAvatar(draft.url, draft.avatarUrl)
}

function ensureDraft(item: AdminFriendLink) {
  if (drafts.value[item.id]) return
  drafts.value[item.id] = {
    name: item.name,
    url: item.url,
    description: item.description,
    avatarUrl: item.avatar ?? '',
    contactEmail: item.contactEmail ?? '',
    sortOrder: String(item.sortOrder ?? 0),
  }
}

async function loadList() {
  listLoading.value = true
  try {
    const data = await fetchAdminFriends({
      status: adminTab.value,
      sort: 'newest',
      page: 1,
      size: 50,
    })
    items.value = data.items
    total.value = data.total
    for (const item of data.items) ensureDraft(item)
  } catch (e) {
    items.value = []
    total.value = 0
    showToast(e instanceof Error ? e.message : t('friends.adminLoadError'))
  } finally {
    listLoading.value = false
  }
}

async function onSave(item: AdminFriendLink) {
  const draft = drafts.value[item.id]
  if (!draft) return
  busyId.value = item.id
  try {
    const { item: updated, message } = await patchAdminFriend(item.id, {
      name: draft.name.trim(),
      url: draft.url.trim(),
      description: draft.description.trim(),
      avatarUrl: draft.avatarUrl.trim() || undefined,
      contactEmail: draft.contactEmail.trim() || undefined,
      sortOrder: Number.parseInt(draft.sortOrder, 10) || 0,
    })
    const idx = items.value.findIndex((x) => x.id === item.id)
    if (idx >= 0) items.value[idx] = updated
    ensureDraft(updated)
    drafts.value[item.id] = {
      name: updated.name,
      url: updated.url,
      description: updated.description,
      avatarUrl: updated.avatar ?? '',
      contactEmail: updated.contactEmail ?? '',
      sortOrder: String(updated.sortOrder ?? 0),
    }
    showToast(message || t('friends.adminSaveSuccess'))
  } catch (e) {
    showToast(e instanceof Error ? e.message : t('friends.adminSaveFailed'))
  } finally {
    busyId.value = null
  }
}

async function onModerate(item: AdminFriendLink, action: FriendModerationAction) {
  busyId.value = item.id
  try {
    const { item: updated, message } = await patchAdminFriend(item.id, { action })
    if (adminTab.value !== 'all' && updated.status !== tabToStatus(adminTab.value)) {
      items.value = items.value.filter((x) => x.id !== item.id)
      total.value = Math.max(0, total.value - 1)
    } else {
      const idx = items.value.findIndex((x) => x.id === item.id)
      if (idx >= 0) items.value[idx] = updated
      ensureDraft(updated)
    }
    const actionMsg =
      action === 'approve'
        ? t('friends.adminModerationApproved')
        : action === 'reject'
          ? t('friends.adminModerationRejected')
          : action === 'hide'
            ? t('friends.adminModerationHidden')
            : t('friends.adminModerationRestored')
    showToast(message || actionMsg)
  } catch (e) {
    showToast(e instanceof Error ? e.message : t('friends.adminModerationFailed'))
  } finally {
    busyId.value = null
  }
}

function tabToStatus(tab: AdminTab): FriendLinkStatus | null {
  if (tab === 'pending') return 0
  if (tab === 'published') return 1
  if (tab === 'hidden') return 2
  if (tab === 'rejected') return 3
  return null
}

const canModerateApprove = (item: AdminFriendLink) => item.status === 0 || item.status === 2
const canModerateReject = (item: AdminFriendLink) => item.status === 0
const canModerateHide = (item: AdminFriendLink) => item.status === 1
const canModerateRestore = (item: AdminFriendLink) => item.status === 2

watch(adminTab, () => {
  void loadList()
})

onMounted(async () => {
  try {
    const user = await fetchMessageAuthUser()
    isSiteOwner.value = Boolean(user?.isSiteOwner)
  } finally {
    authLoading.value = false
  }
  if (isSiteOwner.value) {
    await loadList()
  }
  await playPageEnter(pageRoot.value)
})
</script>

<template>
  <section ref="pageRoot" class="friends-admin-page">
    <header class="message-hero">
      <p class="message-hero-eyebrow">{{ t('friends.adminEyebrow') }}</p>
      <h1 class="message-hero-title">{{ t('friends.adminTitle') }}</h1>
      <p class="message-hero-sub">{{ t('friends.adminSubtitle') }}</p>
    </header>

    <p class="friends-apply-back">
      <RouterLink to="/friends" class="friends-apply-back-link">{{ t('friends.backToList') }}</RouterLink>
    </p>

    <p v-if="authLoading" class="friends-admin-hint" role="status">{{ t('friends.loading') }}</p>
    <div v-else-if="!isSiteOwner" class="friends-admin-gate card">
      <p class="friends-admin-gate-text">{{ t('friends.adminLoginRequired') }}</p>
      <RouterLink to="/messages" class="btn-accent friends-admin-gate-link">{{ t('friends.adminGoLogin') }}</RouterLink>
    </div>

    <template v-else>
      <div class="friends-admin-tabs" role="tablist" :aria-label="t('friends.adminTabLabel')">
        <button
          v-for="tab in statusTabs"
          :key="tab"
          type="button"
          role="tab"
          class="friends-admin-tab"
          :class="{ 'is-active': adminTab === tab }"
          :aria-selected="adminTab === tab"
          @click="adminTab = tab"
        >
          {{ t(`friends.adminTab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`) }}
        </button>
      </div>

      <p class="friends-admin-meta">{{ t('friends.adminFeedCount', { count: total }) }}</p>

      <ul class="friends-admin-list" role="list">
        <li v-if="listLoading" class="friends-admin-hint">{{ t('friends.loading') }}…</li>
        <li v-else-if="!items.length" class="friends-admin-hint">{{ t('friends.adminEmpty') }}</li>
        <template v-else>
          <template v-for="(item, index) in items" :key="item.id">
            <li
              v-if="showGroupDivider(index)"
              class="friends-admin-group-divider"
              aria-hidden="true"
            />
            <li
              class="friends-admin-item card card-glass-dense"
              :style="{ '--enter-i': String(index) }"
            >
              <template v-if="drafts[item.id]">
              <div class="friends-admin-item-head">
                <span
                  class="friends-admin-status-badge"
                  :class="statusBadgeClass(item.status)"
                >{{ statusLabel(item.status) }}</span>
                <time class="friends-admin-time" :datetime="item.createdAt">{{ item.createdAt }}</time>
              </div>

          <div class="friends-admin-fields">
            <label class="friends-admin-field">
              <span class="friends-admin-label">{{ t('friends.applyFieldName') }}</span>
              <input v-model="drafts[item.id].name" type="text" class="friends-admin-input" />
            </label>
            <label class="friends-admin-field">
              <span class="friends-admin-label">{{ t('friends.applyFieldUrl') }}</span>
              <input v-model="drafts[item.id].url" type="url" class="friends-admin-input" />
            </label>
            <label class="friends-admin-field friends-admin-field--avatar">
              <span class="friends-admin-label">{{ t('friends.applyFieldAvatar') }}</span>
              <div class="friends-admin-avatar-row">
                <input
                  v-model="drafts[item.id].avatarUrl"
                  type="url"
                  class="friends-admin-input"
                  :placeholder="t('friends.applyFieldAvatarPh')"
                />
                <img
                  v-if="previewAvatarFor(item.id)"
                  class="friends-admin-avatar-preview"
                  :src="previewAvatarFor(item.id)"
                  :alt="drafts[item.id].name || t('friends.applyPreviewAlt')"
                  width="48"
                  height="48"
                  loading="lazy"
                />
              </div>
            </label>
            <label class="friends-admin-field friends-admin-field--full">
              <span class="friends-admin-label">{{ t('friends.applyFieldDesc') }}</span>
              <textarea v-model="drafts[item.id].description" rows="2" class="friends-admin-textarea" />
            </label>
            <label class="friends-admin-field">
              <span class="friends-admin-label">{{ t('friends.applyFieldEmail') }}</span>
              <input v-model="drafts[item.id].contactEmail" type="email" class="friends-admin-input" />
            </label>
            <label class="friends-admin-field friends-admin-field--narrow">
              <span class="friends-admin-label">{{ t('friends.adminSortOrder') }}</span>
              <input v-model="drafts[item.id].sortOrder" type="number" class="friends-admin-input" />
            </label>
          </div>

          <div class="friends-admin-actions">
            <button
              type="button"
              class="friends-admin-btn friends-admin-btn--save"
              :disabled="busyId === item.id"
              @click="onSave(item)"
            >
              {{ t('friends.adminSave') }}
            </button>
            <button
              v-if="canModerateApprove(item)"
              type="button"
              class="friends-admin-btn friends-admin-btn--approve"
              :disabled="busyId === item.id"
              @click="onModerate(item, 'approve')"
            >
              {{ t('friends.adminApprove') }}
            </button>
            <button
              v-if="canModerateReject(item)"
              type="button"
              class="friends-admin-btn friends-admin-btn--reject"
              :disabled="busyId === item.id"
              @click="onModerate(item, 'reject')"
            >
              {{ t('friends.adminReject') }}
            </button>
            <button
              v-if="canModerateHide(item)"
              type="button"
              class="friends-admin-btn friends-admin-btn--hide"
              :disabled="busyId === item.id"
              @click="onModerate(item, 'hide')"
            >
              {{ t('friends.adminHide') }}
            </button>
            <button
              v-if="canModerateRestore(item)"
              type="button"
              class="friends-admin-btn friends-admin-btn--restore"
              :disabled="busyId === item.id"
              @click="onModerate(item, 'restore')"
            >
              {{ t('friends.adminRestore') }}
            </button>
          </div>
          </template>
            </li>
          </template>
        </template>
      </ul>
    </template>

    <Transition name="friends-toast-fade">
      <p v-if="toast" class="friends-admin-toast" role="status">{{ toast }}</p>
    </Transition>
  </section>
</template>

<style scoped>
.friends-admin-page {
  max-width: 42rem;
  margin: 0 auto;
}

.message-hero {
  text-align: center;
  padding: 0.35rem 0 0.15rem;
}

.message-hero-eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.82rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.message-hero-title {
  margin: 0;
  font-size: clamp(1.85rem, 4.5vw, 2.35rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  background: linear-gradient(
    120deg,
    var(--color-text) 0%,
    color-mix(in srgb, var(--color-accent) 72%, var(--color-text)) 55%,
    var(--color-accent) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.message-hero-sub {
  margin: 0.55rem auto 0;
  max-width: 28rem;
  font-size: 0.98rem;
  color: var(--color-text-muted);
  line-height: 1.55;
}

.friends-admin-hint {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.friends-admin-gate {
  padding: 1.25rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  align-items: flex-start;
}

.friends-admin-gate-text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--color-text-muted);
}

.friends-admin-gate-link {
  text-decoration: none;
}

.friends-admin-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.75rem 0 0.35rem;
}

.friends-admin-tab {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.friends-admin-tab.is-active {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-accent);
}

.friends-admin-meta {
  margin: 0 0 0.85rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.friends-admin-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.friends-admin-item {
  padding: 1rem 1.1rem;
}

.friends-admin-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}

.friends-admin-status-badge {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  border: 1px solid var(--color-border);
}

.friends-admin-status-badge--pending {
  color: #b8860b;
  border-color: color-mix(in srgb, #c9a227 42%, var(--color-border));
  background: color-mix(in srgb, #c9a227 12%, transparent);
}

.friends-admin-status-badge--published {
  color: var(--color-accent);
  border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.friends-admin-status-badge--hidden {
  color: var(--color-text-muted);
  border-color: color-mix(in srgb, var(--color-text-muted) 28%, var(--color-border));
  background: color-mix(in srgb, var(--color-text-muted) 10%, transparent);
}

.friends-admin-status-badge--rejected {
  color: #c44;
  border-color: color-mix(in srgb, #c44 35%, var(--color-border));
  background: color-mix(in srgb, #c44 12%, transparent);
}

.friends-admin-group-divider {
  list-style: none;
  margin: 0.15rem 0;
  padding: 0;
  border: none;
  border-top: 1px solid var(--color-border);
}

.friends-admin-time {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.friends-admin-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem 0.75rem;
}

.friends-admin-field {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  min-width: 0;
}

.friends-admin-field--full {
  grid-column: 1 / -1;
}

.friends-admin-field--avatar {
  grid-column: 1 / -1;
}

.friends-admin-avatar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.friends-admin-avatar-row .friends-admin-input {
  flex: 1;
  min-width: 0;
}

.friends-admin-avatar-preview {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid var(--glass-card-border);
  flex-shrink: 0;
}

.friends-admin-field--narrow {
  max-width: 8rem;
}

.friends-admin-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.friends-admin-input,
.friends-admin-textarea {
  width: 100%;
  padding: 0.5rem 0.62rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text);
  font-size: 0.88rem;
  font-family: inherit;
}

.friends-admin-input:focus,
.friends-admin-textarea:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: -1px;
}

.friends-admin-textarea {
  resize: vertical;
  min-height: 3.5rem;
}

.friends-admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.85rem;
}

.friends-admin-btn {
  padding: 0.38rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.friends-admin-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.friends-admin-btn--save {
  color: var(--color-accent);
  border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
}

.friends-admin-btn--approve {
  color: var(--color-accent);
}

.friends-admin-btn--reject {
  color: #c44;
  border-color: color-mix(in srgb, #c44 35%, var(--color-border));
}

.friends-admin-btn--hide,
.friends-admin-btn--restore {
  color: var(--color-text-muted);
}

.friends-admin-toast {
  position: fixed;
  left: 50%;
  bottom: max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 4.5rem));
  transform: translateX(-50%);
  z-index: calc(var(--z-footer-meta-bar, 180) + 5);
  margin: 0;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-card);
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-accent);
  white-space: nowrap;
  max-width: min(92vw, 28rem);
  overflow: hidden;
  text-overflow: ellipsis;
}

.friends-toast-fade-enter-active,
.friends-toast-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.friends-toast-fade-enter-from,
.friends-toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

@media (max-width: 640px) {
  .friends-admin-fields {
    grid-template-columns: 1fr;
  }

  .friends-admin-field--narrow {
    max-width: none;
  }
}
</style>
