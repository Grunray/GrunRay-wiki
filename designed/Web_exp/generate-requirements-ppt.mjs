/**
 * GrunRay Wiki — Web前端开发课程 需求汇报 PPT 生成脚本
 * 运行: node designed/Web_exp/generate-requirements-ppt.mjs
 */
import pptxgen from "pptxgenjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "GrunRay_Wiki-需求汇报.pptx");
const AFFINITY_ICON = join(__dirname, "assets", "affinity-icon.svg");

// Palette — GrunRay Wiki 浅色主题（tokens.light.css）
const C = {
  bgBase: "D6E4E7",
  bgSurface: "E2F2E8",
  bgElevated: "D4EADC",
  text: "334F52",
  muted: "4D6B6E",
  border: "A8C9B4",
  accent: "A0CCAB",
  accentMuted: "B8DCC4",
  onAccent: "2F4238",
  dark: "334F52",
  tealDeep: "6B9EA3",
  white: "FFFFFF",
};

const affinityIconData = (() => {
  const svg = readFileSync(AFFINITY_ICON, "utf8");
  return "image/svg+xml;base64," + Buffer.from(svg).toString("base64");
})();

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "GrunRay";
pres.title = "GrunRay Wiki 需求汇报";
pres.lang = "zh-CN";

const W = 10;
const H = 5.625;
const M = 0.55;

function makeShadow() {
  return { type: "outer", color: "000000", blur: 4, offset: 2, angle: 135, opacity: 0.12 };
}

function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: C.dark };
  return s;
}

function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: C.bgBase };
  return s;
}

function addSlideHeader(slide, title, accent = C.accent) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: W,
    h: 0.08,
    fill: { color: accent },
    line: { type: "none" },
  });
  slide.addText(title, {
    x: M,
    y: 0.35,
    w: W - M * 2,
    h: 0.65,
    fontSize: 28,
    fontFace: "Microsoft YaHei",
    bold: true,
    color: C.text,
    margin: 0,
  });
}

function addDarkTitle(slide, title, subtitle) {
  slide.addShape(pres.shapes.OVAL, {
    x: 7.2,
    y: -0.8,
    w: 3.5,
    h: 3.5,
    fill: { color: C.tealDeep, transparency: 75 },
    line: { type: "none" },
  });
  slide.addShape(pres.shapes.OVAL, {
    x: -0.6,
    y: 3.8,
    w: 2.8,
    h: 2.8,
    fill: { color: C.accent, transparency: 80 },
    line: { type: "none" },
  });
  slide.addText(title, {
    x: M,
    y: 1.6,
    w: 8.5,
    h: 1.2,
    fontSize: 40,
    fontFace: "Microsoft YaHei",
    bold: true,
    color: C.bgSurface,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: M,
      y: 2.85,
      w: 8,
      h: 0.6,
      fontSize: 18,
      fontFace: "Microsoft YaHei",
      color: C.accentMuted,
      margin: 0,
    });
  }
}

function addAffinityBadge(slide, x, y) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x,
    y,
    w: 1.55,
    h: 0.42,
    fill: { color: C.bgSurface },
    line: { color: C.border, width: 0.5 },
    rectRadius: 0.06,
  });
  slide.addImage({ data: affinityIconData, x: x + 0.06, y: y + 0.06, w: 0.3, h: 0.3 });
  slide.addText("Affinity", {
    x: x + 0.4,
    y: y + 0.1,
    w: 1.05,
    h: 0.28,
    fontSize: 10,
    fontFace: "Segoe UI",
    bold: true,
    color: C.text,
    margin: 0,
  });
}

function addCard(slide, x, y, w, h, title, lines, accent) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x,
    y,
    w,
    h,
    fill: { color: C.white },
    line: { color: C.border, width: 0.5 },
    shadow: makeShadow(),
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x,
    y,
    w: 0.07,
    h,
    fill: { color: accent },
    line: { type: "none" },
  });
  slide.addText(title, {
    x: x + 0.2,
    y: y + 0.15,
    w: w - 0.35,
    h: 0.4,
    fontSize: 14,
    fontFace: "Microsoft YaHei",
    bold: true,
    color: C.text,
    margin: 0,
  });
  const bullets = lines.map((t, i) => ({
    text: t,
    options: { bullet: true, breakLine: i < lines.length - 1, fontSize: 11, color: C.muted },
  }));
  slide.addText(bullets, {
    x: x + 0.15,
    y: y + 0.55,
    w: w - 0.3,
    h: h - 0.65,
    fontFace: "Microsoft YaHei",
    valign: "top",
  });
}

