/**
 * GrunRay Wiki 大作业答辩 PPT — 配色对齐 frontend 浅色主题 tokens.light.css
 * 运行: node build-presentation.mjs
 */
import pptxgen from 'pptxgenjs'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'GrunRay_Wiki-大作业答辩.pptx')

const C = {
  bg: 'D6E4E7',
  surface: 'E2F2E8',
  elevated: 'D4EADC',
  reading: 'F1F0E8',
  text: '334F52',
  muted: '4D6B6E',
  border: 'A8C9B4',
  accent: 'A0CCAB',
  accentMuted: 'B8DCC4',
  onAccent: '2F4238',
  dark: '334F52',
  darkDeep: '2F4238',
  white: 'FFFFFF',
}

const FONT_TITLE = 'Georgia'
const FONT_BODY = 'Calibri'

function makeShadow() {
  return { type: 'outer', color: '334F52', blur: 4, offset: 2, angle: 135, opacity: 0.12 }
}

function lightBg(slide) {
  slide.background = { color: C.bg }
}

function darkBg(slide) {
  slide.background = { color: C.dark }
}

function addTopAccentBar(slide, pres) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.12,
    fill: { color: C.accent },
    line: { type: 'none' },
  })
}

function slideTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.55,
    y: 0.38,
    w: 8.9,
    h: 0.85,
    fontSize: 32,
    fontFace: FONT_TITLE,
    color: C.text,
    bold: true,
    margin: 0,
  })
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.55,
      y: 1.15,
      w: 8.5,
      h: 0.45,
      fontSize: 14,
      fontFace: FONT_BODY,
      color: C.muted,
      margin: 0,
    })
  }
}

function card(slide, pres, x, y, w, h) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x,
    y,
    w,
    h,
    fill: { color: C.surface },
    line: { color: C.border, width: 1 },
    shadow: makeShadow(),
  })
  slide.addShape(pres.shapes.RECTANGLE, {
    x,
    y,
    w: 0.07,
    h,
    fill: { color: C.accent },
    line: { type: 'none' },
  })
}

function bullets(slide, items, x, y, w, h, fontSize = 15) {
  const runs = items.map((t, i) => ({
    text: t,
    options: { bullet: true, breakLine: i < items.length - 1 },
  }))
  slide.addText(runs, {
    x,
    y,
    w,
    h,
    fontSize,
    fontFace: FONT_BODY,
    color: C.text,
    valign: 'top',
    paraSpaceAfter: 6,
  })
}

function statBlock(slide, pres, x, y, num, label) {
  card(slide, pres, x, y, 2.05, 1.35)
  slide.addText(num, {
    x: x + 0.2,
    y: y + 0.22,
    w: 1.7,
    h: 0.65,
    fontSize: 36,
    fontFace: FONT_TITLE,
    color: C.onAccent,
    bold: true,
    align: 'center',
    margin: 0,
  })
  slide.addText(label, {
    x: x + 0.12,
    y: y + 0.88,
    w: 1.85,
    h: 0.4,
    fontSize: 11,
    fontFace: FONT_BODY,
    color: C.muted,
    align: 'center',
    margin: 0,
  })
}

const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9'
pres.author = 'GrunRay Wiki 小组'
pres.title = 'GrunRay Wiki — Web 前端大作业答辩'
pres.subject = 'Web 前端课程大作业'

