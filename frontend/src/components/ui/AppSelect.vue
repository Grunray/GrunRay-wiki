<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export interface AppSelectOption<T extends string = string> {
  value: T
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: AppSelectOption[]
    ariaLabel?: string
    minWidth?: string
    /** editorial：列表刊头皮肤；默认药丸留给碎念撰写等 */
    variant?: 'default' | 'editorial'
  }>(),
  {
    minWidth: 'min(240px, 100%)',
    variant: 'default',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(
  () => props.options.find((item) => item.value === props.modelValue)?.label ?? props.modelValue,
)

function toggleMenu() {
  open.value = !open.value
}

function closeMenu() {
  open.value = false
}

function selectOption(value: string) {
  emit('update:modelValue', value)
  closeMenu()
}

function onDocumentPointerDown(event: MouseEvent) {
  const root = rootRef.value
  if (!root) return
  const target = event.target as Node | null
  if (target && !root.contains(target)) closeMenu()
}

onMounted(() => document.addEventListener('mousedown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentPointerDown))
</script>

<template>
  <div
    ref="rootRef"
    class="select-wrap"
    :class="{ 'select-wrap--open': open, 'select-wrap--editorial': variant === 'editorial' }"
    :style="{ minWidth: minWidth === '0' ? '0' : minWidth }"
  >
    <button
      class="select-btn"
      type="button"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-label="ariaLabel"
      @click="toggleMenu"
    >
      <span class="select-btn-label">{{ selectedLabel }}</span>
      <span v-if="variant === 'editorial'" class="select-btn-chevron" aria-hidden="true" />
      <span v-else class="select-btn-caret" aria-hidden="true">▾</span>
    </button>
    <div v-if="open" class="select-menu" :class="{ card: variant !== 'editorial' }" role="listbox">
      <button
        v-for="option in options"
        :key="option.value"
        class="select-option"
        type="button"
        role="option"
        :aria-selected="modelValue === option.value"
        :class="{ 'select-option--active': modelValue === option.value }"
        @click="selectOption(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.select-wrap {
  position: relative;
  display: inline-block;
  width: 100%;
}

.select-wrap--open {
  z-index: 40;
}

.select-btn {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  width: 100%;
  padding: 0.42rem 0.62rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-bg-surface) 88%, transparent);
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.2;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.select-btn:hover {
  border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
}

.select-btn:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--color-accent) 58%, var(--color-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent);
}

.select-btn-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-btn-caret {
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.select-menu {
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 0;
  z-index: 41;
  width: 100%;
  max-height: 260px;
  overflow: auto;
  padding: 0.35rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-bg-surface) 92%, transparent);
  box-shadow: var(--shadow-card);
}

.select-option {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.55rem;
  margin: 0;
  background: transparent;
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.select-option:hover {
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
}

.select-option--active {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  color: var(--color-accent);
}

.select-wrap--editorial {
  width: auto;
}

.select-wrap--editorial .select-btn {
  width: auto;
  gap: 0.45rem;
  padding: 0.08rem 0 0.2rem;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid transparent;
  background: transparent;
  font-family: var(--font-serif);
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.3;
  box-shadow: none;
}

.select-wrap--editorial .select-btn:hover,
.select-wrap--editorial .select-btn:focus,
.select-wrap--editorial.select-wrap--open .select-btn {
  border-color: transparent;
  border-bottom-color: var(--color-accent);
  color: var(--color-accent);
  box-shadow: none;
  outline: none;
}

.select-wrap--editorial .select-btn-chevron {
  display: inline-block;
  width: 0.38rem;
  height: 0.38rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: translateY(-0.12em) rotate(45deg);
  opacity: 0.55;
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.select-wrap--editorial.select-wrap--open .select-btn-chevron {
  transform: translateY(0.06em) rotate(225deg);
}

.select-wrap--editorial .select-menu {
  left: -0.15rem;
  width: auto;
  min-width: max(12.5rem, 100%);
  overflow: visible;
  padding: 0.28rem;
  background: var(--color-bg-surface);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.select-wrap--editorial .select-option {
  width: calc(100% - 6px);
  padding: 0.3rem 0.55rem;
  font-family: var(--font-serif);
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.35;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.select-wrap--editorial .select-option:hover,
.select-wrap--editorial .select-option:focus-visible {
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
  transform: translateX(6px);
}

@media (prefers-reduced-motion: reduce) {
  .select-wrap--editorial .select-option,
  .select-wrap--editorial .select-btn-chevron {
    transition: none;
  }

  .select-wrap--editorial .select-option:hover,
  .select-wrap--editorial .select-option:focus-visible {
    transform: none;
  }
}

@media (max-width: 768px) {
  .select-btn {
    min-height: 2.6rem;
  }

  .select-wrap--editorial .select-btn {
    min-height: 0;
  }

  .select-option {
    display: flex;
    align-items: center;
    min-height: 2.6rem;
  }

  .select-wrap--editorial .select-option {
    min-height: 0;
  }
}
</style>
