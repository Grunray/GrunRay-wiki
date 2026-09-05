<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import CardCornerVineLazy from '@/components/hover/CardCornerVineLazy.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import TimelinePageSkeleton from '@/components/ui/TimelinePageSkeleton.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { listPostsForBlog } from '@/services/contentRepository'
import type { BlogCategoryFilter, Post } from '@/types/content'
import '@/styles/page-enter-timeline.css'

const BLOG_LIST_CACHE_PREFIX = 'grunray-blog-list:'

function blogListCacheKey(cat: BlogCategoryFilter): string {
  return `${BLOG_LIST_CACHE_PREFIX}${cat}`
}

function readCachedPostsForCategory(cat: BlogCategoryFilter): Post[] | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(blogListCacheKey(cat))
    if (raw === null) return null
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return null
    return data as Post[]
  } catch {
    return null
  }
}

function writeCachedPostsForCategory(cat: BlogCategoryFilter, list: Post[]) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(blogListCacheKey(cat), JSON.stringify(list))
  } catch {
    /* ignore quota */
  }
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

useSeoMeta(() => ({
  title: `${t('blog.title')} | ${SITE_NAME}`,
  description: `${t('blog.subtitle')} ${t('home.tagline')}`,
  path: route.path,
  type: 'website',
}))
const posts = ref<Post[]>([])
const error = ref<string | null>(null)
const loading = ref(false)
const category = ref<BlogCategoryFilter>('all')
const tagFilter = ref('')
const keyword = ref('')
const categoryGroupRef = ref<HTMLElement | null>(null)
const categoryBtnRefs = ref<HTMLElement[]>([])
const categoryLineStyle = ref<Record<string, string>>({ opacity: '0' })
const pageRoot = ref<HTMLElement | null>(null)
const enterPlayed = ref(false)

interface TimelineItem {
  post: Post
  yearLabel: string
  dateLabel: string
  dateTime?: string
  sortTimestamp: number
}

interface TimelineYearGroup {
  year: string
  items: TimelineItem[]
}

const categoryOptions = computed<Array<{ id: BlogCategoryFilter; label: string }>>(() => [
  { id: 'all', label: t('blog.categoryAll') },
  { id: 'misc', label: t('blog.categoryMisc') },
  { id: 'project', label: t('blog.categoryProject') },
  { id: 'algorithm', label: t('blog.categoryAlgorithm') },
])

const tagSelectOptions = computed(() => [
  { value: '', label: t('projects.allTags') },
  ...allTags.value.map((tag) => ({ value: tag, label: tag })),
])

function setCategoryBtnRef(el: Element | null, index: number) {
  if (!el) return
  categoryBtnRefs.value[index] = el as HTMLElement
}

function updateCategoryLine() {
  const idx = categoryOptions.value.findIndex((x) => x.id === category.value)
  if (idx < 0) return
  const group = categoryGroupRef.value
  const el = categoryBtnRefs.value[idx]
  if (!el || !group) return
  const groupRect = group.getBoundingClientRect()
  const btnRect = el.getBoundingClientRect()
  const x = btnRect.left - groupRect.left
  categoryLineStyle.value = {
    width: `${btnRect.width}px`,
    transform: `translateX(${x}px)`,
    opacity: '1',
  }
}

async function loadByCategory() {
  const cat = category.value
  error.value = null

  const cached = readCachedPostsForCategory(cat)
  if (cached !== null) {
    posts.value = cached
  } else {
    posts.value = []
  }

  loading.value = true
  try {
    const next = await listPostsForBlog({ category: cat })
    posts.value = next
    writeCachedPostsForCategory(cat, next)
  } catch {
    error.value = '加载失败，请确认后端已启动并已导入数据。'
    if (cached === null) {
      posts.value = []
    }
  } finally {
    loading.value = false
    if (!enterPlayed.value) {
      enterPlayed.value = true
      await playPageEnter(pageRoot.value)
    }
  }
}

watch(
  category,
  () => {
    void loadByCategory()
  },
  { immediate: true },
)

const allTags = computed(() => {
  const set = new Set<string>()
  for (const post of posts.value) {
    for (const tag of post.tags) set.add(tag)
  }
  return [...set].sort()
})

watch(allTags, (tags) => {
  if (tagFilter.value && !tags.includes(tagFilter.value)) {
    tagFilter.value = ''
  }
})

onMounted(() => {
  window.addEventListener('resize', updateCategoryLine)
  void nextTick(updateCategoryLine)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateCategoryLine)
})

