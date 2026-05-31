-- MySQL 8+ 推荐（JSON 类型）
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `friend_link`;
DROP TABLE IF EXISTS `guest_message`;
DROP TABLE IF EXISTS `guest_user`;
DROP TABLE IF EXISTS `music_track`;
DROP TABLE IF EXISTS `post`;
DROP TABLE IF EXISTS `media`;
DROP TABLE IF EXISTS `category`;
DROP TABLE IF EXISTS `wiki_project`;

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

CREATE TABLE `music_track` (
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

CREATE TABLE `wiki_project` (
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

CREATE TABLE `guest_user` (
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

CREATE TABLE `guest_message` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `parent_id` BIGINT NULL DEFAULT NULL,
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

CREATE TABLE `friend_link` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `url` VARCHAR(512) NOT NULL,
  `url_normalized` VARCHAR(512) NOT NULL,
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
