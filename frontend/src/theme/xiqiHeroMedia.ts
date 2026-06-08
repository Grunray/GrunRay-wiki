/**
 * 栖息三页 hero 背景图：放在 frontend/public/xiqi/。
 * public 静态资源 build 时原样复制到 dist 根，URL 稳定（英文名、无中文百分号编码），
 * dev / build / preview 完全一致 —— 避免此前从项目外 designed/xiqi_img 用中文名打包，
 * preview 静态服务器解析编码中文 asset URL 失败导致 hero 图 404 的问题。
 */
export type XiqiPageRouteName = 'fragments' | 'about' | 'recommend'

export const XIQI_HERO_IMAGES: Record<XiqiPageRouteName, string> = {
  fragments: '/xiqi/fragments.jpg',
  about: '/xiqi/about.jpg',
  recommend: '/xiqi/recommend.jpg',
}

export function resolveXiqiHeroImage(routeName: string | undefined): string | undefined {
  if (!routeName || !(routeName in XIQI_HERO_IMAGES)) return undefined
  return XIQI_HERO_IMAGES[routeName as XiqiPageRouteName]
}