watch(category, () => {
  void nextTick(updateCategoryLine)
})

watch(categoryOptions, () => {
  categoryBtnRefs.value = []
  void nextTick(updateCategoryLine)
})

watch(posts, () => {
  void nextTick(updateCategoryLine)
})

function parseDate(value?: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatMonthDay(value?: string): string {
  const d = parseDate(value)
  if (!d) return t('projects.unknownDate')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

function formatIsoDate(value?: string): string | undefined {
  const d = parseDate(value)
  if (!d) return undefined
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function toTimelineItem(post: Post): TimelineItem {
  const dateSource = post.published_at || post.updated_at
  const d = parseDate(dateSource)
  return {
    post,
    yearLabel: d ? String(d.getFullYear()) : '----',
    dateLabel: formatMonthDay(dateSource),
    dateTime: formatIsoDate(dateSource),
    sortTimestamp: d ? d.getTime() : 0,
  }
}

const visiblePosts = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return posts.value.filter((post) => {
    if (tagFilter.value && !post.tags.includes(tagFilter.value)) return false
    if (!q) return true
    const haystack = `${post.title} ${post.summary} ${post.tags.join(' ')}`.toLowerCase()
    return haystack.includes(q)
  })
})

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 按当前搜索词拆成片段，便于用 <mark> 高亮（无搜索词时整段非命中） */
function highlightSegments(text: string): { text: string; hit: boolean }[] {
  const q = keyword.value.trim()
  if (!q) return [{ text, hit: false }]
  let re: RegExp
  try {
    re = new RegExp(escapeRegExp(q), 'gi')
  } catch {
    return [{ text, hit: false }]
  }
  const parts: { text: string; hit: boolean }[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false })
    parts.push({ text: m[0], hit: true })
    last = m.index + m[0].length
    if (m[0].length === 0) {
      re.lastIndex += 1
      if (re.lastIndex > text.length) break
    }
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false })
  return parts.length ? parts : [{ text, hit: false }]
}

const pinnedItems = computed<TimelineItem[]>(() =>
  visiblePosts.value.filter((post) => post.pinned).map(toTimelineItem),
)

const timelineItems = computed<TimelineItem[]>(() => {
  return visiblePosts.value
    .filter((post) => !post.pinned)
    .map(toTimelineItem)
    .sort((a, b) => {
      if (a.sortTimestamp !== b.sortTimestamp) return b.sortTimestamp - a.sortTimestamp
      return a.post.title.localeCompare(b.post.title)
    })
})

const timelineGroups = computed<TimelineYearGroup[]>(() => {
  const groups: TimelineYearGroup[] = []
  let current: TimelineYearGroup | null = null
  for (const item of timelineItems.value) {
    if (!current || current.year !== item.yearLabel) {
      current = { year: item.yearLabel, items: [] }
      groups.push(current)
    }
    current.items.push(item)
  }
  return groups
})

/** 当前分类接口返回列表为空（非搜索造成） */
const listEmpty = computed(
  () => !loading.value && !error.value && posts.value.length === 0,
)

/** 有数据但被标签 / 关键词筛掉 */
const filteredEmpty = computed(
  () =>
    !loading.value &&
    !error.value &&
    posts.value.length > 0 &&
    visiblePosts.value.length === 0,
)

const hasTimeline = computed(() => pinnedItems.value.length > 0 || timelineGroups.value.length > 0)

function timelineItemEnterIndex(groupIndex: number, itemIndex: number): number {
  let sum = pinnedItems.value.length
  for (let i = 0; i < groupIndex; i++) {
    sum += timelineGroups.value[i]?.items.length ?? 0
  }
  return Math.min(sum + itemIndex, 14)
}

function onCardClick(slug: string) {
  void router.push(`/blog/${slug}`)
}

function onCardKeydown(event: KeyboardEvent, slug: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  onCardClick(slug)
}
</script>

