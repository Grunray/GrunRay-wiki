<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import { canAccessPostPublic, getPostBySlug, getProjectById } from '@/services/contentRepository'
import type { AlgorithmPost, Post, ProjectNote } from '@/types/content'

const route = useRoute()
const { t } = useI18n()

const post = ref<Post | null>(null)
const loadError = ref(false)

async function load(slug: string) {
  loadError.value = false
  try {
    post.value = (await getPostBySlug(slug)) ?? null
  } catch {
    loadError.value = true
    post.value = null
  }
}

watch(
  () => route.params.slug as string,
  (s) => {
    void load(s)
  },
  { immediate: true },
)

const ok = computed(() => {
  const p = post.value
  return p && canAccessPostPublic(p)
})

const algo = computed(() => (post.value?.type === 'algorithm' ? (post.value as AlgorithmPost) : null))
const note = computed(() => (post.value?.type === 'project_note' ? (post.value as ProjectNote) : null))
const noteProject = computed(() => (note.value ? getProjectById(note.value.project_id) : null))
</script>

<template>
  <article v-if="loadError">
    <p class="empty">加载失败，请确认后端已启动。</p>
  </article>
  <article v-else-if="ok && post">
    <p class="back">
      <RouterLink to="/blog">← {{ t('blog.title') }}</RouterLink>
    </p>
    <header class="head">
      <h1 class="title">{{ post.title }}</h1>
      <span v-if="post.pinned" class="badge">{{ t('blog.pinned') }}</span>
    </header>
    <p class="summary">{{ post.summary }}</p>

    <dl v-if="algo" class="meta card">
      <template v-if="algo.series">
        <dt>{{ t('post.series') }}</dt>
        <dd>{{ algo.series }}</dd>
      </template>
      <template v-if="algo.difficulty">
        <dt>{{ t('post.difficulty') }}</dt>
        <dd>{{ algo.difficulty }}</dd>
      </template>
      <template v-if="algo.oj">
        <dt>{{ t('post.oj') }}</dt>
        <dd>{{ algo.oj }}</dd>
      </template>
      <template v-if="algo.problem_id">
        <dt>{{ t('post.problem') }}</dt>
        <dd>{{ algo.problem_id }}</dd>
      </template>
    </dl>

    <p v-if="note && noteProject" class="proj card">
      {{ t('post.projectNote') }}:
      <RouterLink :to="`/projects/${noteProject.slug}`">{{ noteProject.title }}</RouterLink>
    </p>

    <div class="tags">
      <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>

    <div v-if="post.body" class="body prose card">{{ post.body }}</div>
  </article>
  <p v-else class="empty">{{ t('common.notFound') }}</p>
</template>

<style scoped>
.back {
  margin: 0 0 1rem;
}
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
}
.title {
  margin: 0;
  font-size: 1.45rem;
}
.summary {
  color: var(--color-text-muted);
}
.meta {
  display: grid;
  grid-template-columns: 7rem 1fr;
  gap: 0.35rem 1rem;
  margin: 1rem 0;
  font-size: 0.9rem;
}
.meta dt {
  margin: 0;
  color: var(--color-text-muted);
}
.meta dd {
  margin: 0;
}
.proj {
  margin: 1rem 0;
  font-size: 0.9rem;
}
.body {
  margin-top: 1.25rem;
  padding: 1rem 1.25rem;
}
.empty {
  color: var(--color-text-muted);
}
</style>
