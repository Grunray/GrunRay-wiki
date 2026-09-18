import pytest

from app.friend_validate import (
    FriendValidationError,
    normalize_friend_url,
    validate_admin_update,
    validate_application,
    validate_http_url,
)


def test_normalize_strips_trailing_slash_and_lowercases_host():
    assert normalize_friend_url("HTTPS://Example.COM/blog/") == "https://example.com/blog"


def test_normalize_rejects_non_http():
    with pytest.raises(FriendValidationError, match="http"):
        normalize_friend_url("ftp://files.example.com")


def test_validate_http_url_optional_empty():
    assert validate_http_url("", field="头像地址", max_len=512, optional=True) is None


def test_application_requires_fields():
    with pytest.raises(FriendValidationError, match="站点名称"):
        validate_application(
            site_name="",
            site_url="https://example.com",
            description="一座个人站",
            contact_email="a@example.com",
        )


def test_application_rejects_bad_email():
    with pytest.raises(FriendValidationError, match="邮箱"):
        validate_application(
            site_name="示例站",
            site_url="https://example.com",
            description="一座个人站",
            contact_email="not-an-email",
        )


def test_application_ok():
    out = validate_application(
        site_name="示例站",
        site_url="https://Example.com/wiki",
        description="一座个人站",
        contact_email="owner@example.com",
        avatar_url="https://example.com/a.png",
    )
    assert out["name"] == "示例站"
    assert out["url_normalized"] == "https://example.com/wiki"
    assert out["avatar_url"] == "https://example.com/a.png"


def test_admin_update_invalid_sort():
    with pytest.raises(FriendValidationError, match="排序"):
        validate_admin_update({"sortOrder": "nope"})


def test_admin_update_partial():
    out = validate_admin_update({"sortOrder": 3, "contactEmail": ""})
    assert out["sort_order"] == 3
    assert out["contact_email"] is None
