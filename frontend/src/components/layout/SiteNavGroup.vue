<script setup lang="ts">
import type { Component } from 'vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

export type SiteNavDropdownItem = {
  to: string
  label: string
  desc: string
  kicker: string
}

const props = defineProps<{
  label: string
  icon: Component
  items: SiteNavDropdownItem[]
  menuId: string
  /** 侧栏：点击展开，无 hover */
  drawer?: boolean
}>()

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()
const isHover = ref(false)
/** 侧栏默认全开；顶栏分组仍默认收起 */
const isOpen = ref(Boolean(props.drawer))
let leaveTimer = 0

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}

const groupActive = computed(() => props.items.some((item) => isActive(item.to)))
const expanded = computed(() =>
  props.drawer ? isOpen.value : isHover.value || isOpen.value,
)

function onEnter() {
  if (props.drawer) return
  window.clearTimeout(leaveTimer)
  isHover.value = true
}

function onLeave() {
  if (props.drawer) return
  window.clearTimeout(leaveTimer)
  leaveTimer = window.setTimeout(() => {
    isHover.value = false
  }, 80)
}

function onFocusOut(event: FocusEvent) {
  if (props.drawer) return
  const group = event.currentTarget as HTMLElement | null
  const next = event.relatedTarget
  if (group && next instanceof Node && group.contains(next)) return
  onLeave()
}

function onTriggerClick() {
  isOpen.value = !isOpen.value
}

function onItemClick() {
  if (!props.drawer) isOpen.value = false
  emit('navigate')
}

watch(
  () => props.drawer,
  (drawer) => {
    if (drawer) isOpen.value = true
  },
)

watch(
  () => route.path,
  () => {
    if (props.drawer) {
      isOpen.value = true
      return
    }
    isOpen.value = false
    isHover.value = false
  },
)
</script>

<template>
  <div
    class="nav-group"
    :class="{ 'is-expanded': expanded, 'nav-group--drawer': drawer }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focusin="onEnter"
    @focusout="onFocusOut"
  >
    <button
      type="button"
      class="group-trigger"
      :class="{ active: groupActive, 'is-expanded': expanded }"
      :aria-expanded="expanded ? 'true' : 'false'"
      :aria-controls="menuId"
      @click="onTriggerClick"
    >
      <span class="link-icon" aria-hidden="true">
        <component :is="icon" />
      </span>
      <span class="link-label">{{ label }}</span>
      <span class="affordance-plus" aria-hidden="true">+</span>
      <span class="grow-line" aria-hidden="true" />
    </button>

    <Transition name="nav-group-dropdown">
      <div v-if="expanded" :id="menuId" class="dropdown" role="menu">
        <div class="dropdown-sheet">
          <RouterLink
            v-for="(item, index) in items"
            :key="item.to"
            :to="item.to"
            class="dropdown-item"
            :class="{ active: isActive(item.to) }"
            :style="{ '--nav-item-i': index }"
            role="menuitem"
            @click="onItemClick"
          >
            <span class="drop-dot" aria-hidden="true" />
            <span class="meta-title">{{ item.label }}</span>
            <span class="meta-desc">{{ item.desc }}</span>
          </RouterLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nav-group {
  position: relative;
}

.group-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.38rem;
  color: var(--color-text-muted);
  font: inherit;
  font-weight: 500;
  font-size: 0.8rem;
  line-height: 1.2;
  letter-spacing: 0.02em;
  white-space: nowrap;
  padding: 0.42rem 0.62rem;
  border-radius: 0;
  border: 1px solid transparent;
  background-color: transparent;
  box-shadow: none;
  cursor: pointer;
  transition: color 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.link-icon {
  display: inline-flex;
  flex-shrink: 0;
  line-height: 0;
  opacity: 0.55;
}

.group-trigger:hover .link-icon,
.group-trigger.active .link-icon,
.nav-group.is-expanded > .group-trigger .link-icon {
  opacity: 0.9;
}

.affordance-plus {
  display: inline-flex;
  width: 0.7rem;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  opacity: 0.45;
}

.group-trigger:hover {
  color: var(--color-text);
}

.group-trigger.active,
.nav-group.is-expanded > .group-trigger {
  color: var(--color-accent);
  background-color: transparent;
  border-color: transparent;
  box-shadow: none;
}

.grow-line {
  position: absolute;
  left: 0.28rem;
  right: 0.28rem;
  bottom: 0.12rem;
  height: 1px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: 50% 50%;
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.group-trigger:hover .grow-line,
.group-trigger.active .grow-line,
.nav-group.is-expanded > .group-trigger .grow-line {
  transform: scaleX(1);
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 60;
  min-width: 16.5rem;
  margin-top: 0.45rem;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  transform-origin: top left;
}

.dropdown::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -0.55rem;
  height: 0.55rem;
}

