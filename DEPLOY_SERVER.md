# 生产服务器上传与部署（参考与约束）

本文记录本仓库向 **腾讯云 CentOS 服务器**（`grunray.tech` / `118.25.138.103`）的标准部署流程。  
**自动化助手与人工部署均应按本文执行**；未在「明确要求」时，不要擅自做额外操作。

相关但独立的文档：

- Demo 本地构建：`demos/LOCAL_BUILD_AND_DEPLOY.md`
- 后端内容导入：`backend/scripts/run.md`
- Film 孤儿清理（危险）：`backend/scripts/media_tools/sync_film_media_from_import.py` 文件头注释

---

## 0. 环境约定

| 项 | 值 |
|----|-----|
| 服务器项目根 | `/var/www/GrunRay_wiki` |
| SSH | `root@118.25.138.103`（本机密钥：`~/.ssh/id_ed25519`） |
| 后端服务 | systemd：`grunray-wiki` |
| 反向代理 | nginx（站点：`/etc/nginx/conf.d/grunray_wiki.conf`） |
| 前端产物 | `frontend/dist`（Nginx `root`） |
| 后端 API | `127.0.0.1:5000`，Nginx `location ^~ /api/` 反代 |

**绝对不要**用本机的 `backend/.env` 或 `backend/.venv` 覆盖服务器：

- 服务器 `.env` 含生产 MySQL 密码、OAuth、CORS 等
- 服务器 `.venv` 必须是 Linux 下用本机 Python 3.12 建的；Windows venv 不可用

---

## 1. 默认「上传代码」范围（用户说「上传到服务器」时）

只做这些：

1. 本机构建前端与 demos  
2. 打包并上传 `backend/`（排除 `.venv`、`.env`）与 `frontend/dist/`  
3. 服务器解压时**先备份再还原** `.env`  
4. `pip install -r requirements.txt`（在服务器 venv 内）  
5. `systemctl restart grunray-wiki`  
6. 健康检查

**默认不做**（除非用户明确说）：

- 任意 `import_*.py` / 数据库灌数  
- `run_sql.py` 全量或任意迁移  
- `sync_film_media_from_import.py`（会删库删文件）  
- 改 nginx / 证书 / MySQL 密码  
- `git push` / 提交本地变更  

---

## 2. 本机步骤（Windows PowerShell）

在仓库根目录 `E:\Project\GrunRay_wiki`（或当前克隆路径）执行。

### 2.1 构建

```powershell
Set-Location E:\Project\GrunRay_wiki\frontend
npm run build
npm run build:demos
```

说明：

- `npm run build` → `frontend/dist/`
- `npm run build:demos` → `backend/content/media/demos/...`（**不进** `frontend/dist`）

### 2.2 打包（排除敏感与本机 venv）

```powershell
Set-Location E:\Project\GrunRay_wiki
if (Test-Path deploy-backend.tar) { Remove-Item deploy-backend.tar }
if (Test-Path deploy-frontend-dist.tar) { Remove-Item deploy-frontend-dist.tar }

tar -cf deploy-backend.tar --exclude=backend/.venv --exclude=backend/.env --exclude=backend/__pycache__ backend
tar -cf deploy-frontend-dist.tar -C frontend dist
```

### 2.3 上传

```powershell
scp -o BatchMode=yes -i "$env:USERPROFILE\.ssh\id_ed25519" `
  E:\Project\GrunRay_wiki\deploy-backend.tar `
  E:\Project\GrunRay_wiki\deploy-frontend-dist.tar `
  root@118.25.138.103:/tmp/
```

上传成功后应删除本机临时包，避免误提交进仓库。

---

## 3. 服务器步骤（SSH）

```bash
set -e
cd /var/www/GrunRay_wiki

# 保留生产 .env
cp backend/.env /tmp/grunray-wiki.env.bak

tar -xf /tmp/deploy-backend.tar
cp /tmp/grunray-wiki.env.bak backend/.env

rm -rf frontend/dist
tar -xf /tmp/deploy-frontend-dist.tar -C frontend
rm -f /tmp/deploy-backend.tar /tmp/deploy-frontend-dist.tar
chmod -R 755 frontend/dist

cd backend
source .venv/bin/activate
pip install -q -r requirements.txt
deactivate

