-- ============================================
-- VSL Learning Platform - Seed Data
-- Based on "Giáo trình Ngôn ngữ Kí hiệu Thực hành"
-- ============================================

USE vsl_learning;

-- ============================================
-- PARTS (2 phần chính)
-- ============================================
INSERT INTO parts (id, title, slug, description, order_index, icon) VALUES
(1, 'Những vấn đề chung về Ngôn ngữ Kí hiệu', 'phan-mot-ly-thuyet', 
   'Phần lý thuyết giúp bạn hiểu biết cơ bản về ngôn ngữ kí hiệu: lịch sử, khái niệm, đặc điểm, thành tố và đặc trưng ngữ pháp.', 
   1, '📚'),
(2, 'Thực hành Ngôn ngữ Kí hiệu theo các chủ đề', 'phan-hai-thuc-hanh', 
   'Thực hành 10 chủ đề từ vựng kí hiệu: chữ cái ngón tay, bản thân, gia đình, nghề nghiệp, tự nhiên, thực vật, động vật, trường học, giao thông, quê hương.', 
   2, '🤟');

-- ============================================
-- CHAPTERS (14 chương)
-- ============================================

-- Phần 1: Lý thuyết (4 chương)
INSERT INTO chapters (id, part_id, title, slug, description, order_index, start_page, end_page, icon) VALUES
(1, 1, 'Sơ lược lịch sử phát triển của Ngôn ngữ Kí hiệu', 'lich-su-phat-trien', 
   'Tìm hiểu nguồn gốc và quá trình phát triển của ngôn ngữ kí hiệu trên thế giới và Việt Nam.', 
   1, 7, 15, '📜'),
(2, 1, 'Ngôn ngữ Kí hiệu', 'ngon-ngu-ki-hieu', 
   'Khái niệm, đặc điểm, các loại kí hiệu, thành tố và đặc trưng ngữ pháp của ngôn ngữ kí hiệu.', 
   2, 16, 42, '🔤'),
(3, 1, 'Một số phương thức giao tiếp có sử dụng Kí hiệu', 'phuong-thuc-giao-tiep', 
   'Đánh vần bằng tay (fingerspelling), tín hiệu lời nói (cued speech), Makaton và kí hiệu hỗ trợ lời nói.', 
   3, 43, 51, '💬'),
(4, 1, 'Dạy và học Ngôn ngữ Kí hiệu', 'day-va-hoc', 
   'Phương pháp học và dạy ngôn ngữ kí hiệu cho người điếc và người nghe.', 
   4, 52, 74, '🎓');

-- Phần 2: Thực hành (10 chương)
INSERT INTO chapters (id, part_id, title, slug, description, order_index, start_page, end_page, icon) VALUES
(5, 2, 'Chữ cái ngón tay và Số tự nhiên', 'chu-cai-ngon-tay-so', 
   'Bảng chữ cái ngón tay tiếng Việt (A-Y, dấu thanh) và cách biểu diễn số tự nhiên bằng tay.', 
   1, 75, 79, '🔡'),
(6, 2, 'Bản thân', 'ban-than', 
   'Kí hiệu về cơ thể, đặc điểm ngoại hình, cảm xúc và trạng thái bản thân.', 
   2, 80, 102, '🧑'),
(7, 2, 'Gia đình', 'gia-dinh', 
   'Kí hiệu về các thành viên gia đình: ông, bà, bố, mẹ, anh, chị, em và các mối quan hệ.', 
   3, 103, 119, '👨‍👩‍👧‍👦'),
(8, 2, 'Nghề nghiệp', 'nghe-nghiep', 
   'Kí hiệu về các nghề nghiệp phổ biến trong xã hội.', 
   4, 120, 129, '👷'),
(9, 2, 'Hiện tượng tự nhiên', 'hien-tuong-tu-nhien', 
   'Kí hiệu về thời tiết, thiên nhiên và các hiện tượng tự nhiên.', 
   5, 130, 142, '🌤️'),
(10, 2, 'Thực vật', 'thuc-vat', 
   'Kí hiệu về cây cối, hoa quả và các loại thực vật thường gặp.', 
   6, 143, 160, '🌿'),
