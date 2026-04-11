"""从正文/标题等文本中自动抽取关键词（中文：jieba TF-IDF）。"""
from __future__ import annotations


def extract_keywords(text: str, top_k: int = 10) -> list[str]:
    """
    抽取关键词，返回词列表（适合写入 post.keywords JSON）。

    依赖 jieba：首次运行会加载词典，略慢属正常现象。
    """
    text = (text or "").strip()
    if not text:
        return []

    import jieba.analyse

    tags = jieba.analyse.extract_tags(text, topK=top_k, withWeight=False)
    return [str(t).strip() for t in tags if str(t).strip()]
