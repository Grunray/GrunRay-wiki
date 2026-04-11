-- MySQL 8+ 推荐（JSON 类型）
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `post`;
DROP TABLE IF EXISTS `media`;
DROP TABLE IF EXISTS `category`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `category` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL,
  `parent_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_category_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `category` (`id`, `name`, `parent_id`) VALUES
(1, '杂项', NULL),
(2, '项目', NULL),
(3, '算法', NULL);

CREATE TABLE `post` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `legacy_id` VARCHAR(64) NULL DEFAULT NULL COMMENT '原静态 JSON id',
  `slug` VARCHAR(255) NOT NULL,
  `title` VARCHAR(512) NOT NULL,
  `md_url` VARCHAR(1024) NOT NULL COMMENT '相对 CONTENT_ROOT 的路径',
  `summary` TEXT NULL,
  `keywords` JSON NULL COMMENT 'JSON 数组，搜索/推荐用',
  `category_id` INT NOT NULL,
  `type` TINYINT NOT NULL COMMENT '0 article 1 project 2 algorithm',
  `views` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `published_at` DATETIME NULL DEFAULT NULL,
  `locale` VARCHAR(8) NOT NULL DEFAULT 'zh',
  `pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `pinned_order` INT NOT NULL DEFAULT 9999,
  `cover` VARCHAR(1024) NULL DEFAULT NULL,
  `extra` JSON NULL COMMENT '算法/项目笔记等扩展字段',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_post_slug` (`slug`),
  UNIQUE KEY `uq_post_legacy_id` (`legacy_id`),
  KEY `idx_post_type` (`type`),
  KEY `idx_post_category` (`category_id`),
  KEY `idx_post_published` (`published_at`),
  CONSTRAINT `fk_post_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `media` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `url` VARCHAR(1024) NOT NULL COMMENT '资源 URL，不存文件本体',
  `type` ENUM('image', 'gif', 'video') NOT NULL,
  `title` VARCHAR(255) NULL DEFAULT NULL,
  `article_id` BIGINT NULL DEFAULT NULL COMMENT '关联 post.id，可为空',
  `tags` JSON NULL COMMENT '标签数组',
  `views` INT NOT NULL DEFAULT 0 COMMENT '预留扩展：浏览量',
  `likes` INT NOT NULL DEFAULT 0 COMMENT '预留扩展：点赞量',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_media_type` (`type`),
  KEY `idx_media_article` (`article_id`),
  KEY `idx_media_created` (`created_at`),
  CONSTRAINT `fk_media_post` FOREIGN KEY (`article_id`) REFERENCES `post` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