// ── Slide 1: Cover ──
{
  const s = darkSlide();
  addDarkTitle(s, "GrunRay Wiki", "Web 前端开发课程 · 项目需求汇报");
  s.addText("个人博客与作品集站点", {
    x: M,
    y: 3.55,
    w: 6,
    h: 0.45,
    fontSize: 16,
    fontFace: "Microsoft YaHei",
    color: C.accent,
    margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: M,
    y: 4.35,
    w: 4.2,
    h: 0.85,
    fill: { color: C.onAccent, transparency: 30 },
    line: { color: C.accent, width: 0.5 },
  });
  s.addText(
    [
      { text: "汇报人：", options: { bold: true, color: C.accentMuted } },
      { text: "________________", options: { color: C.bgSurface } },
      { text: "        学号：", options: { bold: true, color: C.accentMuted, breakLine: false } },
      { text: "________________", options: { color: C.bgSurface } },
    ],
    { x: M + 0.15, y: 4.48, w: 4, h: 0.6, fontSize: 14, fontFace: "Microsoft YaHei", margin: 0 }
  );
  s.addText("2026", {
    x: 8.2,
    y: 4.9,
    w: 1.2,
    h: 0.35,
    fontSize: 12,
    fontFace: "Microsoft YaHei",
    color: C.muted,
    align: "right",
    margin: 0,
  });
}

// ── Slide 2: 目录 ──
{
  const s = lightSlide();
  addSlideHeader(s, "目录");
  const items = [
    ["01", "项目背景与定位"],
    ["02", "博客需求分析"],
    ["03", "功能需求总览"],
    ["04", "创新亮点设计"],
    ["05", "通用前端需求"],
    ["06", "技术选型与总结"],
  ];
  items.forEach(([num, label], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = M + col * 4.5;
    const cy = 1.15 + row * 1.35;
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx,
      y: cy,
      w: 4.1,
      h: 1.05,
      fill: { color: C.white },
      line: { color: C.border, width: 0.5 },
      shadow: makeShadow(),
    });
    s.addText(num, {
      x: cx + 0.15,
      y: cy + 0.2,
      w: 0.7,
      h: 0.65,
      fontSize: 26,
      fontFace: "Arial Black",
      bold: true,
      color: C.accent,
      margin: 0,
    });
    s.addText(label, {
      x: cx + 0.85,
      y: cy + 0.32,
      w: 3,
      h: 0.45,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: C.text,
      margin: 0,
    });
  });
}

// ── Slide 3: 项目背景 ──
{
  const s = lightSlide();
  addSlideHeader(s, "01 · 项目背景与定位");
  s.addText(
    [
      {
        text: "GrunRay Wiki 是一门 Web 前端开发课程的大作业项目，目标是构建一个集",
        options: { breakLine: true },
      },
      {
        text: "个人博客、项目展示、社区互动、碎念随笔",
        options: { bold: true, color: C.accent, breakLine: true },
      },
      { text: "于一体的现代化个人站点。", options: { breakLine: true } },
      { text: " ", options: { breakLine: true, fontSize: 6 } },
      { text: "核心诉求", options: { bold: true, color: C.text, breakLine: true } },
      { text: "展示前端工程化能力与交互设计水平", options: { bullet: true, breakLine: true } },
      { text: "以 Markdown 为内容源，实现内容与 UI 解耦", options: { bullet: true, breakLine: true } },
      { text: "在常规博客功能之上，做出差异化体验", options: { bullet: true, breakLine: true } },
      { text: "覆盖课程要求的 CRUD、路由、状态管理与动效", options: { bullet: true } },
    ],
    { x: M, y: 1.1, w: 5.2, h: 3.8, fontSize: 14, fontFace: "Microsoft YaHei", color: C.muted, valign: "top" }
  );
  addCard(
    s,
    6.0,
    1.15,
    3.45,
    1.5,
    "四大板块",
    ["首页 · 个人介绍与胶片流", "创作 · 博客 + 项目展示", "社区 · 留言与友链", "栖息 · 碎念与推荐"],
    C.accent
  );
  addCard(
    s,
    6.0,
    2.85,
    3.45,
    1.5,
    "用户角色",
    ["访客：浏览、搜索、留言、申请友链", "站长：内容导入、审核互动、媒体管理"],
    C.accent
  );
}

