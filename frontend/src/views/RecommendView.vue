<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import EdFeedRow from '@/components/editorial/EdFeedRow.vue'
import EdKicker from '@/components/editorial/EdKicker.vue'
import EdLedgerHead from '@/components/editorial/EdLedgerHead.vue'
import EdReadArticle from '@/components/editorial/EdReadArticle.vue'
import EdSwitchFilter from '@/components/editorial/EdSwitchFilter.vue'
import XiqiSplitLayout from '@/components/xiqi/XiqiSplitLayout.vue'
import { updateEdCatLines } from '@/composables/useEdCatLine'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { useSiteLeaveRedirect } from '@/composables/useSiteLeaveRedirect'
import { SITE_NAME } from '@/config/site'
import {
  fetchRecommendDetail,
  fetchRecommendations,
  type RecommendCategory,
  type RecommendDetail,
  type RecommendItem,
} from '@/services/recommendApi'
import '@/styles/page-enter-xiqi.css'
import '@/styles/page-xiqi.css'
import '@/styles/page-ed-ledger.css'
import { formatEditorialDateTime, formatEditorialListDate } from '@/utils/editorialDate'

type CategoryFilter = 'all' | RecommendCategory
type SortOrder = 'newest' | 'oldest'

const { t, locale } = useI18n()
const route = useRoute()
const { startExternalLeave } = useSiteLeaveRedirect()

useSeoMeta(() => ({
  title: `${t('recommend.title')} | ${SITE_NAME}`,
  description: t('recommend.seoDescription'),
  path: route.path,
  type: 'website',
}))

const pageRoot = ref<InstanceType<typeof XiqiSplitLayout> | null>(null)
const filterRef = ref<HTMLElement | null>(null)
const selectedId = ref<string | null>(null)
const detailDisplayId = ref<string | null>(null)
const categoryFilter = ref<CategoryFilter>('all')
const sortOrder = ref<SortOrder>('newest')
const items = ref<RecommendItem[]>([])
const listLoading = ref(true)
const listError = ref('')
const detail = ref<RecommendDetail | null>(null)
const detailLoading = ref(false)

const categoryOptions = computed<Array<{ id: CategoryFilter; label: string }>>(() => [
  { id: 'all', label: t('recommend.categoryAll') },
  { id: 'software', label: t('recommend.categorySoftware') },
  { id: 'opensource', label: t('recommend.categoryOpensource') },
  { id: 'anime', label: t('recommend.categoryAnime') },
])

const sortOptions = computed<Array<{ id: SortOrder; label: string }>>(() => [
  { id: 'newest', label: t('recommend.sortNewest') },
  { id: 'oldest', label: t('recommend.sortOldest') },
])

const visibleItems = computed(() => items.value)

const displayedItem = computed(
  () => visibleItems.value.find((item) => item.id === detailDisplayId.value) ?? null,
)

const detailTitle = computed(() => displayedItem.value?.title ?? '')

const splitHint = computed(() =>
  selectedId.value ? t('xiqi.splitHintOpen') : t('xiqi.splitHintClosed'),
)

function categoryLabel(category: RecommendCategory): string {
  const map: Record<RecommendCategory, string> = {
    software: t('recommend.categorySoftware'),
    opensource: t('recommend.categoryOpensource'),
    anime: t('recommend.categoryAnime'),
  }
  return map[category]
}

function selectItem(id: string) {
  selectedId.value = id
}

function refreshCatLines() {
  updateEdCatLines(filterRef.value)
}

function onVisitLink(url: string, event: MouseEvent) {
  event.preventDefault()
  void startExternalLeave(url, route.fullPath)
}

async function loadList() {
  listLoading.value = true
  listError.value = ''
  try {
    const result = await fetchRecommendations({
      category: categoryFilter.value,
      sort: sortOrder.value,
      size: 50,
    })
    items.value = result.items
  } catch (e) {
    listError.value = e instanceof Error ? e.message : String(e)
    items.value = []
  } finally {
    listLoading.value = false
    await nextTick()
    refreshCatLines()
  }
}

