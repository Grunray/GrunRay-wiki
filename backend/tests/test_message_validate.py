import pytest

from app.message_validate import ValidationError, strip_html_and_validate, validate_content


def test_strip_plain_text():
    assert strip_html_and_validate("  你好世界  ") == "你好世界"


def test_strip_harmless_tags():
    assert strip_html_and_validate("<b>加粗</b>") == "加粗"


def test_reject_script():
    with pytest.raises(ValidationError, match="不允许"):
        strip_html_and_validate('<script>alert(1)</script>')


def test_reject_javascript_url():
    with pytest.raises(ValidationError, match="不允许"):
        strip_html_and_validate("javascript:alert(1)")


def test_content_too_short():
    with pytest.raises(ValidationError, match="长度"):
        validate_content("啊")


def test_content_ok():
    assert validate_content("留下一句") == "留下一句"


def test_content_sensitive_word():
    with pytest.raises(ValidationError, match="不允许的词语"):
        validate_content("这里教你怎么刷单")
