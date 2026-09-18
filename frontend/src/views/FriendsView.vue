<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import type { FriendLink, SpecialLink } from '@/content/data/mockFriends'
import PageStatusBlock from '@/components/ui/PageStatusBlock.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { fetchFriendLinks, fetchSpecialLinks } from '@/services/friendsApi'
import { fetchMessageAuthUser } from '@/services/messageAuth'
import SpecialLinkAvatar from '@/components/friends/SpecialLinkAvatar.vue'
import { resolveFriendAvatar } from '@/utils/siteFavicon'
import '@/styles/page-enter-friends.css'
import '@/styles/page-friends.css'

const { t } = useI18n()
const route = useRoute()

useSeoMeta(() => ({
  title: `${t('friends.title')} | ${SITE_NAME}`,
  description: t('friends.seoDescription'),
  path: route.path,
  type: 'website',
}))

const pageRoot = ref<HTMLElement | null>(null)
const friends = ref<FriendLink[]>([])
const specialLinks = ref<SpecialLink[]>([])
const loading = ref(true)
const loadError = ref(false)
const isSiteOwner = ref(false)

const friendCount = computed(() => friends.value.length)
const specialCount = computed(() => specialLinks.value.length)

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function friendAvatarSrc(friend: FriendLink): string {
  return resolveFriendAvatar(friend.url, friend.avatar)
}

function specialAvatarSrc(item: SpecialLink): string {
  return resolveFriendAvatar(item.url, item.avatar)
}

onMounted(async () => {
  await loadFriends()
  await playPageEnter(pageRoot.value)
})

async function loadFriends() {
  loading.value = true
  loadError.value = false
  try {
    const [linkList, specialList, authUser] = await Promise.all([
      fetchFriendLinks(),
      fetchSpecialLinks(),
      fetchMessageAuthUser().catch(() => null),
    ])
    friends.value = linkList
    specialLinks.value = specialList
    isSiteOwner.value = Boolean(authUser?.isSiteOwner)
  } catch {
    loadError.value = true
    friends.value = []
    specialLinks.value = []
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section ref="pageRoot" class="friends-page">
    <h1 class="h">{{ t('friends.title') }}</h1>

    <div class="ed-filter">
      <p class="ed-kicker">
        <span class="ed-en">{{ t('friends.kickerLinksEn') }}</span>
        <span class="ed-mid" aria-hidden="true">·</span>
        <span class="ed-zh">{{ t('friends.kickerLinksZh') }}</span>
      </p>
      <p class="friends-hint">{{ t('friends.welcomeText') }} {{ t('friends.subtitle') }}</p>
      <div class="friends-actions">
        <RouterLink to="/friends/apply" class="ed-action">{{ t('friends.applyEntryTitle') }}</RouterLink>
        <RouterLink v-if="isSiteOwner" to="/friends/admin" class="ed-action">
          {{ t('friends.adminEntryTitle') }}
        </RouterLink>
      </div>
    </div>

    <header class="friends-section-head" aria-labelledby="friends-list-heading">
      <p id="friends-list-heading" class="ed-kicker">
        <span class="ed-en">{{ t('friends.kickerDirectoryEn') }}</span>
        <span class="ed-mid" aria-hidden="true">·</span>
        <span class="ed-zh">{{ t('friends.kickerDirectoryZh') }}</span>
      </p>
      <span class="friends-section-tools">{{ t('friends.listCount', { count: friendCount }) }}</span>
    </header>

    <PageStatusBlock
      v-if="loadError"
      kind="error"
      :title="t('friends.loadFailed')"
      retryable
      @retry="loadFriends"
    />
    <PageStatusBlock
      v-else-if="loading"
      kind="loading"
      :title="t('friends.loading')"
    />
    <PageStatusBlock
      v-else-if="!friends.length"
      kind="empty"
      :title="t('friends.empty')"
    />
    <ol v-else class="friends-ledger">
      <li v-for="(friend, index) in friends" :key="friend.id">
        <a
          class="friend-row"
          :href="friend.url"
          rel="noopener noreferrer"
          :style="{ '--enter-i': String(index) }"
        >
          <img
            class="friend-row-avatar"
            :src="friendAvatarSrc(friend)"
            :alt="friend.name"
            width="30"
            height="30"
            loading="lazy"
          />
          <div>
            <p class="friend-row-byline">
              <span class="friend-row-name">{{ friend.name }}</span>
              <span class="friend-row-host"> · {{ hostFromUrl(friend.url) }}</span>
            </p>
            <p class="friend-row-desc">{{ friend.description }}</p>
          </div>
        </a>
      </li>
    </ol>

    <template v-if="!loadError && !loading">
      <header class="friends-section-head friends-special-gap" aria-labelledby="friends-special-heading">
        <p id="friends-special-heading" class="ed-kicker">
          <span class="ed-en">{{ t('friends.kickerExtraEn') }}</span>
          <span class="ed-mid" aria-hidden="true">·</span>
          <span class="ed-zh">{{ t('friends.kickerExtraZh') }}</span>
        </p>
        <span class="friends-section-tools">{{ t('friends.extraCount', { count: specialCount }) }}</span>
      </header>

      <ol class="friends-ledger friends-ledger--pair">
        <li v-for="(item, index) in specialLinks" :key="item.id">
          <a
            class="friend-row"
            :href="item.url"
            rel="noopener noreferrer"
            :style="{ '--enter-i': String(index) }"
          >
            <SpecialLinkAvatar v-if="item.icon" :item="item" />
            <img
              v-else
              class="friend-row-avatar"
              :src="specialAvatarSrc(item)"
              :alt="item.title"
              width="30"
              height="30"
              loading="lazy"
            />
            <div>
              <p class="friend-row-byline">
                <span class="friend-row-name">{{ item.title }}</span>
                <span class="friend-row-host"> · {{ hostFromUrl(item.url) }}</span>
              </p>
              <p class="friend-row-desc">{{ item.description }}</p>
            </div>
          </a>
        </li>
      </ol>
    </template>
  </section>
</template>
