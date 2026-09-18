<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import EdKicker from '@/components/editorial/EdKicker.vue'
import { isMotionMinimal } from '@/composables/useMotionPolicy'
import type { TocItem } from '@/utils/headingToc'

/** 与标题 scroll-margin 对齐，并略伸进栏内，避免节题已入视野仍停在上一节。 */
function readingOffsetPx() {
  return Math.min(220, Math.max(112, Math.round(window.innerHeight * 0.18)))
}

const props = withDefaults(
  defineProps<{
    items: TocItem[]
    /** 窄屏折叠；宽屏侧栏用列表 */
    folded?: boolean
    label?: string
  }>(),
  { folded: false },
)

const { t } = useI18n()
const ariaLabel = computed(() => props.label || t('post.tocLabel'))
const activeId = ref('')
const rootRef = ref<HTMLElement | null>(null)
let raf = 0

function updateActive() {
  const list = props.items
  if (!list.length) {
    activeId.value = ''
    return
  }
  let current = list[0].id
  for (const item of list) {
    const el = document.getElementById(item.id)
    if (!el) continue
    if (el.getBoundingClientRect().top <= readingOffsetPx()) current = item.id
  }
  if (activeId.value === current) return
  activeId.value = current
  const link = rootRef.value?.querySelector<HTMLElement>(`[data-toc-id="${CSS.escape(current)}"]`)
  if (!link) return
  const scroller = link.closest('.detail-scroll-rail__card') as HTMLElement | null
  if (scroller) {
    const linkRect = link.getBoundingClientRect()
    const box = scroller.getBoundingClientRect()
    if (linkRect.top < box.top + 8) scroller.scrollTop -= box.top + 8 - linkRect.top
    else if (linkRect.bottom > box.bottom - 8) scroller.scrollTop += linkRect.bottom - (box.bottom - 8)
    return
  }
  link.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    updateActive()
  })
}

function jump(event: Event, id: string) {
  event.preventDefault()
  const el = document.getElementById(id)
  if (!el) return
  activeId.value = id
  el.scrollIntoView({
    behavior: isMotionMinimal() ? 'auto' : 'smooth',
    block: 'start',
  })
  const url = `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`
  history.replaceState(history.state, '', url)
}

watch(
  () => props.items.map((item) => item.id).join('\0'),
  () => {
    void nextTick(updateActive)
  },
)

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  void nextTick(updateActive)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <nav v-if="items.length" ref="rootRef" class="post-toc" :aria-label="ariaLabel">
    <details v-if="folded" class="post-toc-fold">
      <summary class="post-toc-summary">
        <EdKicker :en="t('post.tocKickerEn')" :zh="t('post.tocKickerZh')" />
      </summary>
      <ol class="post-toc-list">
        <li v-for="item in items" :key="item.id" :class="['is-h' + item.level, { 'is-active': item.id === activeId }]">
          <a
            :href="'#' + item.id"
            :data-toc-id="item.id"
            :class="{ 'is-active': item.id === activeId }"
            :aria-current="item.id === activeId ? 'location' : undefined"
            :title="item.text"
            @click="jump($event, item.id)"
          >{{ item.text }}</a>
        </li>
      </ol>
    </details>
    <template v-else>
      <EdKicker :en="t('post.tocKickerEn')" :zh="t('post.tocKickerZh')" />
      <ol class="post-toc-list">
        <li v-for="item in items" :key="item.id" :class="['is-h' + item.level, { 'is-active': item.id === activeId }]">
          <a
            :href="'#' + item.id"
            :data-toc-id="item.id"
            :class="{ 'is-active': item.id === activeId }"
            :aria-current="item.id === activeId ? 'location' : undefined"
            :title="item.text"
            @click="jump($event, item.id)"
          >{{ item.text }}</a>
        </li>
      </ol>
    </template>
  </nav>
</template>

<style scoped>
.post-toc {
  margin: 0;
}

.post-toc-fold {
  margin: 0 0 1.35rem;
  padding: 0 0 0.85rem;
  border-bottom: 1px solid var(--color-border);
}

.post-toc-summary {
  cursor: pointer;
  list-style: none;
}

.post-toc-summary::-webkit-details-marker {
  display: none;
}

.post-toc-summary :deep(.ed-kicker) {
  margin-bottom: 0;
}

.post-toc-list {
  margin: 0.45rem 0 0;
  padding: 0;
  list-style: none;
}

.post-toc-list li {
  min-width: 0;
}

.post-toc-list li + li {
  margin-top: 0.28rem;
}

.post-toc-list a {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--color-text-muted);
  text-decoration: none;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.post-toc-list a:hover,
.post-toc-list a.is-active {
  color: var(--color-accent);
}

.post-toc-list .is-h3 {
  padding-left: 0.75rem;
}

.post-toc-fold .post-toc-list {
  margin-top: 0.65rem;
}

@media (min-width: 1280px) {
  .post-toc-fold {
    display: none;
  }
}
</style>
