"""媒体图片 WebP 内容协商。

浏览器 Accept 含 image/webp 且原图是 jpg/png 时，转码为 webp（磁盘缓存，按 mtime 失效）
后返回，体积通常省 25~50%，利好慢服务器/慢网络。任何一步失败（未装 Pillow、转码异常、
目录穿越）都返回 None，由调用方降级回原图——对前端完全透明。
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

WEBP_SOURCE_EXT = {".jpg", ".jpeg", ".png"}
WEBP_CACHE_DIRNAME = ".webp_cache"
WEBP_QUALITY = 82


def _client_accepts_webp(request) -> bool:
    return "image/webp" in (request.headers.get("Accept") or "")


def maybe_webp_response(media_dir: Path, filename: str, request) -> Optional[Any]:
    if not _client_accepts_webp(request):
        return None
    ext = os.path.splitext(filename)[1].lower()
    if ext not in WEBP_SOURCE_EXT:
        return None

    media_root = media_dir.resolve()
    src = (media_dir / filename).resolve()
    # 防目录穿越：源必须落在 media_dir 内
    try:
        src.relative_to(media_root)
    except ValueError:
        return None
    if not src.is_file():
        return None

    try:
        from PIL import Image
    except ImportError:
        return None  # 未装 Pillow → 降级原图

    cache_path = media_root / WEBP_CACHE_DIRNAME / f"{filename}.webp"
    try:
        if not cache_path.is_file() or cache_path.stat().st_mtime < src.stat().st_mtime:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(src) as im:
                im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
                im.save(cache_path, "WEBP", quality=WEBP_QUALITY, method=6)
    except Exception:
        return None  # 转码失败 → 降级原图

    from flask import send_file

    resp = send_file(str(cache_path), mimetype="image/webp", conditional=True)
    resp.headers["Vary"] = "Accept"
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp
