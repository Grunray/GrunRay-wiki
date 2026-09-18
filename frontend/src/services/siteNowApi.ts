interface ApiEnvelope<T> {
  code: number
  data: T
  message?: string
}

export interface SiteNowStatus {
  doing: string | null
  reading: string | null
  updatedAt: string | null
}

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base.replace(/\/$/, '')}${p}` : p
}

async function siteNowFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = (await res.json()) as ApiEnvelope<T>
  if (!res.ok || body.code !== 0) {
    throw new Error(body.message || `API ${res.status}`)
  }
  return body.data
}

export async function fetchSiteNow(): Promise<SiteNowStatus> {
  return siteNowFetch<SiteNowStatus>('/api/site/now')
}

export async function saveSiteNow(payload: {
  doing: string
  reading: string
}): Promise<SiteNowStatus> {
  return siteNowFetch<SiteNowStatus>('/api/site/now', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
