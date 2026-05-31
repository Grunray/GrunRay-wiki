-- 访客拉黑：增量迁移（在已有 guest_user 表上执行）
SET NAMES utf8mb4;

ALTER TABLE `guest_user`
  ADD COLUMN `is_blocked` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=禁止留言' AFTER `profile_url`;
