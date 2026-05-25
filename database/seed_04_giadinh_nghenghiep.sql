USE vsl_learning;

-- Lesson 21: Gia dinh (pages 103-119)
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES (4, 21, 'grid', 'Kí hiệu về gia đình', 1);

INSERT INTO content_items (content_id, title, description, image_url, keywords, order_index) VALUES
(4,'Gia đình','Hai tay giống chữ G, đặt song song trước ngực, di chuyển theo đường vòng cung về phía trước và chạm vào nhau.','/images/pages/page0103_img01.png','gia đình,family',1),
(4,'Họ hàng','Hai tay khép úp, đặt song song trước ngực, giữ tay trái, di chuyển tay phải xuống dưới 3 bậc.','/images/pages/page0103_img01.png','họ hàng,thân tộc',2),
(4,'Ông','Tay phải giống chữ C, đặt dưới cằm, đưa tay xuống đồng thời nắm lại.','/images/pages/page0103_img01.png','ông,ông nội,ông ngoại',3),
(4,'Bà','Tay phải giống chữ C, đặt vào hai khoé miệng, đưa tay xuống đồng thời hai ngón chạm vào nhau.','/images/pages/page0103_img01.png','bà,bà nội,bà ngoại',4),
(4,'Bố','Tay phải giống chữ B, đặt chạm các đầu ngón tay vào cằm.','/images/pages/page0104_img01.png','bố,ba,cha',5),
(4,'Mẹ','Tay phải khép, lòng bàn tay hướng sang trái, đặt áp vào má phải.','/images/pages/page0104_img01.png','mẹ,má',6),
(4,'Em trai','1. Tay phải khép úp, đặt sát giữa ngực, di chuyển xuống dưới. 2. Tay phải khép hơi khum, đặt chạm các đầu ngón tay vào cằm.','/images/pages/page0104_img01.png','em trai,anh em',7),
(4,'Em gái','1. Tay phải khép úp, đặt sát giữa ngực, di chuyển xuống dưới. 2. Tay phải nắm, ngón cái và ngón trỏ mở ra, nắm nhẹ vào tai.','/images/pages/page0104_img01.png','em gái,chị em',8),
(4,'Con trai','1. Tay phải khép khum, đặt trước bụng, chạm các đầu ngón tay vào bụng, đưa tay xuống và lắc nhẹ cổ tay. 2. Đặt chạm các đầu ngón tay vào cằm.','/images/pages/page0105_img01.png','con trai,con cái',9),
(4,'Con gái','1. Tay phải khép khum, đặt trước bụng, đưa tay xuống và lắc nhẹ cổ tay. 2. Nắm nhẹ vào tai.','/images/pages/page0105_img01.png','con gái,con cái',10),
(4,'Vợ','1. Nắm nhẹ vào tai (nữ). 2. Hai tay khép, tay trái ngửa, tay phải úp, đưa tay phải nắm chặt lấy bàn tay trái.','/images/pages/page0105_img01.png','vợ,hôn nhân',11),
(4,'Chồng','1. Đặt chạm các đầu ngón tay vào cằm (nam). 2. Hai tay khép, tay trái ngửa, tay phải úp, đưa tay phải nắm chặt lấy bàn tay trái.','/images/pages/page0105_img01.png','chồng,hôn nhân',12),
(4,'Anh trai','1. Tay phải khép úp, đặt sát giữa ngực, di chuyển lên trên. 2. Đặt chạm vào cằm.','/images/pages/page0106_img01.png','anh trai,anh em',13),
(4,'Chị gái','1. Tay phải khép úp, đặt sát giữa ngực, di chuyển lên trên. 2. Nắm nhẹ vào tai.','/images/pages/page0106_img01.png','chị gái,chị em',14),
(4,'Cháu trai','1. Tay phải khép úp, di chuyển xuống dưới 2 bậc. 2. Đặt chạm vào cằm.','/images/pages/page0106_img01.png','cháu trai,cháu',15),
(4,'Cháu gái','1. Tay phải khép úp, di chuyển xuống dưới 2 bậc. 2. Nắm nhẹ vào tai.','/images/pages/page0106_img01.png','cháu gái,cháu',16),
(4,'Chú','1. Tay phải khép úp, đặt trước ngực, di chuyển xuống dưới 1 bậc. 2. Đặt chạm vào cằm.','/images/pages/page0107_img01.png','chú,thân tộc',17),
(4,'Cô','1. Tay phải khép úp, đặt trước ngực, di chuyển xuống dưới 1 bậc. 2. Nắm nhẹ vào tai.','/images/pages/page0107_img01.png','cô,thân tộc',18),
(4,'Bác trai','1. Tay phải khép úp, đặt trước ngực, di chuyển lên trên 1 bậc. 2. Đặt chạm vào cằm.','/images/pages/page0107_img01.png','bác trai,thân tộc',19),
(4,'Bác gái','1. Tay phải khép úp, đặt trước ngực, di chuyển lên trên 1 bậc. 2. Nắm nhẹ vào tai.','/images/pages/page0107_img01.png','bác gái,thân tộc',20),
(4,'Cưới','Hai tay khép, lòng bàn tay ngửa, đặt trước ngực, đưa đồng thời hai tay lên trên và chụm lại.','/images/pages/page0108_img01.png','cưới,hôn nhân,lễ cưới',21),
(4,'Yêu','Hai tay nắm, đặt chéo trước ngực (tay phải ở trên), áp sát ngực.','/images/pages/page0108_img01.png','yêu,tình cảm',22),
(4,'Ghét','Hai tay nắm, đặt trước ngực, đẩy mạnh hai tay về phía trước.','/images/pages/page0108_img01.png','ghét,tình cảm',23),
(4,'Nhớ','Tay phải chụm lại, đặt chạm các đầu ngón tay vào giữa trán.','/images/pages/page0108_img01.png','nhớ,tình cảm',24);

