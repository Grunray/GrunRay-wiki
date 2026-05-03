<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import FilmFeed from '@/components/media/FilmFeed.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import '@/styles/page-enter-home.css'
import { useUiStore } from '@/stores/ui'
import type { Post } from '@/types/content'

const { t } = useI18n()
const ui = useUiStore()

const externalLinks = [
  {
    href: '#',
    label: 'Email',
    color: '#9B7BFF',
    emailToCopy: 'meachealed@gmail.com',
    viewBox: '0 0 1024 1024',
    path: 'M874.666667 181.333333H149.333333c-40.533333 0-74.666667 34.133333-74.666666 74.666667v512c0 40.533333 34.133333 74.666667 74.666666 74.666667h725.333334c40.533333 0 74.666667-34.133333 74.666666-74.666667V256c0-40.533333-34.133333-74.666667-74.666666-74.666667z m-725.333334 64h725.333334c6.4 0 10.666667 4.266667 10.666666 10.666667v25.6L512 516.266667l-373.333333-234.666667V256c0-6.4 4.266667-10.666667 10.666666-10.666667z m725.333334 533.333334H149.333333c-6.4 0-10.666667-4.266667-10.666666-10.666667V356.266667l356.266666 224c4.266667 4.266667 10.666667 4.266667 17.066667 4.266666s12.8-2.133333 17.066667-4.266666l356.266666-224V768c0 6.4-4.266667 10.666667-10.666666 10.666667z',
  },
  {
    href: 'https://github.com/Grunray',
    label: 'GitHub',
    color: '#151B23',
    viewBox: '0 0 1024 1024',
    path: 'M850.346667 155.008a42.666667 42.666667 0 0 0-22.741334-23.509333c-8.704-3.754667-85.717333-33.322667-200.32 39.168H396.714667c-114.773333-72.618667-191.701333-42.922667-200.32-39.168a42.88 42.88 0 0 0-22.741334 23.466666c-26.197333 66.218667-18.048 136.448-7.850666 176.896C134.272 374.016 128 413.098667 128 469.333333c0 177.877333 127.104 227.882667 226.730667 246.272a189.568 189.568 0 0 0-13.013334 46.549334A44.373333 44.373333 0 0 0 341.333333 768v38.613333c-19.498667-4.138667-41.002667-11.946667-55.168-26.112C238.08 732.416 188.330667 682.666667 128 682.666667v85.333333c25.002667 0 65.365333 40.362667 97.834667 72.832 51.029333 51.029333 129.066667 55.253333 153.386666 55.253333 3.114667 0 5.376-0.085333 6.528-0.128A42.666667 42.666667 0 0 0 426.666667 853.333333v-82.090666c4.266667-24.746667 20.224-49.621333 27.946666-56.362667a42.666667 42.666667 0 0 0-23.125333-74.581333C293.333333 624.554667 213.333333 591.488 213.333333 469.333333c0-53.12 5.632-70.741333 31.573334-99.285333 11.008-12.117333 14.08-29.568 7.978666-44.8-4.821333-11.904-18.773333-65.450667-6.485333-117.546667 20.650667-1.578667 59.904 4.565333 113.706667 40.96C367.104 253.44 375.466667 256 384 256h256a42.666667 42.666667 0 0 0 23.936-7.338667c54.016-36.522667 92.970667-41.770667 113.664-41.130666 12.330667 52.224-1.578667 105.770667-6.4 117.674666a42.666667 42.666667 0 0 0 8.021333 44.928C805.077333 398.464 810.666667 416.085333 810.666667 469.333333c0 122.581333-79.957333 155.52-218.069334 170.922667a42.666667 42.666667 0 0 0-23.125333 74.709333c19.797333 17.066667 27.861333 32.469333 27.861333 53.034667v128h85.333334v-128c0-20.437333-3.925333-38.101333-9.770667-53.12C769.92 695.765333 896 643.712 896 469.333333c0-56.362667-6.272-95.530667-37.76-137.514666 10.197333-40.405333 18.261333-110.506667-7.893333-176.810667z',
  },
  {
    href: 'https://space.bilibili.com/63001342?spm_id_from=333.1007.0.0',
    label: 'Bilibili',
    color: '#00AEEC',
    viewBox: '0 0 1024 1024',
    path: 'M777.514667 131.669333a53.333333 53.333333 0 0 1 0 75.434667L728.746667 255.829333h49.92A160 160 0 0 1 938.666667 415.872v320a160 160 0 0 1-160 160H245.333333A160 160 0 0 1 85.333333 735.872v-320a160 160 0 0 1 160-160h49.749334L246.4 207.146667a53.333333 53.333333 0 1 1 75.392-75.434667l113.152 113.152c3.370667 3.370667 6.186667 7.04 8.448 10.965333h137.088c2.261333-3.925333 5.12-7.68 8.490667-11.008l113.109333-113.152a53.333333 53.333333 0 0 1 75.434667 0z m1.152 231.253334H245.333333a53.333333 53.333333 0 0 0-53.205333 49.365333l-0.128 4.010667v320c0 28.117333 21.76 51.157333 49.365333 53.162666l3.968 0.170667h533.333334a53.333333 53.333333 0 0 0 53.205333-49.365333l0.128-3.968v-320c0-29.44-23.893333-53.333333-53.333333-53.333334z m-426.666667 106.666666c29.44 0 53.333333 23.893333 53.333333 53.333334v53.333333a53.333333 53.333333 0 1 1-106.666666 0v-53.333333c0-29.44 23.893333-53.333333 53.333333-53.333334z m320 0c29.44 0 53.333333 23.893333 53.333333 53.333334v53.333333a53.333333 53.333333 0 1 1-106.666666 0v-53.333333c0-29.44 23.893333-53.333333 53.333333-53.333334z',
  },
  {
    href: 'https://music.163.com/#/user/home?id=448931649',
    label: '网易云音乐',
    color: '#FF0000',
    viewBox: '0 0 1024 1024',
    path: 'M623.61751703 18.30760297c26.82121482-7.73082075 55.55996445-7.34245925 82.64817779-1.11653927 31.10532741 7.39100445 60.53584592 21.67542518 85.86429629 41.14204445 9.24785778 7.02691555 17.59762963 15.76504889 21.84533334 26.76053333 6.57787259 16.26263703 4.81810963 35.7049837-4.89092742 50.35349334-8.47113482 13.15574518-22.87691852 22.31864889-38.39924148 24.28472888-12.40329482 1.69908148-25.40126815-0.93449482-36.0569363-7.5245037-6.00746667-3.53166222-10.58285037-8.98085925-16.61458962-12.47611259-16.17768297-10.26730667-34.80689778-18.35008-54.28565333-17.88890074-13.71401482 0.15777185-25.77749333 8.192-35.0738963 17.63403851-8.70172445 8.98085925-13.13147259 22.22155852-10.25517037 34.53989927 6.68709925 25.17067852 13.33778963 50.34135703 20.01275259 75.51203555 47.98691555 2.46366815 95.94955852 15.15823408 137.20082963 40.20754963 40.09832297 24.80658963 76.32516741 56.26386963 105.05178074 93.75288889 24.38181925 31.7728237 42.86539852 68.06034963 54.17642666 106.4838637 12.24552297 41.40904297 16.21409185 85.07543703 13.02224593 128.08647111-2.65784889 35.48653037-9.63621925 70.7667437-21.67542518 104.29933037-31.1296 81.65300148-88.7891437 153.24501333-163.00259555 199.64207408-54.43128889 34.38212741-116.94535111 55.12305778-180.69731556 63.03592297-44.00621037 5.49774222-88.84982518 5.52201482-132.63758222-1.9782163-89.97850075-14.86696297-174.30148741-59.71057778-238.29617778-124.48199112-63.59419259-63.71555555-107.85526518-146.41227852-125.75630222-234.6310163-13.20429037-64.33450667-12.60961185-131.50890667 2.03889778-195.55214221 17.90103703-78.97088 57.46536297-152.84451555 113.08600888-211.66914371 45.36547555-48.30245925 101.39875555-86.5196563 162.90550519-111.19274666 6.33514667-2.41512297 12.57320297-5.27928889 19.3209837-6.34728297 14.4057837-2.52434963 29.79460741 0.88594963 41.59108741 9.57553777 15.97136592 11.27461925 24.75804445 31.72427852 22.10019555 51.06953483-2.19666963 19.74575408-16.21409185 37.54970075-34.89185185 44.30961777-62.13783703 23.22887111-117.23662222 64.73500445-156.89803851 117.87984593-35.45012148 47.16164741-58.58190222 103.49833482-66.33699557 162.00741925-7.82791111 57.91440592-0.86167703 117.72207408 19.89138964 172.33540742 29.97665185 79.84469333 89.57800297 148.54826667 165.56335408 187.65141333 45.75383703 23.70218667 97.26027852 36.08120889 148.77885628 35.7292563 42.37994667-0.54613333 84.89339259-7.35459555 124.72471705-22.08805926 35.02535111-13.01010963 67.85403259-32.22186667 95.76751407-57.12554667 26.02021925-23.05896297 47.67137185-50.92389925 64.18887111-81.49522963 8.27695408-15.59514075 15.92282075-31.65146075 20.59529482-48.72722963 13.78683259-48.8121837 16.17768297-101.71429925 1.43208295-150.59930074-12.19697778-40.99640889-37.29483852-77.53879703-69.34679703-105.61005037-14.17519408-12.40329482-29.32129185-23.77500445-45.5596563-33.33840593-14.34510222-8.05850075-30.01306075-13.54410667-45.99656295-17.29422222 11.14112 43.5693037 23.05896297 86.95656297 34.35785481 130.48945778 1.91753482 10.43721482 3.83506963 20.87442963 5.63124147 31.33591704 1.6505363 44.91643259-14.1023763 90.16054518-43.07171555 124.5184-26.99112297 32.37963852-65.31754667 55.15946667-106.77513481 62.98737777-44.68584297 8.90804148-92.73344 0.49758815-131.10840889-24.27259259-36.63947852-23.22887111-63.70341925-60.01398518-77.9757037-100.73125926-8.08277333-22.77982815-12.1120237-46.8703763-12.91301927-70.99733334-2.45153185-52.48948148 11.27461925-106.11977482 41.2998163-149.53130666 35.28021333-51.80984889 90.90085925-87.42987852 150.53861926-104.80905482-4.39333925-16.79663408-8.88376889-33.56899555-13.32565334-50.36562963-11.51734518-36.25111703-9.06581333-76.95625482 8.11918223-111.03497481 9.27213037-19.0175763 23.05896297-35.58362075 39.0060563-49.35831703 17.75540148-15.18250667 38.48419555-27.17316741 61.08197925-33.38695111M481.22235259 413.16200297c-15.99563852 16.79663408-27.2095763 38.03515259-32.03982222 60.70575406-4.34479408 20.58315852-4.36906667 42.04013037-0.46117926 62.68397038 4.76956445 22.80410075 16.54177185 45.11061333 36.0569363 58.56976592 15.14609778 10.75275852 34.86757925 14.01742222 52.93852444 10.48576 33.4354963-5.87396741 60.71789037-36.63947852 61.65238518-70.68178963-1.27431111-8.43472592-2.66998518-16.86945185-5.04869925-25.07358815-12.48824889-47.23446518-25.08572445-94.43252148-37.50115556-141.69125925-28.25329778 8.71386075-55.14733037 23.39877925-75.59698963 45.00138667z',
  },
]

