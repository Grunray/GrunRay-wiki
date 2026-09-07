<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import EdKicker from '@/components/editorial/EdKicker.vue'
import AppImage from '@/components/ui/AppImage.vue'
import { ABOUT_PROFILE, type AboutAwardTier, type AboutProfile } from '@/content/data/aboutResume'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { fetchAboutProfile } from '@/services/aboutApi'
import { SITE_AVATAR_FALLBACK_URL, SITE_AVATAR_PHOTO_URL } from '@/config/siteAvatar'
import { SITE_NAME } from '@/config/site'
import '@/styles/page-enter-xiqi.css'
import '@/styles/page-xiqi.css'
import '@/styles/page-about-resume.css'

const { t } = useI18n()
const route = useRoute()
const profile = ref<AboutProfile>(ABOUT_PROFILE)
const { copied, copyWithFeedback } = useCopyToClipboard()

useSeoMeta(() => ({
  title: `${t('about.title')} | ${SITE_NAME}`,
  description: t('about.seoDescription'),
  path: route.path,
  type: 'website',
}))

const pageRoot = ref<HTMLElement | null>(null)
const avatarSrc = ref(SITE_AVATAR_PHOTO_URL)

function awardTierClass(tier: AboutAwardTier): string {
  return `about-award-line--${tier}`
}

async function copyEmail() {
  await copyWithFeedback(profile.value.email)
}

onMounted(async () => {
  if (pageRoot.value) void playPageEnter(pageRoot.value)
  const remote = await fetchAboutProfile()
  if (remote) {
    profile.value = remote
  }
})
</script>

<template>
  <section ref="pageRoot" class="xiqi-page about-page">
    <div class="about-page-inner">
      <h1 class="h">{{ t('about.title') }}</h1>

      <div class="ed-filter">
        <EdKicker :en="t('about.kickerProfileEn')" :zh="t('about.kickerProfileZh')" />
        <p class="about-hint">{{ profile.intro }}</p>
        <p class="about-hint">
          {{ t('about.privacyNotice') }}
          <button type="button" class="ed-action about-copy-mail" @click="copyEmail">
            {{ profile.email }}
          </button>
          <em class="about-copy-hint" aria-live="polite">
            {{ copied ? t('about.copyEmailDone') : t('about.copyEmailHint') }}
          </em>
        </p>
      </div>

      <div class="about-split">
        <aside class="about-split-side" aria-label="身份与竞赛">
          <div class="about-avatar">
            <AppImage
              :src="avatarSrc"
              :fallback-src="SITE_AVATAR_FALLBACK_URL"
              :alt="profile.alias"
              :min-loader-ms="800"
            />
          </div>
          <h2 class="about-who-name">{{ profile.alias }}</h2>
          <p class="about-who-meta">{{ profile.genderAge }}</p>
          <p class="about-who-mail">
            <button type="button" class="ed-action about-copy-mail" @click="copyEmail">
              {{ profile.email }}
            </button>
          </p>

          <div class="about-side-block">
            <EdKicker :en="t('about.kickerAwardsEn')" :zh="t('about.kickerAwardsZh')" />
            <p
              v-for="award in profile.awards"
              :key="award.id"
              class="about-award-line"
              :class="awardTierClass(award.tier)"
            >
              {{ award.label }}
            </p>
          </div>

          <div class="about-side-block">
            <EdKicker :en="t('about.kickerPapersEn')" :zh="t('about.kickerPapersZh')" />
            <ul class="about-cert-list">
              <li v-for="cert in profile.certificates" :key="cert">{{ cert }}</li>
            </ul>
          </div>
        </aside>

        <div class="about-split-main">
          <section class="about-sec" aria-labelledby="about-edu-heading">
            <div class="about-sec-head">
              <EdKicker
                id="about-edu-heading"
                :en="t('about.kickerEducationEn')"
                :zh="t('about.kickerEducationZh')"
              />
            </div>
            <article class="about-entry">
              <p class="about-entry-when">{{ profile.education.period }}</p>
              <div>
                <h3 class="about-entry-title">
                  {{ profile.education.degree }} · {{ profile.education.major }}
                </h3>
                <p class="about-entry-sub">{{ profile.education.schoolPublic }}</p>
                <div class="about-priv">
                  <span class="about-priv-cap">{{ t('about.educationRankHidden') }}</span>
                  <span class="about-priv-bar" aria-hidden="true" />
                </div>
              </div>
            </article>
          </section>

          <section class="about-sec" aria-labelledby="about-work-heading">
            <div class="about-sec-head">
              <EdKicker
                id="about-work-heading"
                :en="t('about.kickerWorkEn')"
                :zh="t('about.kickerWorkZh')"
              />
            </div>
            <article class="about-entry">
              <p class="about-entry-when">{{ profile.internship.period }}</p>
              <div>
                <h3 class="about-entry-title">{{ profile.internship.role }}</h3>
                <p class="about-entry-sub">{{ profile.internship.companyPublic }}</p>
                <div class="about-priv">
                  <span class="about-priv-cap">{{ t('about.internshipDetailHidden') }}</span>
                  <span class="about-priv-bar" aria-hidden="true" />
                </div>
              </div>
            </article>
          </section>

          <section class="about-sec" aria-labelledby="about-club-heading">
            <div class="about-sec-head">
              <EdKicker
                id="about-club-heading"
                :en="t('about.kickerCommunityEn')"
                :zh="t('about.kickerCommunityZh')"
              />
            </div>
            <article class="about-entry">
              <p class="about-entry-when">{{ profile.club.period }}</p>
              <div>
                <h3 class="about-entry-title">{{ profile.club.role }}</h3>
                <p class="about-entry-sub">{{ profile.club.namePublic }}</p>
                <div class="about-priv">
                  <span class="about-priv-cap">{{ t('about.clubDetailHidden') }}</span>
                  <span class="about-priv-bar" aria-hidden="true" />
                </div>
              </div>
            </article>
          </section>

          <section class="about-sec" aria-labelledby="about-projects-heading">
            <div class="about-sec-head">
              <EdKicker
                id="about-projects-heading"
                :en="t('about.kickerProjectsEn')"
                :zh="t('about.kickerProjectsZh')"
              />
            </div>
            <p class="about-hint">{{ t('about.projectsHint') }}</p>
            <p class="about-projects-go">
              <RouterLink to="/projects" class="ed-action">{{ t('about.projectsCta') }}</RouterLink>
            </p>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>
