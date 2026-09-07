<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import EdKicker from '@/components/editorial/EdKicker.vue'
import PostCard from '@/components/blog/PostCard.vue'
import NotesListSkeleton from '@/components/ui/NotesListSkeleton.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { ensureProjectsLoaded, getProjectBySlug, listPostsForProjectSlug } from '@/services/contentRepository'
import type { Post, Project } from '@/types/content'

const route = useRoute()
const { t } = useI18n()

const slug = computed(() => route.params.slug as string)
const project = ref<Project | null>(null)
const ok = computed(() => project.value && project.value.status !== 'hidden')

const posts = ref<Post[]>([])
const loading = ref(false)
const loadError = ref(false)

watch(
  slug,
  async (s) => {
    loading.value = true
    loadError.value = false
    try {
      await ensureProjectsLoaded()
      project.value = getProjectBySlug(s) ?? null
      posts.value = await listPostsForProjectSlug(s)
    } catch {
      loadError.value = true
      project.value = null
      posts.value = []
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

useSeoMeta(() => {
  const path = route.path
  const p = project.value
  if (loadError.value) {
    return {
      title: `${t('projects.notes')} | ${SITE_NAME}`,
      description: t('common.notFound'),
      path,
      type: 'website' as const,
      robots: 'noindex, nofollow',
    }
  }
  if (p && ok.value) {
    return {
      title: `${p.title} — ${t('projects.notes')} | ${SITE_NAME}`,
      description: `${p.summary} ${t('blog.subtitle')}`,
      path,
      type: 'website' as const,
    }
  }
  if (p && !ok.value) {
    return {
      title: `${t('common.notFound')} | ${SITE_NAME}`,
      description: t('common.notFound'),
      path,
      type: 'website' as const,
      robots: 'noindex, nofollow',
    }
  }
  return {
    title: `${t('projects.notes')} | ${SITE_NAME}`,
    description: t('blog.subtitle'),
    path,
    type: 'website' as const,
  }
})
</script>

<template>
  <p v-if="loadError" class="empty">加载失败，请确认后端已启动并已导入项目数据。</p>
  <NotesListSkeleton v-else-if="loading" />
  <div v-else-if="ok && project" class="notes-page">
    <p class="notes-back">
      <RouterLink :to="`/projects/${project.slug}`">← {{ project.title }}</RouterLink>
    </p>
    <h1 class="h">{{ t('projects.notes') }}</h1>
    <div class="ed-filter">
      <EdKicker :en="t('projects.kickerNotesEn')" :zh="t('projects.kickerNotesZh')" />
    </div>
    <section class="notes-toc" :aria-label="t('projects.notes')">
      <PostCard v-for="p in posts" :key="p.id" :post="p" />
      <p v-if="!posts.length" class="toc-empty">{{ t('projects.notesEmpty') }}</p>
    </section>
  </div>
  <p v-else class="empty">{{ t('common.notFound') }}</p>
</template>

<style scoped>
.notes-page .h {
  margin: 0 0 0.35rem;
  font-family: var(--font-serif);
  font-size: clamp(1.6rem, 3.4vw, 2.1rem);
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.notes-back {
  margin: 0 0 1.4rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
}

.notes-back a {
  color: var(--color-accent);
  text-decoration: none;
  border-bottom: none;
}

.notes-page .ed-filter {
  margin-bottom: 0;
}

.notes-toc {
  border-top: 1px solid var(--color-border);
}

.empty {
  color: var(--color-text-muted);
}
</style>
