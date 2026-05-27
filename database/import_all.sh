#!/usr/bin/env bash
set -euo pipefail

MYSQL_USER="${MYSQL_USER:-${MYSQLUSER:-root}}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-${MYSQLPASSWORD:-}}"
MYSQL_HOST="${MYSQL_HOST:-${MYSQLHOST:-127.0.0.1}}"
MYSQL_PORT="${MYSQL_PORT:-${MYSQLPORT:-3306}}"
DB_NAME="${DB_NAME:-${MYSQLDATABASE:-vsl_learning}}"
SKIP_DROP_DATABASE="${SKIP_DROP_DATABASE:-false}"
CREATE_DATABASE="${CREATE_DATABASE:-true}"

DATABASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "Invalid DB_NAME: $DB_NAME"
  exit 1
fi

MYSQL_ARGS=(-h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" --default-character-set=utf8mb4)
if [[ -n "$MYSQL_PASSWORD" ]]; then
  MYSQL_ARGS+=("-p$MYSQL_PASSWORD")
fi

normalize_sql_file() {
  local source_file="$1"
  local target_file="$TMP_DIR/$(basename "$source_file")"

  if [[ "$CREATE_DATABASE" == "true" ]]; then
    perl -0pe "
      s/CREATE DATABASE IF NOT EXISTS\\s+vsl_learning\\s+CHARACTER SET utf8mb4\\s+COLLATE utf8mb4_unicode_ci;/CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;/g;
      s/USE vsl_learning;/USE \`$DB_NAME\`;/g;
    " "$source_file" > "$target_file"
  else
    perl -0pe "
      s/CREATE DATABASE IF NOT EXISTS\\s+vsl_learning\\s+CHARACTER SET utf8mb4\\s+COLLATE utf8mb4_unicode_ci;/-- CREATE DATABASE skipped by CREATE_DATABASE=false/g;
      s/USE vsl_learning;/USE \`$DB_NAME\`;/g;
    " "$source_file" > "$target_file"
  fi

  echo "$target_file"
}

run_sql_file() {
  local label="$1"
  local file="$2"

  if [[ ! -f "$file" ]]; then
    echo "Missing SQL file: $file"
    exit 1
  fi

  echo "$label"
  mysql "${MYSQL_ARGS[@]}" < "$(normalize_sql_file "$file")"
}

echo "============================================"
echo "   SLMS / VSL Database Import Pipeline"
echo "============================================"
echo

if [[ "$SKIP_DROP_DATABASE" == "true" ]]; then
  echo "[1/14] Skipping database drop for '$DB_NAME'..."
else
  echo "[1/14] Dropping old database '$DB_NAME'..."
  mysql "${MYSQL_ARGS[@]}" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;"
fi

run_sql_file "[2/14] Creating schema..." "$DATABASE_DIR/schema.sql"
run_sql_file "[3/14] Importing seed_01_structure..." "$DATABASE_DIR/seed_01_structure.sql"
run_sql_file "[4/14] Importing seed_02_alphabet_numbers..." "$DATABASE_DIR/seed_02_alphabet_numbers.sql"
run_sql_file "[5/14] Importing seed_03_banthan..." "$DATABASE_DIR/seed_03_banthan.sql"
run_sql_file "[6/14] Importing seed_03_missing..." "$DATABASE_DIR/seed_03_missing.sql"
run_sql_file "[7/14] Importing seed_04_giadinh_nghenghiep..." "$DATABASE_DIR/seed_04_giadinh_nghenghiep.sql"
run_sql_file "[8/14] Importing seed_04_giadinh_full..." "$DATABASE_DIR/seed_04_giadinh_full.sql"
run_sql_file "[9/14] Importing seed_05_tunhien_thucvat_dongvat..." "$DATABASE_DIR/seed_05_tunhien_thucvat_dongvat.sql"
run_sql_file "[10/14] Importing seed_06_truonghoc_giaothong_quehuong..." "$DATABASE_DIR/seed_06_truonghoc_giaothong_quehuong.sql"
run_sql_file "[11/14] Importing seed_05_nghenghiep_full..." "$DATABASE_DIR/seed_05_nghenghiep_full.sql"
run_sql_file "[12/14] Importing LMS tables..." "$DATABASE_DIR/migrations/001_lms_tables.sql"
run_sql_file "[13/14] Applying SLMS image URL migration placeholder..." "$DATABASE_DIR/migrations/002_fix_image_urls.sql"
run_sql_file "[14/14] Applying auth/admin/teacher controls..." "$DATABASE_DIR/migrations/003_auth_admin_teacher_controls.sql"

echo
echo "============================================"
echo "           VERIFICATION REPORT"
echo "============================================"
mysql "${MYSQL_ARGS[@]}" "$DB_NAME" -e "
SELECT 'Parts' AS entity, COUNT(*) AS total FROM parts
UNION ALL SELECT 'Chapters', COUNT(*) FROM chapters
UNION ALL SELECT 'Lessons', COUNT(*) FROM lessons
UNION ALL SELECT 'Page Images', COUNT(*) FROM page_images
UNION ALL SELECT 'Lesson Contents', COUNT(*) FROM lesson_contents
UNION ALL SELECT 'Content Items', COUNT(*) FROM content_items
UNION ALL SELECT 'Teachers table rows', COUNT(*) FROM teachers
UNION ALL SELECT 'Students table rows', COUNT(*) FROM students;
"

echo
echo "Import completed successfully."
