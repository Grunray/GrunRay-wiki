-- 友链：申请与已发布站点（增量迁移，可单独执行）
-- 用法：python scripts/run_sql.py --file friend_link.sql
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `friend_link` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `url` VARCHAR(512) NOT NULL,
  `url_normalized` VARCHAR(512) NOT NULL COMMENT '规范化 URL，用于去重',
  `description` VARCHAR(200) NOT NULL,
  `avatar_url` VARCHAR(512) NULL DEFAULT NULL,
  `cover_url` VARCHAR(512) NULL DEFAULT NULL,
  `tags` JSON NULL DEFAULT NULL,
  `contact_email` VARCHAR(128) NULL DEFAULT NULL,
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0 pending 1 published 2 hidden 3 rejected',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_friend_link_public_id` (`public_id`),
  KEY `idx_friend_link_status` (`status`),
  KEY `idx_friend_link_sort` (`sort_order`, `created_at`),
  KEY `idx_friend_link_url_normalized` (`url_normalized`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
