# GitHub Pages 静态部署

在 `feat/github-pages` 分支上，前端以 **Hash 路由** + **仓库子路径** 发布，访问形态与 [AposBlog](https://apos-dt.github.io/AposBlog/index.html#/) 类似：

`https://grunray.github.io/GrunRay-wiki/index.html#/`

## 本地预览

```bash
cd frontend
npm run build:github-pages
npm run preview -- --base /GrunRay-wiki/
```

浏览器打开预览地址后，路径应带 `#/`（例如 `#/blog`）。

## 首次启用 GitHub Pages

1. 推送 `feat/github-pages` 分支到 GitHub。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
3. （可选）**Settings → Secrets and variables → Actions → Variables** 新增 `VITE_API_BASE_URL`，值为已部署的 Flask API 根地址（无尾斜杠）。未配置时页面可打开，但博客/项目等依赖 `/api` 的数据为空或报错。
4. 在 **Actions** 中运行 **Deploy GitHub Pages**，或向 `feat/github-pages` 推送触发构建。

## 与主站开发的差异

| 项 | 本地 `npm run dev` | GitHub Pages |
|----|------------------|--------------|
| 路由 | History (`/blog`) | Hash (`#/blog`) |
| `base` | `/` | `/GrunRay-wiki/` |
| API | Vite 代理 → `127.0.0.1:5000` | `VITE_API_BASE_URL` 或同源（通常需公网 API + CORS） |
| RSS | `/rss.xml` 代理 | 需 API 或反向代理，静态站本身不提供 |

环境变量见 `frontend/.env.github-pages`；生产构建命令：`npm run build:github-pages`。

## 合并到 main 后

若希望 `main` 也自动部署，在 `.github/workflows/deploy-github-pages.yml` 的 `on.push.branches` 中加入 `main`。
