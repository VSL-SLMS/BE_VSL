-- ============================================
-- VSL Master Seed - Run all seed files in order
-- ============================================
-- Usage: mysql -u root -p < seed_all.sql
-- Or run each file individually in order

SOURCE seed_01_structure.sql;
SOURCE seed_02_alphabet_numbers.sql;
SOURCE seed_03_banthan.sql;
SOURCE seed_04_giadinh_nghenghiep.sql;
SOURCE seed_05_tunhien_thucvat_dongvat.sql;
SOURCE seed_06_truonghoc_giaothong_quehuong.sql;

-- Verification
SELECT 'Parts' AS entity, COUNT(*) AS total FROM parts
UNION ALL SELECT 'Chapters', COUNT(*) FROM chapters
UNION ALL SELECT 'Lessons', COUNT(*) FROM lessons
UNION ALL SELECT 'Page Images', COUNT(*) FROM page_images
UNION ALL SELECT 'Lesson Contents', COUNT(*) FROM lesson_contents
UNION ALL SELECT 'Content Items', COUNT(*) FROM content_items;