// —— 1 封面（深色，与浅色内容页 sandwich）——
{
  const slide = pres.addSlide()
  darkBg(slide)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: 4.85,
    w: 10,
    h: 0.78,
    fill: { color: C.accent, transparency: 15 },
    line: { type: 'none' },
  })
  slide.addText('GrunRay Wiki', {
    x: 0.6,
    y: 1.35,
    w: 8.8,
    h: 1.0,
    fontSize: 44,
    fontFace: FONT_TITLE,
    color: C.white,
    bold: true,
    margin: 0,
  })
  slide.addText('Web 前端课程 · 大作业答辩汇报', {
    x: 0.62,
    y: 2.35,
    w: 8.5,
    h: 0.55,
    fontSize: 22,
    fontFace: FONT_BODY,
    color: C.accentMuted,
    margin: 0,
  })
  slide.addText('个人 Wiki / 作品集站点  |  Vue 3 单页应用  |  三人小组', {
    x: 0.62,
    y: 3.05,
    w: 8.5,
    h: 0.4,
    fontSize: 14,
    fontFace: FONT_BODY,
    color: 'B8DCC4',
    margin: 0,
  })
  slide.addText('成员：成员甲（主责）· 成员乙 · 成员丙\n日期：2026 年 5 月', {
    x: 0.62,
    y: 4.95,
    w: 5.5,
    h: 0.55,
    fontSize: 12,
    fontFace: FONT_BODY,
    color: C.accentMuted,
    margin: 0,
  })
}

// —— 2 目录 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '汇报提纲', 'Outline')
  const items = [
    '项目概述与需求分析',
    '功能模块与页面设计',
    '技术方案与核心亮点',
    '业务模块与小组分工',
    '实现展示 · 总结与 Q&A',
  ]
  bullets(slide, items, 0.75, 1.75, 8.5, 3.2, 17)
  slide.addShape(pres.shapes.OVAL, {
    x: 7.85,
    y: 2.0,
    w: 1.65,
    h: 1.65,
    fill: { color: C.elevated },
    line: { color: C.accent, width: 2 },
  })
  slide.addText('12\n模块', {
    x: 7.85,
    y: 2.35,
    w: 1.65,
    h: 0.9,
    fontSize: 22,
    fontFace: FONT_TITLE,
    color: C.text,
    align: 'center',
    bold: true,
    margin: 0,
  })
}

// —— 3 项目概述 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '一、项目概述', 'GrunRay Wiki — 个人 Wiki / 作品集')
  card(slide, pres, 0.55, 1.65, 4.35, 3.55)
  bullets(
    slide,
    [
      '背景：课程要求可交互、有数据处理的前端应用；本组以真实站点为载体',
      '目的：聚合项目与博客，支持留言/友链互动，实践 Vue 3 工程化',
      '用户：普通访客浏览与投稿；站长 OAuth 后审核留言与友链',
      '场景：个人品牌、算法笔记、竞赛项目归档、长期作品集运营',
    ],
    0.75,
    1.85,
    3.95,
    3.2,
    14,
  )
  card(slide, pres, 5.15, 1.65, 4.3, 1.55)
  slide.addText('三人组规模', {
    x: 5.35,
    y: 1.82,
    w: 3.9,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: C.text,
    fontFace: FONT_BODY,
    margin: 0,
  })
  bullets(
    slide,
    ['功能模块 ≥ 9（本项 12）', '路由页面 ≥ 9（本项 14+）', '前端为主，API 作数据服务'],
    5.35,
    2.2,
    3.85,
    0.95,
    13,
  )
  statBlock(slide, pres, 5.15, 3.35, '14+', '路由视图')
  statBlock(slide, pres, 7.35, 3.35, '12', '功能模块')
}

// —— 4 需求分析 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '二、需求分析', '功能需求 · 非功能需求 · 用户角色')
  const cols = [
    {
      t: '要解决的问题',
      b: ['信息分散 → 一站聚合', '作品展示 → 可嵌入 Demo', '互动与防垃圾 → 验证码+审核', '课程要求 → 非纯静态交互'],
    },
    {
      t: '核心功能',
      b: ['首页胶片流 / 项目时间轴 / 博客筛选', '留言发表与站长审核 / 友链申请', '栖息分栏 / 404 主题彩蛋', '主题·语言·音乐偏好持久化'],
    },
    {
      t: '非功能',
      b: ['界面统一、骨架屏、Toast 反馈', '响应式断点、reduced-motion', '组件分层、layout 块可扩展', 'iframe sandbox、Markdown 消毒'],
    },
  ]
  cols.forEach((col, i) => {
    const x = 0.55 + i * 3.15
    card(slide, pres, x, 1.62, 2.95, 3.6)
    slide.addText(col.t, {
      x: x + 0.18,
      y: 1.78,
      w: 2.6,
      h: 0.4,
      fontSize: 15,
      bold: true,
      color: C.onAccent,
      fontFace: FONT_BODY,
      margin: 0,
    })
    bullets(slide, col.b, x + 0.15, 2.22, 2.65, 2.85, 12)
  })
}

