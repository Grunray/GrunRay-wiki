from __future__ import annotations

from dataclasses import dataclass

from app.friend_status import (
    STATUS_HIDDEN,
    STATUS_PENDING,
    STATUS_PUBLISHED,
    STATUS_REJECTED,
)


@dataclass
class FriendModerationError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


def status_for_action(current: int, action: str) -> int:
    action = (action or "").strip().lower()
    if action == "approve":
        if current in (STATUS_PENDING, STATUS_HIDDEN):
            return STATUS_PUBLISHED
        raise FriendModerationError("当前状态无法通过审核")
    if action == "reject":
        if current == STATUS_PENDING:
            return STATUS_REJECTED
        raise FriendModerationError("仅待审核申请可拒绝")
    if action == "hide":
        if current == STATUS_PUBLISHED:
            return STATUS_HIDDEN
        raise FriendModerationError("仅已发布友链可隐藏")
    if action == "restore":
        if current == STATUS_HIDDEN:
            return STATUS_PUBLISHED
        raise FriendModerationError("仅已隐藏友链可恢复")
    raise FriendModerationError("未知的审核动作")
