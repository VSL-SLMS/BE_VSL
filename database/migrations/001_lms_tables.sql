-- SLMS LMS tables and compatibility updates.
-- Run after database/schema.sql and database/seed_01_structure.sql.

USE vsl_learning;

-- Existing VSL schema already has users. Extend it for LMS RBAC/status.
ALTER TABLE users
  MODIFY role ENUM('ADMIN', 'TEACHER', 'STUDENT') DEFAULT 'STUDENT';

SET @has_status_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'status'
);

SET @add_status_column_sql := IF(
  @has_status_column = 0,
  'ALTER TABLE users ADD COLUMN status ENUM(''ACTIVE'', ''SUSPENDED'') NOT NULL DEFAULT ''ACTIVE''',
  'SELECT ''users.status already exists'' AS message'
);

PREPARE add_status_column_stmt FROM @add_status_column_sql;
EXECUTE add_status_column_stmt;
DEALLOCATE PREPARE add_status_column_stmt;

SET @has_token_version_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'token_version'
);

SET @add_token_version_column_sql := IF(
  @has_token_version_column = 0,
  'ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 1',
  'SELECT ''users.token_version already exists'' AS message'
);

PREPARE add_token_version_column_stmt FROM @add_token_version_column_sql;
EXECUTE add_token_version_column_stmt;
DEALLOCATE PREPARE add_token_version_column_stmt;

SET @has_must_change_password_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'must_change_password'
);

SET @add_must_change_password_column_sql := IF(
  @has_must_change_password_column = 0,
  'ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT ''users.must_change_password already exists'' AS message'
);

PREPARE add_must_change_password_column_stmt FROM @add_must_change_password_column_sql;
EXECUTE add_must_change_password_column_stmt;
DEALLOCATE PREPARE add_must_change_password_column_stmt;

CREATE TABLE IF NOT EXISTS teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  accuracy DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  teacher_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  INDEX idx_students_teacher (teacher_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teacher_change_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  current_teacher_id INT NULL,
  requested_teacher_id INT NULL,
  reason TEXT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (current_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  lesson_id INT NOT NULL,
  status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_lesson (student_id, lesson_id),
  INDEX idx_lesson_progress_student (student_id)
) ENGINE=InnoDB;

-- VSL schema already includes bookmarks. Keep this here for new installs using partial schemas.
CREATE TABLE IF NOT EXISTS bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content_item_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bookmark (user_id, content_item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  instructions TEXT NOT NULL,
  deadline DATETIME NULL,
  allow_late_submission BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  INDEX idx_assignments_teacher (teacher_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assignment_students (
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  content TEXT,
  file_path VARCHAR(500),
  status ENUM('DRAFT', 'SUBMITTED', 'GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED') NOT NULL DEFAULT 'DRAFT',
  score DECIMAL(5,2) NULL,
  feedback TEXT,
  appeal_count INT NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at DATETIME NULL,
  graded_at DATETIME NULL,
  finalized_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_assignment_submission (assignment_id, student_id),
  INDEX idx_submissions_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appeals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  student_id INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('PENDING', 'REVIEWED', 'ESCALATED', 'APPROVED', 'REJECTED', 'FINALIZED') NOT NULL DEFAULT 'PENDING',
  teacher_note TEXT,
  admin_note TEXT,
  admin_score DECIMAL(5,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  finalized_at DATETIME NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_appeals_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teacher_accuracy_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  previous_accuracy DECIMAL(5,2) NOT NULL,
  new_accuracy DECIMAL(5,2) NOT NULL,
  severity ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, is_read)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id INT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_entity (entity, entity_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO system_configs (config_key, config_value)
VALUES ('penalty_severity', 'MEDIUM');

-- TODO: create the single admin account with bcrypt hash in an environment-specific seed.