const homeRoot = ref<HTMLElement | null>(null)
const avatarUrl = ref('')
const latestUpdatedPosts = ref<Post[]>([])
const randomRecommendedPost = ref<Post | null>(null)
const copyToastVisible = ref(false)
const copyToastColor = ref('#9B7BFF')
let copyToastTimer: ReturnType<typeof setTimeout> | null = null

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const input = document.createElement('input')
    input.value = text
    document.body.appendChild(input)
    input.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(input)
    return ok
  }
}

async function handleExternalLinkClick(
  item: { href: string; emailToCopy?: string; color: string },
  event: MouseEvent,
) {
  if (!item.emailToCopy) return
  event.preventDefault()
  const ok = await copyToClipboard(item.emailToCopy)
  if (!ok) return

  copyToastColor.value = item.color
  copyToastVisible.value = true
  if (copyToastTimer) clearTimeout(copyToastTimer)
  copyToastTimer = setTimeout(() => {
    copyToastVisible.value = false
  }, 1400)
}

async function loadAvatar() {
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
  } catch {
    // 头像加载失败时保留默认占位
  }
}

async function loadLatestUpdatedPost() {
  try {
    const res = await fetch('/api/posts/latest-updated')
    if (!res.ok) return
    const json = (await res.json()) as { posts?: Post[] }
    latestUpdatedPosts.value = json.posts ?? []
  } catch {
    latestUpdatedPosts.value = []
  }
}

