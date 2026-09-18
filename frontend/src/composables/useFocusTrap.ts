import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function listFocusable(root: HTMLElement | null | undefined): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.closest('[inert]')) return false
    if (el.getAttribute('aria-hidden') === 'true') return false
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    return el.getClientRects().length > 0
  })
}

export function trapTabKey(event: KeyboardEvent, root: HTMLElement | null | undefined) {
  if (event.key !== 'Tab' || !root) return
  const nodes = listFocusable(root)
  if (!nodes.length) {
    event.preventDefault()
    root.focus()
    return
  }
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  const current = document.activeElement
  if (event.shiftKey) {
    if (current === first || !root.contains(current)) {
      event.preventDefault()
      last.focus()
    }
    return
  }
  if (current === last || !root.contains(current)) {
    event.preventDefault()
    first.focus()
  }
}

type FocusTrapOptions = {
  /** 关闭时把焦点还给打开前的元素。默认 true */
  restore?: boolean
}

/**
 * 模态打开时把 Tab 困在 container 内；关闭后可选归还焦点。
 * container 可晚于 active（Teleport / v-if）。
 */
export function useFocusTrap(
  container: Ref<HTMLElement | null>,
  active: Ref<boolean>,
  options: FocusTrapOptions = {},
) {
  const restore = options.restore !== false
  let restoreEl: HTMLElement | null = null
  let listening = false

  function onKeydown(event: KeyboardEvent) {
    trapTabKey(event, container.value)
  }

  function attach() {
    if (listening) return
    document.addEventListener('keydown', onKeydown, true)
    listening = true
  }

  function detach() {
    if (!listening) return
    document.removeEventListener('keydown', onKeydown, true)
    listening = false
  }

  async function focusInitial() {
    await nextTick()
    const root = container.value
    if (!root || !active.value) return
    if (!root.hasAttribute('tabindex')) root.tabIndex = -1
    const first = listFocusable(root)[0]
    ;(first ?? root).focus()
  }

  watch(active, (on) => {
    if (on) {
      restoreEl = document.activeElement instanceof HTMLElement ? document.activeElement : null
      attach()
      void focusInitial()
      return
    }
    detach()
    if (restore && restoreEl?.isConnected) restoreEl.focus()
    restoreEl = null
  })

  watch(container, (el) => {
    if (el && active.value) {
      attach()
      void focusInitial()
    }
  })

  onBeforeUnmount(() => {
    detach()
  })
}