(11, 2, 'Động vật', 'dong-vat', 
   'Kí hiệu về các loài động vật: gia súc, gia cầm, động vật hoang dã, côn trùng.', 
   7, 161, 174, '🐾'),
(12, 2, 'Trường học', 'truong-hoc', 
   'Kí hiệu về đồ dùng học tập, môn học, hoạt động và không gian trường học.', 
   8, 175, 195, '🏫'),
(13, 2, 'Giao thông', 'giao-thong', 
   'Kí hiệu về phương tiện giao thông, biển báo và hoạt động di chuyển.', 
   9, 196, 208, '🚗'),
(14, 2, 'Quê hương - Đất nước', 'que-huong-dat-nuoc', 
   'Kí hiệu về địa danh, vùng miền và các khái niệm liên quan đến quê hương đất nước.', 
   10, 209, 218, '🇻🇳');

-- ============================================
-- LESSONS (Bài học chi tiết)
-- ============================================

-- Chapter 1: Lịch sử (pages 7-15)
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(1, 1, 'Sự xuất hiện Ngôn ngữ Kí hiệu', 'su-xuat-hien-nnkh', 'theory', 1, 7, 9, 15),
(2, 1, 'Các giai đoạn phát triển của Ngôn ngữ Kí hiệu', 'cac-giai-doan-phat-trien', 'theory', 2, 10, 14, 20),
(3, 1, 'Câu hỏi ôn tập & Bài tập thực hành - Chương 1.1', 'on-tap-1-1', 'quiz', 3, 15, 15, 10);

-- Chapter 2: NNKH (pages 16-42)
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(4, 2, 'Khái niệm Ngôn ngữ Kí hiệu', 'khai-niem-nnkh', 'theory', 1, 16, 17, 10),
(5, 2, 'Một số đặc điểm của Ngôn ngữ Kí hiệu', 'dac-diem-nnkh', 'theory', 2, 18, 19, 15),
(6, 2, 'Các loại Kí hiệu', 'cac-loai-ki-hieu', 'theory', 3, 20, 20, 10),
(7, 2, 'Các thành tố của một Kí hiệu', 'thanh-to-ki-hieu', 'theory', 4, 21, 35, 25),
(8, 2, 'Một số đặc trưng ngữ pháp của Ngôn ngữ Kí hiệu', 'dac-trung-ngu-phap', 'theory', 5, 36, 40, 20),
(9, 2, 'Câu hỏi ôn tập & Bài tập thực hành - Chương 1.2', 'on-tap-1-2', 'quiz', 6, 41, 42, 10);

-- Chapter 3: Phương thức giao tiếp (pages 43-51)
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(10, 3, 'Đánh vần bằng tay (Fingerspelling)', 'danh-van-bang-tay', 'theory', 1, 43, 47, 15),
(11, 3, 'Tín hiệu lời nói (Cued Speech)', 'tin-hieu-loi-noi', 'theory', 2, 48, 49, 10),
(12, 3, 'Makaton', 'makaton', 'theory', 3, 50, 50, 10),
(13, 3, 'Kí hiệu hỗ trợ lời nói (Sim-Com)', 'ki-hieu-ho-tro-loi-noi', 'theory', 4, 50, 50, 10),
(14, 3, 'Câu hỏi ôn tập & Bài tập thực hành - Chương 1.3', 'on-tap-1-3', 'quiz', 5, 51, 51, 10);

-- Chapter 4: Dạy và học (pages 52-74)
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(15, 4, 'Học Ngôn ngữ Kí hiệu', 'hoc-nnkh', 'theory', 1, 52, 59, 20),
(16, 4, 'Dạy Ngôn ngữ Kí hiệu cho trẻ điếc', 'day-nnkh-tre-diec', 'theory', 2, 60, 73, 25),
(17, 4, 'Câu hỏi ôn tập & Bài tập thực hành - Chương 1.4', 'on-tap-1-4', 'quiz', 3, 74, 74, 10);

