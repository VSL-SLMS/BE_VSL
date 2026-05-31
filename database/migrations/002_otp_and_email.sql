
-- Add OTP tracking table
CREATE TABLE IF NOT EXISTS otp_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used BOOLEAN DEFAULT FALSE,
  INDEX idx_email_otp (email, otp_code)
) ENGINE=InnoDB;

-- Ensure users table supports UNVERIFIED status (if required) or modify registration logic to hold until OTP verification.
-- We'll add a 'VERIFIED' flag to the users table
SET @has_verified_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'is_verified'
);
SET @add_verified_column_sql := IF(
  @has_verified_column = 0,
  'ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT ''users.is_verified already exists'' AS message'
);
PREPARE add_verified_column_stmt FROM @add_verified_column_sql;
EXECUTE add_verified_column_stmt;
DEALLOCATE PREPARE add_verified_column_stmt;



-- Add token_version to users
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
  'SELECT \'users.token_version already exists\' AS message'
);
PREPARE add_token_version_column_stmt FROM @add_token_version_column_sql;
EXECUTE add_token_version_column_stmt;
DEALLOCATE PREPARE add_token_version_column_stmt;
