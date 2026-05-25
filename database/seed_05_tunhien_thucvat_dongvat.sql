USE vsl_learning;

-- Lesson 23: Hien tuong tu nhien (pages 130-142)
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES (6, 23, 'grid', 'Kí hiệu về hiện tượng tự nhiên', 1);

INSERT INTO content_items (content_id, title, description, image_url, keywords, order_index) VALUES
(6,'Năm','Hai tay nắm, đặt trước ngực, tay phải đặt trên tay trái, đưa tay phải theo một vòng tròn từ ngoài vào trong rồi đặt chạm trên tay trái.','/images/pages/page0131_img01.png','năm,thời gian',1),
(6,'Tuần lễ','Tay trái khép ngửa, đặt trước ngực. Tay phải giống chữ T úp, đặt chạm vào lòng bàn tay trái, đưa tay dọc trong lòng bàn tay trái qua đầu các ngón tay.','/images/pages/page0131_img01.png','tuần lễ,thời gian',2),
(6,'Thứ hai','Tay phải giống chữ T, đặt trước ngực. Sau đó thay đổi tay giống số 2.','/images/pages/page0131_img01.png','thứ hai,ngày,thời gian',3),
(6,'Thứ ba','Tay phải giống chữ T, đặt trước ngực. Sau đó thay đổi tay giống số 3.','/images/pages/page0131_img01.png','thứ ba,ngày,thời gian',4),
(6,'Thứ tư','Tay phải giống chữ T. Sau đó thay đổi tay giống số 4.','/images/pages/page0132_img01.png','thứ tư,ngày,thời gian',5),
(6,'Thứ năm','Tay phải giống chữ T. Sau đó thay đổi tay giống số 5.','/images/pages/page0132_img01.png','thứ năm,ngày,thời gian',6),
(6,'Thứ sáu','Tay phải giống chữ T. Sau đó thay đổi tay giống số 6.','/images/pages/page0132_img01.png','thứ sáu,ngày,thời gian',7),
(6,'Thứ bảy','Tay phải giống chữ T. Sau đó thay đổi tay giống số 7.','/images/pages/page0132_img01.png','thứ bảy,ngày,thời gian',8),
(6,'Chủ nhật','Tay phải giống chữ C, đặt trước ngực, lắc cổ tay. Sau đó tay phải giống chữ N, lắc cổ tay.','/images/pages/page0133_img01.png','chủ nhật,ngày,thời gian',9),
(6,'Sáng','Hai tay mở, lòng bàn tay ngửa, đặt trước ngực, đưa đồng thời hai tay lên trên.','/images/pages/page0133_img01.png','sáng,thời gian',10),
(6,'Trưa','Tay phải giống số 1, đặt thẳng đứng trước ngực, lòng bàn tay hướng sang trái.','/images/pages/page0133_img01.png','trưa,thời gian',11),
(6,'Chiều','Tay phải mở khép, lòng bàn tay úp, đặt trước ngực, di chuyển tay chếch xuống.','/images/pages/page0133_img01.png','chiều,thời gian',12),
(6,'Tối','Hai tay khép, lòng bàn tay úp, đặt trước mặt, đưa hai tay về phía nhau và chạm vào nhau.','/images/pages/page0134_img01.png','tối,đêm,thời gian',13),
(6,'Mặt trời','Tay phải nắm, đưa lên cao, mở xoè các ngón tay ra.','/images/pages/page0134_img01.png','mặt trời,sun,thiên nhiên',14),
(6,'Mặt trăng','Tay phải giống chữ C, đặt bên phải đầu, hướng lên trên.','/images/pages/page0134_img01.png','mặt trăng,moon,thiên nhiên',15),
(6,'Ngôi sao','Hai tay giống số 1, đặt trước ngực, di chuyển hai ngón trỏ lên xuống xen kẽ.','/images/pages/page0134_img01.png','ngôi sao,star,thiên nhiên',16),
(6,'Mưa','Hai tay mở xoè, lòng bàn tay úp, đặt trước ngực, di chuyển hai tay xuống dưới đồng thời co các ngón tay lại (2 lần).','/images/pages/page0135_img01.png','mưa,rain,thời tiết',17),
(6,'Nắng','Tay phải nắm đưa lên cao, mở xoè các ngón tay ra, đồng thời nheo mắt.','/images/pages/page0135_img01.png','nắng,sunny,thời tiết',18),
(6,'Gió','Hai tay mở, lòng bàn tay hướng vào nhau, đặt trước ngực, đưa đồng thời hai tay sang phải (2 lần).','/images/pages/page0135_img01.png','gió,wind,thời tiết',19),
(6,'Lạnh','Hai tay nắm, đặt trước ngực, run rẩy người.','/images/pages/page0135_img01.png','lạnh,cold,thời tiết',20),
(6,'Nóng','Tay phải mở xoè, lòng bàn tay hướng vào mặt, đặt gần mặt, đưa nhẹ tay ra phía trước.','/images/pages/page0136_img01.png','nóng,hot,thời tiết',21),
(6,'Sấm sét','Hai tay giống số 1, đặt trước ngực, di chuyển hai tay theo đường zigzag xuống dưới.','/images/pages/page0136_img01.png','sấm sét,thunder,thời tiết',22),
(6,'Cầu vồng','Tay phải mở xoè, đưa tay từ trái sang phải theo đường vòng cung lớn phía trên đầu.','/images/pages/page0136_img01.png','cầu vồng,rainbow,thiên nhiên',23),
(6,'Sông','Hai tay mở, lòng bàn tay úp, đặt trước ngực, di chuyển uốn lượn về phía trước.','/images/pages/page0137_img01.png','sông,river,thiên nhiên',24),
(6,'Biển','Hai tay mở, lòng bàn tay úp, đặt trước ngực, di chuyển lên xuống như sóng biển.','/images/pages/page0137_img01.png','biển,sea,thiên nhiên',25),
(6,'Núi','Hai tay khép, đặt trước ngực, đưa hai tay lên cao tạo hình tam giác.','/images/pages/page0137_img01.png','núi,mountain,thiên nhiên',26);