// —— 5 功能模块 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '三、功能模块设计', '全站壳层 + 多业务子模块')
  const rows = [
    ['M01', '壳层导航', 'M07', '留言板'],
    ['M02', '首页', 'M08', '友链'],
    ['M03', '项目库', 'M09', '音乐播放器'],
    ['M04', '项目 Demo', 'M10', '碎语/推荐/关于'],
    ['M05', '项目笔记', 'M11', '动效与偏好'],
    ['M06', '博客算法', 'M12', '404 互动主题'],
  ]
  const tableData = [
    [
      { text: '编号', options: { fill: { color: C.accent }, color: C.onAccent, bold: true } },
      { text: '模块', options: { fill: { color: C.accent }, color: C.onAccent, bold: true } },
      { text: '编号', options: { fill: { color: C.accent }, color: C.onAccent, bold: true } },
      { text: '模块', options: { fill: { color: C.accent }, color: C.onAccent, bold: true } },
    ],
    ...rows.map((r) => r.map((cell) => ({ text: cell }))),
  ]
  slide.addTable(tableData, {
    x: 0.55,
    y: 1.62,
    w: 8.9,
    colW: [0.75, 3.7, 0.75, 3.7],
    fontSize: 13,
    fontFace: FONT_BODY,
    color: C.text,
    border: { pt: 0.75, color: C.border },
    fill: { color: C.surface },
    autoPage: false,
  })
}

// —— 6 页面设计 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '四、页面设计', 'Vue Router 主要路由（节选）')
  bullets(
    slide,
    [
      '/  首页（胶片 Feed）    /projects  项目时间轴    /projects/:slug  详情+Demo',
      '/blog  博客筛选列表    /blog/:slug  文章详情    /messages  留言板',
      '/friends  友链墙    /friends/apply  友链申请',
      '/fragments  碎语（栖息分栏）    /about · /recommend  扩展页',
      '任意无效路径 → 404 互动页（故障动画 · 解锁抽象主题）',
    ],
    0.55,
    1.62,
    5.2,
    3.5,
    14,
  )
  card(slide, pres, 5.95, 1.62, 3.5, 3.5)
  slide.addText('答辩截图建议', {
    x: 6.12,
    y: 1.78,
    w: 3.2,
    h: 0.35,
    fontSize: 15,
    bold: true,
    color: C.text,
    fontFace: FONT_BODY,
    margin: 0,
  })
  bullets(
    slide,
    [
      '首页 / 项目 Demo / 博客筛选',
      '留言 / 友链申请',
      '主题切换 + 音乐播放器',
      '404 故障态 + 抽象主题',
      '（界面截图，非代码）',
    ],
    6.05,
    2.15,
    3.25,
    2.8,
    12,
  )
}

