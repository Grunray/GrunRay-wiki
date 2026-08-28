<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import CardCornerVineLazy from '@/components/hover/CardCornerVineLazy.vue'
import AvatarCircleSkeleton from '@/components/ui/AvatarCircleSkeleton.vue'
import { useHomeHeroRelayout } from '@/composables/useHomeHeroRelayout'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { ensureProjectsLoaded, listProjectsPublic } from '@/services/contentRepository'
import '@/styles/page-enter-home.css'
import '@/styles/page-home-hero.css'
import '@/styles/page-toc-row.css'
import { useUiStore } from '@/stores/ui'
import type { Post, Project } from '@/types/content'
import { readSessionJson, writeSessionJson } from '@/utils/sessionJsonCache'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()
const { photoBackgroundEnabled, theme } = storeToRefs(ui)

useSeoMeta(() => ({
  title: `${t('nav.home')} | ${SITE_NAME}`,
  description: t('home.tagline'),
  path: route.path,
  type: 'website',
}))

const homeRoot = ref<HTMLElement | null>(null)
const peekRef = ref<HTMLElement | null>(null)
const scrollLayerRef = ref<HTMLElement | null>(null)
const avatarUrl = ref('')
const latestUpdatedPosts = ref<Post[]>([])
const randomRecommendedPost = ref<Post | null>(null)
const homeProjects = ref<Project[]>([])
const CACHE_HOME_AVATAR = 'grunray.home.avatarUrl.v1'
const CACHE_HOME_LATEST = 'grunray.home.latestPosts.v1'
const CACHE_HOME_RANDOM = 'grunray.home.randomPost.v1'

const { measureCoverPeek } = useHomeHeroRelayout({ peekRef, scrollLayerRef })

/**
 * 勿在 homeRoot 上再用 :class 绑 is-photo-bg：Vue 会重写 class，冲掉
 * classList 写入的 page-enter--play / home-fonts-ready。左右位移走 html[data-photo-bg]。
 * 模板必须保持单根，否则 AppShell 的 out-in Transition 会卡死成空白页。
 */

/** 封面故事 = 最新一篇；其余进「最新文章」栏 */
const coverStory = computed(() => latestUpdatedPosts.value[0] ?? null)
const latestList = computed(() => latestUpdatedPosts.value.slice(1, 5))

const stageArtSrc = computed(() => {
  if (theme.value === 'light') return '/art/polonia_sandoren.webp'
  if (theme.value === 'abstract') return '/art/polonia_sandoren-abstract.webp'
  return '/art/polonia_sandoren-dark.webp'
})

/** 刊号：VOL.年 · NO.年内周数 · 今天日期 */
const issue = computed(() => {
  const d = new Date()
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return { year: y, no: String(week).padStart(2, '0'), date: `${y}/${m}/${day}` }
})

async function loadAvatar() {
  const cached = readSessionJson<{ url: string }>(CACHE_HOME_AVATAR)
  if (cached?.url) {
    avatarUrl.value = cached.url
    return
  }
  try {
    const q = new URLSearchParams({
      page: '1',
      size: '1',
      folder: 'film/homeView/center/avatar',
    })
    const res = await fetch(`/api/media/list?${q.toString()}`)
    if (!res.ok) return
    const json = (await res.json()) as {
      code: number
      data: Array<{ url: string }>
      message: string
    }
    if (json.code !== 0 || !json.data?.length) return
    avatarUrl.value = json.data[0].url
    writeSessionJson(CACHE_HOME_AVATAR, { url: avatarUrl.value })
  } catch {
    // 头像加载失败时保留默认占位
  }
}

