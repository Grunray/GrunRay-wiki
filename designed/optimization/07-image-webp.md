# 07 · 媒体图片 WebP 内容协商

## 根因
媒体图片走后端接口 `GET /api/media/files/<path>`（`send_from_directory` 原样返回 jpg/png）。
原图体积偏大，在慢服务器 / 慢网络下加载明显。WebP 在同等画质下通常比 jpg/png 小 25~50%。

## 方案：按需转码 + 磁盘缓存 + 内容协商（对前端透明）

不改前端、不改图片 URL，在接口层做 HTTP 内容协商：

- 浏览器请求头 `Accept` 含 `image/webp`（Chrome / Safari / Edge / Firefox 全支持）**且**原图是 jpg/png
  → 转码为 webp 返回；
- 转码结果落磁盘缓存（`content/media/.webp_cache/<path>.webp`，按源文件 mtime 失效），第二次直接命中；
- 返回头带 `Vary: Accept`（让浏览器 / CDN 正确区分 webp 与原图两份缓存）+ `Cache-Control`；
- **任何一步失败都优雅降级回原图**：未装 Pillow、转码异常、目录穿越尝试 → 返回 `None`，调用方走原 `send_from_directory`。

核心逻辑（`backend/app/media_webp.py`）：

```python
def maybe_webp_response(media_dir, filename, request):
    if "image/webp" not in (request.headers.get("Accept") or ""):
        return None
    if os.path.splitext(filename)[1].lower() not in {".jpg", ".jpeg", ".png"}:
        return None
    src = (media_dir / filename).resolve()
    src.relative_to(media_dir.resolve())          # 防目录穿越，越界抛 ValueError
    from PIL import Image                          # 没装 Pillow → ImportError → 降级
    cache_path = media_dir / ".webp_cache" / f"{filename}.webp"
    if not cache_path.is_file() or cache_path.stat().st_mtime < src.stat().st_mtime:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(src) as im:
            im = im.convert("RGBA") if im.mode in ("RGBA","LA","P") else im.convert("RGB")
            im.save(cache_path, "WEBP", quality=82, method=6)
    resp = send_file(str(cache_path), mimetype="image/webp", conditional=True)
    resp.headers["Vary"] = "Accept"
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp
```

接口接入（`read_api.py`）：

```python
@bp.get("/media/files/<path:filename>")
def media_file(filename):
    media_dir = config.CONTENT_ROOT / "media"
    webp = maybe_webp_response(media_dir, filename, request)
    return webp if webp is not None else send_from_directory(str(media_dir), filename)
```

## 前后对比（实测 miku1.jpg）

| 请求 | Content-Type | 体积 |
|---|---|---|
| 无 `Accept: image/webp` | image/jpeg | 446 810 B |
| 有 `Accept: image/webp` | image/webp | **231 342 B（省 48%）** |

- 动图 `gif` 不参与（避免破坏动画）；PNG 透明通道保留（webp 支持 alpha）。
- PNG 大图省得更多，jpg 视内容而定。

## 部署与验证

```bash
# 服务器 venv 装 Pillow（一次）
/var/www/GrunRay_wiki/backend/.venv/bin/pip install Pillow
# scp media_webp.py + read_api.py → systemctl restart grunray-wiki.service
# 验证：
curl -s -H "Accept: image/webp" -D - -o /dev/null \
  https://grunray.tech/api/media/files/film/homeView/right_panel/miku1.jpg \
  | grep -iE "content-type|vary|content-length"
# Content-Type: image/webp / Content-Length: 231342 / Vary: Accept  ✅
```

依赖：`Pillow>=10,<13`（已加入 `requirements.txt`）。`.webp_cache/` 已加入 `.gitignore`（运行时生成，不入库）。
