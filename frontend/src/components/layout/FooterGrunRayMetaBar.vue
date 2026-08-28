<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import FooterExternalLinks from './FooterExternalLinks.vue'

defineProps<{
  metaVisible: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <div
      class="footer-grunray-meta-bar"
      data-footer-meta-teleport
      :aria-hidden="!metaVisible"
    >
      <div
        class="footer-grunray-meta-bar__shell footer-grunray-glass-panel"
        :class="{ 'is-visible': metaVisible }"
      >
        <div class="footer-grunray-meta-bar__inner">
          <div class="footer-grunray-meta-col footer-grunray-meta-col--start">
            <FooterExternalLinks />
            <span
              class="footer-grunray-meta-divider footer-grunray-meta-divider--inline"
              aria-hidden="true"
            />
            <a
              class="footer-grunray-meta-link"
              href="/rss.xml"
              type="application/rss+xml"
              :title="t('footer.rssTitle')"
            >{{ t('footer.rssLabel') }}</a>
            <span
              class="footer-grunray-meta-divider footer-grunray-meta-divider--inline"
              aria-hidden="true"
            />
            <RouterLink
              class="footer-grunray-meta-link"
              to="/legal"
              :title="t('footer.legalTitle')"
            >{{ t('footer.legalLabel') }}</RouterLink>
          </div>
          <span class="footer-grunray-meta-divider" aria-hidden="true" />
          <div class="footer-grunray-meta-col footer-grunray-meta-col--end">
            <span class="footer-grunray-copyright">© 2026 · GrunRay ·</span>
            <span class="footer-grunray-icp-links">
              <a
                class="footer-grunray-icp-link"
                href="https://icp.gov.moe/?keyword=20266668"
                target="_blank"
                rel="noopener noreferrer"
              >萌ICP备20266668号</a>
              <span class="footer-grunray-icp-sep" aria-hidden="true">·</span>
              <a
                class="footer-grunray-icp-link"
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
              >黔ICP备2026008503号</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
