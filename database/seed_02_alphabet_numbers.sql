-- ============================================
-- VSL Seed 02: Chu cai ngon tay & So tu nhien
-- Lesson 18 (pages 75-76) + Lesson 19 (pages 77-79)
-- ============================================
USE vsl_learning;

-- Lesson 18: Bang chu cai ngon tay
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES
(1, 18, 'grid', 'Bảng chữ cái ngón tay tiếng Việt', 1);

INSERT INTO content_items (content_id, title, description, image_url, keywords, order_index) VALUES
(1, 'A', 'Nắm bàn tay phải, ngón cái đặt bên cạnh ngón trỏ.', '/images/pages/page0075_img01.png', 'A,chữ cái,ngón tay', 1),
(1, 'Ă', 'Giống A, ngón cái duỗi thẳng sang ngang.', '/images/pages/page0075_img01.png', 'Ă,chữ cái,ngón tay', 2),
(1, 'Â', 'Giống A, ngón cái duỗi lên trên.', '/images/pages/page0075_img01.png', 'Â,chữ cái,ngón tay', 3),
(1, 'B', 'Bàn tay phải mở, các ngón khép, ngón cái gập vào lòng bàn tay.', '/images/pages/page0075_img01.png', 'B,chữ cái,ngón tay', 4),
(1, 'C', 'Bàn tay phải cong thành hình chữ C.', '/images/pages/page0075_img01.png', 'C,chữ cái,ngón tay', 5),
(1, 'D', 'Ngón trỏ duỗi thẳng lên, các ngón còn lại gập, ngón cái chạm ngón giữa.', '/images/pages/page0075_img01.png', 'D,chữ cái,ngón tay', 6),
(1, 'Đ', 'Tương tự D nhưng ngón trỏ cong nhẹ.', '/images/pages/page0075_img01.png', 'Đ,chữ cái,ngón tay', 7),
(1, 'E', 'Bàn tay mở, các ngón cong lại ở đốt giữa, ngón cái gập vào lòng bàn tay.', '/images/pages/page0075_img01.png', 'E,chữ cái,ngón tay', 8),
(1, 'Ê', 'Giống E, ngón cái duỗi lên trên.', '/images/pages/page0075_img01.png', 'Ê,chữ cái,ngón tay', 9),
(1, 'G', 'Ngón trỏ và ngón cái duỗi thẳng, các ngón còn lại nắm.', '/images/pages/page0075_img01.png', 'G,chữ cái,ngón tay', 10),
(1, 'H', 'Ngón trỏ và ngón giữa duỗi thẳng khép lại, các ngón còn lại nắm, ngón cái gập.', '/images/pages/page0075_img01.png', 'H,chữ cái,ngón tay', 11),
(1, 'I', 'Ngón út duỗi thẳng lên, các ngón còn lại nắm.', '/images/pages/page0075_img01.png', 'I,chữ cái,ngón tay', 12),
(1, 'K', 'Ngón trỏ và ngón giữa duỗi tách ra, ngón cái chạm giữa hai ngón.', '/images/pages/page0075_img01.png', 'K,chữ cái,ngón tay', 13),
(1, 'L', 'Ngón trỏ duỗi thẳng lên, ngón cái duỗi sang ngang, tạo hình chữ L.', '/images/pages/page0075_img01.png', 'L,chữ cái,ngón tay', 14),
(1, 'M', 'Ba ngón (trỏ, giữa, áp út) gập xuống phủ lên ngón cái, ngón út gập.', '/images/pages/page0075_img01.png', 'M,chữ cái,ngón tay', 15),
(1, 'N', 'Hai ngón (trỏ, giữa) gập xuống phủ lên ngón cái, các ngón còn lại nắm.', '/images/pages/page0075_img01.png', 'N,chữ cái,ngón tay', 16),
(1, 'O', 'Tất cả ngón tay cong lại chạm vào ngón cái tạo hình chữ O.', '/images/pages/page0076_img01.png', 'O,chữ cái,ngón tay', 17),
(1, 'Ô', 'Giống O, ngón cái duỗi lên trên.', '/images/pages/page0076_img01.png', 'Ô,chữ cái,ngón tay', 18),
(1, 'Ơ', 'Giống O, ngón cái duỗi sang ngang.', '/images/pages/page0076_img01.png', 'Ơ,chữ cái,ngón tay', 19),
(1, 'P', 'Ngón trỏ duỗi thẳng lên, ngón giữa duỗi chếch sang ngang, ngón cái chạm ngón giữa.', '/images/pages/page0076_img01.png', 'P,chữ cái,ngón tay', 20),
(1, 'Q', 'Ngón cái và ngón trỏ duỗi thẳng xuống dưới.', '/images/pages/page0076_img01.png', 'Q,chữ cái,ngón tay', 21),
(1, 'R', 'Ngón trỏ và ngón giữa duỗi thẳng bắt chéo nhau.', '/images/pages/page0076_img01.png', 'R,chữ cái,ngón tay', 22),
(1, 'S', 'Nắm tay, ngón cái gập phủ lên các ngón.', '/images/pages/page0076_img01.png', 'S,chữ cái,ngón tay', 23),
(1, 'T', 'Ngón cái đặt giữa ngón trỏ và ngón giữa đã gập.', '/images/pages/page0076_img01.png', 'T,chữ cái,ngón tay', 24),
(1, 'U', 'Ngón trỏ và ngón giữa duỗi thẳng khép lại hướng lên, các ngón còn lại nắm.', '/images/pages/page0076_img01.png', 'U,chữ cái,ngón tay', 25),
(1, 'Ư', 'Giống U, ngón cái duỗi sang ngang.', '/images/pages/page0076_img01.png', 'Ư,chữ cái,ngón tay', 26),
(1, 'V', 'Ngón trỏ và ngón giữa duỗi thẳng tách ra hình chữ V.', '/images/pages/page0076_img01.png', 'V,chữ cái,ngón tay', 27),
(1, 'X', 'Ngón trỏ duỗi thẳng rồi cong lại thành móc câu.', '/images/pages/page0076_img01.png', 'X,chữ cái,ngón tay', 28),
(1, 'Y', 'Ngón cái và ngón út duỗi thẳng, các ngón còn lại nắm.', '/images/pages/page0076_img01.png', 'Y,chữ cái,ngón tay', 29),
(1, 'Dấu sắc', 'Ngón trỏ duỗi thẳng, di chuyển chếch từ dưới lên trên sang phải.', '/images/pages/page0076_img01.png', 'dấu sắc,thanh điệu,ngón tay', 30),
(1, 'Dấu huyền', 'Ngón trỏ duỗi thẳng, di chuyển chếch từ trên xuống dưới sang phải.', '/images/pages/page0076_img01.png', 'dấu huyền,thanh điệu,ngón tay', 31),
(1, 'Dấu hỏi', 'Ngón trỏ duỗi thẳng, vẽ hình dấu hỏi trong không khí.', '/images/pages/page0076_img01.png', 'dấu hỏi,thanh điệu,ngón tay', 32),
(1, 'Dấu ngã', 'Ngón trỏ duỗi thẳng, vẽ hình dấu ngã (sóng) trong không khí.', '/images/pages/page0076_img01.png', 'dấu ngã,thanh điệu,ngón tay', 33),
(1, 'Dấu nặng', 'Ngón trỏ duỗi thẳng, chấm xuống dưới.', '/images/pages/page0076_img01.png', 'dấu nặng,thanh điệu,ngón tay', 34);

