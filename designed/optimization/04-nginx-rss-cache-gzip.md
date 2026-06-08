# 04 · nginx：修复 RSS 404 + 静态资源缓存 + gzip

配置文件：服务器 `/etc/nginx/conf.d/grunray_wiki.conf`。
改动流程：备份 → 替换 → `nginx -t` 校验 → 成功 `reload` / 失败自动回滚。

## 一、修复 RSS 404（用户反馈的 bug）

### 根因
RSS 由后端动态生成（Flask `/rss.xml`）。开发时 Vite 有 proxy 把 `/rss.xml` 转发到后端，所以 `npm run dev` 正常；
但**部署后 nginx 没有代理这个路径**，请求落到 SPA 兜底规则：

```nginx
location / { try_files $uri $uri/ /index.html; }
```

于是 `/rss.xml` 返回了 `index.html`（`Content-Type: text/html`）。RSS 阅读器/浏览器拿到 HTML 解析失败，
表现为「打不开 / 404」。

### 方案
加一条精确匹配，把 `/rss.xml` 代理到后端：

```nginx
location = /rss.xml {
    proxy_pass http://127.0.0.1:5000/rss.xml;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

验证：

```bash
curl -sI https://grunray.tech/rss.xml | grep Content-Type
# Content-Type: application/rss+xml; charset=utf-8   ✅
```

> `/sitemap.xml`、`/robots.txt` 同理代理到后端，见 [06](./06-seo-sitemap-meta.md)。

## 二、静态资源缓存策略

Vite 产物文件名带内容 hash（`index-BsED82Ko.js`），改了内容 hash 必变 —— 所以可以**永久强缓存**；
而 `index.html` 是入口、不带 hash，必须**永不缓存**，否则发版后用户拿到旧入口、引用到已删除的旧 chunk。

```nginx
# 带 hash 的产物 + 自托管字体：一年 immutable
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    access_log off;
    try_files $uri =404;
}
location /fonts/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    access_log off;
    try_files $uri =404;
}

# HTML（SPA 入口）：禁缓存，发版即生效
location ~* \.html$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    try_files $uri /index.html;
}
```

> 注：`/assets/` 响应里 `Cache-Control` 可能出现两条（nginx.conf http 块的全局 `expires` 继承 + 本处 `add_header`）。
> HTTP 规范允许多个 `Cache-Control` 合并，合并结果 `max-age=31536000, public, immutable` 行为完全正确。

## 三、gzip

```nginx
gzip on;
gzip_comp_level 6;
gzip_min_length 1024;
gzip_vary on;
gzip_types text/plain text/css text/xml
           application/javascript application/json application/xml
           application/rss+xml application/atom+xml image/svg+xml;
```

验证：`curl -sI -H "Accept-Encoding: gzip" .../assets/xxx.js | grep -i content-encoding` → `gzip`。

## 部署与验证

```bash
# 本地写好 grunray_wiki.conf → scp 到 /tmp → 服务器执行：
cp $CONF $CONF.bak.$(date +%Y%m%d_%H%M%S)
cp /tmp/grunray_wiki.conf $CONF
nginx -t && nginx -s reload || cp $CONF.bak.* $CONF   # 校验失败回滚
```
