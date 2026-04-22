-- 增量：仅创建 wiki_project 表（已有库可单独执行）
-- 用法：cd backend && python scripts/run_sql.py --file wiki_project.sql

CREATE TABLE IF NOT EXISTS `wiki_project` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(64) NOT NULL COMMENT '对外 ID，与 post.extra.project_id 对齐',
  `slug` VARCHAR(255) NOT NULL,
  `locale` VARCHAR(8) NOT NULL DEFAULT 'zh',
  `title` VARCHAR(512) NOT NULL,
  `summary` TEXT NULL,
  `tags` JSON NULL COMMENT '字符串数组',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0 published 1 archived 2 hidden',
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `year` SMALLINT NULL DEFAULT NULL COMMENT '可选展示用',
  `start_date` DATE NULL DEFAULT NULL COMMENT '时间线主排序',
  `end_date` DATE NULL DEFAULT NULL,
  `github_url` VARCHAR(1024) NULL DEFAULT NULL,
  `demo_url` VARCHAR(1024) NULL DEFAULT NULL COMMENT 'Demo 静态页 URL',
  `layout` JSON NOT NULL COMMENT 'ProjectLayoutBlock[]',
  `related_posts_json` JSON NULL COMMENT '手动精选 [{slug,label?,pinned?}]',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wiki_project_public_id` (`public_id`),
  UNIQUE KEY `uq_wiki_project_slug` (`slug`),
  KEY `idx_wiki_project_status` (`status`),
  KEY `idx_wiki_project_start_date` (`start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
