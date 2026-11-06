/** Spring Security Cookie CSRF。写请求把 XSRF-TOKEN 抄到请求头。 */
export function csrfHeaders(method?: string): Record<string, string> {
  const verb = (method || 'GET').toUpperCase()
  if (verb === 'GET' || verb === 'HEAD' || verb === 'OPTIONS') return {}
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)
  if (!match?.[1]) return {}
  return { 'X-XSRF-TOKEN': decodeURIComponent(match[1]) }
}
