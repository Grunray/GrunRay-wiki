<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { ABOUT_PROFILE } from '@/content/data/aboutResume'
import { SITE_NAME } from '@/config/site'
import '@/styles/page-enter-legal.css'
import '@/styles/page-legal.css'

const { t } = useI18n()
const route = useRoute()
const contactEmail = ABOUT_PROFILE.email

useSeoMeta(() => ({
  title: `${t('legal.title')} | ${SITE_NAME}`,
  description: t('legal.seoDescription'),
  path: route.path,
  type: 'website',
}))

const pageRoot = ref<HTMLElement | null>(null)

onMounted(async () => {
  await playPageEnter(pageRoot.value)
})
</script>

<template>
  <article ref="pageRoot" class="legal-page">
    <header class="legal-page-header">
      <p class="legal-page-kicker">{{ t('legal.eyebrow') }}</p>
      <h1 class="legal-page-title">{{ t('legal.title') }}</h1>
      <p class="legal-page-subtitle">{{ t('legal.subtitle') }}</p>
    </header>

    <p class="legal-page-intro card card-glass-dense">{{ t('legal.intro') }}</p>

    <section class="legal-section card card-glass-dense" aria-labelledby="legal-disclaimer-heading">
      <h2 id="legal-disclaimer-heading" class="legal-section-title">
        {{ t('legal.sectionDisclaimerTitle') }}
      </h2>
      <p class="legal-section-body">{{ t('legal.sectionDisclaimerBody1') }}</p>
      <p class="legal-section-body">{{ t('legal.sectionDisclaimerBody2') }}</p>
      <p class="legal-section-body">{{ t('legal.sectionDisclaimerBody3') }}</p>
    </section>

    <section class="legal-section card card-glass-dense" aria-labelledby="legal-copyright-heading">
      <h2 id="legal-copyright-heading" class="legal-section-title">
        {{ t('legal.sectionCopyrightTitle') }}
      </h2>
      <p class="legal-section-body">{{ t('legal.sectionCopyrightBody1') }}</p>
      <p class="legal-section-body">{{ t('legal.sectionCopyrightBody2') }}</p>
      <p class="legal-section-body">{{ t('legal.sectionCopyrightBody3') }}</p>
      <p class="legal-section-body">{{ t('legal.sectionCopyrightBody4') }}</p>
      <p class="legal-section-body">{{ t('legal.sectionCopyrightBody5') }}</p>
      <p class="legal-section-body">
        {{ t('legal.sectionCopyrightBody6') }}
        <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
      </p>
    </section>

    <section class="legal-section card card-glass-dense" aria-labelledby="legal-privacy-heading">
      <h2 id="legal-privacy-heading" class="legal-section-title">
        {{ t('legal.sectionPrivacyTitle') }}
      </h2>
      <p class="legal-section-body">{{ t('legal.sectionPrivacyBody1') }}</p>
      <p class="legal-section-body">{{ t('legal.sectionPrivacyBody2') }}</p>
      <p class="legal-section-body">{{ t('legal.sectionPrivacyBody3') }}</p>
      <p class="legal-section-body">
        {{ t('legal.sectionPrivacyBody4') }}
        <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
      </p>
    </section>

    <section class="legal-section card card-glass-dense" aria-labelledby="legal-credits-heading">
      <h2 id="legal-credits-heading" class="legal-section-title">
        {{ t('legal.sectionCreditsTitle') }}
      </h2>
      <p class="legal-section-body">{{ t('legal.sectionCreditsBody1') }}</p>
      <p class="legal-section-body">{{ t('legal.sectionCreditsBody2') }}</p>
      <p class="legal-section-body">{{ t('legal.sectionCreditsBody3') }}</p>
    </section>

    <RouterLink class="legal-page-back" to="/">{{ t('legal.backHome') }}</RouterLink>
  </article>
</template>
