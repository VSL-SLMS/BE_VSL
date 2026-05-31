const { pool } = require('../config/database');
const vnpayService = require('./vnpay.service');

const COURSE_CODE = process.env.COURSE_CODE || 'SIGN_LANGUAGE_101';
let tablesReady = false;

async function ensurePaymentTables() {
  if (tablesReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_pricing (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price_vnd INT NOT NULL,
      discount_price_vnd INT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      txn_ref VARCHAR(100) NOT NULL UNIQUE,
      amount_vnd INT NOT NULL,
      order_info VARCHAR(255),
      vnp_transaction_no VARCHAR(50),
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
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_purchases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      course_code VARCHAR(100) NOT NULL DEFAULT 'SIGN_LANGUAGE_101',
      payment_id INT NOT NULL,
      purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_course (user_id, course_code),
      INDEX idx_purchases_user (user_id)
    )
  `);

  await pool.query(`
    INSERT INTO course_pricing (id, title, description, price_vnd, discount_price_vnd)
    VALUES (1, ?, ?, ?, NULL)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      description = VALUES(description),
      price_vnd = VALUES(price_vnd),
      is_active = TRUE
  `, [
    'Khóa học Ngôn ngữ Ký hiệu Việt Nam',
    'Trọn bộ 28 bài học - 2 phần - 14 chương. Học ngôn ngữ ký hiệu Việt Nam từ cơ bản đến nâng cao.',
    Number(process.env.COURSE_PRICE_VND || 299000)
  ]);

  tablesReady = true;
}

async function getActivePricing() {
  await ensurePaymentTables();
  const [rows] = await pool.query(`
    SELECT id, title, description, price_vnd, discount_price_vnd
    FROM course_pricing
    WHERE is_active = TRUE
    LIMIT 1
  `);
  const pricing = rows[0] || null;
  if (!pricing) return null;
  return {
    ...pricing,
    course_code: COURSE_CODE,
    currency: 'VND',
    provider: 'VNPAY'
  };
}

async function createPayment(userId, pricingId, ipAddr) {
  await ensurePaymentTables();
  const [users] = await pool.query(`
    SELECT id, role, status FROM users WHERE id = ? LIMIT 1
  `, [userId]);
  const user = users[0];
  if (!user || user.status !== 'ACTIVE') {
    const error = new Error('Only active accounts can create payments.');
    error.status = 403;
    throw error;
  }
  if (user.role !== 'STUDENT') {
    const error = new Error('Only Student accounts can purchase the course.');
    error.status = 403;
    throw error;
  }

  const hasAccess = await getUserCourseAccess(userId);
  if (hasAccess) {
    return {
      alreadyPurchased: true,
      paymentUrl: null,
      access: { hasAccess: true, courseCode: COURSE_CODE }
    };
  }

  const pricing = await getActivePricing();
  if (!pricing) {
    throw new Error('No active course pricing found.');
  }
  if (pricingId && Number(pricingId) !== Number(pricing.id)) {
    const error = new Error('Invalid pricing option.');
    error.status = 400;
    throw error;
  }

  const amount = pricing.discount_price_vnd || pricing.price_vnd;
  const txnRef = `SLMS${userId}${Date.now()}`;
  const orderInfo = `Thanh toan khoa hoc SignLearn ${txnRef}`;

  await pool.query(`
    INSERT INTO payments (user_id, txn_ref, amount_vnd, order_info, status)
    VALUES (?, ?, ?, ?, 'PENDING')
  `, [userId, txnRef, amount, orderInfo]);

  // Retrieve the created payment to pass it to createPaymentUrl
  const [paymentRows] = await pool.query(`
    SELECT id, txn_ref, amount_vnd, order_info
    FROM payments
    WHERE txn_ref = ?
    LIMIT 1
  `, [txnRef]);

  const payment = paymentRows[0];
  const paymentUrl = vnpayService.createPaymentUrl(payment, ipAddr);

  return {
    paymentUrl,
    txnRef,
    amount,
    pricing
  };
}

async function finalizeVNPayPayment(params, { forIpn = false } = {}) {
  await ensurePaymentTables();
  const isVerified = vnpayService.verifyReturnUrl(params);
  if (!isVerified) {
    return forIpn
      ? { RspCode: '97', Message: 'Invalid Checksum' }
      : { success: false, message: 'Invalid signature' };
  }

  const txnRef = params.vnp_TxnRef;
  const vnpAmount = Number(params.vnp_Amount) / 100;
  const responseCode = params.vnp_ResponseCode;
  const transactionStatus = params.vnp_TransactionStatus;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 2. Lookup order
    const [payments] = await connection.query(`
      SELECT id, user_id, amount_vnd, status
      FROM payments
      WHERE txn_ref = ?
      FOR UPDATE
    `, [txnRef]);

    const payment = payments[0];
    if (!payment) {
      await connection.rollback();
      return forIpn
        ? { RspCode: '01', Message: 'Order not Found' }
        : { success: false, message: 'Order not found' };
    }

    if (payment.amount_vnd !== vnpAmount) {
      await connection.rollback();
      return forIpn
        ? { RspCode: '04', Message: 'Invalid Amount' }
        : { success: false, message: 'Invalid amount' };
    }

    if (payment.status !== 'PENDING') {
      await connection.rollback();
      if (forIpn) return { RspCode: '02', Message: 'Order already confirmed' };
      return {
        success: payment.status === 'SUCCESS',
        txnRef,
        amount: payment.amount_vnd,
        status: payment.status,
        message: payment.status === 'SUCCESS' ? 'Thanh toán thành công' : 'Giao dịch đã được xử lý trước đó'
      };
    }

    const isSuccess = responseCode === '00' && transactionStatus === '00';
    const finalStatus = isSuccess ? 'SUCCESS' : 'FAILED';

    await connection.query(`
      UPDATE payments
      SET status = ?,
          vnp_transaction_no = ?,
          vnp_bank_code = ?,
          vnp_card_type = ?,
          vnp_pay_date = ?,
          vnp_response_code = ?,
          vnp_transaction_status = ?
      WHERE id = ?
    `, [
      finalStatus,
      params.vnp_TransactionNo,
      params.vnp_BankCode,
      params.vnp_CardType,
      params.vnp_PayDate,
      responseCode,
      transactionStatus,
      payment.id
    ]);

    if (isSuccess) {
      await connection.query(`
        INSERT IGNORE INTO course_purchases (user_id, payment_id, expires_at)
        VALUES (?, ?, NULL)
      `, [payment.user_id, payment.id]);
    }

    await connection.commit();
    if (forIpn) return { RspCode: '00', Message: 'Confirm Success' };
    return {
      success: isSuccess,
      txnRef,
      amount: payment.amount_vnd,
      status: finalStatus,
      responseCode,
      transactionStatus,
      message: isSuccess ? 'Thanh toán thành công' : 'Thanh toán không thành công hoặc đã bị hủy'
    };
  } catch (error) {
    await connection.rollback();
    console.error('VNPay processing error:', error);
    return forIpn
      ? { RspCode: '99', Message: 'Input required data error' }
      : { success: false, message: 'Could not process payment result.' };
  } finally {
    connection.release();
  }
}

async function processIpn(params) {
  return finalizeVNPayPayment(params, { forIpn: true });
}

async function processReturn(params) {
  return finalizeVNPayPayment(params);
}

async function getUserCourseAccess(userId) {
  await ensurePaymentTables();
  const [users] = await pool.query(`
    SELECT role FROM users WHERE id = ? LIMIT 1
  `, [userId]);

  const user = users[0];
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'TEACHER') return true;

  const [purchases] = await pool.query(`
    SELECT id, purchased_at FROM course_purchases
    WHERE user_id = ?
    LIMIT 1
  `, [userId]);

  return purchases.length > 0;
}

async function getCourseAccess(userId) {
  const hasAccess = await getUserCourseAccess(userId);
  return {
    hasAccess,
    courseCode: COURSE_CODE
  };
}

module.exports = {
  getActivePricing,
  createPayment,
  processIpn,
  processReturn,
  getUserCourseAccess,
  getCourseAccess
};
