-- 栖息分区页面配置（Hero 等）
CREATE TABLE IF NOT EXISTS `xiqi_page` (
  `page` VARCHAR(32) NOT NULL COMMENT 'fragments | about | recommend',
  `hero_image_url` VARCHAR(1024) NULL,
  `hero_image_alt` VARCHAR(255) NULL DEFAULT '',
  `status` ENUM('published', 'hidden') NOT NULL DEFAULT 'published',
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`page`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
