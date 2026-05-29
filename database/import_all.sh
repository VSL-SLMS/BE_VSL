#!/usr/bin/env bash
set -euo pipefail

MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
DB_NAME="${DB_NAME:-vsl_learning}"

DATABASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MYSQL_ARGS=(-h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" --default-character-set=utf8mb4)
if [[ -n "$MYSQL_PASSWORD" ]]; then
  MYSQL_ARGS+=("-p$MYSQL_PASSWORD")
fi

run_sql_file() {
  local label="$1"
  local file="$2"

  if [[ ! -f "$file" ]]; then
    echo "Missing SQL file: $file"
    exit 1
  fi

  echo "$label"
  mysql "${MYSQL_ARGS[@]}" < "$file"
}

echo "============================================"
echo "   SLMS / VSL Database Import Pipeline"
echo "============================================"
echo

echo "[1/14] Dropping old database..."
mysql "${MYSQL_ARGS[@]}" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;"

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
run_sql_file "[14/14] Creating email OTP tables..." "$DATABASE_DIR/migrations/003_email_otps.sql"

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
