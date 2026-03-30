"""搜索：方案 C + 应用层评分（与 designed/back_design.md 一致）。"""
from __future__ import annotations

import math
import re
from typing import Any


def split_terms(q: str) -> list[str]:
    q = (q or "").strip()
    if not q:
        return []
    return [t for t in re.split(r"\s+", q) if t]


def term_in_keywords(term: str, keywords: list[Any]) -> bool:
    tl = term.lower()
    for k in keywords:
        if tl in str(k).lower():
            return True
    return False


def passes_scheme_c(
    terms: list[str],
    title: str,
    summary: str,
    keywords: list[Any],
) -> bool:
    """每个词：title / summary / keywords 至少一处命中；词之间 AND。"""
    if not terms:
        return False
    title_l = title.lower()
    summary_l = summary.lower()
    for term in terms:
        tl = term.lower()
        ok = tl in title_l or tl in summary_l or term_in_keywords(term, keywords)
        if not ok:
            return False
    return True


def score_post(
    terms: list[str],
    title: str,
    summary: str,
    keywords: list[Any],
    views: int,
) -> float:
    """
    按词计分；同一词在同一字段只计一次；浏览量 log(views+1)。
    标题 +10 / 关键词 +6 / 摘要 +3（每个词在每个字段至多一次）。
    """
    s = math.log(max(0, int(views)) + 1)
    title_l = title.lower()
    summary_l = summary.lower()
    for term in terms:
        tl = term.lower()
        if tl in title_l:
            s += 10
        if tl in summary_l:
            s += 3
        if term_in_keywords(term, keywords):
            s += 6
    return s
