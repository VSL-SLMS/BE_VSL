USE vsl_learning;
-- Fix all old image URLs to use full-page format
-- Old: /images/pages/page0XXX_img01.png -> New: /images/pages/page_0XXX.png

-- Lesson 6: Tu nhien (content_id=6)
UPDATE content_items SET image_url='/images/pages/page_0131.png' WHERE content_id=6 AND order_index IN (1,2);
UPDATE content_items SET image_url='/images/pages/page_0131.png' WHERE content_id=6 AND order_index IN (3,4);
UPDATE content_items SET image_url='/images/pages/page_0132.png' WHERE content_id=6 AND order_index IN (5,6,7,8);
UPDATE content_items SET image_url='/images/pages/page_0133.png' WHERE content_id=6 AND order_index IN (9,10,11,12);
UPDATE content_items SET image_url='/images/pages/page_0134.png' WHERE content_id=6 AND order_index IN (13,14,15,16);
UPDATE content_items SET image_url='/images/pages/page_0135.png' WHERE content_id=6 AND order_index IN (17,18,19,20);
UPDATE content_items SET image_url='/images/pages/page_0136.png' WHERE content_id=6 AND order_index IN (21,22,23);
UPDATE content_items SET image_url='/images/pages/page_0137.png' WHERE content_id=6 AND order_index IN (24,25,26);

-- Lesson 7: Thuc vat (content_id=7)
UPDATE content_items SET image_url='/images/pages/page_0144.png' WHERE content_id=7 AND order_index IN (1,2,3,4);
UPDATE content_items SET image_url='/images/pages/page_0145.png' WHERE content_id=7 AND order_index IN (5,6,7);
UPDATE content_items SET image_url='/images/pages/page_0146.png' WHERE content_id=7 AND order_index IN (8,9,10);
UPDATE content_items SET image_url='/images/pages/page_0148.png' WHERE content_id=7 AND order_index IN (11,12);
UPDATE content_items SET image_url='/images/pages/page_0150.png' WHERE content_id=7 AND order_index IN (13,14);
UPDATE content_items SET image_url='/images/pages/page_0151.png' WHERE content_id=7 AND order_index=15;
UPDATE content_items SET image_url='/images/pages/page_0152.png' WHERE content_id=7 AND order_index=16;

-- Lesson 8: Dong vat (content_id=8)
UPDATE content_items SET image_url='/images/pages/page_0162.png' WHERE content_id=8 AND order_index IN (1,2,3,4);
UPDATE content_items SET image_url='/images/pages/page_0163.png' WHERE content_id=8 AND order_index IN (5,6,7,8);
UPDATE content_items SET image_url='/images/pages/page_0164.png' WHERE content_id=8 AND order_index IN (9,10);
UPDATE content_items SET image_url='/images/pages/page_0165.png' WHERE content_id=8 AND order_index IN (11,12);
UPDATE content_items SET image_url='/images/pages/page_0166.png' WHERE content_id=8 AND order_index IN (13,14);
UPDATE content_items SET image_url='/images/pages/page_0168.png' WHERE content_id=8 AND order_index IN (15,16);

-- Lesson 9: Truong hoc (content_id=9)
UPDATE content_items SET image_url='/images/pages/page_0176.png' WHERE content_id=9 AND order_index IN (1,2,3,4);
UPDATE content_items SET image_url='/images/pages/page_0177.png' WHERE content_id=9 AND order_index IN (5,6,7,8);
UPDATE content_items SET image_url='/images/pages/page_0178.png' WHERE content_id=9 AND order_index IN (9,10);
UPDATE content_items SET image_url='/images/pages/page_0179.png' WHERE content_id=9 AND order_index IN (11,12);
UPDATE content_items SET image_url='/images/pages/page_0180.png' WHERE content_id=9 AND order_index IN (13,14);
UPDATE content_items SET image_url='/images/pages/page_0181.png' WHERE content_id=9 AND order_index IN (15,16);
UPDATE content_items SET image_url='/images/pages/page_0182.png' WHERE content_id=9 AND order_index IN (17,18);
UPDATE content_items SET image_url='/images/pages/page_0183.png' WHERE content_id=9 AND order_index IN (19,20);

-- Lesson 10: Giao thong (content_id=10)
UPDATE content_items SET image_url='/images/pages/page_0197.png' WHERE content_id=10 AND order_index IN (1,2,3,4);
UPDATE content_items SET image_url='/images/pages/page_0198.png' WHERE content_id=10 AND order_index IN (5,6,7,8);
UPDATE content_items SET image_url='/images/pages/page_0199.png' WHERE content_id=10 AND order_index IN (9,10);
UPDATE content_items SET image_url='/images/pages/page_0200.png' WHERE content_id=10 AND order_index IN (11,12);

-- Lesson 11: Que huong (content_id=11)
UPDATE content_items SET image_url='/images/pages/page_0209.png' WHERE content_id=11 AND order_index IN (1,2,3);
UPDATE content_items SET image_url='/images/pages/page_0210.png' WHERE content_id=11 AND order_index IN (4,5);
UPDATE content_items SET image_url='/images/pages/page_0211.png' WHERE content_id=11 AND order_index IN (6,7,8);
UPDATE content_items SET image_url='/images/pages/page_0212.png' WHERE content_id=11 AND order_index IN (9,10);
UPDATE content_items SET image_url='/images/pages/page_0213.png' WHERE content_id=11 AND order_index IN (11,12);

-- Also fix old Gia dinh items (content_id=4) that have old format
UPDATE content_items SET image_url='/images/pages/page_0103.png' WHERE content_id=4 AND image_url LIKE '%page0103%';
UPDATE content_items SET image_url='/images/pages/page_0104.png' WHERE content_id=4 AND image_url LIKE '%page0104%';
UPDATE content_items SET image_url='/images/pages/page_0105.png' WHERE content_id=4 AND image_url LIKE '%page0105%';
UPDATE content_items SET image_url='/images/pages/page_0106.png' WHERE content_id=4 AND image_url LIKE '%page0106%';
UPDATE content_items SET image_url='/images/pages/page_0107.png' WHERE content_id=4 AND image_url LIKE '%page0107%';
UPDATE content_items SET image_url='/images/pages/page_0108.png' WHERE content_id=4 AND image_url LIKE '%page0108%';

-- Fix old Nghe nghiep items (content_id=5) that have old format
UPDATE content_items SET image_url='/images/pages/page_0120.png' WHERE content_id=5 AND image_url LIKE '%page0120%';
UPDATE content_items SET image_url='/images/pages/page_0121.png' WHERE content_id=5 AND image_url LIKE '%page0121%';
UPDATE content_items SET image_url='/images/pages/page_0122.png' WHERE content_id=5 AND image_url LIKE '%page0122%';
