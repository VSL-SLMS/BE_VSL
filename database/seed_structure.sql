-- VSL Seed: Structure (Parts, Chapters, Lessons)
USE vsl_learning;

-- PARTS
INSERT INTO parts (id, title, slug, description, order_index) VALUES
(1, 'Phần 1: Ngôn ngữ ký hiệu Việt Nam', 'phan-1-ngon-ngu-ky-hieu', 'Giới thiệu tổng quan về ngôn ngữ ký hiệu Việt Nam', 1),
(2, 'Phần 2: Từ vựng ngôn ngữ ký hiệu', 'phan-2-tu-vung', 'Học từ vựng ngôn ngữ ký hiệu theo chủ đề', 2);

-- CHAPTERS
INSERT INTO chapters (id, part_id, title, slug, description, order_index, start_page, end_page) VALUES
(1, 1, 'Chương 1: Tổng quan NNKH Việt Nam', 'chuong-1-tong-quan', 'Giới thiệu lịch sử và đặc điểm NNKH VN', 1, 5, 68),
(2, 1, 'Chương 1.1: Bảng chữ cái ngón tay', 'chuong-1-1-bang-chu-cai', 'Bảng chữ cái ngón tay tiếng Việt', 2, 69, 74),
(3, 1, 'Chương 1.2: Hệ thống số đếm', 'chuong-1-2-he-thong-so', 'Số đếm bằng ngón tay', 3, 75, 86),
(4, 2, 'Chương 2.1: Bản thân', 'chuong-2-1-ban-than', 'Từ vựng về cơ thể và bản thân', 4, 87, 102),
(5, 2, 'Chương 2.2: Gia đình', 'chuong-2-2-gia-dinh', 'Từ vựng về các thành viên gia đình và đồ vật', 5, 103, 119),
(6, 2, 'Chương 2.3: Nghề nghiệp', 'chuong-2-3-nghe-nghiep', 'Từ vựng về các nghề nghiệp và công cụ', 6, 120, 129),
(7, 2, 'Chương 2.4: Hiện tượng tự nhiên', 'chuong-2-4-tu-nhien', 'Từ vựng về thời gian, thời tiết, mùa', 7, 130, 138),
(8, 2, 'Chương 2.5: Thực vật', 'chuong-2-5-thuc-vat', 'Từ vựng về cây cối, hoa quả', 8, 139, 148),
(9, 2, 'Chương 2.6: Động vật', 'chuong-2-6-dong-vat', 'Từ vựng về các loài động vật', 9, 149, 166),
(10, 2, 'Chương 2.7: Trường học', 'chuong-2-7-truong-hoc', 'Từ vựng về trường lớp và học tập', 10, 167, 186),
(11, 2, 'Chương 2.8: Giao thông', 'chuong-2-8-giao-thong', 'Từ vựng về phương tiện và giao thông', 11, 187, 206),
(12, 2, 'Chương 2.9: Quê hương đất nước', 'chuong-2-9-que-huong', 'Từ vựng về địa lý và quê hương', 12, 207, 218);

-- LESSONS (vocabulary + practice for each chapter)
INSERT INTO lessons (id, chapter_id, title, slug, lesson_type, order_index, start_page, end_page) VALUES
-- Ch 1.2: So dem
(1, 3, 'Số đếm cơ bản', 'so-dem-co-ban', 'theory', 1, 75, 86),
-- Ch 2.1: Ban than
(2, 4, 'Từ vựng bản thân', 'tu-vung-ban-than', 'theory', 1, 87, 101),
(3, 4, 'Thực hành bản thân', 'thuc-hanh-ban-than', 'practice', 2, 102, 102),
-- Ch 2.2: Gia dinh
(4, 5, 'Từ vựng gia đình', 'tu-vung-gia-dinh', 'theory', 1, 103, 117),
(5, 5, 'Thực hành gia đình', 'thuc-hanh-gia-dinh', 'practice', 2, 118, 119),
-- Ch 2.3: Nghe nghiep
(6, 6, 'Từ vựng nghề nghiệp', 'tu-vung-nghe-nghiep', 'theory', 1, 120, 128),
(7, 6, 'Thực hành nghề nghiệp', 'thuc-hanh-nghe-nghiep', 'practice', 2, 129, 129),
-- Ch 2.4: Tu nhien
(8, 7, 'Từ vựng tự nhiên', 'tu-vung-tu-nhien', 'theory', 1, 130, 137),
(9, 7, 'Thực hành tự nhiên', 'thuc-hanh-tu-nhien', 'practice', 2, 138, 138),
-- Ch 2.5: Thuc vat
(10, 8, 'Từ vựng thực vật', 'tu-vung-thuc-vat', 'theory', 1, 139, 147),
(11, 8, 'Thực hành thực vật', 'thuc-hanh-thuc-vat', 'practice', 2, 148, 148),
-- Ch 2.6: Dong vat
(12, 9, 'Từ vựng động vật', 'tu-vung-dong-vat', 'theory', 1, 149, 164),
(13, 9, 'Thực hành động vật', 'thuc-hanh-dong-vat', 'practice', 2, 165, 166),
-- Ch 2.7: Truong hoc
(14, 10, 'Từ vựng trường học', 'tu-vung-truong-hoc', 'theory', 1, 168, 185),
(15, 10, 'Thực hành trường học', 'thuc-hanh-truong-hoc', 'practice', 2, 186, 186),
-- Ch 2.8: Giao thong
(16, 11, 'Từ vựng giao thông', 'tu-vung-giao-thong', 'theory', 1, 187, 205),
(17, 11, 'Thực hành giao thông', 'thuc-hanh-giao-thong', 'practice', 2, 206, 206),
-- Ch 2.9: Que huong
(18, 12, 'Từ vựng quê hương', 'tu-vung-que-huong', 'theory', 1, 207, 217),
(19, 12, 'Thực hành quê hương', 'thuc-hanh-que-huong', 'practice', 2, 218, 218);

-- LESSON_CONTENTS (grid containers for vocabulary lessons)
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES
(1, 1, 'grid', 'Số đếm', 1),
(2, 2, 'grid', 'Bản thân', 1),
(3, 4, 'grid', 'Gia đình', 1),
(4, 6, 'grid', 'Nghề nghiệp', 1),
(5, 8, 'grid', 'Hiện tượng tự nhiên', 1),
(6, 10, 'grid', 'Thực vật', 1),
(7, 12, 'grid', 'Động vật', 1),
(8, 14, 'grid', 'Trường học', 1),
(9, 16, 'grid', 'Giao thông', 1),
(10, 18, 'grid', 'Quê hương', 1);
