-- course_pricing: admin-configurable pricing
CREATE TABLE IF NOT EXISTS course_pricing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,           -- "Khóa học VSL toàn bộ"
  description TEXT,
  price_vnd INT NOT NULL,                -- 299000 (VND, không nhân 100)
  discount_price_vnd INT NULL,           -- giá khuyến mãi
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- payments: VNPay transaction log
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  txn_ref VARCHAR(100) NOT NULL UNIQUE,   -- vnp_TxnRef (unique per day per VNPay)
  amount_vnd INT NOT NULL,                -- actual VND amount
  order_info VARCHAR(255),
  vnp_transaction_no VARCHAR(50),         -- from VNPay response
  vnp_bank_code VARCHAR(20),
  vnp_card_type VARCHAR(20),
  vnp_pay_date VARCHAR(20),
  vnp_response_code VARCHAR(10),
  vnp_transaction_status VARCHAR(10),
  status ENUM('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_payments_user (user_id),
  INDEX idx_payments_txn_ref (txn_ref)
);

-- course_purchases: who bought what
CREATE TABLE IF NOT EXISTS course_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_code VARCHAR(100) NOT NULL DEFAULT 'SIGN_LANGUAGE_101',
  payment_id INT NOT NULL,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,               -- NULL = lifetime access
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_course (user_id, course_code),
  INDEX idx_purchases_user (user_id)
);

-- Seed default pricing
INSERT INTO course_pricing (id, title, description, price_vnd, discount_price_vnd)
VALUES (1,
        'Khóa học Ngôn ngữ Ký hiệu Việt Nam',
        'Trọn bộ 28 bài học - 2 phần - 14 chương. Học ngôn ngữ ký hiệu Việt Nam từ cơ bản đến nâng cao.',
        299000,
        NULL)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  price_vnd = VALUES(price_vnd),
  discount_price_vnd = VALUES(discount_price_vnd),
  is_active = TRUE;
