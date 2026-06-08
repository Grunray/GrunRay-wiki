# 05 · 服务器 / 仓库清理

## 一、服务器清理

盘点 `/var/www/GrunRay_wiki`：

| 项 | 体积 | 处理 |
|---|---|---|
| `backend.zip` | 103 MB | 删（后端已解压运行，zip 无用） |
| `frontend/dist.bak.*` × 4 | 各几 MB | 删 3 个旧的，**保留最新 1 个**作回滚点 |
| `frontend/._dist` | 163 B | 删（scp 带上来的 macOS AppleDouble 垃圾） |

效果：`frontend` 目录 **18 MB → 5.5 MB**；释放 103 MB zip。

> 原则：每次部署留**且只留一个** `dist.bak.*` 回滚点，旧的随新部署清掉，避免堆积。

## 二、仓库清理

`git ls-files` 体检发现两处误入库的大文件：

| 项 | 体积 / 文件数 | 处理 |
|---|---|---|
| `GrunRay_wiki.zip` | 40 MB | 项目自打包快照，冗余 → untrack |
| `demos/crsea-threejs/node_modules/` | **1875 个文件 / 约 40 MB** | 依赖目录不该入库（`.gitignore` 的 `node_modules/` 加得晚，没拦住已跟踪的） |

操作（仅移出索引、**保留工作区文件**）：

```bash
git rm --cached -q GrunRay_wiki.zip
git rm -r --cached -q demos/crsea-threejs/node_modules
# .gitignore 补 /GrunRay_wiki.zip（node_modules/ 已能覆盖 demos 下的）
git commit ...   # 1877 files changed, 1.1M deletions（commit 787bfde）
```

### 重要边界
- 用 `--cached` 只移出 git 索引，**不删本地文件**；
- **不重写历史、不 force push**：彻底从历史抹掉 80 MB 需要 `filter-repo` + 强推，风险高、改写他人已拉取的历史，不做。
  现状收益：工作区干净、以后不再跟踪、新 clone 的 checkout 不含这些大文件 —— 在「不改写历史」前提下能做的最大清理。