async function loadRandomRecommendedPost() {
  try {
    const res = await fetch('/api/posts/random-recommend')
    if (!res.ok) return
    const json = (await res.json()) as { post?: Post }
    randomRecommendedPost.value = json.post ?? null
  } catch {
    randomRecommendedPost.value = null
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

onMounted(() => {
  loadAvatar()
  loadLatestUpdatedPost()
  loadRandomRecommendedPost()
  void playPageEnter(homeRoot.value)
})
</script>

<template>
  <section ref="homeRoot" class="home-layout">
    <aside class="left-ellipse">
      <div class="left-latest-panel">
        <p class="left-section-title">最新三篇文章</p>
        <div v-if="latestUpdatedPosts.length" class="latest-post-list">
          <RouterLink
            v-for="post in latestUpdatedPosts"
            :key="post.id"
            class="latest-post-card card"
            :to="`/blog/${post.slug}`"
          >
            <h3 class="latest-post-title">{{ post.title }}</h3>
            <div class="tags latest-post-tags">
              <template v-if="post.tags.length">
                <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
              </template>
              <span v-else class="tag latest-post-tag-placeholder">无关键词</span>
            </div>
            <p class="latest-post-summary">{{ post.summary || '暂无摘要' }}</p>
            <p class="latest-post-date">
              {{ formatDateYmd(post.updated_at) || '----/--/--' }}
            </p>
          </RouterLink>
        </div>
        <div v-else class="latest-post-card card latest-post-card--empty">
          <p class="latest-post-empty">暂无可展示文章</p>
        </div>
      </div>
      <div class="left-random-panel">
        <p class="left-section-title">随机推荐</p>
        <RouterLink
          v-if="randomRecommendedPost"
          class="latest-post-card card"
          :to="`/blog/${randomRecommendedPost.slug}`"
        >
          <h3 class="latest-post-title">{{ randomRecommendedPost.title }}</h3>
          <div class="tags latest-post-tags">
            <template v-if="randomRecommendedPost.tags.length">
              <span v-for="tag in randomRecommendedPost.tags" :key="tag" class="tag">{{ tag }}</span>
            </template>
            <span v-else class="tag latest-post-tag-placeholder">无关键词</span>
          </div>
          <p class="latest-post-summary">{{ randomRecommendedPost.summary || '暂无摘要' }}</p>
          <p class="latest-post-date">
            {{ formatDateYmd(randomRecommendedPost.updated_at) || '----/--/--' }}
          </p>
        </RouterLink>
        <div v-else class="latest-post-card card latest-post-card--empty">
          <p class="latest-post-empty">暂无可展示文章</p>
        </div>
      </div>
    </aside>

    <div class="center">
      <div class="avatar">
        <img
          v-if="avatarUrl"
          data-splash-avatar-target
          :class="{ 'home-avatar--splash-fly': ui.splashAvatarHandoff }"
          :src="avatarUrl"
          alt="头像"
        />
        <span v-else>头像</span>
      </div>
      <div class="greeting-art card">
        <p class="greeting-art-line">{{ t('home.greeting') }}</p>
      </div>
      <div class="internship-note card">{{ t('home.internshipNote') }}</div>
      <div class="self-intro-box card">
        <div class="cursor-placeholder">
          <div class="cursor-placeholder-text cursor-placeholder-tech">
            <p class="cursor-tech-title">技术栈<br />Languages</p>
            <p class="cursor-tech-divider">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</p>
            <div class="cursor-tech-grid">
              <p>● Python 0.0%</p>
              <p>● JAVA 0.0%</p>
              <p>● C/C++ 0.0%</p>
              <p>● MySQL 0.0%</p>
              <p>● Vue3 0.0%</p>
              <p>● Linux 0.0%</p>
              <p class="cursor-tech-ai">● Artificial Intelligence 10000.0%</p>
            </div>
          </div>
          <p class="cursor-placeholder-text">
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
        <div class="external-links-anchor">
          <nav
            class="external-links-row"
            aria-label="External links"
          >
            <a
              v-for="item in externalLinks"
              :key="item.href + item.label"
              class="icon-btn"
              :style="{ '--icon-color': item.color }"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              @click="handleExternalLinkClick(item, $event)"
            >
              <span class="glass-bg" />
              <svg :viewBox="item.viewBox" class="icon" aria-hidden="true">
                <path :d="item.path" />
              </svg>
              <span class="label-text">{{ item.label }}</span>
            </a>
          </nav>
          <transition name="copy-toast-fade">
            <div v-if="copyToastVisible" class="copy-toast" :style="{ '--toast-color': copyToastColor }">
              邮箱地址已复制
            </div>
          </transition>
        </div>
      </div>
    </div>

    <aside class="right-panel">
      <FilmFeed />
    </aside>
  </section>
</template>

<style scoped>
.home-layout {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  align-items: stretch;
  min-height: calc(100vh - 2rem);
}

.left-ellipse {
  height: 100%;
  width: min(96%, 380px);
  justify-self: start;
  border: 1px solid var(--glass-card-border);
  border-radius: var(--radius-md);
  background: var(--glass-card-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  text-align: left;
  gap: 0.9rem;
  padding: 1.25rem;
}

.left-ellipse > p {
  margin: 0;
  color: var(--color-text);
  font-size: 1.05rem;
}

.latest-post-card {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  text-decoration: none;
  color: inherit;
  padding: 0.9rem 1rem;
}

.latest-post-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.left-latest-panel {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.left-random-panel {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.left-section-title {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  font-weight: 600;
}

.latest-post-card--empty {
  justify-content: center;
  min-height: 180px;
}

.latest-post-title {
  margin: 0;
  font-size: 1rem;
  line-height: 1.35;
}

.latest-post-tags {
  margin: 0.15rem 0 0.05rem;
}

.latest-post-tag-placeholder {
  opacity: 0.78;
}

.latest-post-summary {
  margin: 0.1rem 0 0;
  color: var(--color-text-muted);
  font-size: 0.86rem;
  line-height: 1.55;
}

.latest-post-date {
  margin: 0.3rem 0 0;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.latest-post-empty {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.center {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: stretch;
  height: 100%;
}

.avatar {
  flex: 1 1 0;
  width: 100%;
  border: 2px solid var(--color-border);
  background: var(--color-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-text);
  padding: 1rem;
}

.avatar {
  width: auto;
  height: 100%;
  max-width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  overflow: hidden;
  padding: 0;
  align-self: center;
  font-size: 1.35rem;
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

.internship-note {
  flex: 0 0 auto;
  width: 100%;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  padding: 0.58rem 0.9rem;
}

.greeting-art {
  flex: 0 0 auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0.7rem 1rem;
}

.greeting-art-line {
  margin: 0;
  font-family: 'Playfair Display', 'Averia Gruesa Libre', Georgia, 'Times New Roman', serif;
  font-size: clamp(1.28rem, 2.6vw, 1.85rem);
  font-weight: 600;
  font-style: italic;
  line-height: 1.35;
  letter-spacing: 0.02em;
  color: var(--color-text);
}

.self-intro-box {
  flex: 1 1 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0.85rem;
  text-align: left;
  /* 与全局 .card 的 overflow:hidden 区分：保留内部滚动；圆角/玻璃/阴影由 .card 提供 */
  overflow-x: hidden;
  overflow-y: auto;
}

.cursor-placeholder {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.cursor-placeholder-text {
  margin: 0;
  color: var(--color-text);
  font-size: 0.86rem;
  line-height: 1.62;
  border: 1px solid color-mix(in srgb, var(--glass-card-border) 85%, transparent);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--glass-card-bg) 84%, transparent);
  padding: 0.7rem 0.75rem;
}

.cursor-tech-title {
  margin: 0;
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.45;
}

.cursor-tech-divider {
  margin: 0.1rem 0 0.35rem;
  color: var(--color-text-muted);
  letter-spacing: 0.02em;
  font-size: 0.78rem;
}

.cursor-tech-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.26rem 0.65rem;
}

.cursor-tech-grid p {
  margin: 0;
  font-size: 0.79rem;
  line-height: 1.48;
}

.cursor-tech-ai {
  grid-column: 1 / -1;
}

.external-links-anchor {
  position: relative;
  width: 100%;
}

.external-links-row {
  /* 参考 links_tamplate：flex flex-row-reverse flex-wrap items-center gap-3；小屏 justify-center */
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
}

.icon-btn {
  --icon-color: var(--color-accent);
  position: relative;
  width: 52px;
  height: 52px;
  cursor: pointer;
  color: color-mix(in srgb, var(--icon-color) 76%, white);
  text-decoration: none;
  transition: transform 0.25s ease, color 0.25s ease;
}

.glass-bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--glass-card-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%) brightness(1.02);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%) brightness(1.02);
  box-shadow:
    inset 0 4px 10px rgb(255 255 255 / 0.38),
    inset 0 -6px 12px rgb(0 0 0 / 0.2),
    var(--shadow-card);
}

.glass-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(120deg, rgb(255 255 255 / 0.56), transparent 42%);
  opacity: 0.65;
}

.icon-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--icon-color) 36%, white);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.icon {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 55%;
  height: 55%;
}