<template>
  <section ref="pageRoot" class="blog-page">
    <h1 class="h">{{ t('blog.title') }}</h1>
    <div class="ed-filter" role="search">
      <div class="ed-filter-row">
        <div class="ed-filter-col">
          <p class="ed-kicker">
            <span class="ed-en">{{ t('blog.kickerFilterEn') }}</span>
            <span class="ed-mid" aria-hidden="true">·</span>
            <span class="ed-zh">{{ t('blog.kickerFilterZh') }}</span>
          </p>
          <AppSelect
            v-model="tagFilter"
            variant="editorial"
            :options="tagSelectOptions"
            :aria-label="t('blog.tagFilter')"
            min-width="0"
          />
        </div>
        <div class="ed-filter-col ed-filter-col--section">
          <p class="ed-kicker">
            <span class="ed-en">{{ t('blog.kickerSectionEn') }}</span>
            <span class="ed-mid" aria-hidden="true">·</span>
            <span class="ed-zh">{{ t('blog.kickerSectionZh') }}</span>
          </p>
          <div ref="categoryGroupRef" class="ed-cats">
            <span class="ed-cat-line" :style="categoryLineStyle" aria-hidden="true" />
            <template v-for="(item, i) in categoryOptions" :key="item.id">
              <span v-if="i > 0" class="ed-cat-mid" aria-hidden="true">·</span>
              <button
                type="button"
                class="ed-cat"
                :class="{ 'is-on': category === item.id }"
                :aria-pressed="category === item.id"
                :ref="(el) => setCategoryBtnRef(el as Element | null, i)"
                @click="category = item.id"
              >
                {{ item.label }}
              </button>
            </template>
          </div>
        </div>
      </div>
      <div class="ed-filter-row">
        <div class="ed-filter-col ed-filter-col--search">
          <p class="ed-kicker">
            <span class="ed-en">{{ t('blog.kickerSearchEn') }}</span>
            <span class="ed-mid" aria-hidden="true">·</span>
            <span class="ed-zh">{{ t('blog.kickerSearchZh') }}</span>
          </p>
          <label class="ed-search">
            <input v-model="keyword" type="search" :placeholder="t('blog.searchPlaceholder')" autocomplete="off" />
          </label>
        </div>
      </div>
    </div>
    <p v-if="error" class="empty">{{ error }}</p>
    <TimelinePageSkeleton v-else-if="loading && !posts.length" variant="notes" />
    <div v-else-if="hasTimeline" class="timeline">
      <section v-if="pinnedItems.length" class="timeline-pin" :aria-label="t('blog.pinned')" :style="{ '--enter-gi': 0 }">
        <header class="timeline-pin-head">
          <p class="ed-kicker">
            <span class="ed-en">{{ t('blog.kickerPinnedEn') }}</span>
            <span class="ed-mid" aria-hidden="true">·</span>
            <span class="ed-zh">{{ t('blog.kickerPinnedZh') }}</span>
          </p>
          <p class="timeline-year-count">{{ t('blog.pinnedCount', { count: pinnedItems.length }) }}</p>
        </header>
        <div class="timeline-items">
          <article
            v-for="(item, ii) in pinnedItems"
            :key="item.post.id"
            class="timeline-item"
            :style="{ '--enter-ti': ii }"
          >
            <time class="timeline-date timeline-date--with-year" :datetime="item.dateTime">
              <span class="timeline-date-year">{{ item.yearLabel }}</span>
              <span class="timeline-date-md">{{ item.dateLabel }}</span>
            </time>
            <span class="timeline-dot" aria-hidden="true" />
            <div
              class="timeline-card card timeline-card--clickable card-hover-g"
              role="link"
              tabindex="0"
              @click="onCardClick(item.post.slug)"
              @keydown="onCardKeydown($event, item.post.slug)"
            >
              <div class="timeline-card-head">
                <h3 class="timeline-title">
                  <template v-for="(seg, si) in highlightSegments(item.post.title)" :key="`pttl-${item.post.id}-${si}`">
                    <mark v-if="seg.hit" class="search-hit">{{ seg.text }}</mark>
                    <template v-else>{{ seg.text }}</template>
                  </template>
                </h3>
              </div>
              <p class="timeline-summary">
                <template v-for="(seg, si) in highlightSegments(item.post.summary)" :key="`psum-${item.post.id}-${si}`">
                  <mark v-if="seg.hit" class="search-hit">{{ seg.text }}</mark>
                  <template v-else>{{ seg.text }}</template>
                </template>
              </p>
              <div class="timeline-tags">
                <span v-for="(tag, ti) in item.post.tags" :key="`${item.post.id}-ptag-${ti}`" class="tag">
                  <template v-for="(seg, si) in highlightSegments(tag)" :key="`ptg-${item.post.id}-${ti}-${si}`">
                    <mark v-if="seg.hit" class="search-hit">{{ seg.text }}</mark>
                    <template v-else>{{ seg.text }}</template>
                  </template>
                </span>
              </div>
              <CardCornerVineLazy />
            </div>
          </article>
        </div>
      </section>
      <section
        v-for="(group, gi) in timelineGroups"
        :key="group.year"
        class="timeline-year-group"
        :style="{ '--enter-gi': gi + (pinnedItems.length ? 1 : 0) }"
      >
        <header class="timeline-year-head">
          <h2 class="timeline-year">{{ group.year }}</h2>
          <p class="timeline-year-count">{{ t('blog.timelineCount', { count: group.items.length }) }}</p>
        </header>
        <div class="timeline-items">
          <article
            v-for="(item, ii) in group.items"
            :key="item.post.id"
            class="timeline-item"
            :style="{ '--enter-ti': timelineItemEnterIndex(gi, ii) }"
          >
            <time class="timeline-date" :datetime="item.dateTime">{{ item.dateLabel }}</time>
            <span class="timeline-dot" aria-hidden="true" />
            <div
              class="timeline-card card timeline-card--clickable card-hover-g"
              role="link"
              tabindex="0"
              @click="onCardClick(item.post.slug)"
              @keydown="onCardKeydown($event, item.post.slug)"
            >
              <div class="timeline-card-head">
                <h3 class="timeline-title">
                  <template v-for="(seg, si) in highlightSegments(item.post.title)" :key="`ttl-${item.post.id}-${si}`">
                    <mark v-if="seg.hit" class="search-hit">{{ seg.text }}</mark>
                    <template v-else>{{ seg.text }}</template>
                  </template>
                </h3>
              </div>
              <p class="timeline-summary">
                <template v-for="(seg, si) in highlightSegments(item.post.summary)" :key="`sum-${item.post.id}-${si}`">
                  <mark v-if="seg.hit" class="search-hit">{{ seg.text }}</mark>
                  <template v-else>{{ seg.text }}</template>
                </template>
              </p>
              <div class="timeline-tags">
                <span v-for="(tag, ti) in item.post.tags" :key="`${item.post.id}-tag-${ti}`" class="tag">
                  <template v-for="(seg, si) in highlightSegments(tag)" :key="`tg-${item.post.id}-${ti}-${si}`">
                    <mark v-if="seg.hit" class="search-hit">{{ seg.text }}</mark>
                    <template v-else>{{ seg.text }}</template>
                  </template>
                </span>
              </div>
              <CardCornerVineLazy />
            </div>
          </article>
        </div>
      </section>
    </div>
    <p v-else-if="listEmpty" class="empty">{{ t('blog.emptyCategory') }}</p>
    <p v-else-if="filteredEmpty" class="empty">{{ t('blog.emptyFiltered') }}</p>
  </section>
