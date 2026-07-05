DELIMITER //

DROP PROCEDURE IF EXISTS add_submission_revision_column//
CREATE PROCEDURE add_submission_revision_column(IN in_column_name VARCHAR(64), IN in_column_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'submissions'
      AND COLUMN_NAME = in_column_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE submissions ADD COLUMN ', in_column_name, ' ', in_column_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

CALL add_submission_revision_column('revision_count', 'INT NOT NULL DEFAULT 0');

ALTER TABLE submissions
  MODIFY COLUMN status ENUM('DRAFT', 'SUBMITTED', 'NEEDS_REVISION', 'GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED') NOT NULL DEFAULT 'DRAFT';

CREATE TABLE IF NOT EXISTS submission_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  author_user_id INT NOT NULL,
  content TEXT NOT NULL,
  event_type ENUM('COMMENT', 'RETURNED_FOR_REVISION', 'RESUBMITTED', 'GRADED') NOT NULL DEFAULT 'COMMENT',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_submission_comments_submission (submission_id)
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS add_submission_revision_column;
