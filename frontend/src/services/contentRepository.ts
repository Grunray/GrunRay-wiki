/**
 * 内容访问层：文章走 Flask API；项目仍读本地 JSON（后续可再接 API）。
 */
import { apiGet } from '@/api/http'
import projectsJson from '@/content/data/projects.json'
import type { Post, Project, ProjectNote, ProjectStatus } from '@/types/content'

const projects = projectsJson as Project[]

function byId<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((x) => x.id === id)
}

/** 规范：置顶优先 → pinned_order 升序（缺省视为大）→ published_at 降序 */
export function sortPosts<T extends Pick<Post, 'pinned' | 'pinned_order' | 'published_at'>>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    if (ap === 1) {
      const ao = a.pinned_order ?? 9999
      const bo = b.pinned_order ?? 9999
      if (ao !== bo) return ao - bo
    }
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  })
}

export function getProjectById(id: string): Project | undefined {
  return byId(projects, id)
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}

/** 公共列表：不含 hidden */
export function listProjectsPublic(options?: { includeArchived?: boolean }): Project[] {
  const includeArchived = options?.includeArchived ?? true
  return projects.filter((p) => {
    if (p.status === 'hidden') return false
    if (!includeArchived && p.status === 'archived') return false
    return true
  })
}

export function listFeaturedProjects(): Project[] {
  return listProjectsPublic({ includeArchived: false }).filter((p) => p.featured)
}

/** 详情是否可访问：hidden 不可 */
export function canAccessProjectPublic(project: Project): boolean {
  return project.status !== 'hidden'
}

function projectStatusForNote(projectId: string): ProjectStatus | undefined {
  return getProjectById(projectId)?.status
}

/** 博客聚合：算法与普通文章全部展示；项目笔记需所属项目非 hidden */
export async function listPostsForBlog(): Promise<Post[]> {
  const { posts } = await apiGet<{ posts: Post[] }>('/api/posts')
  const visible = posts.filter((post) => {
    if (post.type === 'algorithm' || post.type === 'article') return true
    const st = projectStatusForNote((post as ProjectNote).project_id)
    return st !== undefined && st !== 'hidden'
  })
  return sortPosts(visible)
}

export async function listAlgorithmPosts(): Promise<Post[]> {
  const { posts } = await apiGet<{ posts: Post[] }>('/api/posts?type=algorithm')
  return sortPosts(posts as Post[])
}

export async function listPostsForProjectSlug(projectSlug: string): Promise<Post[]> {
  const project = getProjectBySlug(projectSlug)
  if (!project || !canAccessProjectPublic(project)) return []
  const q = new URLSearchParams({
    type: 'project_note',
    project_id: project.id,
  })
  const { posts } = await apiGet<{ posts: Post[] }>(`/api/posts?${q.toString()}`)
  return sortPosts(posts as Post[])
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  try {
    return await apiGet<Post>(`/api/posts/${encodeURIComponent(slug)}`)
  } catch (e) {
    const status = (e as Error & { status?: number }).status
    if (status === 404) return undefined
    throw e
  }
}

/** 若笔记所属项目 hidden，则视为不可公开访问 */
export function canAccessPostPublic(post: Post): boolean {
  if (post.type === 'algorithm' || post.type === 'article') return true
  const st = projectStatusForNote((post as ProjectNote).project_id)
  return st !== undefined && st !== 'hidden'
}

export function getRawProjects(): Project[] {
  return projects
}

export async function getRawPosts(): Promise<Post[]> {
  const { posts } = await apiGet<{ posts: Post[] }>('/api/posts')
  return posts
}