// ── Slide 4: 需求分析 ──
{
  const s = lightSlide();
  addSlideHeader(s, "02 · 博客需求分析", C.tealDeep);
  s.addText("基于个人站点场景，对博客模块进行需求拆解：", {
    x: M,
    y: 1.05,
    w: 8,
    h: 0.4,
    fontSize: 13,
    fontFace: "Microsoft YaHei",
    color: C.muted,
    margin: 0,
  });
  const rows = [
    ["功能域", "需求描述", "优先级"],
    ["文章浏览", "算法笔记 / 项目笔记 / 通用文章分类展示", "P0"],
    ["文章详情", "Markdown 渲染、代码高亮、复制、相关推荐", "P0"],
    ["搜索", "中文关键词搜索（jieba 分词 + 打分）", "P0"],
    ["RSS 订阅", "服务端生成 rss.xml 供阅读器订阅", "P1"],
    ["SEO", "每路由 title / OG / JSON-LD 结构化数据", "P1"],
    ["内容管理", "Markdown 导入管线（非在线 CMS）", "P0"],
  ];
  s.addTable(rows, {
    x: M,
    y: 1.45,
    w: W - M * 2,
    h: 3.5,
    fontFace: "Microsoft YaHei",
    fontSize: 11,
    border: { pt: 0.5, color: C.border },
    colW: [1.4, 5.8, 0.9],
    rowH: 0.48,
    fill: { color: C.white },
    color: C.text,
  });
  // header row styling via first row
}

// ── Slide 5: 功能总览 ──
{
  const s = lightSlide();
  addSlideHeader(s, "03 · 功能需求总览");
  const modules = [
    ["博客系统", "列表 / 详情 / 搜索 / RSS", C.accent],
    ["项目展示", "卡片列表 / layout 块 / Demo 嵌入", C.tealDeep],
    ["栖息 Xiqi", "碎念分栏 / 关于 / 推荐页", C.accent],
    ["社区互动", "留言板 / 友链申请与审核", C.bgElevated],
    ["全局壳层", "导航 / 主题 / i18n / 音乐播放器", C.onAccent],
    ["内容管线", "Markdown 导入 / API 只读分发", C.tealDeep],
  ];
  modules.forEach(([title, desc, accent], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    addCard(s, M + col * 3.05, 1.05 + row * 2.05, 2.85, 1.85, title, [desc], accent);
  });
}

// ── Slide 6: 创新点概览 ──
{
  const s = darkSlide();
  addDarkTitle(s, "04 · 创新亮点", "在常规博客之上，打造差异化交互体验");
  const highlights = [
    ["SVG 开屏动画", "蜗牛路径行走 + iris 揭幕"],
    ["Footer 页脚", "滚动揭示 + slice 扭曲"],
    ["项目 Demo", "iframe 内嵌可交互演示"],
    ["胶片首页", "横向胶卷流 + 全屏预览"],
    ["黑胶播放器", "可拖拽 BGM + 摇杆音量"],
    ["栖息分栏", "FLIP 动画阅读器式交互"],
  ];
  highlights.forEach(([t, d], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = M + col * 3.05;
    const cy = 3.55 + row * 0.95;
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx,
      y: cy,
      w: 2.85,
      h: 0.78,
      fill: { color: C.tealDeep, transparency: 40 },
      line: { color: C.accent, width: 0.5 },
    });
    s.addText(t, {
      x: cx + 0.12,
      y: cy + 0.08,
      w: 2.6,
      h: 0.32,
      fontSize: 12,
      fontFace: "Microsoft YaHei",
      bold: true,
      color: C.accent,
      margin: 0,
    });
    s.addText(d, {
      x: cx + 0.12,
      y: cy + 0.38,
      w: 2.6,
      h: 0.32,
      fontSize: 10,
      fontFace: "Microsoft YaHei",
      color: C.accentMuted,
      margin: 0,
    });
  });
}

