const test = require('node:test');
const assert = require('node:assert/strict');
const vnpayService = require('../src/services/vnpay.service');

const originalEnv = {
  VNPAY_TMN_CODE: process.env.VNPAY_TMN_CODE,
  VNPAY_HASH_SECRET: process.env.VNPAY_HASH_SECRET,
  VNPAY_PAYMENT_URL: process.env.VNPAY_PAYMENT_URL,
  VNPAY_RETURN_URL: process.env.VNPAY_RETURN_URL,
  VNP_TMN_CODE: process.env.VNP_TMN_CODE,
  VNP_HASH_SECRET: process.env.VNP_HASH_SECRET,
  VNP_URL: process.env.VNP_URL,
  VNP_RETURN_URL: process.env.VNP_RETURN_URL
};

test.beforeEach(() => {
  process.env.VNPAY_TMN_CODE = 'TESTCODE';
  process.env.VNPAY_HASH_SECRET = 'TESTSECRET';
  process.env.VNPAY_PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  process.env.VNPAY_RETURN_URL = 'https://frontend.test/payment/result';
});

test.afterEach(() => {
  Object.entries(originalEnv).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
});

test('UC-STU-03: VNPay client IP is normalized for sandbox payment data', () => {
  assert.equal(vnpayService.normalizeIpAddr('::1'), '127.0.0.1');
  assert.equal(vnpayService.normalizeIpAddr('::ffff:192.168.1.5'), '192.168.1.5');
  assert.equal(vnpayService.normalizeIpAddr('10.0.0.1, 10.0.0.2'), '10.0.0.1');
  assert.equal(vnpayService.normalizeIpAddr('2001:db8::1'), '127.0.0.1');
});

test('UC-STU-03: VNPay sortObject drops empty values and sorts keys', () => {
  assert.deepEqual(vnpayService.sortObject({
    z: 'last',
    a: 'first',
    empty: '',
    nil: null,
    missing: undefined
  }), {
    a: 'first',
    z: 'last'
  });
});

test('UC-STU-03: VNPay rejects missing config and callbacks without secure hash', () => {
  delete process.env.VNPAY_TMN_CODE;
  delete process.env.VNPAY_HASH_SECRET;
  delete process.env.VNPAY_PAYMENT_URL;
  delete process.env.VNPAY_RETURN_URL;
  delete process.env.VNP_TMN_CODE;
  delete process.env.VNP_HASH_SECRET;
  delete process.env.VNP_URL;
  delete process.env.VNP_RETURN_URL;

  assert.throws(
    () => vnpayService.createPaymentUrl({ txn_ref: 'SLMS', amount_vnd: 1 }, '127.0.0.1'),
    /not configured/
  );

  process.env.VNPAY_TMN_CODE = 'TESTCODE';
  process.env.VNPAY_HASH_SECRET = 'TESTSECRET';
  process.env.VNPAY_PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  process.env.VNPAY_RETURN_URL = 'https://frontend.test/payment/result';

  assert.equal(vnpayService.verifyReturnUrl({ vnp_TxnRef: 'SLMS' }), false);
});

test('UC-STU-03: VNPay payment URL contains signed required parameters', () => {
  const paymentUrl = vnpayService.createPaymentUrl({
    txn_ref: 'SLMS1001',
    amount_vnd: 299000,
    order_info: 'Thanh toan khoa hoc SignLearn SLMS1001'
  }, '::1');

  const url = new URL(paymentUrl);
  const params = Object.fromEntries(url.searchParams.entries());

  assert.equal(url.origin + url.pathname, process.env.VNPAY_PAYMENT_URL);
  assert.equal(params.vnp_TmnCode, 'TESTCODE');
  assert.equal(params.vnp_TxnRef, 'SLMS1001');
  assert.equal(params.vnp_Amount, '29900000');
  assert.equal(params.vnp_IpAddr, '127.0.0.1');
  assert.ok(params.vnp_SecureHash);
  assert.equal(vnpayService.verifyReturnUrl(params), true);
});

test('UC-STU-03: VNPay checksum verification fails after tampering', () => {
  const paymentUrl = vnpayService.createPaymentUrl({
    txn_ref: 'SLMS1002',
    amount_vnd: 299000,
    order_info: 'Thanh toan khoa hoc SignLearn SLMS1002'
  }, '127.0.0.1');

  const url = new URL(paymentUrl);
  const params = Object.fromEntries(url.searchParams.entries());
  params.vnp_Amount = '10000';

  assert.equal(vnpayService.verifyReturnUrl(params), false);
});
