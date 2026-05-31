-- 留言板：OAuth 访客 + 留言/回复（增量迁移，可单独执行）
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `guest_user` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `provider` ENUM('github', 'google') NOT NULL,
  `provider_user_id` VARCHAR(128) NOT NULL,
  `login` VARCHAR(255) NULL DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL DEFAULT NULL,
  `avatar_url` VARCHAR(1024) NULL DEFAULT NULL,
  `profile_url` VARCHAR(1024) NULL DEFAULT NULL,
  `is_blocked` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=禁止留言',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_guest_user_provider` (`provider`, `provider_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `guest_message` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `parent_id` BIGINT NULL DEFAULT NULL COMMENT 'NULL=顶层留言；非 NULL=回复',
  `guest_user_id` BIGINT NULL DEFAULT NULL,
  `author_name` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(1024) NULL DEFAULT NULL,
  `provider` ENUM('github', 'google') NULL DEFAULT NULL,
  `profile_url` VARCHAR(1024) NULL DEFAULT NULL,
  `content` TEXT NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0 pending 1 published 2 hidden 3 rejected',
  `is_owner` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_guest_message_public_id` (`public_id`),
  KEY `idx_guest_message_parent` (`parent_id`),
  KEY `idx_guest_message_status_created` (`status`, `created_at`),
  KEY `idx_guest_message_user` (`guest_user_id`),
  CONSTRAINT `fk_guest_message_parent` FOREIGN KEY (`parent_id`) REFERENCES `guest_message` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_guest_message_user` FOREIGN KEY (`guest_user_id`) REFERENCES `guest_user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
