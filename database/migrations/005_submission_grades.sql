CREATE TABLE IF NOT EXISTS submission_grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  graded_by_user_id INT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  feedback TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_submission_grades_submission (submission_id)
) ENGINE=InnoDB;
