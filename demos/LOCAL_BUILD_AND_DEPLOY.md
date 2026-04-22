# Demo 本地打包与部署说明（简版）

本文只说明 **本地打包** 的流程。

## 1. 结论先看

- 你把 Demo 源码放在 `demos/` 下。
- 在本地执行 `npm run build:demos`。
- Demo 产物会生成到：`backend/content/media/demos/...`
- **不会**进入 `frontend/dist`。

## 2. 目录约定

- Demo 源码示例：
  - `demos/task-board/src/*`
  - `demos/task-board/demo.config.json`
- 产物输出目录：
  - `backend/content/media/demos/task-board/v1/*`

## 2.1 `demo.config.json` 支持两类 demo

### A) 静态 demo（当前 task-board 使用）

```json
{
  "type": "static",
  "version": "v1",
  "source": "src"
}
```

### B) Vue demo（新增支持）

```json
{
  "type": "vue",
  "version": "v1",
  "projectDir": ".",
  "buildCommand": "npm run build",
  "distDir": "dist"
}
```

说明：
- `type=static`：直接复制 `source` 目录到后端静态目录。
- `type=vue`：先在 `projectDir` 执行 `buildCommand`，再复制 `distDir` 产物。

## 3. 本地打包步骤

在仓库根目录执行（Windows PowerShell 示例）：

```bash
cd frontend
npm run build:demos
```

执行后会看到类似输出：

```text
Built demo artifacts:
- task-board@v1
  output: .../backend/content/media/demos/task-board/v1
  url:    /api/media/files/demos/task-board/v1/index.html
```

## 4. 前端如何引用

在项目数据（如 `frontend/src/content/data/projects.json`）里给 Demo 配置：

```json
"demoUrl": "/api/media/files/demos/task-board/v1/index.html"
```

前端详情页会通过 iframe 加载这个 URL。

## 5. 部署到服务器（只说本地打包后的结果）

你本地打包后，只需要把这些结果部署上去：

- `frontend/dist`（主站前端）
- `backend/`（后端服务）
- 以及 Demo 产物目录（通常已经在 `backend/content/media/demos` 内）

重点是：服务器上要能访问 `/api/media/files/demos/...` 对应的文件。

## 6. 常见误区

- 误区：`npm run build:demos` 会把 demo 打进 `frontend/dist`。  
  不是。它会把 demo 复制/发布到后端静态目录。

- 误区：必须把 `demos/` 源码上传到服务器。  
  不必须（若你已在本地打包好并上传了产物）。
