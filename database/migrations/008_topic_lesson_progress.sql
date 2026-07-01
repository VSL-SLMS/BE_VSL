CREATE TABLE IF NOT EXISTS topic_lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  order_index INT NOT NULL DEFAULT 0,
  estimated_minutes INT NOT NULL DEFAULT 10,
  source VARCHAR(100) NOT NULL DEFAULT 'CLOUDINARY_VSL_SAMPLE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_topic_lessons_order (order_index)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS topic_lesson_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_lesson_id INT NOT NULL,
  video_key VARCHAR(100) NOT NULL,
  word VARCHAR(255) NOT NULL,
  description TEXT NULL,
  cloudinary_public_id VARCHAR(255) NOT NULL,
  cloudinary_secure_url TEXT NOT NULL,
  cloudinary_resource_type VARCHAR(50) NOT NULL DEFAULT 'video',
  cloudinary_format VARCHAR(30) NULL,
  width INT NULL,
  height INT NULL,
  duration_seconds DECIMAL(8,3) NULL,
  bytes INT NULL,
  source_dataset VARCHAR(255) NULL,
  source_file VARCHAR(255) NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_lesson_id) REFERENCES topic_lessons(id) ON DELETE CASCADE,
  UNIQUE KEY unique_topic_video_key (topic_lesson_id, video_key),
  INDEX idx_topic_lesson_items_topic (topic_lesson_id, order_index),
  INDEX idx_topic_lesson_items_word (word)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_topic_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  topic_lesson_id INT NOT NULL,
  status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_lesson_id) REFERENCES topic_lessons(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_topic (student_id, topic_lesson_id),
  INDEX idx_student_topic_progress_student (student_id),
  INDEX idx_student_topic_progress_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_topic_video_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  topic_lesson_id INT NOT NULL,
  topic_lesson_item_id INT NOT NULL,
  status ENUM('NOT_STARTED', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_lesson_id) REFERENCES topic_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_lesson_item_id) REFERENCES topic_lesson_items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_topic_video (student_id, topic_lesson_item_id),
  INDEX idx_topic_video_progress_student_topic (student_id, topic_lesson_id),
  INDEX idx_topic_video_progress_status (status)
) ENGINE=InnoDB;
