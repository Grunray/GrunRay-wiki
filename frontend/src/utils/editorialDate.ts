/** 栖息名录行：月日。 */
export function formatEditorialListDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (locale === 'zh' || locale.startsWith('zh')) {
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
