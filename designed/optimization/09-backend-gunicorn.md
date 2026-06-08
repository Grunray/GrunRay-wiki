# 09 · 后端：Flask 开发服务器 → gunicorn

## 根因
后端 systemd 直接跑 `python run.py`，即 Flask 自带的 Werkzeug 开发服务器。日志可见：

```
WARNING: This is a development server. Do not use it in a production deployment.
* Debug mode: on
* Restarting with stat            # 文件改动自动重载
* Debugger is active!
```

两个问题：
1. **单线程 / 串行**：开发服务器默认不并发，多个请求（尤其多图同时加载）排队处理 —— 这是
   「图片加载慢」比图片格式更根本的原因；
2. **debug 模式**：生产开 Werkzeug 调试器有安全风险（可执行任意代码），且 reloader 多占资源。

## 方案：gunicorn 多 worker

`run.py` 模块级已暴露 `app = create_app()`，gunicorn 可直接以 `run:app` 为 WSGI 入口，无需改代码：

```python
# run.py（无需改动）
from app import create_app
app = create_app()                 # gunicorn 用的就是这个 app
if __name__ == "__main__":         # gunicorn 不走这里，故 app.run/debug 全不生效
    app.run(host="0.0.0.0", port=..., debug=os.getenv("FLASK_DEBUG") == "1")
```

### systemd 改动（前后对比）

```diff
- ExecStart=/var/www/GrunRay_wiki/backend/.venv/bin/python run.py
+ ExecStart=/var/www/GrunRay_wiki/backend/.venv/bin/gunicorn -w 3 --timeout 60 -b 127.0.0.1:5000 run:app
```

参数说明：
- `-w 3`：3 个 sync worker。服务器 **2 核 / 2GB**，按 `2×核+1` 上限是 5，但每个 worker 独立加载
  jieba 词典 / Pillow 占内存，小内存机取 **3** 更稳（并发足够，留内存余量）；
- `--timeout 60`：worker 超时放宽到 60s（给慢 DB 查询 / 首次 WebP 转码留余量）；
- `-b 127.0.0.1:5000`：只绑回环。原 `run.py` 绑 `0.0.0.0:5000`（对外暴露端口），
  改回环后**只有本机 nginx 能连**，更安全（nginx 本就 `proxy_pass 127.0.0.1:5000`）；
- debug 自动关闭：gunicorn 不调用 `app.run()`，`FLASK_DEBUG` 不再起作用。

### 完整 service 文件
`/etc/systemd/system/grunray-wiki.service`：

```ini
[Unit]
Description=GrunRay Wiki Flask API
After=network.target mysqld.service

[Service]
User=grunray
Group=grunray
WorkingDirectory=/var/www/GrunRay_wiki/backend
Environment=PATH=/var/www/GrunRay_wiki/backend/.venv/bin:/usr/local/bin:/usr/bin
ExecStart=/var/www/GrunRay_wiki/backend/.venv/bin/gunicorn -w 3 --timeout 60 -b 127.0.0.1:5000 run:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

> `WorkingDirectory=.../backend` 保证 `python-dotenv` 能加载到 `backend/.env`（DB 凭据等）。

## 部署与验证

```bash
# venv 装 gunicorn（一次）
/var/www/GrunRay_wiki/backend/.venv/bin/pip install gunicorn
# 备份 service → 替换 ExecStart → 重载
cp $SVC $SVC.bak.$(date +%Y%m%d_%H%M%S)
systemctl daemon-reload && systemctl restart grunray-wiki.service
```

验证结果（实测）：

| 检查 | 结果 |
|---|---|
| 进程 | 1 master + **3 worker**（`Using worker: sync`） |
| 监听 | `127.0.0.1:5000`（不再 `0.0.0.0`） |
| 日志 | **无** `development server` / `Debug mode` 警告 |
| 功能 | `/api/posts`、`/rss.xml`、WebP 协商均 200/正常 |
| 并发 | 5 并发请求 0.146s 完成（多 worker 并行，不再串行排队） |

回滚：`cp $SVC.bak.* $SVC && systemctl daemon-reload && systemctl restart grunray-wiki.service`。
依赖 `gunicorn`（26.0.0）。
