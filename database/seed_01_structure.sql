-- ============================================
-- VSL Seed 01: Parts, Chapters, Lessons
-- NO icons/logos
-- ============================================
USE vsl_learning;

-- PARTS
INSERT INTO parts (id, title, slug, description, order_index) VALUES
(1, 'Những vấn đề chung về Ngôn ngữ Kí hiệu', 'phan-mot-ly-thuyet',
   'Phần lý thuyết giúp bạn hiểu biết cơ bản về ngôn ngữ kí hiệu: lịch sử, khái niệm, đặc điểm, thành tố và đặc trưng ngữ pháp.', 1),
(2, 'Thực hành Ngôn ngữ Kí hiệu theo các chủ đề', 'phan-hai-thuc-hanh',
   'Thực hành 10 chủ đề từ vựng kí hiệu: chữ cái ngón tay, bản thân, gia đình, nghề nghiệp, tự nhiên, thực vật, động vật, trường học, giao thông, quê hương.', 2);

-- CHAPTERS - Phan 1: Ly thuyet
INSERT INTO chapters (id, part_id, title, slug, description, order_index, start_page, end_page) VALUES
(1, 1, 'Sơ lược lịch sử phát triển của Ngôn ngữ Kí hiệu', 'lich-su-phat-trien',
   'Tìm hiểu nguồn gốc và quá trình phát triển của ngôn ngữ kí hiệu trên thế giới và Việt Nam.', 1, 7, 15),
(2, 1, 'Ngôn ngữ Kí hiệu', 'ngon-ngu-ki-hieu',
   'Khái niệm, đặc điểm, các loại kí hiệu, thành tố và đặc trưng ngữ pháp của ngôn ngữ kí hiệu.', 2, 16, 42),
(3, 1, 'Một số phương thức giao tiếp có sử dụng Kí hiệu', 'phuong-thuc-giao-tiep',
   'Đánh vần bằng tay (fingerspelling), tín hiệu lời nói (cued speech), Makaton và kí hiệu hỗ trợ lời nói.', 3, 43, 51),
(4, 1, 'Dạy và học Ngôn ngữ Kí hiệu', 'day-va-hoc',
   'Phương pháp học và dạy ngôn ngữ kí hiệu cho người điếc và người nghe.', 4, 52, 74);

-- CHAPTERS - Phan 2: Thuc hanh
INSERT INTO chapters (id, part_id, title, slug, description, order_index, start_page, end_page) VALUES
(5, 2, 'Chữ cái ngón tay và Số tự nhiên', 'chu-cai-ngon-tay-so',
   'Bảng chữ cái ngón tay tiếng Việt (A-Y, dấu thanh) và cách biểu diễn số tự nhiên bằng tay.', 1, 75, 79),
(6, 2, 'Bản thân', 'ban-than',
   'Kí hiệu về cơ thể, đặc điểm ngoại hình, trang phục, phụ kiện, cảm xúc, trạng thái và màu sắc.', 2, 80, 102),
(7, 2, 'Gia đình', 'gia-dinh',
   'Kí hiệu về các thành viên gia đình: ông, bà, bố, mẹ, anh, chị, em và các mối quan hệ.', 3, 103, 119),
(8, 2, 'Nghề nghiệp', 'nghe-nghiep',
   'Kí hiệu về các nghề nghiệp phổ biến trong xã hội.', 4, 120, 129),
(9, 2, 'Hiện tượng tự nhiên', 'hien-tuong-tu-nhien',
   'Kí hiệu về thời gian, thời tiết, thiên nhiên và các hiện tượng tự nhiên.', 5, 130, 142),
(10, 2, 'Thực vật', 'thuc-vat',
   'Kí hiệu về cây cối, hoa quả và các loại thực vật thường gặp.', 6, 143, 160),
(11, 2, 'Động vật', 'dong-vat',
   'Kí hiệu về các loài động vật: gia súc, gia cầm, động vật hoang dã, côn trùng.', 7, 161, 174),
(12, 2, 'Trường học', 'truong-hoc',
   'Kí hiệu về đồ dùng học tập, môn học, hoạt động và không gian trường học.', 8, 175, 195),
(13, 2, 'Giao thông', 'giao-thong',
   'Kí hiệu về phương tiện giao thông và hoạt động di chuyển.', 9, 196, 208),
(14, 2, 'Quê hương - Đất nước', 'que-huong-dat-nuoc',
   'Kí hiệu về địa danh, vùng miền và các khái niệm liên quan đến quê hương đất nước.', 10, 209, 218);

