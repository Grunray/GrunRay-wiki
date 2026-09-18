<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'

import EdKicker from '@/components/editorial/EdKicker.vue'
import CardCornerVineLazy from '@/components/hover/CardCornerVineLazy.vue'
import PageStatusBlock from '@/components/ui/PageStatusBlock.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import { useUiStore } from '@/stores/ui'
import '@/styles/page-enter-design.css'
import '@/styles/page-design.css'
import '@/styles/page-toc-row.css'

const { t } = useI18n()
const route = useRoute()
const { theme } = storeToRefs(useUiStore())

useSeoMeta(() => ({
  title: `${t('design.title')} | ${SITE_NAME}`,
  description: t('design.seoDescription'),
  path: route.path,
  type: 'website',
}))

const pageRoot = ref<HTMLElement | null>(null)
const selectDemo = ref('software')
const selectDemoOptions = computed(() => [
  { value: 'software', label: t('design.selectOptA') },
  { value: 'opensource', label: t('design.selectOptB') },
  { value: 'anime', label: t('design.selectOptC') },
])

const TOKEN_KEYS = [
  '--color-bg-base',
  '--color-bg-surface',
  '--color-bg-elevated',
  '--color-reading-bg',
  '--color-text',
  '--color-text-muted',
  '--color-border',
  '--color-accent',
  '--color-accent-muted',
  '--color-on-accent',
] as const

const tokenSwatches = ref<Array<{ key: string; value: string }>>([])

const typeRows = computed(() => [
  { id: 'h1', label: t('design.typePageTitle'), sample: t('design.typeSampleTitle'), className: 'ds-type-h1' },
  { id: 'h2', label: t('design.typeSection'), sample: t('design.typeSampleSection'), className: 'ds-type-h2' },
  { id: 'body', label: t('design.typeBody'), sample: t('design.typeSampleBody'), className: 'ds-type-body' },
  { id: 'kicker', label: t('design.typeKicker'), sample: 'VOL · 2026 · META', className: 'ds-type-kicker' },
  { id: 'ui', label: t('design.typeUi'), sample: t('design.typeSampleUi'), className: 'ds-type-ui' },
  { id: 'mono', label: t('design.typeMono'), sample: 'JetBrains Mono · 0x1A', className: 'ds-type-mono' },
])

function readTokens() {
  const styles = getComputedStyle(document.documentElement)
  tokenSwatches.value = TOKEN_KEYS.map((key) => ({
    key: key.replace(/^--color-/, ''),
    value: styles.getPropertyValue(key).trim() || '—',
  }))
}

onMounted(async () => {
  readTokens()
  await playPageEnter(pageRoot.value)
})

watch(theme, () => {
  readTokens()
})
</script>

