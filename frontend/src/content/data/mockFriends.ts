export type FriendLink = {
  id: string
  name: string
  url: string
  description: string
  /** 可选；未填时由站点 URL 解析 favicon */
  avatar?: string
  /** 卡片背景；未填时与 avatar 相同 */
  cover?: string
  tags?: string[]
}

export type SpecialLink = {
  id: string
  title: string
  description: string
  url: string
  /** 可选；未填时从 url 解析 favicon */
  avatar?: string
  /** 内置圆角矩形图标，优先于 avatar */
  icon?: 'travellings' | 'acg-trip'
}

export const MOCK_FRIEND_LINKS: FriendLink[] = [
  {
    id: 'friend-apos',
    name: 'Apos Blog',
    url: 'https://apos-dt.github.io/AposBlog/index.html#/',
    description: 'Building at the Edge of Manufacturing.',
    avatar: 'https://apos-dt.github.io/AposBlog/avatar.jpg',
    tags: ['blog'],
  },
]

export const MOCK_SPECIAL_LINKS: SpecialLink[] = [
  {
    id: 'acg-trip',
    title: '异次元之旅',
    description: '我们一起去萌站成员的星球旅行吧！',
    url: 'https://travel.moe/go.html?travel=on',
    icon: 'acg-trip',
  },
  {
    id: 'travellings',
    title: '开往',
    description: '随机前往开往的成员博客',
    url: 'https://www.travellings.cn/go.html',
    icon: 'travellings',
  },
]
