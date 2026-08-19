<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import DetailScrollSidebar from '@/components/detail/DetailScrollSidebar.vue'
import PostDetailPageSkeleton from '@/components/ui/PostDetailPageSkeleton.vue'
import { useDetailScrollSidebar } from '@/composables/useDetailScrollSidebar'
import { useMarkdownCodeCopy } from '@/composables/useMarkdownCodeCopy'
import { restartPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { canAccessPostPublic, ensureProjectsLoaded, getPostBySlug, getProjectById } from '@/services/contentRepository'
import '@/styles/page-enter-post.css'
import type { AlgorithmPost, Post, ProjectNote } from '@/types/content'

const POST_DETAIL_CACHE_PREFIX = 'grunray-post-detail:'

function postDetailCacheKey(slug: string): string {
  return `${POST_DETAIL_CACHE_PREFIX}${slug}`
}

function readCachedPost(slug: string): Post | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(postDetailCacheKey(slug))
    if (raw === null) return null
    return JSON.parse(raw) as Post
  } catch {
    return null
  }
}

function writeCachedPost(slug: string, p: Post) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(postDetailCacheKey(slug), JSON.stringify(p))
  } catch {
    /* ignore quota */
  }
}

const route = useRoute()
const { t } = useI18n()

const post = ref<Post | null>(null)
const loadError = ref(false)
const loading = ref(true)
const articleRoot = ref<HTMLElement | null>(null)
const bodyMarkdownRef = ref<HTMLElement | null>(null)
const foldZoneRef = ref<HTMLElement | null>(null)

function bindHtmlBody(el: Element | { $el?: Element } | null) {
  const node = (el && '$el' in el ? el.$el : el) as HTMLElement | null | undefined
  bodyMarkdownRef.value = node ?? null
}

const sidebarContentKey = computed(() => post.value?.slug ?? '')
const { progress: sidebarProgress, wideEnough: sidebarWide } = useDetailScrollSidebar(foldZoneRef, {
  contentKey: sidebarContentKey,
})

