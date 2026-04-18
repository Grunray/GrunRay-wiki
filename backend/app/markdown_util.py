"""Markdown → HTML（服务端可选渲染，与前端自行解析二选一）。"""
from __future__ import annotations

import markdown


def render_markdown_to_html(md: str) -> str:
    """
    将 Markdown 转为 HTML。
    扩展：围栏代码块、代码高亮、表格、换行转 <br>。
    """
    text = md or ""
    return markdown.markdown(
        text,
        extensions=[
            "fenced_code",
            "codehilite",
            "tables",
            "nl2br",
        ],
        extension_configs={
            "codehilite": {
                "guess_lang": False,
                "noclasses": False,
            }
        },
    )
