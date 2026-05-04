<script setup lang="ts">
import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import { computed } from 'vue'

import type { ProjectLayoutBlock } from '@/types/content'

const props = defineProps<{ block: ProjectLayoutBlock }>()

const md = new Marked({ gfm: true, breaks: true })

const bodyHtml = computed(() => {
  const raw = props.block.body?.trim()
  if (!raw) return ''
  const parsed = md.parse(raw, { async: false }) as string
  return DOMPurify.sanitize(parsed)
})
</script>

<template>
  <!-- 与 PostDetailView 正文 `.body` 同款阅读区底，不用全局 `.card` 玻璃 -->
  <section class="block-markdown-reading">
    <h2 v-if="block.title" class="title">{{ block.title }}</h2>
    <div v-if="bodyHtml" class="project-md" v-html="bodyHtml" />
  </section>
</template>

<style scoped>
.block-markdown-reading {
  margin-bottom: 0;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-reading-bg, var(--color-bg-surface));
  box-shadow: var(--shadow-card);
}

.title {
  margin: 0 0 0.65rem;
  font-size: 1.15rem;
  color: var(--color-text);
}
</style>

<!--
  v-html 生成的子节点没有 Vue scoped data 属性，样式放在非 scoped 中，
  且限定在 .project-md 下以免污染全局。
-->
<style>
/* 限定在项目 Markdown 块内，正文排版与 PostDetailView `.body` 一致 */
.block-markdown-reading .project-md {
  color: var(--color-text);
  font-size: 1.06rem;
  line-height: 1.75;
  word-break: break-word;
  white-space: normal;
}

.block-markdown-reading .project-md :where(p) {
  margin: 0.55em 0;
}

.block-markdown-reading .project-md :where(p:first-child) {
  margin-top: 0;
}

.block-markdown-reading .project-md :where(p:last-child) {
  margin-bottom: 0;
}

.block-markdown-reading .project-md :where(h1, h2, h3, h4) {
  margin: 1em 0 0.45em;
  line-height: 1.3;
  color: var(--color-text);
  font-weight: 650;
}

.block-markdown-reading .project-md :where(h1) {
  font-size: 1.25rem;
}
.block-markdown-reading .project-md :where(h2) {
  font-size: 1.12rem;
}
.block-markdown-reading .project-md :where(h3, h4) {
  font-size: 1.02rem;
}

.block-markdown-reading .project-md :where(ul, ol) {
  margin: 0.45em 0;
  padding-left: 1.35rem;
}

.block-markdown-reading .project-md :where(li) {
  margin: 0.25em 0;
}

.block-markdown-reading .project-md :where(blockquote) {
  margin: 0.65em 0;
  padding: 0.35rem 0 0.35rem 0.85rem;
  border-left: 3px solid color-mix(in srgb, var(--color-accent) 55%, var(--color-border));
  color: var(--color-text-muted);
}

.block-markdown-reading .project-md :where(a) {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.block-markdown-reading .project-md :where(hr) {
  margin: 1rem 0;
  border: none;
  border-top: 1px solid var(--color-border);
}

.block-markdown-reading .project-md :where(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.65em 0;
  font-size: 0.88rem;
}

.block-markdown-reading .project-md :where(th, td) {
  border: 1px solid var(--color-border);
  padding: 0.35rem 0.5rem;
  text-align: left;
}

.block-markdown-reading .project-md :where(th) {
  background: color-mix(in srgb, var(--color-bg-elevated) 88%, transparent);
}

.block-markdown-reading .project-md :where(pre) {
  margin: 0.75em 0;
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--color-border) 85%, #000);
  background: color-mix(in srgb, var(--color-reading-bg, var(--color-bg-surface)) 92%, #1a1a1a);
  overflow: auto;
  line-height: 1.5;
}

.block-markdown-reading .project-md :where(code) {
  font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, 'Courier New', monospace;
  font-size: 0.92em;
  padding: 0.12em 0.35em;
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--color-bg-elevated) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
}

.block-markdown-reading .project-md :where(pre code) {
  font-size: 0.9em;
  background: transparent;
  padding: 0;
  border: none;
}

[data-theme='dark'] .block-markdown-reading .project-md :where(pre) {
  background: #1a2220;
  border-color: color-mix(in srgb, var(--color-border) 90%, #000);
}
</style>