<template>
  <article ref="pageRoot" class="design-page">
    <h1 class="h">{{ t('design.title') }}</h1>

    <div class="ed-filter">
      <EdKicker :en="t('design.kickerEn')" :zh="t('design.kickerZh')" />
      <p class="design-hint">{{ t('design.intro') }}</p>
      <p class="design-actions">
        <RouterLink class="ed-action" to="/">← {{ t('design.backHome') }}</RouterLink>
      </p>
    </div>

    <!-- 色板 -->
    <section class="design-sec" aria-labelledby="ds-color-heading">
      <EdKicker id="ds-color-heading" :en="t('design.kickerColorEn')" :zh="t('design.kickerColorZh')" />
      <p class="design-body">{{ t('design.colorLead') }}</p>
      <ul class="ds-swatch-grid">
        <li v-for="sw in tokenSwatches" :key="sw.key" class="ds-swatch">
          <span class="ds-swatch-chip" :style="{ background: `var(--color-${sw.key})` }" />
          <span class="ds-swatch-meta">
            <span class="ds-swatch-name">{{ sw.key }}</span>
            <code class="ds-swatch-value">{{ sw.value }}</code>
          </span>
        </li>
      </ul>
    </section>

    <!-- 字体 -->
    <section class="design-sec" aria-labelledby="ds-type-heading">
      <EdKicker id="ds-type-heading" :en="t('design.kickerTypeEn')" :zh="t('design.kickerTypeZh')" />
      <p class="design-body">{{ t('design.typeLead') }}</p>
      <ul class="ds-type-list">
        <li v-for="row in typeRows" :key="row.id" class="ds-type-row">
          <p class="ds-type-label ed-kicker">
            <span class="ed-en">{{ row.label }}</span>
          </p>
          <p :class="['ds-type-sample', row.className]">{{ row.sample }}</p>
        </li>
      </ul>
    </section>

    <!-- 按钮 -->
    <section class="design-sec" aria-labelledby="ds-btn-heading">
      <EdKicker id="ds-btn-heading" :en="t('design.kickerBtnEn')" :zh="t('design.kickerBtnZh')" />
      <p class="design-body">{{ t('design.btnLead') }}</p>
      <div class="ds-demo-row">
        <button type="button" class="ed-action">{{ t('design.btnEdAction') }}</button>
      </div>
    </section>

    <!-- 下拉 -->
    <section class="design-sec ds-select-sec" aria-labelledby="ds-select-heading">
      <EdKicker id="ds-select-heading" :en="t('design.kickerSelectEn')" :zh="t('design.kickerSelectZh')" />
      <p class="design-body">{{ t('design.selectLead') }}</p>
      <div class="ds-select-demo">
        <span class="compose-ed-label">{{ t('design.selectLabel') }}</span>
        <AppSelect
          v-model="selectDemo"
          variant="editorial"
          :options="selectDemoOptions"
          :aria-label="t('design.selectLabel')"
        />
      </div>
    </section>

    <!-- 标签 -->
    <section class="design-sec" aria-labelledby="ds-tag-heading">
      <EdKicker id="ds-tag-heading" :en="t('design.kickerTagEn')" :zh="t('design.kickerTagZh')" />
      <p class="design-body">{{ t('design.tagLead') }}</p>
      <div class="ds-demo-row">
        <span class="tag">Vue</span>
        <span class="tag">Editorial</span>
        <span class="tag">Design</span>
      </div>
    </section>

    <!-- 卡片 -->
    <section class="design-sec" aria-labelledby="ds-card-heading">
      <EdKicker id="ds-card-heading" :en="t('design.kickerCardEn')" :zh="t('design.kickerCardZh')" />
      <p class="design-body">{{ t('design.cardLead') }}</p>
      <div class="ds-card-grid">
        <div class="card ds-demo-card">
          <p class="ds-demo-card-kicker ed-kicker">
            <span class="ed-en">Surface</span>
            <span class="ed-mid" aria-hidden="true">·</span>
            <span class="ed-zh">{{ t('design.cardSurfaceZh') }}</span>
          </p>
          <h3 class="ds-demo-card-title">{{ t('design.cardTitle') }}</h3>
          <p class="ds-demo-card-body">{{ t('design.cardBody') }}</p>
        </div>
        <div
          class="card card-hover-g ds-demo-card ds-demo-card--clickable"
          role="button"
          tabindex="0"
        >
          <p class="ds-demo-card-kicker ed-kicker">
            <span class="ed-en">Hover G</span>
            <span class="ed-mid" aria-hidden="true">·</span>
            <span class="ed-zh">{{ t('design.cardVineZh') }}</span>
          </p>
          <h3 class="ds-demo-card-title">{{ t('design.cardVineTitle') }}</h3>
          <p class="ds-demo-card-body">{{ t('design.cardVineBody') }}</p>
          <CardCornerVineLazy />
        </div>
      </div>
      <div class="ds-toc-demo" :aria-label="t('design.cardTocLabel')">
        <a
          class="toc-row"
          href="#"
          role="link"
          @click.prevent
        >
          <span class="toc-meta">
            <time datetime="2026-09-16">2026-09-16</time>
          </span>
          <h3 class="toc-title">{{ t('design.cardTocTitle') }}</h3>
          <p class="toc-summary">{{ t('design.cardTocBody') }}</p>
          <div class="toc-tags">
            <span class="tag">Notes</span>
            <span class="tag">Editorial</span>
          </div>
        </a>
      </div>
    </section>

    <!-- 空态 -->
    <section class="design-sec" aria-labelledby="ds-status-heading">
      <EdKicker id="ds-status-heading" :en="t('design.kickerStatusEn')" :zh="t('design.kickerStatusZh')" />
      <p class="design-body">{{ t('design.statusLead') }}</p>
      <div class="ds-status-stack">
        <PageStatusBlock
          kind="empty"
          :title="t('design.statusEmptyTitle')"
          :description="t('design.statusEmptyDesc')"
        />
        <PageStatusBlock
          kind="error"
          :title="t('design.statusErrorTitle')"
          :description="t('design.statusErrorDesc')"
          retryable
          :retry-label="t('common.status.retry')"
        />
        <PageStatusBlock kind="loading" :title="t('common.status.loading')" />
      </div>
    </section>

    <!-- 表单焦点 -->
    <section class="design-sec" aria-labelledby="ds-form-heading">
      <EdKicker id="ds-form-heading" :en="t('design.kickerFormEn')" :zh="t('design.kickerFormZh')" />
      <p class="design-body">{{ t('design.formLead') }}</p>
      <label class="ds-form-field">
        <span class="ed-kicker">
          <span class="ed-en">Field</span>
          <span class="ed-mid" aria-hidden="true">·</span>
          <span class="ed-zh">{{ t('design.formLabelZh') }}</span>
        </span>
        <input class="ds-form-input" type="text" :placeholder="t('design.formPlaceholder')" />
      </label>
    </section>

    <p class="design-foot">
      <RouterLink class="ed-action" to="/legal">{{ t('footer.legalLabel') }}</RouterLink>
    </p>
  </article>
</template>