-- Lesson 24: Thuc vat (pages 143-160)
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES (7, 24, 'grid', 'Kí hiệu về thực vật', 1);

INSERT INTO content_items (content_id, title, description, image_url, keywords, order_index) VALUES
(7,'Quả quýt','Tay trái chụm ngửa, tay phải chụm úp, đặt phía trên gần tay trái, đưa tay xuống dưới (2-3 lần).','/images/pages/page0144_img01.png','quả quýt,trái cây',1),
(7,'Quả mít','Tay phải khép úp, đặt trước ngực. Tay phải mở, đầu ngón cái và ngón giữa chạm vào nhau, búng ngón cái và ngón giữa lên mu bàn tay trái (2-3 lần).','/images/pages/page0144_img01.png','quả mít,trái cây',2),
(7,'Quả đào','1. Tay phải khép khum ngửa, đặt trước ngực, đưa nhẹ tay lên trên. 2. Tay phải giống chữ Đ, đặt trước ngực.','/images/pages/page0144_img01.png','quả đào,trái cây',3),
(7,'Quả sầu riêng','Hai tay khép hơi khum úp, đầu ngón tay hướng sang hai bên và chạm vào nhau, đặt trước ngực, đưa đồng thời hai tay về hai phía.','/images/pages/page0144_img01.png','quả sầu riêng,trái cây',4),
(7,'Quả cam','Tay phải nắm, đặt trước miệng, xoay cổ tay qua lại.','/images/pages/page0145_img01.png','quả cam,trái cây',5),
(7,'Quả chuối','Tay trái giống số 1 duỗi thẳng, tay phải nắm, đưa tay phải từ đầu ngón trỏ tay trái xuống gốc, đồng thời mở các ngón tay ra.','/images/pages/page0145_img01.png','quả chuối,trái cây',6),
(7,'Quả xoài','Tay phải nắm, ngón cái và ngón trỏ mở ra, đặt gần miệng, làm động tác ăn xoài.','/images/pages/page0145_img01.png','quả xoài,trái cây',7),
(7,'Quả dưa hấu','1. Hai tay khum, đặt trước ngực tạo hình tròn lớn. 2. Tay phải giống cầm dao, làm động tác cắt.','/images/pages/page0146_img01.png','quả dưa hấu,trái cây',8),
(7,'Quả táo','Tay phải nắm, đặt gần miệng, xoay cổ tay qua lại (giống cắn táo).','/images/pages/page0146_img01.png','quả táo,trái cây',9),
(7,'Quả ổi','Tay phải khum, đặt trước ngực, bóp nhẹ ngón tay (giống bóp quả ổi).','/images/pages/page0146_img01.png','quả ổi,trái cây',10),
(7,'Hoa','Tay phải chụm lại, đặt gần mũi, đưa nhẹ tay sang phải (giống ngửi hoa).','/images/pages/page0148_img01.png','hoa,flower,thực vật',11),
(7,'Hoa hồng','Giống ký hiệu Hoa, sau đó tay phải giống chữ H, đặt sát má phải, đưa tay theo vòng tròn.','/images/pages/page0148_img01.png','hoa hồng,rose',12),
(7,'Cây','Tay phải duỗi thẳng lên, tay trái nắm lấy cổ tay phải, các ngón tay phải mở xoè ra (giống tán cây).','/images/pages/page0150_img01.png','cây,tree,thực vật',13),
(7,'Lá','Tay trái giống số 1 duỗi thẳng, tay phải mở khép úp, đặt lên đầu ngón trỏ tay trái, lắc nhẹ.','/images/pages/page0150_img01.png','lá,leaf,thực vật',14),
(7,'Rau','Hai tay mở, lòng bàn tay ngửa, đặt trước ngực, đưa lên xuống xen kẽ.','/images/pages/page0151_img01.png','rau,vegetable,thực vật',15),
(7,'Gạo','Tay phải nắm, ngón cái và ngón trỏ chụm, đặt trước ngực, búng ngón tay (giống bốc gạo).','/images/pages/page0152_img01.png','gạo,rice,lương thực',16);

