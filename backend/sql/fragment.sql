-- 碎念（栖息 / fragments）
CREATE TABLE IF NOT EXISTS `fragment` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(64) NOT NULL COMMENT '对外 id',
  `mood` ENUM('rant', 'sketch', 'flash', 'daily') NOT NULL,
  `status` ENUM('published', 'hidden', 'draft') NOT NULL DEFAULT 'published',
  `md_url` VARCHAR(512) NOT NULL COMMENT '相对 CONTENT_ROOT，如 xiqi/fragments/xxx.md',
  `images` JSON NULL COMMENT '[{url, alt}]',
  `cover_index` INT NOT NULL DEFAULT 0,
  `summary` VARCHAR(500) NULL COMMENT '列表摘要',
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fragment_public_id` (`public_id`),
  KEY `idx_fragment_status_created` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
