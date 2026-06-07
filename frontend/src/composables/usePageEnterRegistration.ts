import { onMounted, onUnmounted, type Ref, watch } from 'vue'

import {
  registerPageEnterRoot,
  unregisterPageEnterRoot,
} from '@/composables/gsap/pageEnterOrchestrator'

/** 向调度器登记页面入场根节点（实际播放在 router / 幕帘 revealed 后） */
export function usePageEnterRegistration(rootRef: Ref<HTMLElement | null | undefined>) {
  function bindRoot(el: HTMLElement | null | undefined) {
    if (!el) return
    el.dataset.pageEnterRoot = ''
    registerPageEnterRoot(el)
  }

  watch(
    rootRef,
    (el, prev) => {
      if (prev) unregisterPageEnterRoot(prev)
      bindRoot(el ?? null)
    },
    { flush: 'post', immediate: true },
  )

  onMounted(() => {
    bindRoot(rootRef.value ?? null)
  })

  onUnmounted(() => {
    unregisterPageEnterRoot(rootRef.value ?? null)
  })
}
