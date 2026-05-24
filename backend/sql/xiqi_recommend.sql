-- 推荐条目（栖息 / recommend）
CREATE TABLE IF NOT EXISTS `xiqi_recommend` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(64) NOT NULL COMMENT '对外 id',
  `category` ENUM('software', 'opensource', 'anime') NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL COMMENT '推荐指数 1-5',
  `title` VARCHAR(255) NOT NULL,
  `status` ENUM('published', 'hidden', 'draft') NOT NULL DEFAULT 'published',
  `md_url` VARCHAR(512) NOT NULL COMMENT '相对 CONTENT_ROOT，如 xiqi/recommendations/xxx.md',
  `images` JSON NULL COMMENT '[{url, alt}]',
  `cover_index` INT NOT NULL DEFAULT 0,
  `summary` VARCHAR(500) NULL COMMENT '列表摘要',
  `url` VARCHAR(1024) NULL COMMENT '外链',
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_recommend_public_id` (`public_id`),
  KEY `idx_recommend_list` (`status`, `category`, `rating`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
