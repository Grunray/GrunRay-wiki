<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import EdFeedRow from '@/components/editorial/EdFeedRow.vue'
import EdKicker from '@/components/editorial/EdKicker.vue'
import EdLedgerHead from '@/components/editorial/EdLedgerHead.vue'
import EdReadArticle from '@/components/editorial/EdReadArticle.vue'
import EdSwitchFilter from '@/components/editorial/EdSwitchFilter.vue'
import XiqiSplitLayout from '@/components/xiqi/XiqiSplitLayout.vue'
import { type FragmentMood } from '@/content/data/mockFragments'
import { updateEdCatLines } from '@/composables/useEdCatLine'
import { playPageEnter, prefersReducedMotionMedia } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { fetchFragmentDetail, fetchFragments, type Fragment, type FragmentDetail } from '@/services/fragmentsApi'
import { fetchMessageAuthUser } from '@/services/messageAuth'
import '@/styles/page-enter-xiqi.css'
import '@/styles/page-xiqi.css'
import '@/styles/page-ed-ledger.css'
import { formatEditorialDateTime, formatEditorialListDate } from '@/utils/editorialDate'

type MoodFilter = 'all' | FragmentMood
type SortOrder = 'newest' | 'oldest'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

useSeoMeta(() => ({
  title: `${t('fragments.title')} | ${SITE_NAME}`,
  description: t('fragments.seoDescription'),
  path: route.path,
  type: 'website',
}))

const pageRoot = ref<InstanceType<typeof XiqiSplitLayout> | null>(null)
const filterRef = ref<HTMLElement | null>(null)
const selectedFragmentId = ref<string | null>(null)
/** 关闭动画期间仍展示详情，避免 slot 清空导致面板塌陷 */
const detailDisplayId = ref<string | null>(null)
const moodFilter = ref<MoodFilter>('all')
const sortOrder = ref<SortOrder>('newest')
const fragments = ref<Fragment[]>([])
const listLoading = ref(true)
const listError = ref('')
const detail = ref<FragmentDetail | null>(null)
const detailLoading = ref(false)
const isSiteOwner = ref(false)
const detailArticleRef = ref<InstanceType<typeof EdReadArticle> | null>(null)
let detailBodyTween: gsap.core.Tween | gsap.core.Timeline | null = null

const moodOptions = computed<Array<{ id: MoodFilter; label: string }>>(() => [
  { id: 'all', label: t('fragments.moodAll') },
  { id: 'rant', label: t('fragments.moodRant') },
  { id: 'sketch', label: t('fragments.moodSketch') },
  { id: 'flash', label: t('fragments.moodFlash') },
  { id: 'daily', label: t('fragments.moodDaily') },
])

const sortOptions = computed<Array<{ id: SortOrder; label: string }>>(() => [
  { id: 'newest', label: t('fragments.sortNewest') },
  { id: 'oldest', label: t('fragments.sortOldest') },
])

const visibleFragments = computed(() => fragments.value)

const displayedFragment = computed(() =>
  visibleFragments.value.find((item) => item.id === detailDisplayId.value) ?? null,
)

const detailTitle = computed(() =>
  displayedFragment.value ? moodLabel(displayedFragment.value.mood) : '',
)

const splitHint = computed(() =>
  selectedFragmentId.value ? t('xiqi.splitHintOpen') : t('xiqi.splitHintClosed'),
)

function moodLabel(mood: FragmentMood): string {
  const map: Record<FragmentMood, string> = {
    rant: t('fragments.moodRant'),
    sketch: t('fragments.moodSketch'),
    flash: t('fragments.moodFlash'),
    daily: t('fragments.moodDaily'),
  }
  return map[mood]
}

function detailRootEl(): HTMLElement | null {
  const inst = detailArticleRef.value
  if (!inst) return null
  return inst.$el instanceof HTMLElement ? inst.$el : null
}

function selectFragment(id: string) {
  selectedFragmentId.value = id
}

function refreshCatLines() {
  updateEdCatLines(filterRef.value)
}

async function loadList() {
  listLoading.value = true
  listError.value = ''
  try {
    const result = await fetchFragments({
      mood: moodFilter.value,
      sort: sortOrder.value,
      size: 50,
    })
    fragments.value = result.items
  } catch (e) {
    listError.value = e instanceof Error ? e.message : String(e)
    fragments.value = []
  } finally {
    listLoading.value = false
    await nextTick()
    refreshCatLines()
  }
}