// ── Slide 7: 开屏动画 ──
{
  const s = lightSlide();
  addSlideHeader(s, "创新点 ① · SVG 开屏动画", C.accent);
  s.addShape(pres.shapes.RECTANGLE, {
    x: M,
    y: 1.1,
    w: 3.8,
    h: 3.9,
    fill: { color: C.dark },
    line: { type: "none" },
    shadow: makeShadow(),
  });
  // decorative SVG-like spiral hint
  s.addShape(pres.shapes.OVAL, {
    x: M + 0.9,
    y: 1.8,
    w: 2,
    h: 2,
    fill: { type: "none" },
    line: { color: C.accent, width: 2, dashType: "dash" },
  });
  s.addShape(pres.shapes.OVAL, {
    x: M + 1.2,
    y: 2.1,
    w: 1.4,
    h: 1.4,
    fill: { type: "none" },
    line: { color: C.accent, width: 1.5 },
  });
  s.addText("Splash\nWoniu", {
    x: M + 0.3,
    y: 3.55,
    w: 3.2,
    h: 0.65,
    fontSize: 14,
    fontFace: "Consolas",
    color: C.accent,
    align: "center",
    margin: 0,
  });
  addAffinityBadge(s, M + 0.2, 4.35);
  s.addText("SVG 素材 · Affinity 绘制", {
    x: M + 1.85,
    y: 4.42,
    w: 2.0,
    h: 0.35,
    fontSize: 9,
    fontFace: "Microsoft YaHei",
    color: C.accentMuted,
    margin: 0,
  });
  s.addText(
    [
      { text: "实现方案", options: { bold: true, color: C.text, breakLine: true, fontSize: 16 } },
      { text: " ", options: { breakLine: true, fontSize: 4 } },
      { text: "开屏 SVG 矢量图形使用 Affinity Designer 独立绘制", options: { bullet: true, breakLine: true } },
      { text: "独立 iframe 播放 SVG 路径动画（蜗牛行走）", options: { bullet: true, breakLine: true } },
      { text: "postMessage 与主页面交接，螺旋壳坐标映射头像", options: { bullet: true, breakLine: true } },
      { text: "iris 圆形揭幕动效，平滑过渡到首页内容", options: { bullet: true, breakLine: true } },
      { text: "sessionStorage 控制同会话仅播放一次", options: { bullet: true, breakLine: true } },
      { text: "prefers-reduced-motion 无障碍降级", options: { bullet: true, breakLine: true } },
      { text: " ", options: { breakLine: true, fontSize: 4 } },
      { text: "课程价值：矢量设计 + SVG 动画 + 跨 iframe 通信 + GSAP 编排", options: { italic: true, color: C.accent, fontSize: 12 } },
    ],
    { x: 4.65, y: 1.1, w: 4.85, h: 3.9, fontSize: 13, fontFace: "Microsoft YaHei", color: C.muted, valign: "top" }
  );
}

// ── Slide 8: Footer ──
{
  const s = lightSlide();
  addSlideHeader(s, "创新点 ② · Footer 页脚交互", C.accent);
  addCard(
    s,
    M,
    1.05,
    4.2,
    2.0,
    "滚动揭示（Reveal）",
    [
      "页面滚至底部时，品牌字逐片显现",
      "Glass 风格 meta bar（ICP / RSS）",
      "设计参考 Trae 官网（trae.ai）Footer",
      "与 Xiqi 分栏联动 footer lock",
    ],
    C.accent
  );
  addCard(
    s,
    M,
    3.2,
    4.2,
    1.85,
    "指针扭曲（Distort）",
    [
      "鼠标靠近页脚时 20 片 slice 局部拖影错位",
      "FLIP 布局 + CSS transform 实现",
      "交互参考 Trae 官网 Footer 拖影效果",
    ],
    C.tealDeep
  );
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.1,
    y: 1.05,
    w: 4.35,
    h: 4.0,
    fill: { color: C.white },
    line: { color: C.border, width: 0.5 },
    shadow: makeShadow(),
  });
  s.addText("GRUNRAY", {
    x: 5.3,
    y: 2.2,
    w: 4,
    h: 0.8,
    fontSize: 36,
    fontFace: "Arial Black",
    charSpacing: 8,
    color: C.dark,
    align: "center",
    margin: 0,
  });
  s.addText("FooterGrunRayPanel · useFooterGrunRayReveal", {
    x: 5.3,
    y: 3.2,
    w: 4,
    h: 0.4,
    fontSize: 10,
    fontFace: "Consolas",
    color: C.muted,
    align: "center",
    margin: 0,
  });
  s.addText("参考：Trae 官网 Footer · trae.ai", {
    x: 5.3,
    y: 4.15,
    w: 4,
    h: 0.35,
    fontSize: 9,
    fontFace: "Microsoft YaHei",
    color: C.accent,
    align: "center",
    margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.3,
    y: 4.5,
    w: 3.95,
    h: 0.35,
    fill: { color: C.bgBase },
    line: { type: "none" },
  });
  s.addText("ICP 备案 · RSS 订阅 · 外链导航", {
    x: 5.3,
    y: 4.52,
    w: 3.95,
    h: 0.3,
    fontSize: 9,
    fontFace: "Microsoft YaHei",
    color: C.muted,
    align: "center",
    margin: 0,
  });
}