/** 正文根在首帧可能尚未挂上 ref；且同 slug 再进入时 slug watch 不会触发，必须在 load 结束后统一补 play */
async function restartArticleEnterWhenReady() {
  const p = post.value
  if (!p || !canAccessPostPublic(p) || loadError.value) return
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

async function load(slug: string) {
  loadError.value = false
  const cached = readCachedPost(slug)
  if (cached) {
    post.value = cached
  } else {
    post.value = null
  }
  loading.value = true
  try {
    await ensureProjectsLoaded()
    const next = (await getPostBySlug(slug)) ?? null
    post.value = next
    if (next) writeCachedPost(slug, next)
  } catch {
    loadError.value = true
    if (!cached) post.value = null
  } finally {
    loading.value = false
    await restartArticleEnterWhenReady()
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

useSeoMeta(() => {
  const path = route.path
  const p = post.value
  if (loadError.value) {
    return {
      title: `${t('blog.title')} | ${SITE_NAME}`,
      description: t('common.notFound'),
      path,
      type: 'website' as const,
      robots: 'noindex, nofollow',
    }
  }
  if (loading.value) {
    return {
      title: `${t('blog.title')} | ${SITE_NAME}`,
      description: t('blog.subtitle'),
      path,
      type: 'website' as const,
    }
  }
  if (p && canAccessPostPublic(p)) {
    return {
      title: `${p.title} | ${SITE_NAME}`,
      description: p.summary || t('blog.subtitle'),
      path,
      image: p.cover,
      type: 'article' as const,
      publishedTime: p.published_at,
      modifiedTime: p.updated_at,
    }
  }
  if (p && !canAccessPostPublic(p)) {
    return {
      title: `${t('common.notFound')} | ${SITE_NAME}`,
      description: t('common.notFound'),
      path,
      type: 'website' as const,
      robots: 'noindex, nofollow',
    }
  }
  return {
    title: `${t('blog.title')} | ${SITE_NAME}`,
    description: t('blog.subtitle'),
    path,
    type: 'website' as const,
  }
})

const algo = computed(() => (post.value?.type === 'algorithm' ? (post.value as AlgorithmPost) : null))
const note = computed(() => (post.value?.type === 'project_note' ? (post.value as ProjectNote) : null))
const noteProject = computed(() => (note.value ? getProjectById(note.value.project_id) : null))
const renderedBodyHtml = computed(() => post.value?.body_html?.trim() || '')

const codeCopyLabels = computed(() => ({
  copy: t('post.copyCode'),
  copyDone: t('post.copyCodeDone'),
}))

useMarkdownCodeCopy(bodyMarkdownRef, codeCopyLabels, renderedBodyHtml)
</script>

<template>
  <article v-if="loadError">
    <p class="empty">加载失败，请确认后端已启动。</p>
  </article>
  <PostDetailPageSkeleton v-else-if="loading && !post" />
  <article v-else-if="ok && post" ref="articleRoot" class="post-detail-article">
    <div ref="foldZoneRef" class="post-fold">
      <p class="back">
        <RouterLink to="/blog">← {{ t('blog.title') }}</RouterLink>
      </p>
      <div class="post-lead">
        <header class="head">
          <h1 class="title">{{ post.title }}</h1>
          <span v-if="post.pinned" class="badge">{{ t('blog.pinned') }}</span>
        </header>
        <p class="summary">{{ post.summary }}</p>
        <div v-if="post.tags.length" class="tags">
          <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </div>

      <dl v-if="algo" class="meta">
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

      <p v-if="note && noteProject" class="proj">
        {{ t('post.projectNote') }}:
        <RouterLink :to="`/projects/${noteProject.slug}`">{{ noteProject.title }}</RouterLink>
      </p>
    </div>

    <div
      v-if="renderedBodyHtml"
      :ref="bindHtmlBody"
      class="body prose body-markdown markdown-reading"
      v-html="renderedBodyHtml"
    />
    <div v-else-if="post.body" class="body prose body-plain">{{ post.body }}</div>

    <DetailScrollSidebar
      v-if="sidebarWide"
      :progress="sidebarProgress"
      :kicker="t('post.sidebarKicker')"
      :title="post.title"
      :label="t('post.sidebarLabel')"
    >
      <p v-if="post.summary" class="summary">{{ post.summary }}</p>
      <div v-if="post.tags.length" class="tags">
        <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
      <dl v-if="algo" class="meta">
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
      <p v-if="note && noteProject" class="note">
        {{ t('post.projectNote') }}:
        <RouterLink :to="`/projects/${noteProject.slug}`">{{ noteProject.title }}</RouterLink>
      </p>
    </DetailScrollSidebar>
  </article>
  <p v-else class="empty">{{ t('common.notFound') }}</p>
</template>

<style scoped>
/* 阅读栏：居中窄列（DESIGN.md §5 阅读宽 38rem 上下） */
.post-detail-article {
  max-width: 42rem;
  margin: 0 auto;
}

.post-fold {
  position: relative;
}

.back {
  margin: 0 0 1.4rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
}

.back a {
  color: var(--color-text-muted);
  text-decoration: none;
}

.back a:hover {
  color: var(--color-accent);
  text-decoration: none;
}

/* 题录：hairline 分隔的编辑式头部，不再是卡片 */
.post-lead {
  padding-bottom: 1.4rem;
  margin-bottom: 1.4rem;
  border-bottom: 1px solid var(--color-border);
}

.post-lead .summary {
  margin: 0.65rem 0 0;
}

.post-lead .tags {
  margin: 0.85rem 0 0;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
}

.title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.65rem, 4vw, 2.15rem);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
}

.summary {
  color: var(--color-text-muted);
  line-height: 1.7;
}

/* 算法规格表：mono 标签 + 上下 hairline（题解 spec sheet） */
.meta {
  display: grid;
  grid-template-columns: 7rem 1fr;
  gap: 0.4rem 1rem;
  margin: 0 0 1.4rem;
  padding: 0.8rem 0.25rem;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
}

.meta dt {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  padding-top: 0.14rem;
}

.meta dd {
  margin: 0;
}

.proj {
  margin: 0 0 1.4rem;
  padding-left: 0.85rem;
  border-left: 2px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

/* 正文阅读带：纸面连续，仅靠字号/行距分层，不再加框 */
.body {
  margin-top: 0;
  line-height: 1.85;
  font-size: 1.06rem;
  /* 阅读栏宽度约束仍由 markdown-reading.css 的 .markdown-reading 提供 */
  max-width: 38rem;
}
.body-plain {
  white-space: pre-wrap;
}

.body-markdown {
  white-space: normal;
}

.body-markdown :deep(.md-code-block--copyable) {
  position: relative;
}

.body-markdown :deep(.md-code-copy-btn) {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 2rem;
  height: 1.75rem;
  padding: 0 0.45rem;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: var(--radius-sm);
  background: rgb(30 30 30 / 88%);
  color: #c8c8c8;
  font-size: 0.75rem;
  line-height: 1;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.body-markdown :deep(.md-code-copy-btn:hover) {
  color: #fff;
  border-color: rgb(255 255 255 / 28%);
  background: rgb(45 45 45 / 92%);
}

.body-markdown :deep(.md-code-copy-btn__icon) {
  display: inline-flex;
}

.body-markdown :deep(.md-code-copy-btn__check),
.body-markdown :deep(.md-code-copy-btn__label) {
  display: none;
}

.body-markdown :deep(.md-code-copy-btn--done) {
  color: #b5cea8;
  border-color: color-mix(in srgb, #b5cea8 45%, rgb(255 255 255 / 14%));
}

.body-markdown :deep(.md-code-copy-btn--done .md-code-copy-btn__icon) {
  display: none;
}

.body-markdown :deep(.md-code-copy-btn--done .md-code-copy-btn__check) {
  display: inline;
  font-size: 0.85rem;
  font-weight: 600;
}

.body-markdown :deep(.md-code-copy-btn--done .md-code-copy-btn__label) {
  display: inline;
}

.empty {
  color: var(--color-text-muted);
}

@media (max-width: 480px) {
  .title {
    font-size: clamp(1.4rem, 7vw, 1.7rem);
  }

  /* 元信息窄屏改上下堆叠，避免 7rem 固定首列把值列压窄 */
  .meta {
    grid-template-columns: 1fr;
    gap: 0.1rem 0;
  }

  .meta dt {
    margin-top: 0.4rem;
  }

  .body {
    padding: 0.85rem 0.9rem;
  }

  .body-markdown :deep(.md-code-copy-btn) {
    height: 2rem;
    min-width: 2.25rem;
  }
}
</style>
