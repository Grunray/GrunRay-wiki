<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import EdFeedRow from '@/components/editorial/EdFeedRow.vue'
import EdKicker from '@/components/editorial/EdKicker.vue'
import EdLedgerHead from '@/components/editorial/EdLedgerHead.vue'
import PageStatusBlock from '@/components/ui/PageStatusBlock.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import {
  fetchFragmentAdminList,
  fetchRecommendAdminList,
  type FragmentAdminItem,
  type RecommendAdminItem,
  type XiqiAdminStatus,
} from '@/services/fragmentsAdminApi'
import { fetchMessageAuthUser } from '@/services/messageAuth'
import { formatEditorialListDate } from '@/utils/editorialDate'
import { ownerFacingMessage } from '@/utils/publicErrorMessage'
import '@/styles/page-enter-legal.css'
import '@/styles/page-ed-ledger.css'
import '@/styles/page-compose.css'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const kind = computed(() => (route.name === 'recommend-edit' ? 'recommend' : 'fragments'))

useSeoMeta(() => ({
  title: `${kind.value === 'recommend' ? t('recommend.edit.title') : t('fragments.edit.title')} | ${SITE_NAME}`,
  description:
    kind.value === 'recommend' ? t('recommend.edit.seoDescription') : t('fragments.edit.seoDescription'),
  path: route.path,
  type: 'website',
  robots: 'noindex, nofollow',
}))

const pageRoot = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref('')
const fragmentItems = ref<FragmentAdminItem[]>([])
const recommendItems = ref<RecommendAdminItem[]>([])

const listCount = computed(() =>
  kind.value === 'recommend' ? recommendItems.value.length : fragmentItems.value.length,
)

function statusLabel(status: XiqiAdminStatus): string {
  if (status === 'draft') return t('fragments.compose.statusDraft')
  if (status === 'hidden') return t('fragments.compose.statusHidden')
  return t('fragments.compose.statusPublished')
}

function moodLabel(mood: FragmentAdminItem['mood']): string {
  const map = {
    rant: t('fragments.moodRant'),
    sketch: t('fragments.moodSketch'),
    flash: t('fragments.moodFlash'),
    daily: t('fragments.moodDaily'),
  }
  return map[mood]
}

function categoryLabel(category: RecommendAdminItem['category']): string {
  const map = {
    software: t('recommend.categorySoftware'),
    opensource: t('recommend.categoryOpensource'),
    anime: t('recommend.categoryAnime'),
  }
  return map[category]
}

function fragmentDateLine(item: FragmentAdminItem): string {
  const date = formatEditorialListDate(item.createdAt, locale.value)
  return [statusLabel(item.status), date].filter(Boolean).join(' · ')
}

function recommendDateLine(item: RecommendAdminItem): string {
  const date = formatEditorialListDate(item.createdAt, locale.value)
  return [statusLabel(item.status), date].filter(Boolean).join(' · ')
}

function openFragment(id: string) {
  router.push({ name: 'fragments-compose', query: { id } })
}

function openRecommend(id: string) {
  router.push({ name: 'recommend-compose', query: { id } })
}

async function loadList() {
  loading.value = true
  error.value = ''
  try {
    if (kind.value === 'recommend') {
      const result = await fetchRecommendAdminList({ sort: 'newest', size: 100 })
      recommendItems.value = result.items
      fragmentItems.value = []
    } else {
      const result = await fetchFragmentAdminList({ sort: 'newest', size: 100 })
      fragmentItems.value = result.items
      recommendItems.value = []
    }
  } catch (e) {
    error.value = ownerFacingMessage(e, t('common.status.ownerActionFailed'))
    fragmentItems.value = []
    recommendItems.value = []
  } finally {
    loading.value = false
  }
}

watch(kind, () => {
  void loadList()
})

onMounted(async () => {
  try {
    const user = await fetchMessageAuthUser()
    if (!user?.isSiteOwner) {
      router.replace({ name: kind.value === 'recommend' ? 'recommend' : 'fragments' })
      return
    }
  } catch {
    router.replace({ name: kind.value === 'recommend' ? 'recommend' : 'fragments' })
    return
  }
  await loadList()
  await playPageEnter(pageRoot.value)
})
</script>

<template>
  <article ref="pageRoot" class="compose-ed-page">
    <p class="compose-ed-back">
      <RouterLink v-if="kind === 'recommend'" to="/recommend">← {{ t('recommend.title') }}</RouterLink>
      <RouterLink v-else to="/fragments">← {{ t('fragments.title') }}</RouterLink>
    </p>
    <h1 class="h">
      {{ kind === 'recommend' ? t('recommend.edit.title') : t('fragments.edit.title') }}
    </h1>

    <div class="ed-filter">
      <EdKicker
        :en="kind === 'recommend' ? t('recommend.edit.kickerEn') : t('fragments.edit.kickerEn')"
        :zh="kind === 'recommend' ? t('recommend.edit.kickerZh') : t('fragments.edit.kickerZh')"
      />
      <p class="compose-ed-hint">
        {{ kind === 'recommend' ? t('recommend.edit.subtitle') : t('fragments.edit.subtitle') }}
      </p>
    </div>

    <EdLedgerHead :kicker-en="t('xiqi.kickerLedgerEn')" :kicker-zh="t('xiqi.kickerLedgerZh')">
      {{ t('xiqi.feedCount', { count: listCount }) }}
      · {{ t('fragments.edit.clickHint') }}
    </EdLedgerHead>

    <PageStatusBlock v-if="error" kind="error" :title="error" retryable @retry="loadList" />
    <PageStatusBlock v-else-if="loading" kind="loading" :title="t('xiqi.loading')" />
    <ol
      v-else-if="kind === 'fragments' && fragmentItems.length"
      class="ed-feed"
      aria-live="polite"
    >
      <li v-for="(item, index) in fragmentItems" :key="item.id">
        <EdFeedRow
          :image-url="item.imageUrl"
          :image-alt="item.imageAlt || ''"
          :tone="item.mood"
          :tone-label="moodLabel(item.mood)"
          :date-label="fragmentDateLine(item)"
          :body="item.content"
          :enter-index="index"
          @click="openFragment(item.id)"
        />
      </li>
    </ol>
    <ol
      v-else-if="kind === 'recommend' && recommendItems.length"
      class="ed-feed"
      aria-live="polite"
    >
      <li v-for="(item, index) in recommendItems" :key="item.id">
        <EdFeedRow
          :image-url="item.imageUrl"
          :image-alt="item.imageAlt || item.title"
          :tone="item.category"
          :tone-label="categoryLabel(item.category)"
          :date-label="recommendDateLine(item)"
          :title="item.title"
          :body="item.summary"
          :enter-index="index"
          @click="openRecommend(item.id)"
        />
      </li>
    </ol>
    <PageStatusBlock
      v-else
      kind="empty"
      :title="kind === 'recommend' ? t('recommend.edit.empty') : t('fragments.edit.empty')"
    />
  </article>
</template>
