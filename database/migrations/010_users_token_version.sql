SET @has_token_version_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'token_version'
);

SET @add_token_version_column_sql := IF(
  @has_token_version_column = 0,
  'ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 1 AFTER role',
  'SELECT ''users.token_version already exists'' AS message'
);

PREPARE add_token_version_column_stmt FROM @add_token_version_column_sql;
EXECUTE add_token_version_column_stmt;
DEALLOCATE PREPARE add_token_version_column_stmt;
