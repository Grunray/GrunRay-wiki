-- 增量：首页 NOW · 此刻（在写 / 在读）
-- 用法：cd backend && python scripts/run_sql.py --file site_now.sql
-- 空字符串表示回退前端 i18n 默认文案。

CREATE TABLE IF NOT EXISTS `site_now` (
  `id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `doing` VARCHAR(200) NOT NULL DEFAULT '',
  `reading` VARCHAR(200) NOT NULL DEFAULT '',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