.dropdown-sheet {
  position: relative;
  padding: 0;
  background: var(--color-bg-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* 顶/底弧线 hairline：贴齐首末选项（间距 0），拉满两端并随卡片圆角走弧 */
.dropdown-sheet::before,
.dropdown-sheet::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
  height: 6px;
  pointer-events: none;
}

.dropdown-sheet::before {
  top: 0;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  box-shadow: inset 0 1px 0 var(--color-border);
}

.dropdown-sheet::after {
  bottom: 0;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  box-shadow: inset 0 -1px 0 var(--color-border);
}

.nav-group-dropdown-enter-active {
  transition:
    opacity 0.46s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-group-dropdown-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.34s ease;
}

.nav-group-dropdown-enter-from,
.nav-group-dropdown-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}

.nav-group-dropdown-enter-active .dropdown-item {
  animation: nav-dropdown-item-in 0.44s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--nav-item-i, 0) * 0.055s + 0.08s);
}

@keyframes nav-dropdown-item-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.dropdown-item {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.7rem;
  align-items: start;
  width: 100%;
  padding: 0.48rem 0.5rem;
  border-radius: var(--radius-sm);
  color: inherit;
  text-decoration: none;
  transition: background 0.2s ease;
}

.dropdown-item + .dropdown-item::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: var(--color-border);
  pointer-events: none;
}

/* 目录打孔：外实心环 + 内掏空（同心圆） */
.drop-dot {
  grid-row: 1 / span 2;
  align-self: center;
  box-sizing: border-box;
  width: 0.55rem;
  height: 0.55rem;
  border: 0;
  border-radius: 999px;
  background: var(--color-border);
  -webkit-mask: radial-gradient(circle, transparent 38%, #000 40%);
  mask: radial-gradient(circle, transparent 38%, #000 40%);
  transition: background-color 0.2s ease;
}

.meta-title {
  font-family: var(--font-serif);
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-text);
  transition: color 0.2s ease;
}

.meta-desc {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  line-height: 1.35;
}

.dropdown-item:hover {
  background: color-mix(in srgb, var(--color-bg-elevated) 52%, transparent);
  text-decoration: none;
}

.dropdown-item:hover .meta-title,
.dropdown-item.active .meta-title {
  color: var(--color-accent);
}

.dropdown-item:hover .drop-dot,
.dropdown-item.active .drop-dot {
  background-color: var(--color-accent);
}

@media (max-width: 768px) {
  .group-trigger {
    padding: 0.5rem 0.56rem;
    font-size: 0.85rem;
    gap: 0.32rem;
  }

  .nav-group {
    position: static;
  }

  .dropdown {
    left: 0.75rem;
    right: 0.75rem;
    width: auto;
    min-width: 0;
    transform: none;
    transform-origin: top center;
  }

  .nav-group-dropdown-enter-from,
  .nav-group-dropdown-leave-to {
    transform: translateY(10px) scale(0.97);
  }

  .nav-group-dropdown-enter-to,
  .nav-group-dropdown-leave-from {
    transform: translateY(0) scale(1);
  }
}

/* 侧栏手风琴：菜单落在触发器下方，不浮层 */
.nav-group--drawer {
  position: static;
  width: 100%;
}

.nav-group--drawer > .group-trigger {
  width: 100%;
  justify-content: flex-start;
  min-height: 44px;
  padding: 0.72rem 0.35rem;
  font-size: 0.95rem;
}

.nav-group--drawer .dropdown {
  position: static;
  left: auto;
  right: auto;
  top: auto;
  width: 100%;
  min-width: 0;
  transform: none;
  padding: 0 0 0.2rem 0.15rem;
}

.nav-group--drawer .dropdown-sheet {
  padding: 0.15rem 0 0.25rem;
  border-radius: 0;
  box-shadow: none;
  border: 0;
  background: transparent;
  overflow: visible;
}

.nav-group--drawer .dropdown-sheet::before,
.nav-group--drawer .dropdown-sheet::after {
  display: none;
}

.nav-group--drawer .dropdown-item {
  min-height: 44px;
  align-items: center;
  padding: 0.55rem 0.35rem;
}

.nav-group--drawer .nav-group-dropdown-enter-from,
.nav-group--drawer .nav-group-dropdown-leave-to {
  transform: none;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .group-trigger,
  .grow-line {
    transition: none;
  }

  .nav-group-dropdown-enter-active,
  .nav-group-dropdown-leave-active {
    transition: opacity 0.16s ease;
  }

  .nav-group-dropdown-enter-from,
  .nav-group-dropdown-leave-to {
    transform: none;
  }

  .nav-group-dropdown-enter-active .dropdown-item {
    animation: none;
  }
}
</style>
