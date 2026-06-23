-- Adds practical teacher-selection profile fields.
-- Run after 001_lms_tables.sql.

SET @has_bio_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'teachers'
    AND column_name = 'bio'
);

SET @add_bio_column_sql := IF(
  @has_bio_column = 0,
  'ALTER TABLE teachers ADD COLUMN bio TEXT NULL',
  'SELECT ''teachers.bio already exists'' AS message'
);

PREPARE add_bio_column_stmt FROM @add_bio_column_sql;
EXECUTE add_bio_column_stmt;
DEALLOCATE PREPARE add_bio_column_stmt;

SET @has_specialization_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'teachers'
    AND column_name = 'specialization'
);

SET @add_specialization_column_sql := IF(
  @has_specialization_column = 0,
  'ALTER TABLE teachers ADD COLUMN specialization VARCHAR(255) NULL',
  'SELECT ''teachers.specialization already exists'' AS message'
);

PREPARE add_specialization_column_stmt FROM @add_specialization_column_sql;
EXECUTE add_specialization_column_stmt;
DEALLOCATE PREPARE add_specialization_column_stmt;

SET @has_availability_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'teachers'
    AND column_name = 'availability_status'
);

SET @add_availability_column_sql := IF(
  @has_availability_column = 0,
  'ALTER TABLE teachers ADD COLUMN availability_status ENUM(''OPEN'', ''LIMITED'', ''FULL'') NOT NULL DEFAULT ''OPEN''',
  'SELECT ''teachers.availability_status already exists'' AS message'
);

PREPARE add_availability_column_stmt FROM @add_availability_column_sql;
EXECUTE add_availability_column_stmt;
DEALLOCATE PREPARE add_availability_column_stmt;

SET @has_max_students_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'teachers'
    AND column_name = 'max_students'
);

SET @add_max_students_column_sql := IF(
  @has_max_students_column = 0,
  'ALTER TABLE teachers ADD COLUMN max_students INT NOT NULL DEFAULT 30',
  'SELECT ''teachers.max_students already exists'' AS message'
);

PREPARE add_max_students_column_stmt FROM @add_max_students_column_sql;
EXECUTE add_max_students_column_stmt;
DEALLOCATE PREPARE add_max_students_column_stmt;

SET @has_reliability_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'teachers'
    AND column_name = 'reliability_label'
);

SET @add_reliability_column_sql := IF(
  @has_reliability_column = 0,
  'ALTER TABLE teachers ADD COLUMN reliability_label ENUM(''NEW'', ''RELIABLE'', ''HIGHLY_RELIABLE'') NOT NULL DEFAULT ''NEW''',
  'SELECT ''teachers.reliability_label already exists'' AS message'
);

PREPARE add_reliability_column_stmt FROM @add_reliability_column_sql;
EXECUTE add_reliability_column_stmt;
DEALLOCATE PREPARE add_reliability_column_stmt;
