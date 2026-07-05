DELIMITER //

DROP PROCEDURE IF EXISTS add_submission_cloudinary_column//
CREATE PROCEDURE add_submission_cloudinary_column(IN in_column_name VARCHAR(64), IN in_column_definition TEXT)
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

DROP PROCEDURE IF EXISTS add_submission_cloudinary_index//
CREATE PROCEDURE add_submission_cloudinary_index(IN in_index_name VARCHAR(64), IN in_index_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'submissions'
      AND INDEX_NAME = in_index_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE submissions ADD INDEX ', in_index_name, ' ', in_index_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

CALL add_submission_cloudinary_column('cloudinary_public_id', 'VARCHAR(255) NULL');
CALL add_submission_cloudinary_column('cloudinary_asset_id', 'VARCHAR(255) NULL');
CALL add_submission_cloudinary_column('cloudinary_secure_url', 'TEXT NULL');
CALL add_submission_cloudinary_column('cloudinary_resource_type', 'VARCHAR(50) NULL');
CALL add_submission_cloudinary_column('cloudinary_format', 'VARCHAR(30) NULL');
CALL add_submission_cloudinary_column('media_bytes', 'BIGINT NULL');
CALL add_submission_cloudinary_column('media_duration_seconds', 'DECIMAL(10,3) NULL');
CALL add_submission_cloudinary_column('original_filename', 'VARCHAR(255) NULL');
CALL add_submission_cloudinary_column('media_delivery_type', 'VARCHAR(30) NULL DEFAULT ''authenticated''');
CALL add_submission_cloudinary_index('idx_submissions_cloudinary_public_id', '(cloudinary_public_id)');

DROP PROCEDURE IF EXISTS add_submission_cloudinary_column;
DROP PROCEDURE IF EXISTS add_submission_cloudinary_index;
