<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import EdKicker from '@/components/editorial/EdKicker.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { playPageEnter } from '@/composables/usePageEnterAnimation'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { SITE_NAME } from '@/config/site'
import {
  fetchRecommendAdminDetail,
  publishRecommendImport,
  saveRecommendImportFile,
  uploadXiqiMedia,
  type FragmentImageRef,
  type SaveRecommendImportPayload,
} from '@/services/fragmentsAdminApi'
import { fetchMessageAuthUser } from '@/services/messageAuth'
import type { RecommendCategory } from '@/services/recommendApi'
import { toDatetimeLocalValue } from '@/utils/editorialDate'
import { buildMarkdownPreview } from '@/utils/markdownPreview'
import { ownerFacingMessage } from '@/utils/publicErrorMessage'
import '@/styles/page-enter-legal.css'
import '@/styles/page-compose.css'

type ComposeStatus = 'published' | 'hidden' | 'draft'
type SaveMode = 'file' | 'db'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const pageRoot = ref<HTMLElement | null>(null)
const publicId = ref('')
const title = ref('')
const category = ref<RecommendCategory>('software')
const status = ref<ComposeStatus>('draft')
const url = ref('')
const createdAt = ref('')
const bodyMarkdown = ref('')
const images = ref<FragmentImageRef[]>([])
const coverIndex = ref(0)
const editorRef = ref<HTMLTextAreaElement | null>(null)
const dragOver = ref(false)
const submitting = ref(false)
const lastMode = ref<SaveMode | null>(null)
const submitMessage = ref('')
const submitError = ref('')
const importCommand = ref('')

const editId = computed(() => {
  const raw = route.query.id
  return typeof raw === 'string' ? raw : ''
})

const pageTitle = computed(() =>
  editId.value || publicId.value ? t('recommend.compose.editTitle') : t('recommend.compose.title'),
)

useSeoMeta(() => ({
  title: `${pageTitle.value} | ${SITE_NAME}`,
  description: t('recommend.compose.seoDescription'),
  path: route.path,
  type: 'website',
  robots: 'noindex, nofollow',
}))

const previewCover = computed(() => images.value[coverIndex.value] ?? null)

const markdownPreview = computed(() => buildMarkdownPreview(bodyMarkdown.value))

const previewCardHtml = computed(() => markdownPreview.value.summaryHtml)

const markdownIssues = computed(() =>
  markdownPreview.value.issues.map((issue) => ({
    ...issue,
    label: issue.line
      ? t(`fragments.compose.${issue.messageKey}`, { line: issue.line })
      : t(`fragments.compose.${issue.messageKey}`),
  })),
)

const hasMarkdownErrors = computed(() => markdownPreview.value.hasErrors)

const categorySelectOptions = computed(() => [
  { value: 'software', label: t('recommend.categorySoftware') },
  { value: 'opensource', label: t('recommend.categoryOpensource') },
  { value: 'anime', label: t('recommend.categoryAnime') },
])

const statusSelectOptions = computed(() => [
  { value: 'draft', label: t('fragments.compose.statusDraft') },
  { value: 'published', label: t('fragments.compose.statusPublished') },
  { value: 'hidden', label: t('fragments.compose.statusHidden') },
])

function categoryLabel(c: RecommendCategory): string {
  const map: Record<RecommendCategory, string> = {
    software: t('recommend.categorySoftware'),
    opensource: t('recommend.categoryOpensource'),
    anime: t('recommend.categoryAnime'),
  }
  return map[c]
}

function insertAtCaret(text: string) {
  const el = editorRef.value
  if (!el) {
    bodyMarkdown.value += text
    return
  }
  const start = el.selectionStart ?? bodyMarkdown.value.length
  const end = el.selectionEnd ?? start
  bodyMarkdown.value = bodyMarkdown.value.slice(0, start) + text + bodyMarkdown.value.slice(end)
  const pos = start + text.length
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(pos, pos)
  })
}

async function uploadAndInsert(file: File) {
  const uploaded = await uploadXiqiMedia('recommendations', file)
  images.value.push(uploaded)
  if (images.value.length === 1) coverIndex.value = 0
  const alt = uploaded.alt || title.value || t('recommend.compose.imageDefaultAlt')
  insertAtCaret(`\n![${alt}](${uploaded.url})\n`)
}

async function onEditorDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  try {
    await uploadAndInsert(file)
  } catch (e) {
    submitError.value = ownerFacingMessage(e, t('common.status.ownerActionFailed'))
  }
}

