const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('../src/utils/jwt');

const originalDateNow = Date.now;

test.afterEach(() => {
  Date.now = originalDateNow;
});

function hmacToken(header, payload, secret) {
  const data = [
    Buffer.from(JSON.stringify(header)).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url')
  ].join('.');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

test('JWT signs and verifies HS256 payloads with expiry metadata', () => {
  Date.now = () => 1_000_000;
  const token = jwt.sign({ id: 7 }, 'secret', { expiresIn: '2m' });
  const payload = jwt.verify(token, 'secret');

  assert.equal(payload.id, 7);
  assert.equal(payload.iat, 1000);
  assert.equal(payload.exp, 1120);
});

test('JWT accepts numeric and second-based expiry values', () => {
  Date.now = () => 10_000;

  const noExpiry = jwt.verify(jwt.sign({ id: 1 }, 'secret'), 'secret');
  assert.equal(noExpiry.exp, undefined);
  assert.equal(jwt.verify(jwt.sign({ id: 1 }, 'secret', { expiresIn: 5 }), 'secret').exp, 15);
  assert.equal(jwt.verify(jwt.sign({ id: 1 }, 'secret', { expiresIn: '5' }), 'secret').exp, 15);
  assert.equal(jwt.verify(jwt.sign({ id: 1 }, 'secret', { expiresIn: '1h' }), 'secret').exp, 3610);
  assert.equal(jwt.verify(jwt.sign({ id: 1 }, 'secret', { expiresIn: '1d' }), 'secret').exp, 86410);
});

test('JWT rejects invalid signing inputs and malformed tokens', () => {
  assert.throws(() => jwt.sign({ id: 1 }, ''), /secret/);
  assert.throws(() => jwt.verify('a.b.c', ''), /secret/);
  assert.throws(() => jwt.sign({ id: 1 }, 'secret', { expiresIn: 'soon' }), /expiresIn/);
  assert.throws(() => jwt.verify('not-a-jwt', 'secret'), /Invalid token/);
});

test('JWT rejects bad signatures, unsupported algorithms, and expired tokens', () => {
  Date.now = () => 1_000;
  const token = jwt.sign({ id: 1 }, 'secret', { expiresIn: '1s' });
  const parts = token.split('.');

  assert.throws(() => jwt.verify(`${parts[0]}.${parts[1]}.x`, 'secret'), /signature/);
  assert.throws(() => jwt.verify(`${parts[0]}.${parts[1]}.${parts[2].replace(/.$/, 'x')}`, 'secret'), /signature/);
  assert.throws(() => jwt.verify(hmacToken({ alg: 'none' }, { id: 1 }, 'secret'), 'secret'), /Unsupported/);

  Date.now = () => 3_000;
  assert.throws(() => jwt.verify(token, 'secret'), /expired/);
});
