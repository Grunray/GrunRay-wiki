import { nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'

/** 读单个 query；数组取第一项。 */
export function queryParam(query: LocationQuery, key: string): string {
  const raw = query[key]
  const v = Array.isArray(raw) ? raw[0] : raw
  return (v ?? '').trim()
}

export function compactQuery(parts: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(parts)) {
    const s = v?.trim()
    if (s) out[k] = s
  }
  return out
}

function sameQuery(next: Record<string, string>, query: LocationQuery, keys: string[]): boolean {
  for (const key of keys) {
    if (queryParam(query, key) !== (next[key] ?? '')) return false
  }
  return true
}

/**
 * 列表筛选 ↔ URL query 双向同步。
 * 空值不写入；push 进历史（分类/标签），replace 适合检索去抖。
 */
export function useListQuerySync(
  keys: string[],
  build: () => Record<string, string | undefined>,
) {
  const route = useRoute()
  const router = useRouter()
  let applyingFromRoute = false

  async function write(mode: 'push' | 'replace') {
    if (applyingFromRoute) return
    const next = compactQuery(build())
    if (sameQuery(next, route.query, keys)) return
    const rest: LocationQuery = { ...route.query }
    for (const k of keys) delete rest[k]
    await router[mode]({ query: { ...rest, ...next } })
  }

  function applyFromRoute(apply: (query: LocationQuery) => void) {
    applyingFromRoute = true
    try {
      apply(route.query)
    } finally {
      void nextTick(() => {
        applyingFromRoute = false
      })
    }
  }

  return { write, applyFromRoute }
}

export function debounceFn(fn: () => void, ms: number): (() => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  const cancel = () => {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
  }
  const wrapped = () => {
    cancel()
    timer = window.setTimeout(() => {
      timer = null
      fn()
    }, ms)
  }
  wrapped.cancel = cancel
  onBeforeUnmount(cancel)
  return wrapped
}