// —— 7 交互流程 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '五、交互流程设计', '典型用户路径')
  const steps = [
    { n: '1', t: '进入首页', d: '浏览介绍与胶片媒体' },
    { n: '2', t: '列表筛选', d: '项目/博客 标签·关键词' },
    { n: '3', t: '查看详情', d: 'Markdown 或 Demo iframe' },
    { n: '4', t: '互动投稿', d: '留言 / 友链申请 + 验证码' },
    { n: '5', t: '站长审核', d: '待审核 Tab 批准/回复' },
    { n: '6', t: '404 彩蛋', d: '解锁第三套抽象主题' },
  ]
  steps.forEach((s, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 0.55 + col * 3.15
    const y = 1.65 + row * 1.85
    card(slide, pres, x, y, 2.95, 1.55)
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.15,
      y: y + 0.2,
      w: 0.45,
      h: 0.45,
      fill: { color: C.accent },
      line: { type: 'none' },
    })
    slide.addText(s.n, {
      x: x + 0.15,
      y: y + 0.2,
      w: 0.45,
      h: 0.45,
      fontSize: 14,
      bold: true,
      color: C.onAccent,
      align: 'center',
      valign: 'middle',
      margin: 0,
    })
    slide.addText(s.t, {
      x: x + 0.72,
      y: y + 0.22,
      w: 2.1,
      h: 0.35,
      fontSize: 14,
      bold: true,
      color: C.text,
      fontFace: FONT_BODY,
      margin: 0,
    })
    slide.addText(s.d, {
      x: x + 0.72,
      y: y + 0.58,
      w: 2.05,
      h: 0.75,
      fontSize: 11,
      color: C.muted,
      fontFace: FONT_BODY,
      margin: 0,
    })
  })
}

// —— 8 技术方案 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '七、技术方案设计', '前端技术栈与分工说明')
  const tech = [
    ['HTML5', '语义标签 header/nav/article/section'],
    ['CSS3', 'Flex/Grid · 变量主题 · 入场动画 · 404 故障动画'],
    ['JavaScript', '组合式 API · 表单校验 · 异步请求'],
    ['Vue 3', '组件化 · 条件/列表渲染 · script setup'],
    ['Vue Router', '14+ 子路由 · AppShell 布局 meta'],
    ['Pinia', '主题/音乐/轨迹等全局 UI'],
    ['Storage', 'localStorage 偏好 · session 列表缓存'],
    ['其它', 'vue-i18n · marked+DOMPurify · GSAP 光标'],
  ]
  tech.forEach((row, i) => {
    const y = 1.62 + i * 0.42
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.55,
      y,
      w: 1.55,
      h: 0.34,
      fill: { color: C.elevated },
      line: { color: C.border, width: 0.5 },
    })
    slide.addText(row[0], {
      x: 0.55,
      y,
      w: 1.55,
      h: 0.34,
      fontSize: 11,
      bold: true,
      color: C.onAccent,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_BODY,
      margin: 0,
    })
    slide.addText(row[1], {
      x: 2.2,
      y,
      w: 7.2,
      h: 0.34,
      fontSize: 12,
      color: C.text,
      fontFace: FONT_BODY,
      valign: 'middle',
      margin: 0,
    })
  })
  card(slide, pres, 0.55, 5.05, 8.9, 0.42)
  slide.addText('未使用 jQuery / Element Plus；未使用 ECharts（统计可视化为后续改进项）', {
    x: 0.72,
    y: 5.12,
    w: 8.5,
    h: 0.3,
    fontSize: 11,
    italic: true,
    color: C.muted,
    fontFace: FONT_BODY,
    margin: 0,
  })
}

// —— 9 核心亮点 Demo ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '核心亮点 · 项目 Demo 容器', '数据驱动 layout + 沙箱 iframe「站中站」')
  card(slide, pres, 0.55, 1.62, 5.0, 3.55)
  bullets(
    slide,
    [
      'project-blocks/registry.ts 注册 overview/demo/gallery 等块',
      'ProjectDetailView 按 layout 数组顺序渲染',
      'DemoBlock：demoUrl 或 srcdoc + sandbox iframe',
      'demos/*/demo.config.json + build-demo-assets.mjs 构建子工程',
      'npm run build:demos 产出静态资源供详情页引用',
    ],
    0.75,
    1.8,
    4.6,
    3.2,
    14,
  )
  card(slide, pres, 5.75, 1.62, 3.7, 3.55)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 6.0,
    y: 2.0,
    w: 3.2,
    h: 2.2,
    fill: { color: C.reading },
    line: { color: C.border, width: 1 },
  })
  slide.addText('iframe Demo', {
    x: 6.0,
    y: 2.85,
    w: 3.2,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: C.muted,
    align: 'center',
    fontFace: FONT_BODY,
    margin: 0,
  })
  slide.addText('答辩演示：/projects/grunray-wiki', {
    x: 6.05,
    y: 4.55,
    w: 3.1,
    h: 0.35,
    fontSize: 10,
    color: C.muted,
    align: 'center',
    fontFace: FONT_BODY,
    margin: 0,
  })
}