// ── Slide 9: 项目 Demo ──
{
  const s = lightSlide();
  addSlideHeader(s, "创新点 ③ · 项目 Demo 嵌入", C.tealDeep);
  s.addText(
    [
      { text: "Layout 块驱动架构", options: { bold: true, color: C.text, breakLine: true, fontSize: 15 } },
      { text: "项目详情页由 YAML front matter 中的 layout 数组驱动", options: { bullet: true, breakLine: true } },
      { text: "registry.ts 注册块类型：overview / demo / gallery / changelog", options: { bullet: true, breakLine: true } },
      { text: "新增展示形式无需修改路由，内容与 UI 解耦", options: { bullet: true, breakLine: true } },
      { text: " ", options: { breakLine: true, fontSize: 4 } },
      { text: "DemoBlock 能力", options: { bold: true, color: C.text, breakLine: true, fontSize: 15 } },
      { text: "iframe 内嵌 demo_url 或 demo_embed_html", options: { bullet: true, breakLine: true } },
      { text: "sandbox 安全策略限制脚本权限", options: { bullet: true, breakLine: true } },
      { text: "示例：CRSEA Three.js 交互演示", options: { bullet: true, breakLine: true } },
      { text: "Demo 资源独立构建，通过 /api/media/files 分发", options: { bullet: true } },
    ],
    { x: M, y: 1.05, w: 4.8, h: 4.0, fontSize: 12, fontFace: "Microsoft YaHei", color: C.muted, valign: "top" }
  );
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.55,
    y: 1.05,
    w: 3.9,
    h: 2.5,
    fill: { color: C.dark },
    line: { color: C.accent, width: 1 },
    shadow: makeShadow(),
  });
  s.addText("Demo iframe", {
    x: 5.7,
    y: 1.15,
    w: 3.6,
    h: 0.35,
    fontSize: 10,
    fontFace: "Consolas",
    color: C.accent,
    margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.85,
    y: 1.65,
    w: 3.3,
    h: 1.65,
    fill: { color: C.tealDeep },
    line: { type: "none" },
  });
  s.addText("Three.js\nInteractive Demo", {
    x: 5.85,
    y: 2.0,
    w: 3.3,
    h: 1,
    fontSize: 14,
    fontFace: "Microsoft YaHei",
    color: C.accentMuted,
    align: "center",
    valign: "middle",
    margin: 0,
  });
  addCard(
    s,
    5.55,
    3.75,
    3.9,
    1.3,
    "课程体现",
    ["组件化设计", "安全沙箱", "静态资源工程化"],
    C.accent
  );
}

// ── Slide 10: 其他创新 ──
{
  const s = lightSlide();
  addSlideHeader(s, "其他创新补充");
  addCard(
    s,
    M,
    1.05,
    2.85,
    2.2,
    "首页胶片流 FilmFeed",
    ["模拟胶卷穿孔横向滚动", "滚轮调速 + 全屏预览", "媒体 API 动态加载"],
    C.accent
  );
  addCard(
    s,
    M + 3.05,
    1.05,
    2.85,
    2.2,
    "黑胶音乐播放器",
    ["可拖拽黑胶 UI", "摇杆式音量控制", "曲目 API + localStorage"],
    C.onAccent
  );
  addCard(
    s,
    M + 6.1,
    1.05,
    2.85,
    2.2,
    "栖息分栏 XiqiSplit",
    ["列表选中 FLIP 展开详情", "阅读器式双栏交互", "与页脚/入场动画联动"],
    C.tealDeep
  );
  addCard(
    s,
    M,
    3.45,
    2.85,
    1.65,
    "路由级照片背景",
    ["按路由切换背景图", "各页独立入场 CSS", "GSAP 时间轴编排"],
    C.accent
  );
  addCard(
    s,
    M + 3.05,
    3.45,
    2.85,
    1.65,
    "404 乱码彩蛋",
    ["Glitch 视觉故障效果", "abstract 主题彩蛋解锁", "增强站点记忆点"],
    C.bgElevated
  );
  addCard(
    s,
    M + 6.1,
    3.45,
    2.85,
    1.65,
    "中文智能搜索",
    ["jieba 分词 + TF-IDF", "应用层相关性打分", "优于简单 SQL LIKE"],
    C.tealDeep
  );
}

