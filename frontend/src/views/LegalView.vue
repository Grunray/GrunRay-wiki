<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import EdKicker from '@/components/editorial/EdKicker.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { ABOUT_PROFILE } from '@/content/data/aboutResume'
import { SITE_NAME } from '@/config/site'
import '@/styles/page-enter-legal.css'
import '@/styles/page-legal.css'

const { t } = useI18n()
const route = useRoute()
const contactEmail = ABOUT_PROFILE.email
const { copied, copyWithFeedback } = useCopyToClipboard()

useSeoMeta(() => ({
  title: `${t('legal.title')} | ${SITE_NAME}`,
  description: t('legal.seoDescription'),
  path: route.path,
  type: 'website',
}))

const pageRoot = ref<HTMLElement | null>(null)

async function copyEmail() {
  await copyWithFeedback(contactEmail)
}

onMounted(async () => {
  await playPageEnter(pageRoot.value)
})
</script>

<template>
  <article ref="pageRoot" class="legal-page">
    <h1 class="h">{{ t('legal.title') }}</h1>

    <div class="ed-filter">
      <EdKicker :en="t('legal.kickerLegalEn')" :zh="t('legal.kickerLegalZh')" />
      <p class="legal-hint">{{ t('legal.intro') }}</p>
      <p class="legal-actions">
        <RouterLink class="ed-action" to="/">← {{ t('legal.backHome') }}</RouterLink>
      </p>
    </div>

    <section class="legal-sec" aria-labelledby="legal-disclaimer-heading">
      <EdKicker
        id="legal-disclaimer-heading"
        :en="t('legal.kickerDisclaimerEn')"
        :zh="t('legal.kickerDisclaimerZh')"
      />
      <p class="legal-body">{{ t('legal.sectionDisclaimerBody1') }}</p>
      <p class="legal-body">{{ t('legal.sectionDisclaimerBody2') }}</p>
      <p class="legal-body">{{ t('legal.sectionDisclaimerBody3') }}</p>
    </section>

    <section class="legal-sec" aria-labelledby="legal-copyright-heading">
      <EdKicker
        id="legal-copyright-heading"
        :en="t('legal.kickerCopyrightEn')"
        :zh="t('legal.kickerCopyrightZh')"
      />
      <p class="legal-body">{{ t('legal.sectionCopyrightBody1') }}</p>
      <p class="legal-body">{{ t('legal.sectionCopyrightBody2') }}</p>
      <p class="legal-body">{{ t('legal.sectionCopyrightBody3') }}</p>
      <p class="legal-body">{{ t('legal.sectionCopyrightBody4') }}</p>
      <p class="legal-body">{{ t('legal.sectionCopyrightBody5') }}</p>
      <p class="legal-body">
        {{ t('legal.sectionCopyrightBody6') }}
        <button type="button" class="ed-action" @click="copyEmail">{{ contactEmail }}</button>
        <em class="legal-copy-hint" aria-live="polite">
          {{ copied ? t('about.copyEmailDone') : t('about.copyEmailHint') }}
        </em>
      </p>
    </section>

    <section class="legal-sec" aria-labelledby="legal-privacy-heading">
      <EdKicker
        id="legal-privacy-heading"
        :en="t('legal.kickerPrivacyEn')"
        :zh="t('legal.kickerPrivacyZh')"
      />
      <p class="legal-body">{{ t('legal.sectionPrivacyBody1') }}</p>
      <p class="legal-body">{{ t('legal.sectionPrivacyBody2') }}</p>
      <p class="legal-body">{{ t('legal.sectionPrivacyBody3') }}</p>
      <p class="legal-body">
        {{ t('legal.sectionPrivacyBody4') }}
        <button type="button" class="ed-action" @click="copyEmail">{{ contactEmail }}</button>
      </p>
    </section>

    <section class="legal-sec" aria-labelledby="legal-credits-heading">
      <EdKicker
        id="legal-credits-heading"
        :en="t('legal.kickerCreditsEn')"
        :zh="t('legal.kickerCreditsZh')"
      />
      <p class="legal-body">{{ t('legal.sectionCreditsBody1') }}</p>
      <p class="legal-body">{{ t('legal.sectionCreditsBody2') }}</p>
      <p class="legal-body">{{ t('legal.sectionCreditsBody3') }}</p>
    </section>
  </article>
</template>
