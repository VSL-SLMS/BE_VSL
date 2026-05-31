-- Stores one-time OTP codes for password changes.
-- The app also creates this table lazily on first OTP request for Railway deployments.

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose ENUM('CHANGE_PASSWORD') NOT NULL DEFAULT 'CHANGE_PASSWORD',
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_reset_otps_user_purpose (user_id, purpose, expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
