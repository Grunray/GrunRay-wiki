<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { ensureProjectsLoaded, getProjectById } from '@/services/contentRepository'
import type { AlgorithmPost, Post, ProjectNote } from '@/types/content'

const props = defineProps<{ post: Post }>()

const { t } = useI18n()

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
  <article class="post-card">
    <div class="post-card-meta">
      <time v-if="post.published_at" class="post-card-date" :datetime="post.published_at">{{
        post.published_at.slice(0, 10)
      }}</time>
      <span v-if="post.pinned" class="badge">{{ t('blog.pinned') }}</span>
    </div>
    <div class="timeline-card-head">
      <h2 class="timeline-title">
        <RouterLink :to="postLink">{{ post.title }}</RouterLink>
      </h2>
    </div>
    <p class="timeline-summary">{{ post.summary }}</p>
    <p v-if="post.type === 'algorithm' && (post as AlgorithmPost).series" class="post-card-meta-line">
      {{ t('post.series') }}: {{ (post as AlgorithmPost).series }}
    </p>
    <p v-if="post.type === 'project_note' && projectTitle" class="post-card-meta-line">
      {{ t('post.projectNote') }} · {{ projectTitle }}
    </p>
    <div v-if="post.tags.length" class="timeline-tags">
      <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>
  </article>
</template>

<style scoped>
.post-card {
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--color-border);
}

.post-card:first-child {
  border-top: 1px solid var(--color-border);
}

.post-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.35rem;
}

.post-card-date {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.timeline-title :deep(a) {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
}

.timeline-title :deep(a:hover) {
  color: var(--color-accent);
}

.post-card-meta-line {
  margin: 0 0 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
</style>
