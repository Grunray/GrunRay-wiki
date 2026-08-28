<script setup lang="ts">
import { EXTERNAL_LINKS } from '@/config/externalLinks'
import { useExternalLinkCopy } from '@/composables/useExternalLinkCopy'

const { copyToastVisible, copyToastColor, handleExternalLinkClick } = useExternalLinkCopy()
</script>

<template>
  <div class="footer-external-links">
    <nav class="footer-external-links-toolbar" aria-label="External links">
      <a
        v-for="item in EXTERNAL_LINKS"
        :key="item.href + item.label"
        class="footer-ext-btn"
        :style="{ '--icon-color': item.color }"
        :href="item.href"
        target="_blank"
        rel="noopener noreferrer"
        @click="handleExternalLinkClick(item, $event)"
      >
        <svg :viewBox="item.viewBox" class="footer-ext-btn__icon" aria-hidden="true">
          <path :d="item.path" />
        </svg>
        <span class="footer-ext-btn__label">{{ item.label }}</span>
      </a>
    </nav>
    <transition name="footer-copy-toast-fade">
      <div
        v-if="copyToastVisible"
        class="footer-copy-toast"
        :style="{ '--toast-color': copyToastColor }"
      >
        邮箱地址已复制
      </div>
    </transition>
  </div>
</template>

<style scoped>
.footer-external-links {
  position: relative;
  display: flex;
  align-items: center;
}

/* 方案 D：纸面分段条（DESIGN.md · btn-accent 纪律） */
.footer-external-links-toolbar {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  flex-shrink: 0;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-surface) 84%, transparent);
  box-shadow: var(--shadow-card);
}

.footer-ext-btn {
  --icon-color: var(--color-accent);
  position: relative;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: color-mix(in srgb, var(--icon-color) 82%, var(--color-text-muted));
  text-decoration: none;
  cursor: pointer;
  transition:
    color 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.footer-ext-btn:not(:first-child) {
  border-inline-end: 1px solid var(--color-border);
}

.footer-ext-btn__icon {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 50%;
  height: 50%;
}

.footer-ext-btn__icon path {
  fill: currentColor;
}

.footer-ext-btn:hover {
  color: var(--icon-color);
  background: color-mix(in srgb, var(--icon-color) 16%, transparent);
  transform: translateY(-1px);
}

.footer-ext-btn:active {
  transform: translateY(0);
}

.footer-ext-btn:focus-visible {
  outline: none;
  color: var(--icon-color);
  background: color-mix(in srgb, var(--icon-color) 12%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--icon-color) 18%, transparent);
}

.footer-ext-btn__label {
  position: absolute;
  bottom: calc(100% + 0.38rem);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  opacity: 0;
  visibility: hidden;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--icon-color);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-card);
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 20;
}

.footer-ext-btn:hover .footer-ext-btn__label,
.footer-ext-btn:focus-visible .footer-ext-btn__label {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.footer-copy-toast {
  --toast-color: #9b7bff;
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.45rem);
  transform: translateX(-50%);
  width: fit-content;
  border-radius: 999px;
  padding: 0.33rem 0.75rem;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--toast-color);
  border: 1px solid color-mix(in srgb, var(--toast-color) 36%, var(--color-border));
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-card);
  white-space: nowrap;
  z-index: 30;
}

.footer-copy-toast-fade-enter-active,
.footer-copy-toast-fade-leave-active {
  transition: all 0.22s ease;
}

.footer-copy-toast-fade-enter-from,
.footer-copy-toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

[data-theme='abstract'] .footer-external-links-toolbar {
  border-radius: 0;
}

[data-theme='abstract'] .footer-ext-btn {
  border-radius: 0;
  font-family: var(--font-mono);
}

[data-theme='abstract'] .footer-ext-btn__label {
  border-radius: 0;
}

@media (max-width: 768px) {
  .footer-external-links {
    width: 100%;
    justify-content: center;
  }

  .footer-external-links-toolbar {
    flex-direction: row;
  }
}

@media (prefers-reduced-motion: reduce) {
  .footer-ext-btn:hover {
    transform: none;
  }

  .footer-ext-btn:active {
    transform: none;
  }
}
</style>
