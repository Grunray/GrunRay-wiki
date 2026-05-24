"""栖息（xiqi）路径常量。"""
from __future__ import annotations

from pathlib import Path

from app.config import config

_backend_root = Path(__file__).resolve().parent.parent

IMPORT_XIQI_ROOT = _backend_root / "import" / "xiqi"
IMPORT_XIQI_FRAGMENTS = IMPORT_XIQI_ROOT / "fragments"
IMPORT_XIQI_PAGES = IMPORT_XIQI_ROOT / "pages"
IMPORT_XIQI_ABOUT = IMPORT_XIQI_ROOT / "about"
IMPORT_XIQI_RECOMMENDATIONS = IMPORT_XIQI_ROOT / "recommendations"

CONTENT_XIQI_ROOT = config.CONTENT_ROOT / "xiqi"
CONTENT_XIQI_FRAGMENTS = CONTENT_XIQI_ROOT / "fragments"
CONTENT_XIQI_ABOUT = CONTENT_XIQI_ROOT / "about"
CONTENT_XIQI_RECOMMENDATIONS = CONTENT_XIQI_ROOT / "recommendations"

ABOUT_RESUME_FILENAME = "resume.md"

MEDIA_XIQI_ROOT = config.CONTENT_ROOT / "media" / "xiqi"
MEDIA_XIQI_FRAGMENTS = MEDIA_XIQI_ROOT / "fragments"
MEDIA_XIQI_PAGES = MEDIA_XIQI_ROOT / "pages"
MEDIA_XIQI_RECOMMENDATIONS = MEDIA_XIQI_ROOT / "recommendations"

ALLOWED_XIQI_PAGES = frozenset({"fragments", "about", "recommend"})

MEDIA_SCOPE_FRAGMENTS = "fragments"
MEDIA_SCOPE_RECOMMENDATIONS = "recommendations"
MEDIA_SCOPE_PAGE_PREFIX = "pages/"


def media_dir_for_scope(scope: str) -> Path:
    """scope: fragments | recommendations | pages/fragments | pages/about | pages/recommend"""
    scope = scope.strip().strip("/")
    if scope == MEDIA_SCOPE_FRAGMENTS:
        return MEDIA_XIQI_FRAGMENTS
    if scope == MEDIA_SCOPE_RECOMMENDATIONS:
        return MEDIA_XIQI_RECOMMENDATIONS
    if scope.startswith("pages/"):
        page = scope.split("/", 1)[1]
        if page not in ALLOWED_XIQI_PAGES:
            raise ValueError(f"未知页面 scope: {scope!r}")
        return MEDIA_XIQI_PAGES / page
    raise ValueError(f"未知 media scope: {scope!r}")


def media_url_for_scope(scope: str, filename: str) -> str:
    scope = scope.strip().strip("/")
    if scope == MEDIA_SCOPE_FRAGMENTS:
        return f"/api/media/files/xiqi/fragments/{filename}"
    if scope == MEDIA_SCOPE_RECOMMENDATIONS:
        return f"/api/media/files/xiqi/recommendations/{filename}"
    if scope.startswith("pages/"):
        page = scope.split("/", 1)[1]
        return f"/api/media/files/xiqi/pages/{page}/{filename}"
    raise ValueError(f"未知 media scope: {scope!r}")