-- Lesson 19: So tu nhien
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES
(2, 19, 'grid', 'Số tự nhiên bằng ngón tay', 1);

INSERT INTO content_items (content_id, title, description, image_url, keywords, order_index) VALUES
(2, '0', 'Nắm bàn tay phải, lòng bàn tay hướng về phía trước.', '/images/pages/page0077_img01.png', '0,số,không,zero', 1),
(2, '1', 'Ngón trỏ duỗi thẳng lên, các ngón còn lại nắm.', '/images/pages/page0077_img01.png', '1,số,một,one', 2),
(2, '2', 'Ngón trỏ và ngón giữa duỗi thẳng tách ra, các ngón còn lại nắm.', '/images/pages/page0077_img01.png', '2,số,hai,two', 3),
(2, '3', 'Ngón trỏ, ngón giữa và ngón áp út duỗi thẳng.', '/images/pages/page0077_img01.png', '3,số,ba,three', 4),
(2, '4', 'Bốn ngón (trỏ, giữa, áp út, út) duỗi thẳng, ngón cái gập.', '/images/pages/page0077_img01.png', '4,số,bốn,four', 5),
(2, '5', 'Xòe cả 5 ngón tay.', '/images/pages/page0077_img01.png', '5,số,năm,five', 6),
(2, '6', 'Ngón cái và ngón út duỗi thẳng, các ngón giữa gập.', '/images/pages/page0078_img01.png', '6,số,sáu,six', 7),
(2, '7', 'Ngón cái, ngón trỏ và ngón út duỗi thẳng, ngón giữa và áp út gập.', '/images/pages/page0078_img01.png', '7,số,bảy,seven', 8),
(2, '8', 'Ngón cái, ngón trỏ, ngón giữa và ngón út duỗi, ngón áp út gập.', '/images/pages/page0078_img01.png', '8,số,tám,eight', 9),
(2, '9', 'Ngón cái gập chạm vào ngón trỏ đã cong, các ngón còn lại duỗi.', '/images/pages/page0078_img01.png', '9,số,chín,nine', 10),
(2, '10', 'Nắm tay, ngón cái duỗi thẳng lên trên.', '/images/pages/page0079_img01.png', '10,số,mười,ten', 11),
(2, '100', 'Giống số 1, sau đó giống chữ cái ngón tay "C".', '/images/pages/page0079_img01.png', '100,số,một trăm,hundred', 12),
(2, '1000', 'Giống số 1, sau đó bàn tay phải khép đặt lên lòng bàn tay trái.', '/images/pages/page0079_img01.png', '1000,số,một nghìn,thousand', 13);