async function onFilePick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    await uploadAndInsert(file)
  } catch (e) {
    submitError.value = ownerFacingMessage(e, t('common.status.ownerActionFailed'))
  }
}

function removeImage(index: number) {
  images.value.splice(index, 1)
  if (coverIndex.value >= images.value.length) {
    coverIndex.value = Math.max(0, images.value.length - 1)
  }
}

function buildPayload(): SaveRecommendImportPayload {
  return {
    publicId: publicId.value || undefined,
    title: title.value.trim(),
    category: category.value,
    status: status.value,
    url: url.value.trim() || undefined,
    createdAt: createdAt.value || undefined,
    images: images.value,
    coverIndex: coverIndex.value,
    bodyMarkdown: bodyMarkdown.value,
    rating: 5,
  }
}

async function submitRecommend(mode: SaveMode) {
  if (submitting.value) return
  submitError.value = ''
  submitMessage.value = ''
  importCommand.value = ''
  if (!title.value.trim()) {
    submitError.value = t('recommend.compose.titleRequired')
    return
  }
  if (!bodyMarkdown.value.trim()) {
    submitError.value = t('fragments.compose.bodyRequired')
    return
  }
  if (hasMarkdownErrors.value) {
    submitError.value = t('fragments.compose.markdownFixRequired')
    return
  }
  lastMode.value = mode
  submitting.value = true
  try {
    const result =
      mode === 'db' ? await publishRecommendImport(buildPayload()) : await saveRecommendImportFile(buildPayload())
    publicId.value = result.publicId
    submitMessage.value =
      mode === 'db' ? t('fragments.compose.publishSuccess') : t('fragments.compose.submitSuccess')
    importCommand.value = mode === 'file' ? result.importCommand : ''
  } catch (e) {
    submitError.value = ownerFacingMessage(e, t('common.status.ownerActionFailed'))
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const user = await fetchMessageAuthUser()
    if (!user?.isSiteOwner) {
      router.replace({ name: 'recommend' })
      return
    }
  } catch {
    router.replace({ name: 'recommend' })
    return
  }
  if (!editId.value) await playPageEnter(pageRoot.value)
})

watch(
  editId,
  async (id) => {
    if (!id) return
    submitError.value = ''
    try {
      const item = await fetchRecommendAdminDetail(id)
      publicId.value = item.id
      title.value = item.title
      category.value = item.category
      status.value = item.status
      url.value = item.url || ''
      createdAt.value = toDatetimeLocalValue(item.createdAt || '')
      bodyMarkdown.value = item.body || ''
      images.value = (item.images ?? []).map((img) => ({ url: img.url, alt: img.alt || '' }))
      coverIndex.value = item.coverIndex ?? 0
    } catch (e) {
      submitError.value = ownerFacingMessage(e, t('common.status.ownerActionFailed'))
    } finally {
      await playPageEnter(pageRoot.value)
    }
  },
  { immediate: true },
)
</script>

