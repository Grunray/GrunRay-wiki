/**
 * 关于页履历类型与静态 fallback（API `GET /api/xiqi/about` 不可用时使用）。
 * 权威数据源：`backend/import/xiqi/about/resume.md` → import → content + DB。
 *
 * 隐私：学校全称、排名、公司全称、实习/社团细节等 Raw 只存在于 import / 数据库。
 * 公开 API 与本文件 **不要**带 schoolRaw / rankRaw / companyRaw / summaryRaw / nameRaw。
 * 页面只渲染公开文案 +「已隐藏」占位。CSS blur 挡不住查看源代码。
 */

export type AboutAwardTier = 'gold' | 'silver' | 'bronze'

export interface AboutAward {
  id: string
  label: string
  /** 金牌=国一 · 银牌=国二 · 铜牌=国三（邀请赛铜牌按铜牌样式） */
  tier: AboutAwardTier
}

export interface AboutEducationPublic {
  schoolPublic: string
  degree: string
  major: string
  period: string
}

export interface AboutInternshipPublic {
  companyPublic: string
  role: string
  period: string
}

export interface AboutClubPublic {
  namePublic: string
  role: string
  period: string
}

export interface AboutProfile {
  alias: string
  genderAge: string
  email: string
  intro: string
  awards: AboutAward[]
  education: AboutEducationPublic
  internship: AboutInternshipPublic
  club: AboutClubPublic
  certificates: string[]
}

const AWARD_TIERS = new Set<AboutAwardTier>(['gold', 'silver', 'bronze'])

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** 丢掉 API 可能误带的 Raw，只保留公开字段。 */
export function toPublicAboutProfile(raw: unknown): AboutProfile | null {
  const data = asRecord(raw)
  if (!data) return null
  const education = asRecord(data.education)
  const internship = asRecord(data.internship)
  const club = asRecord(data.club)
  if (!education || !internship || !club) return null

  const awardsRaw = Array.isArray(data.awards) ? data.awards : []
  const awards: AboutAward[] = []
  for (const item of awardsRaw) {
    const award = asRecord(item)
    if (!award) continue
    const tier = str(award.tier).toLowerCase()
    if (!AWARD_TIERS.has(tier as AboutAwardTier)) continue
    const id = str(award.id)
    const label = str(award.label)
    if (!id || !label) continue
    awards.push({ id, label, tier: tier as AboutAwardTier })
  }

  return {
    alias: str(data.alias),
    genderAge: str(data.genderAge),
    email: str(data.email),
    intro: str(data.intro),
    awards,
    education: {
      schoolPublic: str(education.schoolPublic),
      degree: str(education.degree),
      major: str(education.major),
      period: str(education.period),
    },
    internship: {
      companyPublic: str(internship.companyPublic),
      role: str(internship.role),
      period: str(internship.period),
    },
    club: {
      namePublic: str(club.namePublic),
      role: str(club.role),
      period: str(club.period),
    },
    certificates: Array.isArray(data.certificates)
      ? data.certificates.map((c) => str(c).trim()).filter(Boolean)
      : [],
  }
}

export const ABOUT_PROFILE: AboutProfile = {
  alias: 'GrunRay',
  genderAge: '男 · 21 岁',
  email: 'meachealed@gmail.com',
  intro:
    '软件工程本科在读，做全栈开发与测试，习惯用 Cursor 等 AI 工具辅助编程。算法与数据结构基础扎实。',
  awards: [
    { id: 'icpc', label: 'ICPC 西安邀请赛 · 铜牌', tier: 'bronze' },
    { id: 'ccpc', label: 'CCPC 郑州邀请赛 · 铜牌', tier: 'bronze' },
    { id: 'ra', label: '睿抗 · 国二', tier: 'silver' },
  ],
  education: {
    schoolPublic: '某大学',
    degree: '本科',
    major: '软件工程',
    period: '2023 — 2027',
  },
  internship: {
    companyPublic: '某有限公司',
    role: '全栈工程师',
    period: '2025.07 — 2025.09',
  },
  club: {
    namePublic: '某大学 ACM 协会',
    role: '会员',
    period: '2023.10 — 至今',
  },
  certificates: ['大学英语四级'],
}
