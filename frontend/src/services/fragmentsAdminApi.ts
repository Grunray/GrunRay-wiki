import type { FragmentMood } from '@/content/data/mockFragments'
import type { RecommendCategory } from '@/services/recommendApi'

export interface FragmentImageRef {
  url: string
  alt: string
}

export interface SaveFragmentImportPayload {
  publicId?: string
  mood: FragmentMood
  status: 'published' | 'hidden' | 'draft'
  createdAt?: string
  images: FragmentImageRef[]
  coverIndex: number
  bodyMarkdown: string
}

export interface SaveFragmentImportResult {
  publicId: string
  path: string
  importCommand: string
  imported?: boolean
}

export interface SaveRecommendImportPayload {
  publicId?: string
  title: string
  category: RecommendCategory
  status: 'published' | 'hidden' | 'draft'
  url?: string
  createdAt?: string
  images: FragmentImageRef[]
  coverIndex: number
  bodyMarkdown: string
  rating?: number
  summary?: string
}

export interface SaveRecommendImportResult {
  publicId: string
  path: string
  importCommand: string
  imported?: boolean
}

export interface SaveXiqiPageImportPayload {
  page: 'fragments' | 'about' | 'recommend'
  heroImageUrl?: string | null
  heroImageAlt?: string
  status?: 'published' | 'hidden'
}

export interface SaveXiqiPageImportResult {
  page: string
  path: string
  importCommand: string
}

interface ApiEnvelope<T> {
  code: number
  data: T
  message?: string
}

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base.replace(/\/$/, '')}${p}` : p
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<{ data: T; message: string }> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body instanceof FormData ? {} : init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const body = (await res.json()) as ApiEnvelope<T>
  if (!res.ok || body.code !== 0) {
    const err = new Error(body.message || `API ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return { data: body.data, message: body.message || '' }
}

export async function uploadXiqiMedia(
  scope: 'fragments' | 'recommendations' | `pages/${'fragments' | 'about' | 'recommend'}`,
  file: File,
  alt = '',
): Promise<FragmentImageRef> {
  const form = new FormData()
  form.append('file', file)
  if (alt) form.append('alt', alt)
  const { data } = await adminFetch<FragmentImageRef>(
    `/api/xiqi/media?scope=${encodeURIComponent(scope)}`,
    { method: 'POST', body: form },
  )
  return data
}

export async function saveFragmentImportFile(
  payload: SaveFragmentImportPayload,
): Promise<SaveFragmentImportResult> {
  const { data } = await adminFetch<SaveFragmentImportResult>('/api/fragments/import-file', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data
}

export async function publishFragmentImport(
  payload: SaveFragmentImportPayload,
): Promise<SaveFragmentImportResult> {
  const { data } = await adminFetch<SaveFragmentImportResult>('/api/fragments/import-db', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data
}

export async function saveRecommendImportFile(
  payload: SaveRecommendImportPayload,
): Promise<SaveRecommendImportResult> {
  const { data } = await adminFetch<SaveRecommendImportResult>('/api/recommendations/import-file', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data
}

export async function publishRecommendImport(
  payload: SaveRecommendImportPayload,
): Promise<SaveRecommendImportResult> {
  const { data } = await adminFetch<SaveRecommendImportResult>('/api/recommendations/import-db', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data
}

export async function saveXiqiPageImportFile(
  payload: SaveXiqiPageImportPayload,
): Promise<SaveXiqiPageImportResult> {
  const { data } = await adminFetch<SaveXiqiPageImportResult>('/api/xiqi/pages/import-file', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data
}

export type XiqiAdminStatus = 'published' | 'hidden' | 'draft'

export interface FragmentAdminItem {
  id: string
  content: string
  mood: FragmentMood
  createdAt: string
  status: XiqiAdminStatus
  imageUrl?: string
  imageAlt?: string
}

export interface FragmentAdminDetail extends FragmentAdminItem {
  body?: string
  images?: FragmentImageRef[]
  coverIndex?: number
}

export interface RecommendAdminItem {
  id: string
  category: RecommendCategory
  title: string
  rating: number
  summary: string
  status: XiqiAdminStatus
  url?: string
  createdAt: string
  imageUrl?: string
  imageAlt?: string
}

export interface RecommendAdminDetail extends RecommendAdminItem {
  body?: string
  images?: FragmentImageRef[]
  coverIndex?: number
}

export interface XiqiAdminListResult<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export async function fetchFragmentAdminList(params?: {
  mood?: FragmentMood | 'all'
  status?: XiqiAdminStatus | 'all'
  sort?: 'newest' | 'oldest'
  page?: number
  size?: number
}): Promise<XiqiAdminListResult<FragmentAdminItem>> {
  const q = new URLSearchParams()
  if (params?.mood && params.mood !== 'all') q.set('mood', params.mood)
  if (params?.status && params.status !== 'all') q.set('status', params.status)
  if (params?.sort) q.set('sort', params.sort)
  if (params?.page) q.set('page', String(params.page))
  if (params?.size) q.set('size', String(params.size))
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const { data } = await adminFetch<XiqiAdminListResult<FragmentAdminItem>>(`/api/xiqi/admin/fragments${suffix}`)
  return data
}

export async function fetchFragmentAdminDetail(publicId: string): Promise<FragmentAdminDetail> {
  const { data } = await adminFetch<FragmentAdminDetail>(
    `/api/xiqi/admin/fragments/${encodeURIComponent(publicId)}`,
  )
  return data
}

export async function fetchRecommendAdminList(params?: {
  category?: RecommendCategory | 'all'
  status?: XiqiAdminStatus | 'all'
  sort?: 'newest' | 'oldest'
  page?: number
  size?: number
}): Promise<XiqiAdminListResult<RecommendAdminItem>> {
  const q = new URLSearchParams()
  if (params?.category && params.category !== 'all') q.set('category', params.category)
  if (params?.status && params.status !== 'all') q.set('status', params.status)
  if (params?.sort) q.set('sort', params.sort)
  if (params?.page) q.set('page', String(params.page))
  if (params?.size) q.set('size', String(params.size))
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const { data } = await adminFetch<XiqiAdminListResult<RecommendAdminItem>>(
    `/api/xiqi/admin/recommendations${suffix}`,
  )
  return data
}

export async function fetchRecommendAdminDetail(publicId: string): Promise<RecommendAdminDetail> {
  const { data } = await adminFetch<RecommendAdminDetail>(
    `/api/xiqi/admin/recommendations/${encodeURIComponent(publicId)}`,
  )
  return data
}
