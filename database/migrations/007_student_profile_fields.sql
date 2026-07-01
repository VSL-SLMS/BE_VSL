-- Adds Student profile fields that are not part of generic users.
-- Name, email, password, and avatar live in users.

SET @has_student_dob_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'students'
    AND column_name = 'date_of_birth'
);

SET @add_student_dob_column_sql := IF(
  @has_student_dob_column = 0,
  'ALTER TABLE students ADD COLUMN date_of_birth DATE NULL',
  'SELECT ''students.date_of_birth already exists'' AS message'
);

PREPARE add_student_dob_column_stmt FROM @add_student_dob_column_sql;
EXECUTE add_student_dob_column_stmt;
DEALLOCATE PREPARE add_student_dob_column_stmt;
