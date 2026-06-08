# 08 · 后续优化建议

本轮未做、但值得后续推进的项，按收益/性价比排序。

## 1. 【高】用 gunicorn 替代 Flask 开发服务器

后端 systemd 当前直接跑 `python run.py`，日志可见：

```
WARNING: This is a development server. Do not use it in a production deployment.
* Debug mode: on
```

Flask 自带 server **单线程**、且开了 debug —— 多图/多请求并发时**串行排队**，这才是
「图片加载慢」更根本的原因（比图片格式影响更大）。建议：

```bash
/var/www/GrunRay_wiki/backend/.venv/bin/pip install gunicorn
# systemd ExecStart 改为（4 worker 示例）：
# gunicorn -w 4 -b 127.0.0.1:5000 "app:create_app()"
```

并关闭 debug 模式（生产不应开 `Debug mode: on` / Werkzeug 调试器）。
> 属于改动后端运行方式，需停机重启验证，建议单独安排。

## 2. 【中】canonical 域名统一（www vs 非 www）

当前混用：前端运行时 canonical 用 `window.location.origin`（用户访问什么就是什么），
后端 RSS/sitemap 用 `https://www.grunray.tech`（带 www）。
建议二选一固定为主域名，另一域 301 跳转，并让前后端 canonical 一致，避免搜索引擎收录分裂。
- nginx 已 `server_name grunray.tech www.grunray.tech` 同时服务；
- 可在 HTTPS server 加一段把非主域 301 到主域。

## 3. 【中】CI/CD 自动部署

当前部署是手动 build → tar → scp → ssh。可接 GitHub Actions：push main 后自动
构建前端、rsync 到服务器、重启后端、reload nginx，并保留回滚点。
消除手动步骤与「忘了某一步」的风险。

## 4. 【低】其它

- **HTTP/2 / HTTP/3**：nginx 443 加 `http2 on;`，多 chunk 并发下载更快（懒加载后小 chunk 变多，收益明显）。
- **媒体图片 Cache-Control 经 nginx 统一**：目前原图走后端 `send_from_directory`，可在 nginx `/api/media/` 加合理强缓存（注意带 `Vary: Accept` 以兼容 webp 协商）。
- **监控**：接入简单的 uptime / 错误日志告警（如 `grunray-wiki.service` 异常退出）。
- **错误页**：`/api/` 404/500 目前是 Flask JSON，可统一错误结构。
