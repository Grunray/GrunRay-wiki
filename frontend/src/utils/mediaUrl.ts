/** 规范化媒体 URL：去控制字符、反斜杠改斜杠，避免 CSS url() 与 fetch 404 */
export function sanitizeMediaUrl(raw: string): string {
  return raw
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\\/g, '/')
}
