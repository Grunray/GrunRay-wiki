<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import DetailScrollSidebar from '@/components/detail/DetailScrollSidebar.vue'
import PostTocNav from '@/components/detail/PostTocNav.vue'
import EdKicker from '@/components/editorial/EdKicker.vue'
import PageStatusBlock from '@/components/ui/PageStatusBlock.vue'
import PostDetailPageSkeleton from '@/components/ui/PostDetailPageSkeleton.vue'
import { useDetailScrollSidebar } from '@/composables/useDetailScrollSidebar'
import { readListReturnPath } from '@/composables/useListScrollRestore'
import { useMarkdownCodeCopy } from '@/composables/useMarkdownCodeCopy'
import { restartPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { canAccessPostPublic, ensureProjectsLoaded, getPostBySlug, getProjectById, listPostsForBlog } from '@/services/contentRepository'
import '@/styles/page-enter-post.css'
import type { AlgorithmPost, Post, ProjectNote } from '@/types/content'
import { injectHeadingIds } from '@/utils/headingToc'
import { pickPostNeighbors } from '@/utils/postNeighbors'

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
const newerPost = ref<Post | null>(null)
const olderPost = ref<Post | null>(null)
const loadError = ref(false)
const loading = ref(true)
const articleRoot = ref<HTMLElement | null>(null)
const bodyMarkdownRef = ref<HTMLElement | null>(null)
const foldZoneRef = ref<HTMLElement | null>(null)
const blogListTo = computed(() => readListReturnPath('blog'))

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
    try {
      const neighbors = await listPostsForBlog({ category: 'all' })
      const pair = next ? pickPostNeighbors(neighbors, slug) : { newer: null, older: null }
      newerPost.value = pair.newer
      olderPost.value = pair.older
    } catch {
      newerPost.value = null
      olderPost.value = null
    }
  } catch {
    loadError.value = true
    if (!cached) post.value = null
    newerPost.value = null
    olderPost.value = null
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
const toc = computed(() => injectHeadingIds(post.value?.body_html?.trim() || ''))
const renderedBodyHtml = computed(() => toc.value.html)
const tocItems = computed(() => toc.value.items)

const codeCopyLabels = computed(() => ({
  copy: t('post.copyCode'),
  copyDone: t('post.copyCodeDone'),
}))

useMarkdownCodeCopy(bodyMarkdownRef, codeCopyLabels, renderedBodyHtml)

watch(
  [renderedBodyHtml, () => route.hash],
  async () => {
    const raw = route.hash.replace(/^#/, '')
    if (!raw) return
    await nextTick()
    let id = raw
    try {
      id = decodeURIComponent(raw)
    } catch {
      /* keep raw */
    }
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  },
)
</script>

<template>
  <PageStatusBlock
    v-if="loadError"
    kind="error"
    :title="t('common.status.loadFailed')"
    retryable
    @retry="load(route.params.slug as string)"
  />
  <PostDetailPageSkeleton v-else-if="loading && !post" />
  <article v-else-if="ok && post" ref="articleRoot" class="post-detail-article">
    <div ref="foldZoneRef" class="post-fold">
      <p class="back">
        <RouterLink :to="blogListTo">← {{ t('blog.title') }}</RouterLink>
      </p>
      <div class="ed-mast">
        <section class="ed-zone">
          <h1 class="title">{{ post.title }}</h1>
          <p class="summary">{{ post.summary }}</p>
          <div v-if="post.tags.length" class="tags">
            <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </section>
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

    <PostTocNav v-if="tocItems.length && !sidebarWide" :items="tocItems" folded />

    <div
      v-if="renderedBodyHtml"
      :ref="bindHtmlBody"
      class="body prose body-markdown markdown-reading"
      v-html="renderedBodyHtml"
    />
    <div v-else-if="post.body" class="body prose body-plain">{{ post.body }}</div>

    <nav v-if="newerPost || olderPost" class="post-adjacent" :aria-label="t('post.adjacentLabel')">
      <div v-if="newerPost" class="post-adjacent-item">
        <EdKicker :en="t('post.newerKickerEn')" :zh="t('post.newerKickerZh')" />
        <RouterLink class="ed-action" :to="`/blog/${newerPost.slug}`">{{ newerPost.title }}</RouterLink>
      </div>
      <div v-if="olderPost" class="post-adjacent-item">
        <EdKicker :en="t('post.olderKickerEn')" :zh="t('post.olderKickerZh')" />
        <RouterLink class="ed-action" :to="`/blog/${olderPost.slug}`">{{ olderPost.title }}</RouterLink>
      </div>
    </nav>

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
      <PostTocNav v-if="tocItems.length" :items="tocItems" />
    </DetailScrollSidebar>
  </article>
  <PageStatusBlock
    v-else
    kind="empty"
    :title="t('common.status.notFoundTitle')"
    :description="t('common.status.notFoundHint')"
  />
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

.post-adjacent {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.1rem 1.5rem;
  margin: 2.2rem 0 0;
  padding: 1.15rem 0 0;
  border-top: 1px solid var(--color-text);
}

.post-adjacent-item .ed-kicker {
  margin-bottom: 0.35rem;
}

.post-adjacent-item .ed-action {
  display: inline;
}

@media (min-width: 640px) {
  .post-adjacent {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
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
}
</style>
