"""搜索：向后兼容，逻辑见 keywords_match。"""
from __future__ import annotations

from app.keywords_match import (  # noqa: F401
    passes_scheme_c,
    score_post,
    split_terms,
    term_in_keywords,
)