-- LESSONS - Chapter 1
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(1, 1, 'Sự xuất hiện Ngôn ngữ Kí hiệu', 'su-xuat-hien-nnkh', 'theory', 1, 7, 9, 15),
(2, 1, 'Các giai đoạn phát triển của Ngôn ngữ Kí hiệu', 'cac-giai-doan-phat-trien', 'theory', 2, 10, 14, 20),
(3, 1, 'Câu hỏi ôn tập - Chương 1.1', 'on-tap-1-1', 'quiz', 3, 15, 15, 10);

-- LESSONS - Chapter 2
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(4, 2, 'Khái niệm Ngôn ngữ Kí hiệu', 'khai-niem-nnkh', 'theory', 1, 16, 17, 10),
(5, 2, 'Một số đặc điểm của Ngôn ngữ Kí hiệu', 'dac-diem-nnkh', 'theory', 2, 18, 19, 15),
(6, 2, 'Các loại Kí hiệu', 'cac-loai-ki-hieu', 'theory', 3, 20, 20, 10),
(7, 2, 'Các thành tố của một Kí hiệu', 'thanh-to-ki-hieu', 'theory', 4, 21, 35, 25),
(8, 2, 'Một số đặc trưng ngữ pháp của Ngôn ngữ Kí hiệu', 'dac-trung-ngu-phap', 'theory', 5, 36, 40, 20),
(9, 2, 'Câu hỏi ôn tập - Chương 1.2', 'on-tap-1-2', 'quiz', 6, 41, 42, 10);

-- LESSONS - Chapter 3
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(10, 3, 'Đánh vần bằng tay (Fingerspelling)', 'danh-van-bang-tay', 'theory', 1, 43, 47, 15),
(11, 3, 'Tín hiệu lời nói (Cued Speech)', 'tin-hieu-loi-noi', 'theory', 2, 48, 49, 10),
(12, 3, 'Makaton', 'makaton', 'theory', 3, 50, 50, 10),
(13, 3, 'Kí hiệu hỗ trợ lời nói (Sim-Com)', 'ki-hieu-ho-tro-loi-noi', 'theory', 4, 50, 50, 10),
(14, 3, 'Câu hỏi ôn tập - Chương 1.3', 'on-tap-1-3', 'quiz', 5, 51, 51, 10);

-- LESSONS - Chapter 4
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(15, 4, 'Học Ngôn ngữ Kí hiệu', 'hoc-nnkh', 'theory', 1, 52, 59, 20),
(16, 4, 'Dạy Ngôn ngữ Kí hiệu cho trẻ điếc', 'day-nnkh-tre-diec', 'theory', 2, 60, 73, 25),
(17, 4, 'Câu hỏi ôn tập - Chương 1.4', 'on-tap-1-4', 'quiz', 3, 74, 74, 10);

-- LESSONS - Practice chapters (5-14)
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page, estimated_minutes) VALUES
(18, 5, 'Bảng chữ cái ngón tay', 'bang-chu-cai-ngon-tay', 'practice', 1, 75, 76, 20),
(19, 5, 'Số tự nhiên bằng ngón tay', 'so-tu-nhien-ngon-tay', 'practice', 2, 77, 79, 15),
(20, 6, 'Kí hiệu về bản thân', 'ki-hieu-ban-than', 'practice', 1, 80, 102, 45),
(21, 7, 'Kí hiệu về gia đình', 'ki-hieu-gia-dinh', 'practice', 1, 103, 119, 30),
(22, 8, 'Kí hiệu về nghề nghiệp', 'ki-hieu-nghe-nghiep', 'practice', 1, 120, 129, 20),
(23, 9, 'Kí hiệu về hiện tượng tự nhiên', 'ki-hieu-tu-nhien', 'practice', 1, 130, 142, 25),
(24, 10, 'Kí hiệu về thực vật', 'ki-hieu-thuc-vat', 'practice', 1, 143, 160, 30),
(25, 11, 'Kí hiệu về động vật', 'ki-hieu-dong-vat', 'practice', 1, 161, 174, 25),
(26, 12, 'Kí hiệu về trường học', 'ki-hieu-truong-hoc', 'practice', 1, 175, 195, 35),
(27, 13, 'Kí hiệu về giao thông', 'ki-hieu-giao-thong', 'practice', 1, 196, 208, 20),
(28, 14, 'Kí hiệu về quê hương - đất nước', 'ki-hieu-que-huong', 'practice', 1, 209, 218, 20);

-- ============================================
-- AUTO-GENERATE PAGE IMAGES
-- ============================================
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
      VALUES (v_lesson_id, v_page, CONCAT('/images/pages/page_', LPAD(v_page, 4, '0'), '.png'), v_order);
      SET v_page = v_page + 1;
      SET v_order = v_order + 1;
    END WHILE;
  END LOOP;
  CLOSE lesson_cursor;
END //
DELIMITER ;

CALL generate_page_images();
DROP PROCEDURE generate_page_images;