-- Chapter 5: Chữ cái ngón tay (pages 75-79) - PRACTICE
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(18, 5, 'Bảng chữ cái ngón tay', 'bang-chu-cai-ngon-tay', 'practice', 1, 75, 76, 20),
(19, 5, 'Số tự nhiên bằng ngón tay', 'so-tu-nhien-ngon-tay', 'practice', 2, 77, 79, 15);

-- Chapter 6: Bản thân (pages 80-102) - PRACTICE
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(20, 6, 'Kí hiệu về bản thân', 'ki-hieu-ban-than', 'practice', 1, 80, 102, 30);

-- Chapter 7: Gia đình (pages 103-119) - PRACTICE
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(21, 7, 'Kí hiệu về gia đình', 'ki-hieu-gia-dinh', 'practice', 1, 103, 119, 25);

-- Chapter 8: Nghề nghiệp (pages 120-129) - PRACTICE
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(22, 8, 'Kí hiệu về nghề nghiệp', 'ki-hieu-nghe-nghiep', 'practice', 1, 120, 129, 20);

-- Chapter 9: Hiện tượng tự nhiên (pages 130-142) - PRACTICE
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(23, 9, 'Kí hiệu về hiện tượng tự nhiên', 'ki-hieu-tu-nhien', 'practice', 1, 130, 142, 20);

-- Chapter 10: Thực vật (pages 143-160) - PRACTICE
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(24, 10, 'Kí hiệu về thực vật', 'ki-hieu-thuc-vat', 'practice', 1, 143, 160, 25);

-- Chapter 11: Động vật (pages 161-174) - PRACTICE
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(25, 11, 'Kí hiệu về động vật', 'ki-hieu-dong-vat', 'practice', 1, 161, 174, 20);

-- Chapter 12: Trường học (pages 175-195) - PRACTICE
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(26, 12, 'Kí hiệu về trường học', 'ki-hieu-truong-hoc', 'practice', 1, 175, 195, 30);

-- Chapter 13: Giao thông (pages 196-208) - PRACTICE
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(27, 13, 'Kí hiệu về giao thông', 'ki-hieu-giao-thong', 'practice', 1, 196, 208, 20);

-- Chapter 14: Quê hương (pages 209-218) - PRACTICE
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(28, 14, 'Kí hiệu về quê hương - đất nước', 'ki-hieu-que-huong', 'practice', 1, 209, 218, 20);

-- ============================================
-- PAGE IMAGES (link original PDF pages to lessons)
-- Auto-generated from extracted images
-- ============================================

-- We'll generate this with a script, but here's the pattern:
-- Each lesson maps to its page range

-- Helper: Generate page_images for all lessons
-- Lesson 1: pages 7-9
INSERT INTO page_images (lesson_id, page_number, image_path, order_index)
SELECT 1, p.n, CONCAT('/images/pages/page', LPAD(p.n, 4, '0'), '_img01.png'), p.n - 7 + 1
FROM (SELECT 7 AS n UNION SELECT 8 UNION SELECT 9) p;

-- Lesson 2: pages 10-14
INSERT INTO page_images (lesson_id, page_number, image_path, order_index)
SELECT 2, p.n, CONCAT('/images/pages/page', LPAD(p.n, 4, '0'), '_img01.png'), p.n - 10 + 1
FROM (SELECT 10 AS n UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14) p;

-- Lesson 3: page 15
INSERT INTO page_images (lesson_id, page_number, image_path, order_index)
VALUES (3, 15, '/images/pages/page0015_img01.png', 1);

-- Lessons 4-17: Theory lessons (auto-generate in bulk)
-- We'll use a script to generate these more efficiently

-- ============================================
-- SAMPLE CONTENT for Practice Lessons
-- (Content Abstraction Layer in action)
-- ============================================

-- Lesson 18: Bảng chữ cái ngón tay (Grid layout)
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES
(1, 18, 'grid', 'Bảng chữ cái ngón tay tiếng Việt', 1);