-- Lesson 22: Nghe nghiep (pages 120-129)
INSERT INTO lesson_contents (id, lesson_id, type, title, order_index) VALUES (5, 22, 'grid', 'Kí hiệu về nghề nghiệp', 1);

INSERT INTO content_items (content_id, title, description, image_url, keywords, order_index) VALUES
(5,'Giáo viên','1. Hai tay khép, lòng bàn tay hướng vào nhau, đặt hai bên đầu. 2. Tay phải giống số 1, đặt trước ngực, đưa tay lên xuống.','/images/pages/page0120_img01.png','giáo viên,teacher,nghề nghiệp',1),
(5,'Bác sĩ','Tay phải giống chữ B, lòng bàn tay hướng sang trái, đặt chạm vào cánh tay trái (vị trí bắt mạch).','/images/pages/page0120_img01.png','bác sĩ,doctor,nghề nghiệp',2),
(5,'Nông dân','1. Tay phải nắm, đặt trước ngực, làm động tác cầm liềm cắt lúa. 2. Hai tay giống chữ C, đặt trước hai mắt.','/images/pages/page0120_img01.png','nông dân,farmer,nghề nghiệp',3),
(5,'Công nhân','1. Tay trái khép úp, đặt trước ngực. Tay phải nắm, đặt trên tay trái, đưa tay phải lên xuống. 2. Hai tay giống chữ C, đặt trước hai mắt.','/images/pages/page0120_img01.png','công nhân,worker,nghề nghiệp',4),
(5,'Y tá','Tay phải giống số 1, đưa chạm đầu ngón trỏ vào bắp tay trái.','/images/pages/page0121_img01.png','y tá,nurse,nghề nghiệp',5),
(5,'Bộ đội','Tay phải giống chữ U, đặt chạm vào trán bên phải, đưa tay xuống chạm vào vai phải.','/images/pages/page0121_img01.png','bộ đội,quân nhân,nghề nghiệp',6),
(5,'Công an','Tay phải giống chữ C, đặt chạm vào giữa trán, sau đó thay đổi tay giống chữ A.','/images/pages/page0121_img01.png','công an,police,nghề nghiệp',7),
(5,'Thợ xây','1. Tay trái khép úp, tay phải khép, đặt chạm trên mu bàn tay trái, đưa tay phải lên xuống (2 lần). 2. Hai tay giống chữ C, đặt trước hai mắt.','/images/pages/page0121_img01.png','thợ xây,builder,nghề nghiệp',8),
(5,'Kĩ sư','1. Tay phải giống chữ K, đặt trước ngực, lắc cổ tay. 2. Hai tay giống chữ C, đặt trước hai mắt.','/images/pages/page0122_img01.png','kĩ sư,engineer,nghề nghiệp',9),
(5,'Luật sư','1. Tay phải giống chữ L, đặt trước ngực, lắc cổ tay. 2. Hai tay giống chữ C, đặt trước hai mắt.','/images/pages/page0122_img01.png','luật sư,lawyer,nghề nghiệp',10),
(5,'Nhà báo','1. Tay phải giống động tác cầm bút viết. 2. Hai tay giống chữ C, đặt trước hai mắt.','/images/pages/page0122_img01.png','nhà báo,journalist,nghề nghiệp',11),
(5,'Đầu bếp','1. Tay phải giống động tác xào thức ăn. 2. Hai tay giống chữ C, đặt trước hai mắt.','/images/pages/page0122_img01.png','đầu bếp,chef,nghề nghiệp',12);
