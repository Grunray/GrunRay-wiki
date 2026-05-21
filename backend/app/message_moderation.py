from __future__ import annotations

from dataclasses import dataclass

from app.message_status import (
    STATUS_HIDDEN,
    STATUS_PENDING,
    STATUS_PUBLISHED,
    STATUS_REJECTED,
)


@dataclass
class ModerationError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


def status_for_action(current: int, action: str) -> int:
    """将审核动作映射为目标 status，非法迁移抛出 ModerationError。"""
    action = (action or "").strip().lower()
    if action == "approve":
        if current in (STATUS_PENDING, STATUS_HIDDEN):
            return STATUS_PUBLISHED
        raise ModerationError("当前状态无法通过审核")
    if action == "reject":
        if current == STATUS_PENDING:
            return STATUS_REJECTED
        raise ModerationError("仅待审核留言可拒绝")
    if action == "hide":
        if current == STATUS_PUBLISHED:
            return STATUS_HIDDEN
        raise ModerationError("仅已发布留言可隐藏")
    if action == "restore":
        if current == STATUS_HIDDEN:
            return STATUS_PUBLISHED
        raise ModerationError("仅已隐藏留言可恢复")
    raise ModerationError("未知的审核动作")
