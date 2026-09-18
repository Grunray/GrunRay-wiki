export interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

export function slugifyHeading(text: string, index: number): string {
  const s = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return s || `section-${index + 1}`
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base
  let n = 2
  while (used.has(id)) id = `${base}-${n++}`
  used.add(id)
  return id
}

function stampHeading(el: Element, index: number, used: Set<string>): TocItem | null {
  if (el.closest('pre, code')) return null
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return null
  const level: 2 | 3 = el.tagName === 'H3' ? 3 : 2
  const base = (el as HTMLElement).id.trim() || slugifyHeading(text, index)
  const id = uniqueId(base, used)
  el.id = id
  return { id, text, level }
}

/**
 * 从正文 HTML 抽出 h2/h3，补唯一 id；无标题则 items 为空。
 */
export function injectHeadingIds(html: string): { html: string; items: TocItem[] } {
  const source = html.trim()
  if (!source) return { html, items: [] }
  const doc = new DOMParser().parseFromString(`<div id="toc-root">${source}</div>`, 'text/html')
  const root = doc.getElementById('toc-root')
  if (!root) return { html, items: [] }

  const used = new Set<string>()
  const items: TocItem[] = []
  ;[...root.querySelectorAll('h2, h3')].forEach((el, index) => {
    const item = stampHeading(el, index, used)
    if (item) items.push(item)
  })

  return { html: root.innerHTML, items }
}

/** 项目 layout 渲染后：给已挂载的 h2/h3 补 id，并生成 TOC。 */
export function stampHeadingIds(root: ParentNode): TocItem[] {
  const used = new Set<string>()
  const items: TocItem[] = []
  ;[...root.querySelectorAll('h2, h3')].forEach((el, index) => {
    const item = stampHeading(el, index, used)
    if (item) items.push(item)
  })
  return items
}