async function loadDetail(id: string) {
  detailLoading.value = true
  try {
    detail.value = await fetchFragmentDetail(id)
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}

function goCompose() {
  router.push({ name: 'fragments-compose' })
}

watch([moodFilter, sortOrder], () => {
  void loadList()
})

watch([moodFilter, sortOrder, locale], () => {
  void nextTick(refreshCatLines)
})

watch(selectedFragmentId, (id) => {
  if (id) {
    detailDisplayId.value = id
    detail.value = null
    void loadDetail(id)
  }
})

function playFragmentDetailReveal(opts?: { firstOpen?: boolean }) {
  const el = detailRootEl()
  if (!el) return
  detailBodyTween?.kill()
  const parts = el.querySelectorAll('.ed-read-head, .ed-read-body--excerpt')
  if (!parts.length) return
  const firstOpen = opts?.firstOpen ?? true
  if (prefersReducedMotionMedia() || firstOpen) {
    /* 首次打开：正文已在纸面上，由面板 clip 揭开，不再整段淡入以免栏里先空一截 */
    gsap.set(el.querySelectorAll('.ed-read-head, .ed-read-body'), { autoAlpha: 1, y: 0 })
    return
  }
  detailBodyTween = gsap.fromTo(
    parts,
    { autoAlpha: 0, y: 8 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.34,
      stagger: 0.06,
      ease: 'power3.out',
      delay: 0.04,
    },
  )
}

function playFragmentHtmlUpgrade() {
  const htmlBody = detailRootEl()?.querySelector('.ed-read-body--html')
  if (!htmlBody) return
  gsap.set(htmlBody, { autoAlpha: 1, y: 0 })
}

watch(detailDisplayId, async (id, prev) => {
  if (!id) return
  await nextTick()
  playFragmentDetailReveal({ firstOpen: !prev })
})

watch(detailLoading, async (loading) => {
  if (loading || !detailDisplayId.value || !detail.value?.bodyHtml) return
  await nextTick()
  playFragmentHtmlUpgrade()
})

function onDetailPanelClosed() {
  detailBodyTween?.kill()
  detailBodyTween = null
  detailDisplayId.value = null
  detail.value = null
}

watch(visibleFragments, (list) => {
  if (selectedFragmentId.value && !list.some((item) => item.id === selectedFragmentId.value)) {
    selectedFragmentId.value = null
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
  try {
    const user = await fetchMessageAuthUser()
    isSiteOwner.value = Boolean(user?.isSiteOwner)
  } catch {
    isSiteOwner.value = false
  }
  await loadList()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', refreshCatLines)
  detailBodyTween?.kill()
  detailBodyTween = null
})
</script>

<template>
  <XiqiSplitLayout
    ref="pageRoot"
    editorial
    v-model:selected-key="selectedFragmentId"
    :detail-title="detailTitle"
    @detail-closed="onDetailPanelClosed"
  >
    <template #masthead>
      <h1 class="h">{{ t('fragments.title') }}</h1>

      <div ref="filterRef" class="ed-filter" :aria-label="t('fragments.filterLabel')">
        <EdKicker :en="t('fragments.kickerNotesEn')" :zh="t('fragments.kickerNotesZh')" />
        <p class="habitat-hint">{{ t('fragments.intro') }}</p>
        <EdSwitchFilter
          v-model:filter="moodFilter"
          v-model:sort="sortOrder"
          :filter-aria="t('fragments.filterMood')"
          :sort-aria="t('fragments.sortLabel')"
          :filter-options="moodOptions"
          :sort-options="sortOptions"
        />
        <p v-if="isSiteOwner">
          <button type="button" class="ed-action" @click="goCompose">
            {{ t('fragments.compose.button') }}
          </button>
        </p>
      </div>
    </template>

    <EdLedgerHead :kicker-en="t('xiqi.kickerLedgerEn')" :kicker-zh="t('xiqi.kickerLedgerZh')">
      {{ t('xiqi.feedCount', { count: visibleFragments.length }) }}
      · {{ splitHint }}
    </EdLedgerHead>

    <p v-if="listError" class="habitat-empty">{{ listError }}</p>
    <p v-else-if="listLoading" class="habitat-empty">{{ t('xiqi.loading') }}</p>
    <TransitionGroup
      v-else-if="visibleFragments.length"
      name="xiqi-feed-item"
      tag="ol"
      class="ed-feed xiqi-feed"
      aria-live="polite"
    >
      <li v-for="(item, index) in visibleFragments" :key="item.id">
        <EdFeedRow
          :image-url="item.imageUrl"
          :image-alt="item.imageAlt || ''"
          :tone="item.mood"
          :tone-label="moodLabel(item.mood)"
          :date-label="formatEditorialListDate(item.createdAt, locale)"
          :body="item.content"
          :selected="detailDisplayId === item.id"
          :expanded="selectedFragmentId === item.id"
          :enter-index="index"
          @click="selectFragment(item.id)"
        />
      </li>
    </TransitionGroup>
    <p v-else class="habitat-empty">{{ t('fragments.empty') }}</p>

    <template #detail>
      <EdReadArticle
        v-if="displayedFragment"
        ref="detailArticleRef"
        :tone="displayedFragment.mood"
        :tone-label="moodLabel(displayedFragment.mood)"
        :datetime="displayedFragment.createdAt"
        :time-label="formatEditorialDateTime(displayedFragment.createdAt, locale)"
        :body-html="detail?.bodyHtml"
        :excerpt="displayedFragment.content"
        :loading="detailLoading"
      />
    </template>
  </XiqiSplitLayout>
</template>
