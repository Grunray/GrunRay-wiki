<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import CardCornerVineLazy from '@/components/hover/CardCornerVineLazy.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import TimelinePageSkeleton from '@/components/ui/TimelinePageSkeleton.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { ensureProjectsLoaded, listProjectsPublic } from '@/services/contentRepository'
import '@/styles/page-enter-timeline.css'
import type { Project } from '@/types/content'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

useSeoMeta(() => ({
  title: `${t('projects.title')} | ${SITE_NAME}`,
  description: `${t('projects.title')} — ${t('home.tagline')}`,
  path: route.path,
  type: 'website',
}))
const includeArchived = ref(true)
const tagFilter = ref('')
const loading = ref(true)
const loadError = ref<string | null>(null)
const pageRoot = ref<HTMLElement | null>(null)
const enterPlayed = ref(false)

interface TimelineItem {
  project: Project
  yearLabel: string
  dateLabel: string
  sortTimestamp: number
}

interface TimelineYearGroup {
  year: string
  items: TimelineItem[]
}

function parseDate(value?: string): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatMonthDay(value?: string): string {
  const d = parseDate(value)
  if (!d) return t('projects.unknownDate')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

const allTags = computed(() => {
  const set = new Set<string>()
  for (const p of listProjectsPublic({ includeArchived: true })) {
    for (const tag of p.tags) set.add(tag)
  }
  return [...set].sort()
})

const tagSelectOptions = computed(() => [
  { value: '', label: t('projects.allTags') },
  ...allTags.value.map((tag) => ({ value: tag, label: tag })),
])

const timelineItems = computed<TimelineItem[]>(() => {
  let list = listProjectsPublic({ includeArchived: includeArchived.value })
  if (tagFilter.value) list = list.filter((p) => p.tags.includes(tagFilter.value))
  return list
    .map((project) => {
      const d = parseDate(project.start_date)
      const yearFallback = project.year ?? 0
      return {
        project,
        yearLabel: d ? String(d.getFullYear()) : (project.year ? String(project.year) : '----'),
        dateLabel: formatMonthDay(project.start_date),
        sortTimestamp: d ? d.getTime() : yearFallback * 10_000_000,
      }
    })
    .sort((a, b) => {
      if (a.sortTimestamp !== b.sortTimestamp) return b.sortTimestamp - a.sortTimestamp
      return a.project.title.localeCompare(b.project.title)
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

function timelineItemEnterIndex(groupIndex: number, itemIndex: number): number {
  let sum = 0
  for (let i = 0; i < groupIndex; i++) {
    sum += timelineGroups.value[i]?.items.length ?? 0
  }
  return Math.min(sum + itemIndex, 14)
}

function onCardClick(slug: string) {
  void router.push(`/projects/${slug}`)
}

function onCardKeydown(event: KeyboardEvent, slug: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  onCardClick(slug)
}

watch(loading, async (isLoading) => {
  if (enterPlayed.value || isLoading) return
  enterPlayed.value = true
  await playPageEnter(pageRoot.value)
})

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    await ensureProjectsLoaded()
  } catch {
    loadError.value = '加载失败，请确认后端已启动并已导入项目数据。'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section ref="pageRoot" class="projects-page">
    <h1 class="h">{{ t('projects.title') }}</h1>
    <div class="ed-filter" role="search">
      <div class="ed-filter-row">
        <div class="ed-filter-col">
          <p class="ed-kicker">
            <span class="ed-en">{{ t('projects.kickerFilterEn') }}</span>
            <span class="ed-mid" aria-hidden="true">·</span>
            <span class="ed-zh">{{ t('projects.kickerFilterZh') }}</span>
          </p>
          <AppSelect
            v-model="tagFilter"
            variant="editorial"
            :options="tagSelectOptions"
            :aria-label="t('projects.filterTags')"
            min-width="0"
          />
        </div>
        <div class="ed-filter-col ed-filter-col--archive">
          <p class="ed-kicker">
            <span class="ed-en">{{ t('projects.kickerArchiveEn') }}</span>
            <span class="ed-mid" aria-hidden="true">·</span>
            <span class="ed-zh">{{ t('projects.kickerArchiveZh') }}</span>
          </p>
          <button
            type="button"
            class="ed-toggle"
            :class="{ 'is-on': includeArchived }"
            :aria-pressed="includeArchived"
            @click="includeArchived = !includeArchived"
          >
            <span class="ed-toggle-label">{{ includeArchived ? t('projects.showArchived') : t('projects.hideArchived') }}</span>
            <span class="toggle-visual" aria-hidden="true">
              <span class="toggle-end toggle-end--left" />
              <span class="toggle-track" />
              <span class="toggle-end toggle-end--right" />
            </span>
          </button>
        </div>
      </div>
    </div>

    <p v-if="loadError" class="empty">{{ loadError }}</p>
    <TimelinePageSkeleton v-else-if="loading" variant="notes" />
    <div v-else-if="timelineGroups.length" class="timeline">
      <section
        v-for="(group, gi) in timelineGroups"
        :key="group.year"
        class="timeline-year-group"
        :style="{ '--enter-gi': gi }"
      >
        <header class="timeline-year-head">
          <h2 class="timeline-year">{{ group.year }}</h2>
          <p class="timeline-year-count">{{ t('projects.timelineCount', { count: group.items.length }) }}</p>
        </header>
        <div class="timeline-items">
          <article
            v-for="(item, ii) in group.items"
            :key="item.project.id"
            class="timeline-item"
            :style="{ '--enter-ti': timelineItemEnterIndex(gi, ii) }"
          >
            <time class="timeline-date">{{ item.dateLabel }}</time>
            <span class="timeline-dot" aria-hidden="true" />
            <div
              class="timeline-card card timeline-card--clickable card-hover-g"
              data-cursor-hover="project"
              role="link"
              tabindex="0"
              @click="onCardClick(item.project.slug)"
              @keydown="onCardKeydown($event, item.project.slug)"
            >
              <div class="timeline-card-head">
                <h3 class="timeline-title">{{ item.project.title }}</h3>
                <span
                  class="timeline-status"
                  :class="item.project.status === 'published' ? 'timeline-status--on' : undefined"
                >
                  {{ item.project.status === 'archived' ? t('projects.archived') : t('projects.active') }}
                </span>
              </div>
              <p class="timeline-summary">{{ item.project.summary }}</p>
              <div class="timeline-tags">
                <span v-for="tag in item.project.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
              <CardCornerVineLazy />
            </div>
          </article>
        </div>
      </section>
    </div>
    <p v-else class="empty">{{ t('projects.empty') }}</p>
  </section>
</template>

<style scoped>
.projects-page {
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

.empty {
  color: var(--color-text-muted);
}

@media (max-width: 760px) {
  .projects-page {
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
</style>