systemctl restart grunray-wiki
sleep 2
systemctl is-active grunray-wiki nginx
curl -s http://127.0.0.1:5000/api/health
curl -sk -o /dev/null -w "home:%{http_code}\n" https://127.0.0.1/
```

期望：

- `grunray-wiki`、`nginx` 均为 `active`
- `/api/health` 返回 `{"ok": true}`（或等价健康 JSON）
- 首页 HTTPS 为 `200`

---

## 4. Nginx 约束（踩过的坑）

`/api/` 必须用前缀优先，避免被 `location ~* \.html$` 抢走：

```nginx
location ^~ /api/ {
    proxy_pass http://127.0.0.1:5000;
    ...
}
```

否则 `/api/media/files/demos/.../index.html` 会返回主站 SPA，iframe 内表现为站内 404。  
配置路径：`/etc/nginx/conf.d/grunray_wiki.conf`。改完后：`nginx -t && systemctl reload nginx`。

---

## 5. 内容导入（仅当用户明确要求）

在服务器 `backend` 目录、已激活 `.venv` 后，按 `backend/scripts/run.md` 执行。常用顺序：

```bash
cd /var/www/GrunRay_wiki/backend
source .venv/bin/activate

python scripts/content_tools/import_markdown_posts.py
# 子目录文章默认不会被扫到（脚本用 glob 非 rglob），项目笔记需单独：
python scripts/content_tools/import_markdown_posts.py --dir import/markdown/project/grunray-wiki

python scripts/projects_tools/import_projects.py
python scripts/media_tools/import_film_media.py
python scripts/music_tools/import_music.py
python scripts/friend_link_tools/import_friend_links.py
python scripts/guest_tools/user/import_guest_users.py
python scripts/guest_tools/message/import_guest_messages.py
python scripts/xiqi_tools/import_xiqi.py fragments
python scripts/xiqi_tools/import_xiqi.py pages
python scripts/xiqi_tools/import_xiqi.py about
python scripts/xiqi_tools/import_xiqi.py recommendations

systemctl restart grunray-wiki
```

注意：

- `import_markdown_posts.py` 使用 `inbox.glob("*.md")`，**只扫一层**；`demo/`、`project/...` 子目录不会自动导入。
- 友链 `import_friend_links.py` 只做 upsert，**不会**删除已从 Markdown 移除的旧记录；删库需用户确认后 SQL。
- **不要**在生产跑 `seed_from_json.py`（会清空 post）。
- **不要**在生产无备份时跑完整 `python scripts/run_sql.py`（`schema.sql` 含 `DROP TABLE`）；缺表时用 `--file xxx.sql`。

---

## 6. Film 同步删除（危险，默认禁止）

脚本：`python scripts/media_tools/sync_film_media_from_import.py`

- 仅当用户**明确要求**清理「import 已删、库/content 仍在」的 film 时才用。
- 必须先 `--dry-run`，确认孤儿列表正确后再 `--confirm`。
- 流程：先从 `import/film` 删除源文件 → dry-run → confirm。

---

## 7. 助手行为约束（给 AI）

1. 用户只说「上传 / 部署到服务器」→ **只执行第 2–3 节**，不 import、不改库、不跑危险脚本。  
2. 需要 import / 删库 / 改 nginx / 改 `.env` → **等用户明确说**再做。  
3. 上传前在本机构建；服务器 **不装 Node**（CentOS 7 glibc 过旧）。  
4. SSH 用密钥 `BatchMode=yes`；不要把服务器密码写进仓库或对话可提交文件。  
5. 部署后提醒用户浏览器 **强制刷新**（`Ctrl+Shift+R`）。  
6. 临时 `deploy-*.tar` 部署结束后删除，且勿提交进 git。

---

## 8. 快速自检清单

- [ ] `frontend/dist/index.html` 已更新（服务器 mtime）
- [ ] `backend/.env` 仍是生产配置（未被本机覆盖）
- [ ] `systemctl is-active grunray-wiki nginx` → active
- [ ] `curl http://127.0.0.1:5000/api/health` → ok
- [ ] `https://grunray.tech` 强刷后为新版本
- [ ] Demo：`https://grunray.tech/api/media/files/demos/crsea-threejs/v1/index.html` 标题为 Demo，而非主站 SPA
