<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { listPostsForBlog } from '@/services/contentRepository'
import type { BlogCategoryFilter, Post } from '@/types/content'

const { t } = useI18n()
const router = useRouter()
const posts = ref<Post[]>([])
const error = ref<string | null>(null)
const loading = ref(false)
const category = ref<BlogCategoryFilter>('all')
const tagFilter = ref('')
const keyword = ref('')
const tagMenuOpen = ref(false)
const tagMenuRef = ref<HTMLElement | null>(null)
const categoryGroupRef = ref<HTMLElement | null>(null)
const categoryBtnRefs = ref<HTMLElement[]>([])
const categoryPillStyle = ref<Record<string, string>>({ opacity: '0' })

interface TimelineItem {
  post: Post
  yearLabel: string
  dateLabel: string
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

const selectedTagLabel = computed(() => tagFilter.value || t('projects.allTags'))

function setCategoryBtnRef(el: Element | null, index: number) {
  if (!el) return
  categoryBtnRefs.value[index] = el as HTMLElement
}

function updateCategoryPill() {
  const idx = categoryOptions.value.findIndex((x) => x.id === category.value)
  if (idx < 0) return
  const group = categoryGroupRef.value
  const el = categoryBtnRefs.value[idx]
  if (!el || !group) return
  const groupRect = group.getBoundingClientRect()
  const btnRect = el.getBoundingClientRect()
  const x = btnRect.left - groupRect.left
  const y = btnRect.top - groupRect.top
  categoryPillStyle.value = {
    width: `${btnRect.width}px`,
    height: `${btnRect.height}px`,
    transform: `translate(${x}px, ${y}px)`,
    opacity: '1',
  }
}

async function loadByCategory() {
  loading.value = true
  error.value = null
  try {
    posts.value = await listPostsForBlog({ category: category.value })
  } catch {
    error.value = '加载失败，请确认后端已启动并已导入数据。'
  } finally {
    loading.value = false
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

function toggleTagMenu() {
  tagMenuOpen.value = !tagMenuOpen.value
}

function closeTagMenu() {
  tagMenuOpen.value = false
}

function selectTag(value: string) {
  tagFilter.value = value
  closeTagMenu()
}

function onDocumentPointerDown(event: MouseEvent) {
  const root = tagMenuRef.value
  if (!root) return
  const target = event.target as Node | null
  if (target && !root.contains(target)) closeTagMenu()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentPointerDown)
  window.addEventListener('resize', updateCategoryPill)
  void nextTick(updateCategoryPill)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentPointerDown)
  window.removeEventListener('resize', updateCategoryPill)
})

watch(category, () => {
  void nextTick(updateCategoryPill)
})

watch(categoryOptions, () => {
  categoryBtnRefs.value = []
  void nextTick(updateCategoryPill)
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

const visiblePosts = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return posts.value.filter((post) => {
    if (tagFilter.value && !post.tags.includes(tagFilter.value)) return false
    if (!q) return true
    const haystack = `${post.title} ${post.summary} ${post.tags.join(' ')}`.toLowerCase()
    return haystack.includes(q)
  })
})

