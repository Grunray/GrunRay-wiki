/** 栖息名录行：月日。 */
export function formatEditorialListDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (locale === 'zh' || locale.startsWith('zh')) {
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** 撰写时间控件：转成本地 `YYYY-MM-DDTHH:mm:ss`。 */
export function toDatetimeLocalValue(iso: string): string {
  const raw = iso.trim()
  if (!raw) return ''
  const d = new Date(raw.includes('T') || raw.includes(' ') ? raw.replace(' ', 'T') : raw)
  if (Number.isNaN(d.getTime())) return raw.replace(' ', 'T').slice(0, 19)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 栖息详情 meta：年月日时分。 */
export function formatEditorialDateTime(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const loc = locale === 'zh' || locale.startsWith('zh') ? 'zh-CN' : 'en-US'
  return d.toLocaleString(loc, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
