<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { setXiqiSplitFooterLock } from '@/composables/useXiqiSplitFooter'

const selectedKey = defineModel<string | null>('selectedKey', { default: null })

defineProps<{
  detailTitle?: string
}>()

const { t } = useI18n()

const splitMainRef = ref<HTMLElement | null>(null)
/** 控制分栏布局（含 footer 锁定）；关闭详情后需等过渡结束再解除 */
const layoutSplit = ref(false)

const isOpen = computed(() => selectedKey.value !== null)

let pendingPanelScroll = 0

function getMainInner(): HTMLElement | null {
  return splitMainRef.value?.querySelector('.xiqi-split-main-inner') ?? null
}

/** 整页滚动时，主栏内容已向下滚动的距离 */
function measureMainScrollOffset(): number {
  const inner = getMainInner()
  if (!inner) return 0
  const innerDocTop = inner.getBoundingClientRect().top + window.scrollY
  return Math.max(0, window.scrollY - innerDocTop)
}

function restoreMainPanelScroll(offset: number) {
  const main = splitMainRef.value
  if (!main) return
  main.scrollTop = offset
}

function restoreWindowScrollFromPanel(panelScroll: number) {
  const inner = getMainInner()
  if (!inner) return
  const innerDocTop = inner.getBoundingClientRect().top + window.scrollY
  window.scrollTo({ top: Math.max(0, innerDocTop + panelScroll), behavior: 'auto' })
}

async function afterSplitLayout() {
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function closeDetail() {
  selectedKey.value = null
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    closeDetail()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
})

watch(isOpen, async (open) => {
  const main = splitMainRef.value

  if (open) {
    pendingPanelScroll = 0
    const scrollOffset = main ? measureMainScrollOffset() : 0
    layoutSplit.value = true
    setXiqiSplitFooterLock(true)
    if (!main) return
    await afterSplitLayout()
    restoreMainPanelScroll(scrollOffset)
    return
  }

  pendingPanelScroll = main?.scrollTop ?? 0
})

async function onDetailAfterLeave() {
  if (isOpen.value) return

  layoutSplit.value = false
  setXiqiSplitFooterLock(false)
  await afterSplitLayout()
  restoreWindowScrollFromPanel(pendingPanelScroll)
  pendingPanelScroll = 0
}

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  layoutSplit.value = false
  pendingPanelScroll = 0
  setXiqiSplitFooterLock(false)
})
</script>

<template>
  <section class="xiqi-page" :class="{ 'xiqi-page--split': layoutSplit }">
    <div class="xiqi-split">
      <div ref="splitMainRef" class="xiqi-split-main">
        <div class="xiqi-split-main-inner">
          <slot />
        </div>
      </div>

      <Transition name="xiqi-detail" @after-leave="onDetailAfterLeave">
        <aside
          v-if="isOpen"
          class="xiqi-split-detail card card-glass-dense"
          role="complementary"
          :aria-label="detailTitle || t('xiqi.detailPanel')"
        >
          <header class="xiqi-detail-head">
            <p v-if="detailTitle" class="xiqi-detail-title">{{ detailTitle }}</p>
            <button
              type="button"
              class="xiqi-detail-close"
              :aria-label="t('xiqi.closeDetail')"
              @click="closeDetail"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </header>
          <div class="xiqi-detail-body">
            <slot name="detail" />
          </div>
        </aside>
      </Transition>
    </div>
  </section>
</template>