<template>
  <article ref="pageRoot" class="compose-ed-page">
    <p class="compose-ed-back">
      <RouterLink v-if="editId" to="/recommend/edit">← {{ t('recommend.edit.title') }}</RouterLink>
      <RouterLink v-else to="/recommend">← {{ t('recommend.title') }}</RouterLink>
    </p>
    <h1 class="h">{{ pageTitle }}</h1>

    <div class="ed-filter">
      <EdKicker :en="t('fragments.compose.kickerWriteEn')" :zh="t('fragments.compose.kickerWriteZh')" />
      <p class="compose-ed-hint">{{ t('recommend.compose.subtitle') }}</p>
    </div>

    <div class="compose-ed-grid">
      <div>
        <label class="ed-search">
          {{ t('recommend.compose.fieldTitle') }}
          <input
            v-model="title"
            type="text"
            maxlength="120"
            :placeholder="t('recommend.compose.titlePlaceholder')"
            :aria-label="t('recommend.compose.fieldTitle')"
          />
        </label>

        <div class="compose-ed-meta">
          <div class="compose-ed-field">
            <span class="compose-ed-label">{{ t('recommend.compose.category') }}</span>
            <AppSelect
              v-model="category"
              variant="editorial"
              :options="categorySelectOptions"
              :aria-label="t('recommend.compose.category')"
              min-width="0"
            />
          </div>
          <div class="compose-ed-field">
            <span class="compose-ed-label">{{ t('fragments.compose.status') }}</span>
            <AppSelect
              v-model="status"
              variant="editorial"
              :options="statusSelectOptions"
              :aria-label="t('fragments.compose.status')"
              min-width="0"
            />
          </div>
          <label class="ed-search">
            {{ t('recommend.compose.fieldUrl') }}
            <input
              v-model="url"
              type="url"
              maxlength="512"
              :placeholder="t('recommend.compose.urlPlaceholder')"
              :aria-label="t('recommend.compose.fieldUrl')"
            />
          </label>
        </div>

        <div class="compose-ed-editor" :class="{ 'is-dragover': dragOver }">
          <div class="compose-ed-editor-head">
            <EdKicker :en="t('fragments.compose.kickerBodyEn')" :zh="t('fragments.compose.kickerBodyZh')" />
            <label class="ed-action compose-ed-upload">
              {{ t('fragments.compose.uploadImage') }}
              <input type="file" accept="image/*" hidden @change="onFilePick" />
            </label>
          </div>
          <label class="ed-search">
            {{ t('fragments.compose.body') }}
            <textarea
              ref="editorRef"
              v-model="bodyMarkdown"
              rows="14"
              :placeholder="t('recommend.compose.bodyPlaceholder')"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop="onEditorDrop"
            />
          </label>
          <p class="compose-ed-hint">{{ t('fragments.compose.dropHint') }}</p>
        </div>

        <template v-if="images.length">
          <EdKicker
            class="compose-ed-kicker-gap"
            :en="t('fragments.compose.kickerMediaEn')"
            :zh="t('fragments.compose.kickerMediaZh')"
          />
          <ul class="compose-ed-attach">
            <li v-for="(img, index) in images" :key="img.url" class="compose-ed-attach-item">
              <label class="compose-ed-cover">
                <input v-model="coverIndex" type="radio" :value="index" />
                <img :src="img.url" :alt="img.alt" loading="lazy" />
              </label>
              <label class="ed-search">
                {{ t('fragments.compose.altPlaceholder') }}
                <input v-model="img.alt" type="text" :placeholder="t('fragments.compose.altPlaceholder')" />
              </label>
              <button type="button" class="ed-action ghost" @click="removeImage(index)">
                {{ t('fragments.compose.removeImage') }}
              </button>
            </li>
          </ul>
        </template>

        <div class="compose-ed-foot">
          <button
            type="button"
            class="ed-action"
            :disabled="submitting || hasMarkdownErrors"
            @click="submitRecommend('file')"
          >
            {{
              submitting && lastMode === 'file'
                ? t('fragments.compose.submitting')
                : t('fragments.compose.submit')
            }}
          </button>
          <button
            type="button"
            class="ed-action"
            :disabled="submitting || hasMarkdownErrors"
            @click="submitRecommend('db')"
          >
            {{
              submitting && lastMode === 'db'
                ? t('fragments.compose.publishing')
                : t('fragments.compose.publish')
            }}
          </button>
          <RouterLink class="ed-action" to="/recommend">{{ t('fragments.compose.viewList') }}</RouterLink>
          <p v-if="submitMessage" class="compose-ed-ok" role="status">{{ submitMessage }}</p>
          <p v-if="submitError" class="compose-ed-err" role="alert">{{ submitError }}</p>
        </div>
        <p v-if="importCommand" class="compose-ed-cli">
          <code>{{ importCommand }}</code>
        </p>
      </div>

      <aside class="compose-ed-preview">
        <EdKicker :en="t('fragments.compose.kickerPreviewEn')" :zh="t('fragments.compose.kickerPreviewZh')" />
        <ul v-if="markdownIssues.length" class="compose-ed-issues" aria-live="polite">
          <li
            v-for="(issue, index) in markdownIssues"
            :key="`${issue.messageKey}-${issue.line ?? index}`"
            :class="{ 'is-error': issue.severity === 'error' }"
          >
            {{ issue.label }}
          </li>
        </ul>
        <p class="compose-ed-label">{{ t('recommend.compose.previewRowLabel') }}</p>
        <div class="compose-ed-preview-card">
          <p class="compose-ed-preview-meta">
            <span class="tone">{{ categoryLabel(category) }}</span>
          </p>
          <p class="compose-ed-preview-title">{{ title || t('recommend.compose.previewEmptyTitle') }}</p>
          <img
            v-if="previewCover"
            class="compose-ed-thumb"
            :src="previewCover.url"
            :alt="previewCover.alt || title"
            loading="lazy"
          />
          <div
            v-if="previewCardHtml"
            class="compose-ed-preview-body markdown-reading"
            v-html="previewCardHtml"
          />
          <p v-else class="compose-ed-empty">{{ t('fragments.compose.previewEmpty') }}</p>
        </div>
      </aside>
    </div>
  </article>
</template>
