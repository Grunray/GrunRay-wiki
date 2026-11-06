/** 与 Vite 代理 `/api` 一致；生产或灰度可设 VITE_API_BASE_URL */
export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base.replace(/\/$/, '')}${p}` : p
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { credentials: 'same-origin' })
  if (!res.ok) {
    const err = new Error(`API ${res.status}`) as Error & { status: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}
