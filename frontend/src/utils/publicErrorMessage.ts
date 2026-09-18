/**
 * 公网页错误文案：不把堆栈 / 过长技术串直接甩给访客。
 * 站长 compose / 后台可用 ownerFacingMessage，仍截断异常长文本。
 */

const STACK_HINT = /\n\s+at\s|Traceback \(most recent call last\)/i

export function visitorFacingLoadError(err: unknown, fallback: string): string {
  void err
  return fallback
}

export function ownerFacingMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const m = err.message.trim()
    if (!m || m.length > 240 || STACK_HINT.test(m)) return fallback
    return m
  }
  if (typeof err === 'string') {
    const m = err.trim()
    if (!m || m.length > 240 || STACK_HINT.test(m)) return fallback
    return m
  }
  return fallback
}
