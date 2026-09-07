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
    0: 'friends-status-badge--pending',
    1: 'friends-status-badge--published',
    2: 'friends-status-badge--hidden',
    3: 'friends-status-badge--rejected',
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
    <p class="friends-back">
      <RouterLink to="/friends">← {{ t('friends.title') }}</RouterLink>
    </p>
    <h1 class="h">{{ t('friends.adminTitle') }}</h1>

    <p v-if="authLoading" class="friends-empty friends-empty--inset" role="status">{{ t('friends.loading') }}</p>

    <div v-else-if="!isSiteOwner" class="friends-admin-gate">
      <p class="friends-hint">{{ t('friends.adminLoginRequired') }}</p>
      <div class="friends-compose-foot">
        <RouterLink to="/messages" class="ed-action">{{ t('friends.adminGoLogin') }}</RouterLink>
      </div>
    </div>

    <template v-else>
      <div class="ed-filter">
        <p class="ed-kicker">
          <span class="ed-en">{{ t('friends.kickerReviewEn') }}</span>
          <span class="ed-mid" aria-hidden="true">·</span>
          <span class="ed-zh">{{ t('friends.kickerReviewZh') }}</span>
        </p>
        <p class="friends-hint">{{ t('friends.adminSubtitle') }}</p>
        <div class="friends-admin-tabs" role="tablist" :aria-label="t('friends.adminTabLabel')">
          <button
            v-for="tab in statusTabs"
            :key="tab"
            type="button"
            role="tab"
            class="friends-text-btn"
            :class="{ 'is-on': adminTab === tab }"
            :aria-selected="adminTab === tab"
            @click="adminTab = tab"
          >
            {{ t(`friends.adminTab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`) }}
          </button>
        </div>
      </div>

      <header class="friends-section-head friends-section-head--inset">
        <p class="ed-kicker">
          <span class="ed-en">{{ t('friends.kickerQueueEn') }}</span>
          <span class="ed-mid" aria-hidden="true">·</span>
          <span class="ed-zh">{{ t('friends.kickerQueueZh') }}</span>
        </p>
        <span class="friends-section-tools">{{ t('friends.adminFeedCount', { count: total }) }}</span>
      </header>

      <p v-if="listLoading" class="friends-empty friends-empty--inset" role="status">{{ t('friends.loading') }}</p>
      <p v-else-if="!items.length" class="friends-empty friends-empty--inset">{{ t('friends.adminEmpty') }}</p>
      <template v-else>
        <template v-for="(item, index) in items" :key="item.id">
          <div
            v-if="showGroupDivider(index)"
            class="friends-review-split"
            aria-hidden="true"
          />
          <article
            v-if="drafts[item.id]"
            class="friends-review-card"
            :style="{ '--enter-i': String(index) }"
          >
            <div class="friends-review-head">
              <span class="friends-status-badge" :class="statusBadgeClass(item.status)">
                {{ statusLabel(item.status) }}
              </span>
              <time :datetime="item.createdAt">{{ item.createdAt }}</time>
            </div>

            <label class="ed-search">
              {{ t('friends.applyFieldName') }}
              <input v-model="drafts[item.id].name" type="text" />
            </label>
            <label class="ed-search">
              {{ t('friends.applyFieldUrl') }}
              <input v-model="drafts[item.id].url" type="url" />
            </label>
            <label class="ed-search">
              {{ t('friends.applyFieldAvatar') }}
              <input
                v-model="drafts[item.id].avatarUrl"
                type="url"
                :placeholder="t('friends.applyFieldAvatarPh')"
              />
            </label>
            <div v-if="previewAvatarFor(item.id)" class="friends-icon-preview">
              <img
                :src="previewAvatarFor(item.id)"
                :alt="drafts[item.id].name || t('friends.applyPreviewAlt')"
                width="48"
                height="48"
                loading="lazy"
              />
              <p>{{ t('friends.applyAvatarHint') }}</p>
            </div>
            <label class="friends-bio-field">
              {{ t('friends.applyFieldDesc') }}
              <textarea v-model="drafts[item.id].description" class="friends-bio" rows="2" />
            </label>
            <div class="friends-review-grid">
              <label class="ed-search">
                {{ t('friends.applyFieldEmail') }}
                <input v-model="drafts[item.id].contactEmail" type="email" />
              </label>
              <label class="ed-search">
                {{ t('friends.adminSortOrder') }}
                <input v-model="drafts[item.id].sortOrder" type="number" />
              </label>
            </div>

            <div class="friends-review-actions">
              <button
                type="button"
                class="ed-action"
                :disabled="busyId === item.id"
                @click="onSave(item)"
              >
                {{ t('friends.adminSave') }}
              </button>
              <button
                v-if="canModerateApprove(item)"
                type="button"
                class="ed-action"
                :disabled="busyId === item.id"
                @click="onModerate(item, 'approve')"
              >
                {{ t('friends.adminApprove') }}
              </button>
              <button
                v-if="canModerateReject(item)"
                type="button"
                class="ed-action danger"
                :disabled="busyId === item.id"
                @click="onModerate(item, 'reject')"
              >
                {{ t('friends.adminReject') }}
              </button>
              <button
                v-if="canModerateHide(item)"
                type="button"
                class="ed-action ghost"
                :disabled="busyId === item.id"
                @click="onModerate(item, 'hide')"
              >
                {{ t('friends.adminHide') }}
              </button>
              <button
                v-if="canModerateRestore(item)"
                type="button"
                class="ed-action"
                :disabled="busyId === item.id"
                @click="onModerate(item, 'restore')"
              >
                {{ t('friends.adminRestore') }}
              </button>
            </div>
          </article>
        </template>
      </template>
    </template>

    <Transition name="friends-toast-fade">
      <p v-if="toast" class="friends-admin-toast" role="status">{{ toast }}</p>
    </Transition>
  </section>
</template>