async function loadLatestUpdatedPost() {
  const cached = readSessionJson<{ posts: Post[] }>(CACHE_HOME_LATEST)
  if (cached && Array.isArray(cached.posts)) {
    latestUpdatedPosts.value = cached.posts
    return
  }
  try {
    const res = await fetch('/api/posts/latest-updated')
    if (!res.ok) return
    const json = (await res.json()) as { posts?: Post[] }
    latestUpdatedPosts.value = json.posts ?? []
    writeSessionJson(CACHE_HOME_LATEST, { posts: latestUpdatedPosts.value })
  } catch {
    latestUpdatedPosts.value = []
  }
}

async function loadRandomRecommendedPost() {
  const cachedRand = readSessionJson<{ post: Post | null }>(CACHE_HOME_RANDOM)
  if (cachedRand !== null && typeof cachedRand === 'object' && 'post' in cachedRand) {
    randomRecommendedPost.value = cachedRand.post ?? null
    return
  }
  try {
    const res = await fetch('/api/posts/random-recommend')
    if (!res.ok) return
    const json = (await res.json()) as { post?: Post }
    randomRecommendedPost.value = json.post ?? null
    writeSessionJson(CACHE_HOME_RANDOM, { post: randomRecommendedPost.value })
  } catch {
    randomRecommendedPost.value = null
  }
}

async function loadHomeProjects() {
  try {
    await ensureProjectsLoaded()
    homeProjects.value = listProjectsPublic({ includeArchived: true }).slice(0, 3)
  } catch {
    homeProjects.value = []
  }
}

function formatDateYmd(input?: string): string {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

function projectYear(p: Project): string {
  if (p.year) return String(p.year)
  return p.start_date ? String(new Date(p.start_date).getFullYear()) : ''
}

async function waitGreetingFonts() {
  const fonts = document.fonts
  if (!fonts?.load) return
  try {
    await Promise.race([
      fonts.load('400 4rem "Great Vibes"'),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 1200)
      }),
    ])
  } catch {
    // 字体失败仍显示问候语
  }
}

onMounted(() => {
  loadAvatar()
  loadLatestUpdatedPost()
  loadRandomRecommendedPost()
  void loadHomeProjects()
  void (async () => {
    await waitGreetingFonts()
    homeRoot.value?.classList.add('home-fonts-ready')
    await nextTick()
    measureCoverPeek()
    void playPageEnter(homeRoot.value)
  })()
  const peek = peekRef.value
  peek?.addEventListener(
    'mouseenter',
    () => {
      homeRoot.value
        ?.querySelector('.cover-story-detail')
        ?.dispatchEvent(new Event('mouseenter'))
    },
    { once: true },
  )
})

watch(coverStory, async () => {
  await nextTick()
  measureCoverPeek()
})
</script>

