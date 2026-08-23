<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import CardCornerVineLazy from '@/components/hover/CardCornerVineLazy.vue'
import FilmFeed from '@/components/media/FilmFeed.vue'
import AvatarCircleSkeleton from '@/components/ui/AvatarCircleSkeleton.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { ensureProjectsLoaded, listProjectsPublic } from '@/services/contentRepository'
import '@/styles/page-enter-home.css'
import { useUiStore } from '@/stores/ui'
import type { Post, Project } from '@/types/content'
import { readSessionJson, writeSessionJson } from '@/utils/sessionJsonCache'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()

useSeoMeta(() => ({
  title: `${t('nav.home')} | ${SITE_NAME}`,
  description: t('home.tagline'),
  path: route.path,
  type: 'website',
}))

const homeRoot = ref<HTMLElement | null>(null)
const avatarUrl = ref('')
const latestUpdatedPosts = ref<Post[]>([])
const randomRecommendedPost = ref<Post | null>(null)
const homeProjects = ref<Project[]>([])
const CACHE_HOME_AVATAR = 'grunray.home.avatarUrl.v1'
const CACHE_HOME_LATEST = 'grunray.home.latestPosts.v1'
const CACHE_HOME_RANDOM = 'grunray.home.randomPost.v1'

/** 封面故事 = 最新一篇；其余进「最新文章」栏 */
const coverStory = computed(() => latestUpdatedPosts.value[0] ?? null)
const latestList = computed(() => latestUpdatedPosts.value.slice(1, 5))

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

onMounted(() => {
  loadAvatar()
  loadLatestUpdatedPost()
  loadRandomRecommendedPost()
  void loadHomeProjects()
  void playPageEnter(homeRoot.value)
})
</script>

<template>
  <section ref="homeRoot" class="home-layout">
    <!-- 刊号行：VOL / NO / 日期 + 头像（splash 动画落点保留） -->
    <header class="home-mast">
      <p class="mast-vol">
        <strong>{{ SITE_NAME }}</strong> · VOL.{{ issue.year }} · NO.{{ issue.no }} · {{ issue.date }}
      </p>
      <div class="avatar">
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

    <!-- 电影感横幅：胶片为背景，刊名压上（cover-text 文案保留于此） -->
    <section class="home-band" aria-label="封面横幅">
      <FilmFeed horizontal class="home-band-film" />
      <div class="home-band-scrim" aria-hidden="true"></div>
      <div class="home-band-copy">
        <p class="cover-kicker">{{ SITE_NAME }} · {{ t('home.tagline') }}</p>
        <h1 class="cover-greeting">{{ t('home.greeting') }}</h1>
        <p class="cover-note">{{ t('home.internshipNote') }}</p>
      </div>
    </section>

    <!-- 封面故事：最新一篇文章当本期主角 -->
    <section v-if="coverStory" class="cover-story card-hover-g" aria-label="封面故事">
      <p class="cover-story-kicker">{{ t('home.coverStoryKicker') }}</p>
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
    </section>

    <!-- NOW：此刻在做什么 -->
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
  </section>
</template>

<style scoped>
/* 首页 = 刊号行 → 胶片横幅（刊名压上） → 封面故事 → NOW → 三栏目录（方案 A+C 混合） */
.home-layout {
  display: flex;
  flex-direction: column;
  gap: clamp(1.6rem, 3.2vw, 2.4rem);
}

/* —— 刊号行 —— */
.home-mast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  margin: 0;
  padding-top: 1rem;
  border-top: 2px solid color-mix(in srgb, var(--color-text) 82%, transparent);
}

.mast-vol {
  margin: 0;
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

.avatar {
  flex: 0 0 auto;
  width: 3rem;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  font-size: 1.1rem;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: opacity 0.28s ease;
}

.home-avatar--splash-fly {
  opacity: 0;
  pointer-events: none;
}

/* —— 电影感横幅：FilmFeed 铺满变矮后的容器（不裁切上沿） —— */
.home-band {
  position: relative;
  height: clamp(13rem, 32vh, 20rem);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.home-band-film {
  position: absolute;
  inset: 0;
}

.home-band-scrim {
  position: absolute;
  inset: 0;
  z-index: 20;
  /* 底缘托住刊名；顶缘保持通透，避免盖住胶片右上角滚轮提示 */
  background: linear-gradient(
    to top,
    rgb(12 16 13 / 82%) 0%,
    rgb(12 16 13 / 52%) 36%,
    rgb(12 16 13 / 18%) 58%,
    transparent 76%
  );
  pointer-events: none;
}

.home-band-copy {
  position: absolute;
  inset: auto 0 0 0;
  z-index: 30;
  padding: 1.3rem clamp(1.2rem, 3vw, 2.2rem);
  pointer-events: none;
}

/* 横幅永远是深色胶片底，文案固定浅色系，不随主题令牌变化 */
.cover-kicker {
  margin: 0 0 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-accent) 45%, #ffffff);
}

.cover-greeting {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.85rem, 4.4vw, 3.1rem);
  font-weight: 600;
  font-style: italic;
  line-height: 1.22;
  letter-spacing: 0.01em;
  color: #f4f1e8;
}

.cover-note {
  margin: 0.7rem 0 0;
  font-size: 0.88rem;
  line-height: 1.65;
  color: rgb(244 241 232 / 72%);
  max-width: 34rem;
}

/* —— 封面故事：全页唯一强强调块，卡片包裹 + accent 左边条 —— */
.cover-story {
  padding: clamp(1.15rem, 2.4vw, 1.7rem) clamp(1.15rem, 2.6vw, 1.8rem);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.cover-story-kicker {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.cover-story-title {
  margin: 0.55rem 0 0;
  font-family: var(--font-serif);
  font-size: clamp(1.6rem, 3.6vw, 2.5rem);
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
  font-size: 0.95rem;
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
  border-top: 1px solid var(--color-border);
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
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-text) 76%, transparent);
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

.toc-row {
  display: block;
  padding: 0.8rem 1.65rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: inherit;
  transition: background 0.2s ease;
}

.toc-row + .toc-row {
  border-top: 1px solid var(--color-border);
}

.toc-row:hover {
  background: color-mix(in srgb, var(--color-bg-elevated) 52%, transparent);
  text-decoration: none;
}

.toc-row:hover .toc-title {
  color: var(--color-accent);
}

.toc-row:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.toc-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.toc-status {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.toc-status--on {
  background: var(--color-accent);
}

.toc-status--off {
  background: var(--color-border);
}

.toc-year {
  margin-left: auto;
  color: var(--color-text-muted);
  opacity: 0.8;
}

.toc-title {
  margin: 0.25rem 0 0;
  font-family: var(--font-serif);
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.42;
  color: var(--color-text);
  transition: color 0.2s ease;
}

.toc-summary {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0.28rem 0 0;
  font-size: 0.84rem;
  line-height: 1.65;
  color: var(--color-text-muted);
}

.toc-empty {
  margin: 0;
  padding: 1.4rem 1.65rem;
  color: var(--color-text-muted);
  font-size: 0.88rem;
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
  font-size: 0.84rem;
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
    padding-top: 0.8rem;
  }

  .home-band {
    height: clamp(10rem, 26vh, 16rem);
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
