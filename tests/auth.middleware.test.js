const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authService = require('../src/services/auth.service');
const { pool } = require('../src/config/database');
const { requireAuth, optionalAuth } = require('../src/middlewares/auth.middleware');
const { createMockResponse } = require('./helpers');

const TEST_SECRET = 'unit-test-secret';
const originalJwtSecret = process.env.JWT_SECRET;
const originalGetUserById = authService.getUserById;

function makeToken(payload = {}) {
  return jwt.sign({
    id: 10,
    role: 'STUDENT',
    status: 'ACTIVE',
    token_version: 1,
    ...payload
  }, TEST_SECRET, { expiresIn: '1h' });
}

test.beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

test.afterEach(() => {
  authService.getUserById = originalGetUserById;
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test.after(async () => {
  await pool.end();
});

test('UC-SYS-01: requireAuth rejects requests without bearer token', async () => {
  const req = { headers: {} };
  const res = createMockResponse();
  let nextCalled = false;

  await requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Authentication required.');
});

test('UC-SYS-01: requireAuth accepts a valid JWT and active database user', async () => {
  const token = makeToken();
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createMockResponse();
  let nextCalled = false;

  authService.getUserById = async () => ({
    id: 10,
    role: 'STUDENT',
    status: 'ACTIVE',
    token_version: 1
  });

  await requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 10);
  assert.equal(res.statusCode, 200);
});

test('UC-SYS-01: requireAuth rejects token_version mismatch after password change', async () => {
  const token = makeToken({ token_version: 1 });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createMockResponse();
  let nextCalled = false;

  authService.getUserById = async () => ({
    id: 10,
    role: 'STUDENT',
    status: 'ACTIVE',
    token_version: 2
  });

  await requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /invalid|expired/i);
});

test('UC-SYS-01: requireAuth rejects suspended accounts', async () => {
  const token = makeToken({ status: 'SUSPENDED' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createMockResponse();

  authService.getUserById = async () => ({
    id: 10,
    role: 'STUDENT',
    status: 'SUSPENDED',
    token_version: 1
  });

  await requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Account suspended.');
});

test('UC-SYS-01: optionalAuth treats invalid tokens as guest without failing', async () => {
  const req = { headers: { authorization: 'Bearer invalid-token' } };
  const res = createMockResponse();
  let nextCalled = false;

  await optionalAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user, undefined);
  assert.equal(res.statusCode, 200);
});

test('UC-SYS-02: password change verification token is scoped to user and token version', () => {
  const user = {
    id: 10,
    role: 'TEACHER',
    status: 'ACTIVE',
    token_version: 3
  };
  const token = authService.__testing.signPasswordChangeToken(user);

  assert.doesNotThrow(() => authService.__testing.verifyPasswordChangeToken(user, token));
  assert.throws(
    () => authService.__testing.verifyPasswordChangeToken({ ...user, id: 11 }, token),
    /invalid|expired/i
  );
  assert.throws(
    () => authService.__testing.verifyPasswordChangeToken({ ...user, token_version: 4 }, token),
    /invalid|expired/i
  );
});
