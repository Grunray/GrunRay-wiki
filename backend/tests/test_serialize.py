from datetime import datetime

from app.friend_serialize import row_to_admin_friend, row_to_friend
from app.keywords_match import passes_scheme_c, split_terms
from app.message_serialize import row_to_message
from app.serialize import row_to_post


def test_row_to_friend_public_shape():
    row = {
        "public_id": "abc",
        "name": "友站",
        "url": "https://friend.example",
        "description": "简介",
        "avatar_url": "https://friend.example/a.png",
        "cover_url": None,
        "tags": '["tech"]',
    }
    item = row_to_friend(row)
    assert item["id"] == "abc"
    assert item["avatar"] == "https://friend.example/a.png"
    assert item["tags"] == ["tech"]
    assert "status" not in item


def test_row_to_admin_friend_includes_status():
    row = {
        "public_id": "abc",
        "name": "友站",
        "url": "https://friend.example",
        "description": "简介",
        "status": 0,
        "sort_order": 2,
        "contact_email": "a@b.c",
        "created_at": datetime(2026, 9, 1, 12, 0, 0),
        "updated_at": None,
    }
    item = row_to_admin_friend(row)
    assert item["status"] == 0
    assert item["sortOrder"] == 2
    assert item["contactEmail"] == "a@b.c"
    assert item["createdAt"].startswith("2026-09-01")


def test_row_to_message_replies_and_owner_flag():
    row = {
        "public_id": "m1",
        "author_name": "访客",
        "content": "你好",
        "is_owner": 0,
        "profile_url": "https://github.com/someone",
        "created_at": datetime(2026, 1, 1, 8, 0, 0),
    }
    replies = [
        {
            "public_id": "r1",
            "author_name": "GrunRay",
            "content": "收到",
            "is_owner": 1,
            "profile_url": "https://github.com/Grunray",
            "created_at": datetime(2026, 1, 1, 9, 0, 0),
        }
    ]
    item = row_to_message(row, replies)
    assert item["id"] == "m1"
    assert item["isOwner"] is False
    assert len(item["replies"]) == 1
    assert item["replies"][0]["isOwner"] is True


def test_row_to_post_maps_type_and_tags():
    row = {
        "id": 9,
        "legacy_id": None,
        "slug": "hello",
        "locale": "zh",
        "title": "标题",
        "summary": "摘要",
        "published_at": datetime(2026, 5, 1, 0, 0, 0),
        "updated_at": None,
        "keywords": '["vue","flask"]',
        "category_id": 1,
        "pinned": 0,
        "pinned_order": 0,
        "type": 2,
        "cover": None,
        "extra": '{"oj":"luogu","difficulty":"绿"}',
        "md_url": "posts/hello.md",
    }
    post = row_to_post(row)
    assert post["type"] == "algorithm"
    assert post["tags"] == ["vue", "flask"]
    assert post["oj"] == "luogu"
    assert "body" not in post


def test_search_scheme_c_and():
    assert split_terms("  vue  flask ") == ["vue", "flask"]
    assert passes_scheme_c(["vue"], "Vue 笔记", "", []) is True
    assert passes_scheme_c(["vue", "missing"], "Vue 笔记", "", []) is False