async function loadDetail(id: string) {
  detailLoading.value = true
  try {
    detail.value = await fetchRecommendDetail(id)
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}

watch([categoryFilter, sortOrder], () => {
  void loadList()
})

watch([categoryFilter, sortOrder, locale], () => {
  void nextTick(refreshCatLines)
})

watch(selectedId, (id) => {
  if (id) {
    detailDisplayId.value = id
    detail.value = null
    void loadDetail(id)
  }
})

function onDetailPanelClosed() {
  detailDisplayId.value = null
  detail.value = null
}

watch(visibleItems, (list) => {
  if (selectedId.value && !list.some((item) => item.id === selectedId.value)) {
    selectedId.value = null
  }
  if (detailDisplayId.value && !list.some((item) => item.id === detailDisplayId.value)) {
    detailDisplayId.value = null
    detail.value = null
  }
})

onMounted(async () => {
  window.addEventListener('resize', refreshCatLines)
  const startEnter = async () => {
    const root = pageRoot.value?.$el
    if (root instanceof HTMLElement) await playPageEnter(root)
    await nextTick()
    refreshCatLines()
  }
  void startEnter()
  await loadList()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', refreshCatLines)
})
</script>

<template>
  <XiqiSplitLayout
    ref="pageRoot"
    editorial
    v-model:selected-key="selectedId"
    :detail-title="detailTitle"
    @detail-closed="onDetailPanelClosed"
  >
    <template #masthead>
      <h1 class="h">{{ t('recommend.title') }}</h1>

      <div ref="filterRef" class="ed-filter" :aria-label="t('recommend.filterLabel')">
        <EdKicker :en="t('recommend.kickerPicksEn')" :zh="t('recommend.kickerPicksZh')" />
        <p class="habitat-hint">{{ t('recommend.intro') }}</p>
        <EdSwitchFilter
          v-model:filter="categoryFilter"
          v-model:sort="sortOrder"
          :filter-aria="t('recommend.filterCategory')"
          :sort-aria="t('recommend.sortLabel')"
          :filter-options="categoryOptions"
          :sort-options="sortOptions"
        />
      </div>
    </template>

    <EdLedgerHead :kicker-en="t('xiqi.kickerLedgerEn')" :kicker-zh="t('xiqi.kickerLedgerZh')">
      {{ t('xiqi.feedCount', { count: visibleItems.length }) }}
      · {{ splitHint }}
    </EdLedgerHead>

    <p v-if="listError" class="habitat-empty">{{ listError }}</p>
    <p v-else-if="listLoading" class="habitat-empty">{{ t('xiqi.loading') }}</p>
    <TransitionGroup
      v-else-if="visibleItems.length"
      name="xiqi-feed-item"
      tag="ol"
      class="ed-feed xiqi-feed"
      aria-live="polite"
    >
      <li v-for="(item, index) in visibleItems" :key="item.id">
        <EdFeedRow
          :image-url="item.imageUrl"
          :image-alt="item.imageAlt || item.title"
          :tone="item.category"
          :tone-label="categoryLabel(item.category)"
          :date-label="formatEditorialListDate(item.createdAt, locale)"
          :title="item.title"
          :body="item.summary"
          :selected="detailDisplayId === item.id"
          :expanded="selectedId === item.id"
          :enter-index="index"
          @click="selectItem(item.id)"
        />
      </li>
    </TransitionGroup>
    <p v-else class="habitat-empty">{{ t('recommend.empty') }}</p>

    <template #detail>
      <EdReadArticle
        v-if="displayedItem"
        :tone="displayedItem.category"
        :tone-label="categoryLabel(displayedItem.category)"
        :datetime="displayedItem.createdAt"
        :time-label="formatEditorialDateTime(displayedItem.createdAt, locale)"
        :title="displayedItem.title"
        :body-html="detail?.bodyHtml"
        :excerpt="displayedItem.summary"
        :loading="detailLoading"
        :loading-label="t('xiqi.loading')"
      >
        <template v-if="displayedItem.url" #link>
          <a
            class="ed-action"
            :href="displayedItem.url"
            @click="onVisitLink(displayedItem.url, $event)"
          >
            {{ t('recommend.visitLink') }}
          </a>
        </template>
      </EdReadArticle>
    </template>
  </XiqiSplitLayout>
</template>