<template>
  <section ref="homeRoot" class="home-layout">
    <section class="home-stage" aria-label="首屏">
      <figure v-if="!photoBackgroundEnabled" class="home-stage-art" aria-hidden="true">
        <img
          :src="stageArtSrc"
          alt=""
          width="1536"
          height="1024"
          decoding="async"
          fetchpriority="low"
        />
      </figure>

      <div class="home-wrap home-stage-inner">
        <header class="home-mast" aria-label="刊号">
          <p class="mast-vol card">
            <strong>{{ SITE_NAME }}</strong> · VOL.{{ issue.year }} · NO.{{ issue.no }} · {{ issue.date }}
          </p>
          <div class="home-mast-avatar card">
            <img
              v-if="avatarUrl"
              data-splash-avatar-target
              :class="{ 'home-avatar--splash-fly': ui.splashAvatarHandoff }"
              :src="avatarUrl"
              alt="头像"
            />
            <AvatarCircleSkeleton v-else />
          </div>
        </header>

        <div class="home-stage-void" aria-hidden="true"></div>

        <div class="home-stage-dock">
          <div class="home-intro-track">
            <div class="home-intro-stack">
              <h1 class="home-intro-greeting card">
                {{ t('home.greeting') }}<span class="home-intro-brand">{{ t('home.greetingBrand') }}</span>
              </h1>
              <p class="home-intro-note card">{{ t('home.internshipNote') }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="home-rising">
      <div class="home-peek-wrap">
        <article
          ref="peekRef"
          class="cover-story-peek"
          data-cursor-hover="project"
          aria-label="封面故事"
        >
          <p class="cover-story-kicker">{{ t('home.coverStoryKicker') }}</p>
        </article>
      </div>

      <div ref="scrollLayerRef" class="home-scroll-layer" aria-label="滚动纸面">
        <div class="home-scroll-layer-paper">
          <div v-if="coverStory" class="home-wrap">
            <div
              class="cover-story cover-story-detail card card-hover-g"
              data-cursor-hover="project"
            >
              <h2 class="cover-story-title">
                <RouterLink :to="`/blog/${coverStory.slug}`">{{ coverStory.title }}</RouterLink>
              </h2>
              <p v-if="coverStory.summary" class="cover-story-lede">{{ coverStory.summary }}</p>
              <p class="cover-story-meta">
                <time>{{ formatDateYmd(coverStory.updated_at) || '----/--/--' }}</time>
                <span v-for="tag in coverStory.tags" :key="tag" class="tag">{{ tag }}</span>
                <RouterLink class="cover-story-read" :to="`/blog/${coverStory.slug}`">
                  {{ t('home.readStory') }} →
                </RouterLink>
              </p>
              <CardCornerVineLazy />
            </div>
          </div>

          <section class="home-sheet" aria-label="目录与后续内容">
            <div class="home-sheet-body">
              <div class="home-wrap">
                <section class="home-now" aria-label="此刻">
      <p class="now-kicker">{{ t('home.nowKicker') }}</p>
      <ul class="now-list">
        <li>{{ t('home.nowDoing') }}</li>
        <li>{{ t('home.nowReading') }}</li>
      </ul>
    </section>

    <!-- 目录卡：左列 文章+项目，右列 站长自述 -->
    <div class="home-toc">
      <div class="toc-main">
        <section class="toc-col" aria-label="最新文章">
        <header class="toc-head">
          <span>{{ t('home.colLatest') }}</span>
          <RouterLink class="toc-all" to="/blog">{{ t('home.colAll') }} →</RouterLink>
        </header>
        <template v-if="latestList.length">
          <RouterLink
            v-for="post in latestList"
            :key="post.id"
            class="toc-row"
            :to="`/blog/${post.slug}`"
          >
            <span class="toc-meta">
              <time>{{ formatDateYmd(post.updated_at) || '----/--/--' }}</time>
            </span>
            <h3 class="toc-title">{{ post.title }}</h3>
            <p class="toc-summary">{{ post.summary || '—' }}</p>
          </RouterLink>
        </template>
        <p v-else class="toc-empty">{{ t('home.emptyPosts') }}</p>
      </section>

      <section class="toc-col" aria-label="项目">
        <header class="toc-head">
          <span>{{ t('home.colProjects') }}</span>
          <RouterLink class="toc-all" to="/projects">{{ t('home.colAll') }} →</RouterLink>
        </header>
        <template v-if="homeProjects.length">
          <RouterLink
            v-for="p in homeProjects"
            :key="p.id"
            class="toc-row"
            :to="`/projects/${p.slug}`"
          >
            <span class="toc-meta">
              <span
                class="toc-status"
                :class="p.status === 'published' ? 'toc-status--on' : 'toc-status--off'"
                aria-hidden="true"
              ></span>
              {{ p.status === 'published' ? t('projects.active') : t('projects.archived') }}
              <span v-if="projectYear(p)" class="toc-year">{{ projectYear(p) }}</span>
            </span>
            <h3 class="toc-title">{{ p.title }}</h3>
            <p class="toc-summary">{{ p.summary || '—' }}</p>
          </RouterLink>
        </template>
        <p v-else class="toc-empty">{{ t('home.emptyProjects') }}</p>
        </section>
      </div>

      <aside class="toc-side" aria-label="站长自述">
        <header class="toc-head">
          <span>{{ t('home.colAbout') }}</span>
          <RouterLink class="toc-all" to="/about">{{ t('home.moreAbout') }} →</RouterLink>
        </header>
        <div class="self-intro">
          <div class="self-intro-tech">
            <p class="self-intro-tech-title">技术栈 · Languages</p>
            <div class="self-intro-tech-grid">
              <p>● Python 0.0%</p>
              <p>● JAVA 0.0%</p>
              <p>● C/C++ 0.0%</p>
              <p>● MySQL 0.0%</p>
              <p>● Vue3 0.0%</p>
              <p>● Linux 0.0%</p>
              <p class="self-intro-tech-ai">● Artificial Intelligence 10000.0%</p>
            </div>
          </div>
          <p class="self-intro-text">
            大三纯正全栈优质牛马，正宗新代码
            <br />
            从小写代码跑路长大，100%AI添加。
            <br />
            究极二刺螈，看番堪比吃盐。
            <br />
            爱好：喜欢去算法竞赛现场看男娘。
            <br />
            部分奖项：ICPC/CCPC不屈铜牌，省赛甚至难铜，有没有懂的。
            <br />
            精神状态：肘，忽略ጿ ኈ ቼ ዽ ጿ
          </p>
        </div>

        <!-- 旧文重读：垫高右列 + sticky 吸顶时仍可见 -->
        <section class="side-reread" aria-label="旧文重读">
          <header class="toc-head">
            <span>{{ t('home.colRandom') }}</span>
          </header>
          <RouterLink
            v-if="randomRecommendedPost"
            class="toc-row side-reread-row"
            :to="`/blog/${randomRecommendedPost.slug}`"
          >
            <span class="toc-meta">
              <time>{{ formatDateYmd(randomRecommendedPost.updated_at) || '----/--/--' }}</time>
            </span>
            <h3 class="toc-title">{{ randomRecommendedPost.title }}</h3>
            <p class="toc-summary">{{ randomRecommendedPost.summary || '—' }}</p>
          </RouterLink>
          <p v-else class="toc-empty side-reread-empty">{{ t('home.emptyRandom') }}</p>
        </section>
      </aside>
    </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-mast {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-self: flex-start;
  gap: 0.95rem;
  width: max-content;
  max-width: min(100%, 36rem);
  margin: 0.55rem 0 0;
}

.mast-vol {
  margin: 0;
  padding: 0.7rem 1rem;
  width: max-content;
  max-width: 100%;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.mast-vol strong {
  font-weight: 600;
  color: var(--color-text);
}

.home-mast-avatar {
  flex: 0 0 auto;
  width: 2.85rem;
  aspect-ratio: 1 / 1;
  padding: 0;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  font-size: 1.1rem;
}

.home-mast-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: opacity 0.28s ease;
}

.home-mast-avatar :deep(.avatar-circle-skeleton) {
  min-height: 0;
}

.home-avatar--splash-fly {
  opacity: 0;
  pointer-events: none;
}

/* —— 封面故事正文（kicker 在 peek；花藤仍挂在 detail） —— */

.cover-story-kicker {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.cover-story-title {
  margin: 0.55rem 0 0;
  font-family: var(--font-serif);
  font-size: clamp(1.72rem, 3.8vw, 2.65rem);
  font-weight: 700;
  line-height: 1.24;
  letter-spacing: 0.01em;
}

.cover-story-title a {
  color: var(--color-text);
  text-decoration: none;
  transition: color 0.2s ease;
}

.cover-story-title a:hover {
  color: var(--color-accent);
  text-decoration: none;
}

.cover-story-lede {
  margin: 0.7rem 0 0;
  max-width: 38em;
  font-size: 1.02rem;
  line-height: 1.75;
  color: var(--color-text-muted);
}

.cover-story-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin: 1rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.cover-story-read {
  position: relative;
  z-index: 2;
  margin-left: auto;
  /* 给右下角花藤留空，避免「开始阅读」与生长动画重叠 */
  margin-right: var(--card-vine-gutter, 4.25rem);
  color: var(--color-accent);
  font-weight: 500;
  text-decoration: none;
  border-bottom: 1px solid var(--color-accent);
  padding-bottom: 1px;
  white-space: nowrap;
}

/* —— NOW 行：纯 hairline 分隔（不染色），与上下保持纸面连续性 —— */
.home-now {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 1.1rem;
  align-items: start;
  padding: 0.95rem 0;
  border-bottom: 1px solid var(--color-border);
}

.now-kicker {
  margin: 0;
  padding-top: 0.15rem;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.now-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 1.6rem;
}

.now-list li {
  font-size: 0.88rem;
  color: var(--color-text-muted);
}

.now-list li::before {
  content: '·';
  margin-right: 0.5rem;
  color: var(--color-accent);
}

.now-link {
  color: var(--color-accent);
  text-decoration: none;
}

.now-link:hover {
  text-decoration: underline;
}

/* —— 目录区：平铺（无卡片外壳），靠 2px 顶线 + 内部 hairline 分区 —— */
.home-toc {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
  padding-top: 1.35rem;
  border-top: 2px solid color-mix(in srgb, var(--color-text) 82%, transparent);
  margin-bottom: 0.6rem;
}

.toc-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 1rem 0 0.6rem;
}

.toc-main .toc-col + .toc-col {
  border-top: 1px solid var(--color-border);
  padding-top: 1.05rem;
  margin-top: 1rem;
}

.toc-col {
  min-width: 0;
}

.toc-side {
  /* align-self:start 才能让 sticky 在 grid 拉伸单元格里生效 */
  align-self: start;
  position: sticky;
  top: 5.5rem;
  min-width: 0;
  border-left: 1px solid var(--color-border);
  padding: 1rem 1.3rem 1.15rem;
}

.toc-head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin: 0 0 0.2rem;
  padding: 0 1.3rem 0.6rem;
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-text) 84%, transparent);
}

