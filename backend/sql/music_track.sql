-- 增量迁移：已有库在未整体重跑 schema.sql 时执行本文件即可。
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `music_track` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `url` VARCHAR(768) NOT NULL COMMENT '同源 /api/media/files/music/...；768=InnoDB utf8mb4 唯一索引字节上限',
  `title` VARCHAR(255) NULL DEFAULT NULL,
  `artist` VARCHAR(255) NULL DEFAULT NULL,
  `duration_sec` INT NULL DEFAULT NULL COMMENT '秒，可选，导入脚本可后续用 ffprobe 填充',
  `post_id` BIGINT NULL DEFAULT NULL COMMENT '可选关联 post.id',
  `tags` JSON NULL COMMENT '标签数组',
  `sort_order` INT NOT NULL DEFAULT 9999 COMMENT '越小越靠前',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_music_track_url` (`url`),
  KEY `idx_music_sort` (`sort_order`, `id`),
  KEY `idx_music_post` (`post_id`),
  CONSTRAINT `fk_music_track_post` FOREIGN KEY (`post_id`) REFERENCES `post` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