.icon path {
  fill: currentColor;
  transition: filter 0.25s ease;
}

.icon-btn:hover {
  color: var(--icon-color);
  transform: scale(1.08);
}

.icon-btn:hover::after {
  border-color: var(--icon-color);
  box-shadow: 0 0 12px color-mix(in srgb, var(--icon-color) 70%, white);
}

.icon-btn:hover .icon {
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--icon-color) 78%, white));
}

.icon-btn:active {
  transform: scale(0.95);
}

.label-text {
  position: absolute;
  top: calc(100% + 0.42rem);
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  opacity: 0;
  visibility: hidden;
  padding: 0.33rem 0.7rem;
  border-radius: 999px;
  white-space: nowrap;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--icon-color);
  border: 1px solid color-mix(in srgb, var(--icon-color) 30%, var(--glass-card-border));
  background: var(--glass-card-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%) brightness(1.02);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%) brightness(1.02);
  box-shadow: var(--shadow-card);
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 20;
}

.icon-btn:hover .label-text {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.copy-toast {
  --toast-color: #9b7bff;
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.5rem);
  width: fit-content;
  border-radius: 999px;
  padding: 0.33rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--toast-color);
  border: 1px solid color-mix(in srgb, var(--toast-color) 36%, var(--glass-card-border));
  background: var(--glass-card-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%) brightness(1.02);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%) brightness(1.02);
  box-shadow: var(--shadow-card);
}

.copy-toast-fade-enter-active,
.copy-toast-fade-leave-active {
  transition: all 0.22s ease;
}

.copy-toast-fade-enter-from,
.copy-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.right-panel {
  width: min(86%, 300px);
  justify-self: end;
  border: 1px solid var(--glass-card-border);
  background: var(--glass-card-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

@media (max-width: 1100px) {
  .home-layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .left-ellipse {
    min-height: 240px;
    width: 100%;
    height: auto;
    border-radius: var(--radius-lg);
  }

  .center {
    height: auto;
  }

  .avatar,
  .greeting-art,
  .internship-note,
  .self-intro-box {
    flex: 0 0 auto;
  }

  .avatar {
    width: 180px;
    height: 180px;
    aspect-ratio: auto;
  }

  .right-panel {
    width: 100%;
    height: auto;
  }
}

@media (max-width: 640px) {
  .cursor-placeholder {
    grid-template-columns: 1fr;
  }

  .external-links-row {
    justify-content: center;
  }
}
</style>
