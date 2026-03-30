<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import PostCard from '@/components/blog/PostCard.vue'
import { getProjectBySlug, listPostsForProjectSlug } from '@/services/contentRepository'
import type { Post } from '@/types/content'

const route = useRoute()
const { t } = useI18n()

const slug = computed(() => route.params.slug as string)
const project = computed(() => getProjectBySlug(slug.value))
const ok = computed(() => project.value && project.value.status !== 'hidden')

const posts = ref<Post[]>([])

watch(
  slug,
  async (s) => {
    posts.value = await listPostsForProjectSlug(s)
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="ok && project">
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
