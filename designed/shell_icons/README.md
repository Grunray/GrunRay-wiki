# shell_icons

主导航（`SiteNav.vue`）左侧图标的静态预览与选型。

| 文件 | 说明 |
|------|------|
| `nav-icons-preview.html` | 五枚统一描边图标 + 顶栏药丸链接交互预览 |

在浏览器中直接打开 `nav-icons-preview.html` 即可查看浅色/深色与悬停、选中状态。

**调整版 v2**（顶栏预览区第二行，初版保留）：

- **项目** — `</>` 描边 SVG（`icon-nav-projects-v2`）
- **友链** — 双人 users，体现 friend（`icon-nav-friends-v2`）

**调整版 v3**（第三行，源自 `参考/preview.html` 植物系概念稿）：

- 全套细线图标（stroke 1.75）+ 叶片光晕 / 生长线 / 选中呼吸动效
- **项目** — 双尖括号 `<>`（无中间斜杠，与 v2 区分）
- **友链** — 双头像剪影式 friend

已接入前端：`SiteNav.vue` + `SiteNavGroup.vue`（**v4 分组** + **v5 父级图标**）；图标见 `frontend/src/components/icons/*NavIcon.vue`。占位路由：`/fragments`、`/about`、`/recommend`。

**调整版 v4**（`nav-icons-preview.html`，源自 `参考/sub-menu.html`）：

- 顶栏：**首页** · **创作**（项目/博客）· **社区**（留言/友链）· **栖息**（碎念/关于/推荐）
- `nav-icons-preview.html` 在 v4 顶栏下方有 **v4 图标一览**（父级 + 二级 + 共用箭头）

**调整版 v5**（父级与子项去重，已合入前端）：

- **创作** 父级：`CreateNavIcon.vue`（笔尖 + 星芒）≠ 二级 **项目** `ProjectsNavIcon`
- **社区** 父级：`CommunityNavIcon.vue`（地球经纬）≠ 二级 **友链** `FriendsNavIcon`
- 「栖息」为新增父级，收纳 **碎念、关于、推荐**（推荐：软件 / 开源 / 番剧动漫）
- 悬停父级即可移入二级菜单，移出父级与面板后收起

图标语义：

- **首页** — 房屋轮廓
- **项目** — 层叠方块（作品集）
- **博客** — 展开的书本
- **留言** — 对话气泡
- **友链** — 双环链接

规范：`viewBox="0 0 24 24"`、`stroke-width="2"`、圆角端点、`currentColor`，与 `frontend/src/components/icons/*NavIcon.vue` 一致。