const timelineItems = computed<TimelineItem[]>(() => {
  return visiblePosts.value
    .map((post) => {
      const dateSource = post.published_at || post.updated_at
      const d = parseDate(dateSource)
      return {
        post,
        yearLabel: d ? String(d.getFullYear()) : '----',
        dateLabel: formatMonthDay(dateSource),
        sortTimestamp: d ? d.getTime() : 0,
      }
    })
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
  <section class="blog-page">
    <h1 class="h">{{ t('blog.title') }}</h1>
    <!-- <p class="sub">{{ t('blog.subtitle') }}</p> -->
    <div class="toolbar card">
      <div class="row row-top">
        <span class="lbl lbl-tag">{{ t('blog.tagFilter') }}</span>
        <div ref="tagMenuRef" class="select-wrap">
          <button class="select-btn" type="button" :aria-expanded="tagMenuOpen" aria-haspopup="listbox" @click="toggleTagMenu">
            <span class="select-btn-label">{{ selectedTagLabel }}</span>
            <span class="select-btn-caret" aria-hidden="true">▾</span>
          </button>
          <div v-if="tagMenuOpen" class="select-menu card" role="listbox">
            <button class="select-option" :class="{ 'select-option--active': tagFilter === '' }" type="button" @click="selectTag('')">
              {{ t('projects.allTags') }}
            </button>
            <button
              v-for="tg in allTags"
              :key="tg"
              class="select-option"
              :class="{ 'select-option--active': tagFilter === tg }"
              type="button"
              @click="selectTag(tg)"
            >
              {{ tg }}
            </button>
          </div>
        </div>

        <div ref="categoryGroupRef" class="category-group category-group--toolbar">
          <span class="category-pill-bg" :style="categoryPillStyle" aria-hidden="true" />
          <button
            v-for="(item, i) in categoryOptions"
            :key="item.id"
            class="category-btn"
            :class="{ 'category-btn--active': category === item.id }"
            type="button"
            :ref="(el) => setCategoryBtnRef(el as Element | null, i)"
            @click="category = item.id"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
      <div class="row row-search">
        <div class="search-wrap">
          <span class="search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="search-icon-svg" focusable="false">
              <circle cx="11" cy="11" r="6.5" />
              <line x1="16" y1="16" x2="21" y2="21" />
            </svg>
          </span>
          <input v-model="keyword" class="search-input" type="text" :placeholder="t('blog.searchPlaceholder')" />
        </div>
      </div>
    </div>
    <p v-if="error" class="empty">{{ error }}</p>
    <p v-else-if="loading" class="empty">加载中...</p>
    <div v-else-if="timelineGroups.length" class="timeline">
      <section v-for="group in timelineGroups" :key="group.year" class="timeline-year-group">
        <header class="timeline-year-head">
          <h2 class="timeline-year">{{ group.year }}</h2>
          <p class="timeline-year-count">{{ t('blog.timelineCount', { count: group.items.length }) }}</p>
        </header>
        <div class="timeline-items">
          <article v-for="item in group.items" :key="item.post.id" class="timeline-item">
            <time class="timeline-date">{{ item.dateLabel }}</time>
            <span class="timeline-dot" aria-hidden="true" />
            <div
              class="timeline-card card timeline-card--clickable"
              role="link"
              tabindex="0"
              @click="onCardClick(item.post.slug)"
              @keydown="onCardKeydown($event, item.post.slug)"
            >
              <div class="timeline-card-head">
                <h3 class="timeline-title">{{ item.post.title }}</h3>
                <span v-if="item.post.pinned" class="badge">{{ t('blog.pinned') }}</span>
              </div>
              <p class="timeline-summary">{{ item.post.summary }}</p>
              <div class="timeline-tags">
                <span v-for="tag in item.post.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
    <p v-else class="empty">暂无文章。</p>
  </section>
</template>

<style scoped>
.blog-page {
  max-width: 980px;
  --timeline-date-col: 5.2rem;
  --timeline-dot-col: 1.25rem;
  --timeline-gap: 0.7rem;
  --timeline-dot-offset: 1.22rem;
  --timeline-item-gap: 0.85rem;
}

.h {
  margin: 0 0 0.35rem;
}
.sub {
  margin: 0 0 1.25rem;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.toolbar {
  position: relative;
  z-index: 2;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-bg-surface) 85%, transparent);
  overflow: visible;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2rem;
}

.lbl {
  min-width: 6rem;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.lbl-tag {
  min-width: 0;
  width: max-content;
  flex-shrink: 0;
}

.category-group--toolbar {
  margin-left: auto;
}

.row-top {
  position: relative;
  z-index: 3;
  flex-wrap: wrap;
}

.category-group {
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-bg-surface) 86%, transparent);
}

.category-pill-bg {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
  background: color-mix(in srgb, var(--color-accent) 16%, var(--color-bg-surface));
  transition:
    transform 0.35s ease,
    width 0.35s ease,
    height 0.35s ease,
    opacity 0.2s ease;
  z-index: 0;
}