-- Lesson 25: Dong vat (pages 161-174)
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES (8, 25, 'grid', 'Kí hiệu về động vật', 1);

INSERT INTO content_items (content_id, title, description, image_url, keywords, order_index) VALUES
(8,'Con bò','Hai tay giống chữ Đ, đặt áp vào hai bên thái dương.','/images/pages/page0162_img01.png','con bò,cow,động vật',1),
(8,'Con ngựa','Hai tay nắm úp, đặt trước ngực, đưa đồng thời cả hai tay ra-vào (2 lần).','/images/pages/page0162_img01.png','con ngựa,horse,động vật',2),
(8,'Con gà','Tay trái khép ngửa, đặt trước ngực. Tay phải giống chữ Đ úp, gập cổ tay, chạm đầu ngón trỏ vào lòng bàn tay trái (2 lần).','/images/pages/page0162_img01.png','con gà,chicken,động vật',3),
(8,'Con gà trống','1. Tay phải khép, ngón cái mở ra, đặt chạm ngón cái vào giữa trán, đưa tay theo đường vòng cung qua đỉnh đầu. 2. Giống ký hiệu Con gà.','/images/pages/page0162_img01.png','con gà trống,rooster,động vật',4),
(8,'Con chó','Tay phải khép úp, đặt trước ngực, vỗ nhẹ vào đùi (2 lần).','/images/pages/page0163_img01.png','con chó,dog,động vật',5),
(8,'Con mèo','Tay phải nắm, ngón cái và ngón trỏ mở ra, đặt gần mũi, đưa sang hai bên (giống râu mèo).','/images/pages/page0163_img01.png','con mèo,cat,động vật',6),
(8,'Con lợn','Tay phải nắm, đặt trước mũi, xoay cổ tay qua lại.','/images/pages/page0163_img01.png','con lợn,pig,động vật',7),
(8,'Con trâu','Hai tay giống chữ Đ, đặt hai bên đầu, đưa hai tay ra phía trước theo đường vòng cung.','/images/pages/page0163_img01.png','con trâu,buffalo,động vật',8),
(8,'Con voi','Tay phải khép, đặt trước mũi, đưa tay xuống dưới theo đường vòng cung (giống vòi voi).','/images/pages/page0164_img01.png','con voi,elephant,động vật',9),
(8,'Con hổ','Hai tay mở xoè, đặt hai bên mặt, co các ngón tay lại (giống vuốt hổ), khuôn mặt hung dữ.','/images/pages/page0164_img01.png','con hổ,tiger,động vật',10),
(8,'Con cá','Tay phải khép, lòng bàn tay hướng sang trái, đặt trước ngực, di chuyển tay uốn lượn về phía trước.','/images/pages/page0165_img01.png','con cá,fish,động vật',11),
(8,'Con chim','Tay phải nắm, ngón trỏ và ngón cái chụm, đặt trước miệng, mở đóng hai ngón tay (giống mỏ chim).','/images/pages/page0165_img01.png','con chim,bird,động vật',12),
(8,'Con rắn','Tay phải giống chữ V, đặt trước ngực, di chuyển tay uốn lượn về phía trước.','/images/pages/page0166_img01.png','con rắn,snake,động vật',13),
(8,'Con khỉ','Hai tay gãi vào hai bên hông.','/images/pages/page0166_img01.png','con khỉ,monkey,động vật',14),
(8,'Con kiến','Tay phải giống số 1, đặt trước ngực, di chuyển ngón trỏ bò bò trên cánh tay trái.','/images/pages/page0168_img01.png','con kiến,ant,côn trùng',15),
(8,'Con bướm','Hai tay mở, lòng bàn tay hướng vào nhau, đặt trước ngực, vẫy hai tay lên xuống (giống cánh bướm).','/images/pages/page0168_img01.png','con bướm,butterfly,côn trùng',16);
