const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function getVNPayConfig() {
  const tmnCode = process.env.VNPAY_TMN_CODE || process.env.VNP_TMN_CODE;
  const secretKey = process.env.VNPAY_HASH_SECRET || process.env.VNP_HASH_SECRET;
  const paymentUrl = process.env.VNPAY_PAYMENT_URL || process.env.VNP_URL;
  const returnUrl = getReturnUrl();

  if (!tmnCode || !secretKey || !paymentUrl || !returnUrl) {
    throw new Error('VNPay environment variables are not configured.');
  }

  return { tmnCode, secretKey, paymentUrl, returnUrl };
}

function joinUrl(baseUrl, pathname) {
  return `${String(baseUrl || '').trim().replace(/\/+$/, '')}${pathname}`;
}

function getBackendReturnUrl() {
  const backendUrl = process.env.BACKEND_PUBLIC_URL || process.env.API_PUBLIC_URL || process.env.PUBLIC_BACKEND_URL;
  return backendUrl ? joinUrl(backendUrl, '/api/payments/vnpay/return') : '';
}

function isFrontendPaymentResultUrl(value) {
  try {
    return new URL(value).pathname === '/payment/result';
  } catch {
    return false;
  }
}

function getReturnUrl() {
  const configuredReturnUrl = process.env.VNPAY_RETURN_URL || process.env.VNP_RETURN_URL;
  const backendReturnUrl = getBackendReturnUrl();

  if (backendReturnUrl && isFrontendPaymentResultUrl(configuredReturnUrl)) {
    return backendReturnUrl;
  }

  return configuredReturnUrl || backendReturnUrl;
}

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      sorted[key] = obj[key];
    }
  }
  return sorted;
}

function sortAndEncodeObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') {
      sorted[encodeURIComponent(key)] = encodeURIComponent(String(value)).replace(/%20/g, '+');
    }
  }
  return sorted;
}

function normalizeIpAddr(ipAddr) {
  const raw = String(ipAddr || '').split(',')[0].trim();
  if (!raw || raw === '::1') return '127.0.0.1';
  if (raw.startsWith('::ffff:')) return raw.replace('::ffff:', '');
  if (raw.includes(':')) return '127.0.0.1';
  return raw;
}

function buildQueryString(params) {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function formatDate(date) {
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

/**
 * Generates the VNPay payment URL for a given transaction.
 * @param {object} payment - The payment object containing id, txn_ref, amount_vnd, order_info
 * @param {string} ipAddr - The client IP address
 */
function createPaymentUrl(payment, ipAddr) {
  const { tmnCode, secretKey, paymentUrl, returnUrl } = getVNPayConfig();

  const date = new Date();
  const createDate = formatDate(date);

  // VNPay amount is in VND and multiplied by 100
  const amount = payment.amount_vnd * 100;

  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: payment.txn_ref,
    vnp_OrderInfo: payment.order_info || `Thanh toan khoa hoc SignLearn ${payment.txn_ref}`,
    vnp_OrderType: 'other',
    vnp_Amount: amount,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: normalizeIpAddr(ipAddr),
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortAndEncodeObject(params);
  const signData = buildQueryString(sortedParams);
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  sortedParams.vnp_SecureHash = signed;

  return `${paymentUrl}?${buildQueryString(sortedParams)}`;
}

/**
 * Verifies the integrity of VNPay callback parameters.
 * @param {object} query - The query parameters received from VNPay (req.query)
 */
function verifyReturnUrl(query) {
  const { secretKey } = getVNPayConfig();
  const secureHash = query.vnp_SecureHash;
  if (!secureHash) return false;

  // Exclude secure hash parameters
  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const sortedParams = sortAndEncodeObject(params);
  const signData = buildQueryString(sortedParams);
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return String(secureHash).toLowerCase() === signed.toLowerCase();
}

module.exports = {
  createPaymentUrl,
  verifyReturnUrl,
  sortObject,
  normalizeIpAddr,
  getReturnUrl
};
