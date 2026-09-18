import type { Post } from '@/types/content'

export function pickPostNeighbors(
  posts: Post[],
  slug: string,
): { newer: Post | null; older: Post | null } {
  const index = posts.findIndex((p) => p.slug === slug)
  if (index < 0) return { newer: null, older: null }

  const current = posts[index]
  const globalNewer = index > 0 ? posts[index - 1] : null
  const globalOlder = index < posts.length - 1 ? posts[index + 1] : null
  const tags = new Set(current.tags)
  if (!tags.size) return { newer: globalNewer, older: globalOlder }

  const tagged = posts.filter((p) => p.tags.some((tag) => tags.has(tag)))
  const taggedIndex = tagged.findIndex((p) => p.slug === slug)
  if (taggedIndex < 0) return { newer: globalNewer, older: globalOlder }

  return {
    newer: tagged[taggedIndex - 1] ?? globalNewer,
    older: tagged[taggedIndex + 1] ?? globalOlder,
  }
}
