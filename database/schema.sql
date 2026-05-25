-- ============================================
-- VSL Learning Platform - Database Schema v2.0
-- Content Abstraction Layer Architecture
-- NO icons/logos - clean data only
-- ============================================

CREATE DATABASE IF NOT EXISTS vsl_learning
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vsl_learning;

-- ============================================
-- CORE STRUCTURE: Parts -> Chapters -> Lessons
-- ============================================

-- Parts (Phan): top-level grouping
CREATE TABLE parts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (order_index)
) ENGINE=InnoDB;

-- Chapters (Chuong): belong to a Part
CREATE TABLE chapters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  part_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  start_page INT,
  end_page INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
  INDEX idx_part_order (part_id, order_index)
) ENGINE=InnoDB;

-- Lessons (Bai hoc): belong to a Chapter
CREATE TABLE lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  lesson_type ENUM('theory', 'practice', 'quiz', 'exercise') NOT NULL DEFAULT 'theory',
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  start_page INT,
  end_page INT,
  estimated_minutes INT DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  INDEX idx_chapter_order (chapter_id, order_index)
) ENGINE=InnoDB;

-- ============================================
-- CONTENT ABSTRACTION LAYER
-- lesson_contents -> content_blocks / content_items
-- ============================================

-- Lesson Contents: container for content sections within a lesson
CREATE TABLE lesson_contents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  type ENUM('article', 'grid') NOT NULL,
  title VARCHAR(255),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  INDEX idx_lesson_order (lesson_id, order_index)
) ENGINE=InnoDB;

-- Content Blocks: for 'article' type lesson_contents
-- Text paragraphs + embedded images in reading order
CREATE TABLE content_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content_id INT NOT NULL,
  type ENUM('text', 'image', 'heading', 'quote', 'list') NOT NULL DEFAULT 'text',
  text_content TEXT,
  image_url VARCHAR(500),
  image_caption VARCHAR(500),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES lesson_contents(id) ON DELETE CASCADE,
  INDEX idx_content_order (content_id, order_index),
  FULLTEXT idx_text_search (text_content)
) ENGINE=InnoDB;

-- Content Items: for 'grid' type lesson_contents
-- Sign language vocabulary cards (title + description)
CREATE TABLE content_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  keywords VARCHAR(500),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES lesson_contents(id) ON DELETE CASCADE,
  INDEX idx_content_order (content_id, order_index),
  FULLTEXT idx_search (title, description, keywords)
) ENGINE=InnoDB;

-- Page Images: original PDF page images (fallback / book mode)
CREATE TABLE page_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  page_number INT NOT NULL,
  image_path VARCHAR(500) NOT NULL,
  width INT,
  height INT,
  order_index INT NOT NULL DEFAULT 0,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  INDEX idx_lesson_page (lesson_id, order_index)
) ENGINE=InnoDB;

-- ============================================
-- USER SYSTEM
-- ============================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  avatar_url VARCHAR(500),
  role ENUM('student', 'teacher', 'admin') DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- User Progress: track learning completion
CREATE TABLE user_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  last_content_id INT,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_lesson (user_id, lesson_id),
  INDEX idx_user (user_id),
  INDEX idx_lesson (lesson_id)
) ENGINE=InnoDB;

-- Bookmarks: save favorite signs
CREATE TABLE bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content_item_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bookmark (user_id, content_item_id)
) ENGINE=InnoDB;