INSERT INTO content_items (content_id, title, description, image_url, keywords, order_index) VALUES
(1, 'A', 'Nắm bàn tay phải, ngón cái đặt bên cạnh ngón trỏ', '/images/pages/page0075_img01.png', 'chữ cái,A,ngón tay', 1),
(1, 'B', 'Bàn tay phải mở, các ngón khép, ngón cái gập vào lòng bàn tay', '/images/pages/page0075_img01.png', 'chữ cái,B,ngón tay', 2),
(1, 'C', 'Bàn tay phải cong thành hình chữ C', '/images/pages/page0075_img01.png', 'chữ cái,C,ngón tay', 3),
(1, 'D', 'Ngón trỏ duỗi thẳng lên, các ngón còn lại gập, ngón cái chạm ngón giữa', '/images/pages/page0075_img01.png', 'chữ cái,D,ngón tay', 4),
(1, 'Đ', 'Tương tự D nhưng ngón trỏ cong nhẹ', '/images/pages/page0075_img01.png', 'chữ cái,Đ,ngón tay', 5);

-- Lesson 20: Bản thân (Grid layout - từ trang 80-102)
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES
(2, 20, 'grid', 'Kí hiệu về cơ thể và đặc điểm', 1);

INSERT INTO content_items (content_id, title, description, image_url, keywords, order_index) VALUES
(2, 'Bé trai', 'Tay phải khép, lòng bàn tay úp, đầu ngón tay hướng chếch sang trái, đặt trước ngực, đưa tay xuống dưới. Tay phải giống chữ cái ngón tay "U", lòng bàn tay hướng vào trong, đặt chạm vào cằm, giữ nguyên cánh tay, gập ngón tay xuống.', '/images/pages/page0080_img01.png', 'bé trai,trẻ em,giới tính,bản thân', 1),
(2, 'Bé gái', 'Tay phải khép, lòng bàn tay úp, đầu ngón tay hướng chếch sang trái, đặt trước ngực, đưa tay xuống dưới. Ngón trỏ và ngón cái tay phải nắm nhẹ vào tai phải (vị trí đeo khuyên tai).', '/images/pages/page0080_img01.png', 'bé gái,trẻ em,giới tính,bản thân', 2),
(2, 'Cao', 'Tay phải khép, lòng bàn tay úp, đầu ngón tay hướng chếch sang trái, đặt trước ngực, di chuyển tay lên trên.', '/images/pages/page0080_img01.png', 'cao,chiều cao,đặc điểm,bản thân', 3),
(2, 'Thấp', 'Tay phải khép, lòng bàn tay úp, đầu ngón tay hướng chếch sang trái, đặt trước ngực, di chuyển tay xuống dưới.', '/images/pages/page0080_img01.png', 'thấp,chiều cao,đặc điểm,bản thân', 4),
(2, 'Gầy', 'Hai tay nắm, ngón cái mở ra, hướng lên trên, lòng bàn tay hướng vào nhau, đặt ở hai bên, di chuyển đồng thời cả tay vào gần nhau.', '/images/pages/page0081_img01.png', 'gầy,thể trạng,đặc điểm,bản thân', 5),
(2, 'Béo', 'Hai tay mở, lòng bàn tay hướng vào nhau, đầu ngón tay hướng lên trên, đặt gần hai bên má, di chuyển đồng thời cả hai tay sang hai bên.', '/images/pages/page0081_img01.png', 'béo,thể trạng,đặc điểm,bản thân', 6),
(2, 'Đầu', 'Tay phải khép, lòng bàn tay hướng sang trái, đầu ngón tay hướng lên trên, đặt gần đầu, di chuyển tay chạm vào đầu.', '/images/pages/page0081_img01.png', 'đầu,cơ thể,bộ phận,bản thân', 7),
(2, 'Tóc', 'Tay phải mở, ngón cái và ngón trỏ nắm nhẹ vào tóc.', '/images/pages/page0081_img01.png', 'tóc,cơ thể,bộ phận,bản thân', 8),
(2, 'Mắt', 'Tay phải giống số tự nhiên "1", lòng bàn tay hướng vào trong, đặt chạm đầu ngón tay trỏ vào đuôi mắt phải.', '/images/pages/page0081_img01.png', 'mắt,cơ thể,bộ phận,bản thân', 9),
(2, 'Mũi', 'Tay phải giống số tự nhiên "1", lòng bàn tay hướng vào trong, đặt chạm đầu ngón tay trỏ vào mũi.', '/images/pages/page0081_img01.png', 'mũi,cơ thể,bộ phận,bản thân', 10);

