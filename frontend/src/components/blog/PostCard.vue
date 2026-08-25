<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { ensureProjectsLoaded, getProjectById } from '@/services/contentRepository'
import '@/styles/page-toc-row.css'
import type { AlgorithmPost, Post, ProjectNote } from '@/types/content'

const props = defineProps<{ post: Post }>()

const { t } = useI18n()

const algo = computed(() =>
  props.post.type === 'algorithm' ? (props.post as AlgorithmPost) : null,
)

const projectTitle = computed(() => {
  if (props.post.type !== 'project_note') return null
  return getProjectById((props.post as ProjectNote).project_id)?.title ?? null
})

const postLink = computed(() => `/blog/${props.post.slug}`)

onMounted(() => {
  void ensureProjectsLoaded()
})
</script>

<template>
  <RouterLink :to="postLink" class="toc-row">
    <span class="toc-meta">
      <time v-if="post.published_at" :datetime="post.published_at">{{
        post.published_at.slice(0, 10)
      }}</time>
      <span v-if="post.pinned" class="badge">{{ t('blog.pinned') }}</span>
    </span>
    <h2 class="toc-title">{{ post.title }}</h2>
    <p v-if="post.summary" class="toc-summary">{{ post.summary }}</p>
    <p v-if="algo?.series" class="toc-note">{{ t('post.series') }}: {{ algo.series }}</p>
    <p v-if="post.type === 'project_note' && projectTitle" class="toc-note">
      {{ t('post.projectNote') }} · {{ projectTitle }}
    </p>
    <div v-if="post.tags.length" class="toc-tags">
      <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>
  </RouterLink>
</template>