.category-btn {
  position: relative;
  z-index: 1;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-muted);
  padding: 0.32rem 0.7rem;
  font-size: 0.86rem;
  line-height: 1.2;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.category-btn:hover {
  color: var(--color-text);
}

.category-btn--active {
  color: var(--color-accent);
}

.select-wrap {
  position: relative;
  z-index: 4;
  display: inline-block;
  min-width: 280px;
  max-width: 320px;
}

.select-btn {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  width: 100%;
  padding: 0.42rem 0.62rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-surface) 88%, transparent);
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.2;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.select-btn:hover {
  border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
}

.select-btn:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--color-accent) 58%, var(--color-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent);
}

.select-btn-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-btn-caret {
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.select-menu {
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 0;
  z-index: 20;
  width: 100%;
  max-height: 260px;
  overflow: auto;
  padding: 0.35rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-bg-surface) 92%, transparent);
  box-shadow: var(--shadow-card);
}

.select-option {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.55rem;
  margin: 0;
  background: transparent;
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.select-option:hover {
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
}

.select-option--active {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  color: var(--color-accent);
}

.row-search {
  position: relative;
  z-index: 1;
  overflow: visible;
}

.search-wrap {
  position: relative;
  width: min(420px, 100%);
}

.search-icon {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.search-icon-svg {
  width: 0.95rem;
  height: 0.95rem;
  display: block;
  stroke: color-mix(in srgb, var(--color-text-muted) 92%, transparent);
  stroke-width: 1.8;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.search-input {
  width: 100%;
  padding: 0.38rem 0.55rem 0.38rem 2rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-surface) 88%, transparent);
  color: var(--color-text);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.timeline-year-group {
  margin-bottom: 1.4rem;
}

.timeline-year-head {
  display: flex;
  align-items: baseline;
  gap: 0.9rem;
  margin-bottom: 0.55rem;
}

.timeline-year {
  margin: 0;
  font-size: 2rem;
  line-height: 1;
}

.timeline-year-count {
  margin: 0;
  margin-left: auto;
  color: var(--color-text-muted);
  font-size: 1rem;
  text-align: right;
}

.timeline-items {
  position: relative;
}

.timeline-item {
  display: grid;
  grid-template-columns: var(--timeline-date-col) var(--timeline-dot-col) minmax(0, 1fr);
  column-gap: var(--timeline-gap);
  align-items: start;
  margin-bottom: var(--timeline-item-gap);
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-date {
  padding-top: 0.95rem;
  font-size: 1.2rem;
  color: var(--color-text-muted);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.timeline-dot {
  position: relative;
  margin-top: var(--timeline-dot-offset);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-accent) 75%, #19d3ff);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.timeline-card {
  padding: 0.85rem 1rem;
}

.timeline-card--clickable {
  cursor: pointer;
}

.timeline-card--clickable:hover {
  border-color: color-mix(in srgb, var(--color-accent) 38%, var(--color-border));
  transform: translateY(-1px);
}

.timeline-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem;
}

.timeline-title {
  margin: 0;
  font-size: 1.15rem;
}

.timeline-summary {
  margin: 0.45rem 0 0.55rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.timeline-tags {
  margin-bottom: 0.3rem;
}

@media (max-width: 860px) {
  .category-group--toolbar {
    margin-left: 0;
  }

  .select-wrap {
    min-width: 0;
    width: min(320px, 100%);
  }

  .search-wrap {
    width: 100%;
  }

  .blog-page {
    --timeline-date-col: 4.3rem;
    --timeline-dot-col: 1.1rem;
    --timeline-gap: 0.55rem;
  }

  .timeline-item {
    grid-template-columns: var(--timeline-date-col) var(--timeline-dot-col) minmax(0, 1fr);
    column-gap: var(--timeline-gap);
  }

  .timeline-year {
    font-size: 1.65rem;
  }

  .timeline-date {
    font-size: 1rem;
  }
}

.empty {
  color: var(--color-text-muted);
}
</style>