-- Lesson 21: Gia đình (Grid layout - từ trang 103-119)
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES
(3, 21, 'grid', 'Kí hiệu về gia đình và thân tộc', 1);

INSERT INTO content_items (content_id, title, description, image_url, keywords, order_index) VALUES
(3, 'Gia đình', 'Hai tay giống chữ cái ngón tay "G", lòng bàn tay hướng vào nhau, đầu ngón tay hướng lên trên, đặt song song trước ngực, di chuyển đồng thời cả hai tay theo đường vòng cung về phía trước và chạm vào nhau.', '/images/pages/page0103_img01.png', 'gia đình,family,thân tộc', 1),
(3, 'Họ hàng', 'Hai tay khép, lòng bàn tay úp, đầu ngón tay hướng về phía trước, đặt song song trước ngực, giữ nguyên tay trái, di chuyển tay phải xuống dưới 3 bậc.', '/images/pages/page0103_img01.png', 'họ hàng,thân tộc,gia đình', 2),
(3, 'Ông', 'Tay phải giống chữ cái ngón tay "C", lòng bàn tay hướng vào trong, đặt phía dưới sát cằm, di chuyển tay xuống dưới, đồng thời nắm tay lại.', '/images/pages/page0103_img01.png', 'ông,ông nội,ông ngoại,gia đình', 3),
(3, 'Bà', 'Tay phải nắm, ngón cái và ngón trỏ mở ra, giống chữ cái ngón tay "C", lòng bàn tay hướng vào trong, đặt vào hai khoé miệng, đưa nhẹ tay xuống dưới đồng thời hai ngón tay chạm vào nhau.', '/images/pages/page0103_img01.png', 'bà,bà nội,bà ngoại,gia đình', 4);

-- ============================================
-- Generate page_images for ALL practice lessons
-- ============================================

-- Helper procedure to bulk insert page images
DELIMITER //
CREATE PROCEDURE generate_page_images()
BEGIN
  DECLARE v_lesson_id INT;
  DECLARE v_start INT;
  DECLARE v_end INT;
  DECLARE v_page INT;
  DECLARE v_order INT;
  DECLARE done INT DEFAULT FALSE;
  
  DECLARE lesson_cursor CURSOR FOR 
    SELECT id, start_page, end_page FROM lessons WHERE start_page IS NOT NULL;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  OPEN lesson_cursor;
  
  read_loop: LOOP
    FETCH lesson_cursor INTO v_lesson_id, v_start, v_end;
    IF done THEN LEAVE read_loop; END IF;
    
    SET v_order = 1;
    SET v_page = v_start;
    
    WHILE v_page <= v_end DO
      INSERT IGNORE INTO page_images (lesson_id, page_number, image_path, order_index)
      VALUES (v_lesson_id, v_page, CONCAT('/images/pages/page', LPAD(v_page, 4, '0'), '_img01.png'), v_order);
      SET v_page = v_page + 1;
      SET v_order = v_order + 1;
    END WHILE;
  END LOOP;
  
  CLOSE lesson_cursor;
END //
DELIMITER ;

CALL generate_page_images();
DROP PROCEDURE generate_page_images;

-- Verify counts
SELECT 'Parts' AS entity, COUNT(*) AS count FROM parts
UNION ALL
SELECT 'Chapters', COUNT(*) FROM chapters
UNION ALL
SELECT 'Lessons', COUNT(*) FROM lessons
UNION ALL
SELECT 'Page Images', COUNT(*) FROM page_images
UNION ALL
SELECT 'Lesson Contents', COUNT(*) FROM lesson_contents
UNION ALL
SELECT 'Content Items', COUNT(*) FROM content_items;