</template>

<style scoped>
.blog-page {
  max-width: 980px;
  --timeline-date-col: 5.2rem;
  --timeline-dot-col: 1.25rem;
  --timeline-gap: 0.7rem;
  --timeline-dot-offset: 1.05rem;
  --timeline-item-gap: 0.85rem;
}

.h {
  margin: 0 0 0.35rem;
  font-family: var(--font-serif);
  font-size: clamp(1.6rem, 3.4vw, 2.1rem);
  font-weight: 600;
  letter-spacing: 0.01em;
}
/* 琥珀色「荧光笔」式高亮，浅/深主题下都易辨认 */

.search-hit {
  background: linear-gradient(
    165deg,
    rgb(254 249 195 / 0.98),
    rgb(253 224 71 / 0.94)
  );
  color: rgb(66 32 6);
  border: 1.5px solid rgb(202 138 4 / 0.72);
  border-radius: 0.3em;
  padding: 0.08em 0.26em;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow:
    0 0 0 1px rgb(253 224 71 / 0.55),
    0 2px 14px rgb(234 179 8 / 0.42);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

[data-theme='dark'] .search-hit {
  background: linear-gradient(
    165deg,
    rgb(254 240 138 / 0.96),
    rgb(250 204 21 / 0.9)
  );
  box-shadow:
    0 0 0 1px rgb(250 204 21 / 0.45),
    0 2px 18px rgb(250 204 21 / 0.35);
}

@media (max-width: 860px) {
  .blog-page {
    --timeline-date-col: 4.3rem;
    --timeline-dot-col: 1.1rem;
    --timeline-gap: 0.55rem;
  }

  .timeline-year {
    font-size: 1.9rem;
  }

  .timeline-date {
    font-size: 0.78rem;
  }
}

.empty {
  color: var(--color-text-muted);
}
</style>
