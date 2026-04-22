<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import PostCard from '@/components/blog/PostCard.vue'
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
</script>

<template>
  <p v-if="loadError" class="empty">加载失败，请确认后端已启动并已导入项目数据。</p>
  <p v-else-if="loading" class="empty">正在加载项目笔记...</p>
  <div v-else-if="ok && project">
    <p class="back">
      <RouterLink :to="`/projects/${project.slug}`">← {{ project.title }}</RouterLink>
    </p>
    <h1 class="h">{{ t('projects.notes') }}</h1>
    <PostCard v-for="p in posts" :key="p.id" :post="p" />
    <p v-if="!posts.length" class="empty">暂无笔记。</p>
  </div>
  <p v-else class="empty">{{ t('common.notFound') }}</p>
</template>

<style scoped>
.back {
  margin: 0 0 1rem;
}
.h {
  margin: 0 0 1rem;
}
.empty {
  color: var(--color-text-muted);
}
</style>
