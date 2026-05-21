from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from app.config import config

_DANGEROUS_PATTERNS = [
    re.compile(r"<\s*script", re.I),
    re.compile(r"<\s*iframe", re.I),
    re.compile(r"javascript\s*:", re.I),
    re.compile(r"on\w+\s*=", re.I),
    re.compile(r"data\s*:\s*text/html", re.I),
]
_HTML_TAG_RE = re.compile(r"<[^>]+>")


@dataclass
class ValidationError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


_sensitive_words: set[str] | None = None


def _load_sensitive_words() -> set[str]:
    global _sensitive_words
    if _sensitive_words is not None:
        return _sensitive_words
    path: Path = config.MESSAGE_SENSITIVE_WORDS_PATH
    words: set[str] = set()
    if path.is_file():
        for line in path.read_text(encoding="utf-8").splitlines():
            w = line.strip()
            if not w or w.startswith("#"):
                continue
            words.add(w.lower())
    _sensitive_words = words
    return words


def strip_html_and_validate(raw: str) -> str:
    text = raw.strip()
    for pat in _DANGEROUS_PATTERNS:
        if pat.search(text):
            raise ValidationError("内容包含不允许的 HTML 或脚本")
    stripped = _HTML_TAG_RE.sub("", text)
    if stripped != text:
        for pat in _DANGEROUS_PATTERNS:
            if pat.search(stripped):
                raise ValidationError("内容包含不允许的 HTML 或脚本")
    return stripped.strip()


def validate_content(raw: str) -> str:
    text = strip_html_and_validate(raw)
    n = len(text)
    if n < config.MESSAGE_MIN_LENGTH or n > config.MESSAGE_MAX_LENGTH:
        raise ValidationError(
            f"内容长度需在 {config.MESSAGE_MIN_LENGTH}–{config.MESSAGE_MAX_LENGTH} 字之间"
        )
    lower = text.lower()
    for word in _load_sensitive_words():
        if word and word in lower:
            raise ValidationError("内容含有不允许的词语，请修改后重试")
    return text
