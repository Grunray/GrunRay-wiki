<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import DetailScrollSidebar from '@/components/detail/DetailScrollSidebar.vue'
import ProjectDetailPageSkeleton from '@/components/ui/ProjectDetailPageSkeleton.vue'
import { useDetailScrollSidebar } from '@/composables/useDetailScrollSidebar'
import { restartPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import ProjectBlockRenderer from '@/project-blocks/ProjectBlockRenderer.vue'
import '@/styles/page-enter-post.css'
import { canAccessProjectPublic, ensureProjectsLoaded, getProjectBySlug } from '@/services/contentRepository'
import type { Project } from '@/types/content'

const route = useRoute()
const { t } = useI18n()

const project = ref<Project | null>(null)
const loading = ref(true)
const loadError = ref(false)
const articleRoot = ref<HTMLElement | null>(null)
const foldZoneRef = ref<HTMLElement | null>(null)
const sidebarContentKey = computed(() => project.value?.slug ?? '')
const { progress: sidebarProgress, wideEnough: sidebarWide } = useDetailScrollSidebar(foldZoneRef, {
  contentKey: sidebarContentKey,
})
const ok = computed(() => {
  const p = project.value
  return p && canAccessProjectPublic(p)
})

async function restartProjectEnterWhenReady() {
  const p = project.value
  if (!p || !canAccessProjectPublic(p) || loadError.value) return
  await nextTick()
  let el = articleRoot.value
  if (!el) {
    await nextTick()
    el = articleRoot.value
  }
  if (!el) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
    el = articleRoot.value
  }
  if (el) restartPageEnter(el)
}

watch(
  () => route.params.slug as string,
  async (slug) => {
    loading.value = true
    loadError.value = false
    try {
      await ensureProjectsLoaded()
      project.value = getProjectBySlug(slug) ?? null
    } catch {
      loadError.value = true
      project.value = null
    } finally {
      loading.value = false
      await restartProjectEnterWhenReady()
    }
  },
  { immediate: true },
)

function formatDateYmd(input?: string): string {
  if (!input) return t('projects.unknownDate')
  const d = new Date(`${input}T00:00:00`)
  if (Number.isNaN(d.getTime())) return input
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

const periodText = computed(() => {
  const p = project.value
  if (!p) return t('projects.unknownDate')
  const start = formatDateYmd(p.start_date)
  const end = p.end_date ? formatDateYmd(p.end_date) : t('projects.inProgress')
  return `${start} - ${end}`
})

useSeoMeta(() => {
  const path = route.path
  const p = project.value
  if (loadError.value) {
    return {
      title: `${t('projects.title')} | ${SITE_NAME}`,
      description: t('common.notFound'),
      path,
      type: 'website' as const,
      robots: 'noindex, nofollow',
    }
  }
  if (p && canAccessProjectPublic(p)) {
    return {
      title: `${p.title} | ${SITE_NAME}`,
      description: p.summary || t('projects.title'),
      path,
      type: 'article' as const,
      publishedTime: p.start_date,
      modifiedTime: p.end_date ?? p.start_date,
    }
  }
  if (p && !canAccessProjectPublic(p)) {
    return {
      title: `${t('common.notFound')} | ${SITE_NAME}`,
      description: t('common.notFound'),
      path,
      type: 'website' as const,
      robots: 'noindex, nofollow',
    }
  }
  return {
    title: `${t('projects.title')} | ${SITE_NAME}`,
    description: `${t('projects.title')} — ${t('home.tagline')}`,
    path,
    type: 'website' as const,
  }
})
</script>

<template>
  <article v-if="loadError">
    <p class="empty">加载失败，请确认后端已启动并已导入项目数据。</p>
  </article>
  <ProjectDetailPageSkeleton v-else-if="loading" />
  <article v-else-if="ok && project" ref="articleRoot" class="project-detail">
    <div ref="foldZoneRef" class="project-fold">
      <p class="back">
        <RouterLink to="/projects">← {{ t('projects.title') }}</RouterLink>
      </p>

      <div class="ed-mast">
        <section class="ed-zone">
          <h1 class="title">{{ project.title }}</h1>
          <p class="summary">{{ project.summary }}</p>
          <div v-if="project.tags.length" class="tags">
            <span v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </section>
        <div class="ed-split">
          <section class="ed-zone ed-zone--facts">
            <p class="ed-kicker">
              <span class="ed-en">{{ t('projects.kickerFactsEn') }}</span>
              <span class="ed-mid" aria-hidden="true">·</span>
              <span class="ed-zh">{{ t('projects.kickerFactsZh') }}</span>
            </p>
            <dl class="ed-meta">
              <dt>{{ t('projects.factsPeriod') }}</dt>
              <dd>{{ periodText }}</dd>
              <dt>{{ t('projects.factsStatus') }}</dt>
              <dd>
                <span
                  class="ed-status"
                  :class="{ 'ed-status--on': project.status !== 'archived' }"
                >
                  {{ project.status === 'archived' ? t('projects.archived') : t('projects.active') }}
                </span>
              </dd>
            </dl>
          </section>
          <section class="ed-zone ed-zone--actions">
            <p class="ed-kicker">
              <span class="ed-en">{{ t('projects.kickerActionsEn') }}</span>
              <span class="ed-mid" aria-hidden="true">·</span>
              <span class="ed-zh">{{ t('projects.kickerActionsZh') }}</span>
            </p>
            <div class="ed-actions">
              <a
                v-if="project.github_url"
                class="ed-action"
                :href="project.github_url"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ t('projects.openGithub') }}
              </a>
              <span v-else class="ed-action ed-action--disabled">{{ t('projects.githubMissing') }}</span>
              <RouterLink class="ed-action" :to="`/projects/${project.slug}/notes`">
                {{ t('projects.notes') }}
              </RouterLink>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div class="detail-grid">
      <section class="main-content">
        <!-- <section class="card content-head">
          <h2 class="content-title">{{ t('projects.contentTitle') }}</h2>
        </section> -->
        <div class="blocks">
          <ProjectBlockRenderer v-for="(block, i) in project.layout" :key="i" :block="block" />
        </div>
      </section>
    </div>

    <DetailScrollSidebar
      v-if="sidebarWide"
      :progress="sidebarProgress"
      :kicker="t('projects.sidebarKicker')"
      :title="project.title"
      :label="t('projects.sidebarLabel')"
    >
      <p v-if="project.summary" class="summary">{{ project.summary }}</p>
      <div v-if="project.tags.length" class="tags">
        <span v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
      <dl class="meta">
        <dt>{{ t('projects.factsPeriod') }}</dt>
        <dd>{{ periodText }}</dd>
        <dt>{{ t('projects.factsStatus') }}</dt>
        <dd>{{ project.status === 'archived' ? t('projects.archived') : t('projects.active') }}</dd>
      </dl>
      <div class="actions">
        <a
          v-if="project.github_url"
          :href="project.github_url"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('projects.openGithub') }}
        </a>
        <RouterLink :to="`/projects/${project.slug}/notes`">{{ t('projects.notes') }}</RouterLink>
      </div>
    </DetailScrollSidebar>
  </article>
  <p v-else class="empty">{{ t('common.notFound') }}</p>
</template>

<style scoped>
.project-detail {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.project-fold {
  display: flex;
  flex-direction: column;
}

.summary {
  color: var(--color-text-muted);
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.main-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.blocks {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 0;
}

.empty {
  color: var(--color-text-muted);
}
</style>
