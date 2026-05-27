-- Auth hardening:
-- - one seeded admin account
-- - teacher accounts are admin-created
-- - teacher temporary passwords require first-login password change

USE vsl_learning;

SET @has_must_change_password := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'must_change_password'
);

SET @add_must_change_password_sql := IF(
  @has_must_change_password = 0,
  'ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT ''users.must_change_password already exists'' AS message'
);

PREPARE add_must_change_password_stmt FROM @add_must_change_password_sql;
EXECUTE add_must_change_password_stmt;
DEALLOCATE PREPARE add_must_change_password_stmt;

-- Password: Admin@123
-- Change this after first login in any real deployment.
INSERT INTO users (
  username,
  email,
  password_hash,
  display_name,
  role,
  status,
  must_change_password
)
SELECT
  'admin',
  'admin@slms.local',
  '$2b$10$p9Gq5EIAIVfQA.dUeAYYVu1Z9SaLF0L79IqT2UP3QyfnMPvcx53Ki',
  'System Admin',
  'ADMIN',
  'ACTIVE',
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE role = 'ADMIN'
);