.toc-head::after {
  content: '';
  flex: 1 1 auto;
}

.toc-all {
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  text-decoration: none;
  white-space: nowrap;
}

.toc-all:hover {
  color: var(--color-accent);
  text-decoration: none;
}

.toc-side .toc-head {
  padding: 0 0 0.6rem;
}

/* —— 站长自述：目录卡右列的纯内容 —— */
.self-intro {
  padding: 0.85rem 0 0.2rem;
}

.self-intro-tech-title {
  margin: 0 0 0.55rem;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.self-intro-tech-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.24rem 0.7rem;
  font-family: var(--font-mono);
}

.self-intro-tech-grid p {
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.55;
  color: var(--color-text-muted);
}

.self-intro-tech-ai {
  grid-column: 1 / -1;
  color: var(--color-accent) !important;
  font-weight: 600;
}

.self-intro-text {
  margin: 0.9rem 0 0;
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--color-text);
}

/* —— 右列旧文重读：与自述用 hairline 分段 —— */
.side-reread {
  margin-top: 1.15rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.side-reread-row {
  padding-left: 0;
  padding-right: 0;
  border-radius: var(--radius-sm);
}

.side-reread-empty {
  padding-left: 0;
  padding-right: 0;
}

@media (max-width: 960px) {
  .home-toc {
    grid-template-columns: 1fr;
  }

  .toc-side {
    position: static;
    border-left: 0;
    border-top: 1px solid var(--color-border);
  }
}

@media (max-width: 640px) {
  .home-mast {
    margin-top: 0.35rem;
  }

  .home-mast-avatar {
    width: 2.55rem;
  }

  .cover-story-read {
    margin-left: 0;
    margin-right: var(--card-vine-gutter, 4.25rem);
    width: auto;
  }

  .home-now {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }
}
</style>
