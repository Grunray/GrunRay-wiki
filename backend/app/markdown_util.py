"""Markdown → HTML（服务端可选渲染，与前端自行解析二选一）。"""
from __future__ import annotations

import xml.etree.ElementTree as etree

import markdown
from markdown.extensions import Extension
from markdown.inlinepatterns import InlineProcessor

# GFM 删除线：~~text~~ → <del>text</del>（Python-Markdown 标准扩展不含此项）
_STRIKE_RE = r"~~([^~\n]+?)~~"


class _StrikethroughProcessor(InlineProcessor):
    def handleMatch(self, m, data):  # noqa: N802 — Markdown API
        el = etree.Element("del")
        el.text = m.group(1)
        return el, m.start(0), m.end(0)


class StrikethroughExtension(Extension):
    def extendMarkdown(self, md):  # noqa: N802 — Markdown API
        # 优先级介于 strong/em 一带，避免被其它行内规则先吃掉
        md.inlinePatterns.register(
            _StrikethroughProcessor(_STRIKE_RE, md),
            "strikethrough",
            175,
        )


def render_markdown_to_html(md: str) -> str:
    """
    将 Markdown 转为 HTML。
    扩展：围栏代码块、代码高亮、表格、换行转 <br>、GFM 删除线 ~~…~~。
    """
    text = md or ""
    return markdown.markdown(
        text,
        extensions=[
            "fenced_code",
            "codehilite",
            "tables",
            "nl2br",
            StrikethroughExtension(),
        ],
        extension_configs={
            "codehilite": {
                "guess_lang": False,
                "noclasses": False,
            }
        },
    )
