<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { ensureProjectsLoaded, listProjectsPublic } from '@/services/contentRepository'
import type { Project } from '@/types/content'

const { t } = useI18n()
const router = useRouter()
const includeArchived = ref(true)
const tagFilter = ref('')
const loading = ref(true)
const loadError = ref<string | null>(null)

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

function onCardClick(slug: string) {
  void router.push(`/projects/${slug}`)
}

function onCardKeydown(event: KeyboardEvent, slug: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  onCardClick(slug)
}

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
  <section class="projects-page">
    <h1 class="h">{{ t('projects.title') }}</h1>
    <div class="toolbar card">
      <label class="row">
        <input v-model="includeArchived" type="checkbox" />
        <span>{{ t('projects.includeArchived') }}</span>
      </label>
      <div class="row">
        <span class="lbl">{{ t('projects.filterTags') }}</span>
        <select v-model="tagFilter" class="select">
          <option value="">{{ t('projects.allTags') }}</option>
          <option v-for="tg in allTags" :key="tg" :value="tg">{{ tg }}</option>
        </select>
      </div>
    </div>

    <p v-if="loadError" class="empty">{{ loadError }}</p>
    <p v-else-if="loading" class="empty">正在加载项目...</p>
    <div v-else-if="timelineGroups.length" class="timeline">
      <section v-for="group in timelineGroups" :key="group.year" class="timeline-year-group">
        <header class="timeline-year-head">
          <h2 class="timeline-year">{{ group.year }}</h2>
          <p class="timeline-year-count">{{ t('projects.timelineCount', { count: group.items.length }) }}</p>
        </header>
        <div class="timeline-items">
          <article v-for="item in group.items" :key="item.project.id" class="timeline-item">
            <time class="timeline-date">{{ item.dateLabel }}</time>
            <span class="timeline-dot" aria-hidden="true" />
            <div
              class="timeline-card card timeline-card--clickable"
              role="link"
              tabindex="0"
              @click="onCardClick(item.project.slug)"
              @keydown="onCardKeydown($event, item.project.slug)"
            >
              <div class="timeline-card-head">
                <h3 class="timeline-title">{{ item.project.title }}</h3>
                <span v-if="item.project.status === 'archived'" class="badge">{{ t('projects.archived') }}</span>
              </div>
              <p class="timeline-summary">{{ item.project.summary }}</p>
              <div class="timeline-tags">
                <span v-for="tag in item.project.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
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
}

.h {
  margin: 0 0 1rem;
}

.toolbar {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.lbl {
  min-width: 6rem;
}
.select {
  flex: 1;
  max-width: 240px;
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  color: var(--color-text);
}
.empty {
  color: var(--color-text-muted);
}

.timeline-year-group {
  margin-bottom: 1.4rem;
}

.timeline-year-head {
  display: flex;
  align-items: baseline;
  gap: 0.9rem;
  margin-bottom: 0.35rem;
}

.timeline-year {
  margin: 0;
  font-size: 2rem;
  line-height: 1;
}

.timeline-year-count {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 1rem;
}

.timeline-items {
  position: relative;
}

.timeline-item {
  display: grid;
  grid-template-columns: 5.2rem 1.25rem minmax(0, 1fr);
  column-gap: 0.7rem;
  align-items: start;
  margin-bottom: 0.85rem;
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
  margin-top: 1.22rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-accent) 75%, #19d3ff);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.timeline-dot::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -1.8rem;
  width: 2px;
  height: calc(100% + 1.8rem + 0.85rem);
  transform: translateX(-50%);
  background: color-mix(in srgb, var(--color-border) 82%, transparent);
}

.timeline-year-group:first-child .timeline-item:first-child .timeline-dot::before {
  top: 50%;
  height: calc(50% + 0.85rem);
}

.timeline-item:last-child .timeline-dot::before {
  height: 50%;
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

@media (max-width: 760px) {
  .timeline-item {
    grid-template-columns: 4.3rem 1.1rem minmax(0, 1fr);
    column-gap: 0.55rem;
  }

  .timeline-year {
    font-size: 1.65rem;
  }

  .timeline-date {
    font-size: 1rem;
  }
}
</style>