// —— 10 核心亮点 动效 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '核心亮点 · 壳层动效与体验', '成员甲主责')
  bullets(
    slide,
    [
      'AppShell：顶栏 FLIP 工具动画、滚动 compact 导航、页脚揭示',
      'page-enter-*.css + usePageEnterAnimation（双 rAF）',
      'FilmFeed 胶片滚动 · FloatingMusicPlayer 拖拽持久化',
      'XiqiSplitLayout 栖息分栏：列表+详情滑入，防关闭塌陷',
      'CursorTrail（GSAP）· 日/夜/抽象三套主题 token',
    ],
    0.55,
    1.62,
    5.0,
    3.5,
    14,
  )
  card(slide, pres, 5.75, 1.62, 3.7, 1.65)
  slide.addText('404 互动页', {
    x: 5.95,
    y: 1.78,
    w: 3.3,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: C.text,
    fontFace: FONT_BODY,
    margin: 0,
  })
  bullets(
    slide,
    ['corruptText 故障文案', 'page-corrupt 全站视觉', '解锁/应用抽象主题', '重播故障 · 返回首页'],
    5.9,
    2.15,
    3.4,
    1.0,
    12,
  )
  card(slide, pres, 5.75, 3.45, 3.7, 1.72)
  slide.addText('数据处理（前端）', {
    x: 5.95,
    y: 3.6,
    w: 3.3,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: C.text,
    fontFace: FONT_BODY,
    margin: 0,
  })
  bullets(
    slide,
    ['增：留言、友链申请', '查/筛/排：博客、项目、留言', '改/审：站长回复与审核'],
    5.9,
    3.95,
    3.4,
    1.05,
    12,
  )
}

// —— 11 留言模块 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '业务模块 · 留言板', '成员乙  |  /messages')
  card(slide, pres, 0.55, 1.62, 4.35, 3.55)
  bullets(
    slide,
    [
      '发表：正文校验、500 字限制、算术验证码',
      '列表：公开 feed + 最新/最早排序',
      '站长：GitHub/Google OAuth 登录',
      '待审核 Tab：批准 / 拒绝',
      '站长回复、Toast 与 loading 反馈',
    ],
    0.75,
    1.8,
    3.95,
    3.2,
    14,
  )
  card(slide, pres, 5.15, 1.62, 4.3, 3.55)
  slide.addText('截图占位', {
    x: 5.5,
    y: 2.6,
    w: 3.6,
    h: 0.5,
    fontSize: 20,
    color: C.muted,
    align: 'center',
    fontFace: FONT_BODY,
    margin: 0,
  })
  slide.addText('插入：发表区 + 待审核 Tab 界面截图', {
    x: 5.35,
    y: 3.2,
    w: 3.9,
    h: 0.4,
    fontSize: 11,
    color: C.muted,
    align: 'center',
    italic: true,
    fontFace: FONT_BODY,
    margin: 0,
  })
}

// —— 12 友链模块 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '业务模块 · 友链', '成员丙  |  /friends · /friends/apply')
  card(slide, pres, 0.55, 1.62, 4.35, 3.55)
  bullets(
    slide,
    [
      '友链列表：普通链与特殊样式头像',
      '申请页：站名/URL/描述/邮箱/头像',
      'URL 与邮箱格式校验、favicon 预览',
      '验证码提交、成功/错误反馈',
      '配合实验报告统稿与答辩视频',
    ],
    0.75,
    1.8,
    3.95,
    3.2,
    14,
  )
  card(slide, pres, 5.15, 1.62, 4.3, 3.55)
  slide.addText('截图占位', {
    x: 5.5,
    y: 2.6,
    w: 3.6,
    h: 0.5,
    fontSize: 20,
    color: C.muted,
    align: 'center',
    fontFace: FONT_BODY,
    margin: 0,
  })
  slide.addText('插入：友链墙 + 申请表单预览截图', {
    x: 5.35,
    y: 3.2,
    w: 3.9,
    h: 0.4,
    fontSize: 11,
    color: C.muted,
    align: 'center',
    italic: true,
    fontFace: FONT_BODY,
    margin: 0,
  })
}