// ── Slide 11: 通用前端需求 ──
{
  const s = lightSlide();
  addSlideHeader(s, "05 · 通用前端需求", C.bgElevated);
  const cols = [
    {
      title: "数据与 CRUD",
      items: [
        "RESTful API 对接（axios/fetch 封装）",
        "留言/友链：访客 Create + 站长 Update/Delete",
        "碎念撰写：站长表单 + 文件导入",
        "列表分页、筛选、骨架屏加载态",
      ],
      accent: C.accent,
      x: M,
    },
    {
      title: "交互与动效",
      items: [
        "GSAP + CSS Keyframes 页面入场",
        "FLIP 动画（顶栏溢出/分栏/页脚）",
        "主题切换 light / dark / abstract",
        "prefers-reduced-motion 降级",
      ],
      accent: C.tealDeep,
      x: M + 3.05,
    },
    {
      title: "工程化与体验",
      items: [
        "Vue Router 嵌套路由 + scrollBehavior",
        "Pinia 全局状态（主题/音乐/背景）",
        "vue-i18n 中英文切换",
        "响应式布局 + SEO meta + JSON-LD",
      ],
      accent: C.accent,
      x: M + 6.1,
    },
  ];
  cols.forEach(({ title, items, accent, x }) => {
    addCard(s, x, 1.05, 2.85, 3.85, title, items, accent);
  });
}

// ── Slide 12: 技术选型 ──
{
  const s = lightSlide();
  addSlideHeader(s, "06 · 技术选型");
  s.addTable(
    [
      ["层次", "技术", "说明"],
      ["前端框架", "Vue 3 + TypeScript + Vite", "Composition API、类型安全、快速 HMR"],
      ["路由/状态", "Vue Router 5 + Pinia", "嵌套路由、全局 UI 状态管理"],
      ["样式/动画", "Less + GSAP", "模块化 CSS、时间轴动画"],
      ["Markdown", "marked + DOMPurify", "客户端/服务端双轨渲染与消毒"],
      ["SEO", "@unhead/vue", "动态 head、OG、结构化数据"],
      ["后端", "Flask + PyMySQL", "REST API、Markdown 导入、jieba 搜索"],
    ],
    {
      x: M,
      y: 1.05,
      w: W - M * 2,
      h: 3.9,
      fontFace: "Microsoft YaHei",
      fontSize: 11,
      border: { pt: 0.5, color: C.border },
      colW: [1.2, 3.2, 4.8],
      rowH: 0.52,
      fill: { color: C.white },
      color: C.text,
    }
  );
}

// ── Slide 13: 总结 ──
{
  const s = darkSlide();
  addDarkTitle(s, "总结", "需求 → 分析 → 实现 → 创新");
  s.addText(
    [
      { text: "本项目以", options: { color: C.accentMuted } },
      { text: "个人博客", options: { bold: true, color: C.accent } },
      { text: "为课程载体，在实现完整前端工程能力的同时，", options: { color: C.accentMuted, breakLine: true } },
      { text: "通过开屏动画、页脚交互、Demo 嵌入等创新点体现差异化设计思维。", options: { color: C.accentMuted, breakLine: true } },
      { text: " ", options: { breakLine: true, fontSize: 6 } },
      { text: "预期成果：可部署的个人站点 + 可演示的交互亮点 + 规范的内容管线", options: { color: C.white, fontSize: 14, breakLine: true } },
    ],
    { x: M, y: 3.5, w: 8.5, h: 1.5, fontSize: 13, fontFace: "Microsoft YaHei", valign: "top" }
  );
  s.addText("谢谢聆听", {
    x: M,
    y: 4.85,
    w: 3,
    h: 0.45,
    fontSize: 20,
    fontFace: "Microsoft YaHei",
    bold: true,
    color: C.accent,
    margin: 0,
  });
}

await pres.writeFile({ fileName: OUT });
console.log("Generated:", OUT);