// —— 13 分工 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '小组分工', '详见 division_of_labor.md')
  const team = [
    ['成员甲  ~58%', '壳层·动效·Demo 容器·首页/项目/博客框架·404·栖息分栏'],
    ['成员乙  ~22%', '留言板全流程与 API 联调'],
    ['成员丙  ~20%', '友链模块·内容联调·报告统稿·答辩视频'],
  ]
  team.forEach((row, i) => {
    const y = 1.65 + i * 1.15
    card(slide, pres, 0.55, y, 8.9, 0.95)
    slide.addText(row[0], {
      x: 0.75,
      y: y + 0.12,
      w: 1.6,
      h: 0.7,
      fontSize: 15,
      bold: true,
      color: C.onAccent,
      fontFace: FONT_BODY,
      valign: 'middle',
      margin: 0,
    })
    slide.addText(row[1], {
      x: 2.35,
      y: y + 0.12,
      w: 6.85,
      h: 0.7,
      fontSize: 13,
      color: C.text,
      fontFace: FONT_BODY,
      valign: 'middle',
      margin: 0,
    })
  })
}

// —— 14 总结 ——
{
  const slide = pres.addSlide()
  lightBg(slide)
  addTopAccentBar(slide, pres)
  slideTitle(slide, '九、总结与不足', '完成情况 · 改进方向')
  card(slide, pres, 0.55, 1.62, 4.35, 3.55)
  slide.addText('已完成', {
    x: 0.75,
    y: 1.78,
    w: 3.5,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: C.text,
    fontFace: FONT_BODY,
    margin: 0,
  })
  bullets(
    slide,
    [
      '三人组规模与功能/页面数量达标',
      'Vue3 + Router + Pinia 技术栈完整',
      '表单·筛选·审核等数据处理闭环',
      '自定义 UI，浅色主题统一',
    ],
    0.75,
    2.15,
    3.9,
    2.2,
    14,
  )
  card(slide, pres, 5.15, 1.62, 4.3, 3.55)
  slide.addText('不足与后续', {
    x: 5.35,
    y: 1.78,
    w: 3.5,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: C.text,
    fontFace: FONT_BODY,
    margin: 0,
  })
  bullets(
    slide,
    [
      '统计图表（ECharts）可加强',
      '依赖本地 API，需附运行说明',
      '访客不可编辑自己的留言',
      '持续作为个人 Wiki 迭代',
    ],
    5.35,
    2.15,
    3.9,
    2.2,
    14,
  )
}

// —— 15 致谢 ——
{
  const slide = pres.addSlide()
  darkBg(slide)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.12,
    fill: { color: C.accent },
    line: { type: 'none' },
  })
  slide.addText('谢谢聆听', {
    x: 0.6,
    y: 1.85,
    w: 8.8,
    h: 1.0,
    fontSize: 40,
    fontFace: FONT_TITLE,
    color: C.white,
    bold: true,
    align: 'center',
    margin: 0,
  })
  slide.addText('Q & A', {
    x: 0.6,
    y: 2.85,
    w: 8.8,
    h: 0.6,
    fontSize: 28,
    fontFace: FONT_BODY,
    color: C.accentMuted,
    align: 'center',
    margin: 0,
  })
  slide.addText('GrunRay Wiki  |  Web 前端大作业  |  三人小组', {
    x: 0.6,
    y: 4.35,
    w: 8.8,
    h: 0.4,
    fontSize: 13,
    fontFace: FONT_BODY,
    color: 'B8DCC4',
    align: 'center',
    margin: 0,
  })
}

await pres.writeFile({ fileName: OUT })
console.log('Wrote:', OUT)
