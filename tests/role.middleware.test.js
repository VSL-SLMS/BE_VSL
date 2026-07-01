const test = require('node:test');
const assert = require('node:assert/strict');
const { requireRole } = require('../src/middlewares/role.middleware');
const { createMockResponse } = require('./helpers');

test('UC-SYS-01: requireRole allows users with an accepted role', () => {
  const req = { user: { id: 1, role: 'ADMIN' } };
  const res = createMockResponse();
  let nextCalled = false;

  requireRole('ADMIN', 'TEACHER')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('UC-SYS-01: requireRole rejects missing users', () => {
  const req = {};
  const res = createMockResponse();
  let nextCalled = false;

  requireRole('ADMIN')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, true);
});

test('UC-SYS-01: requireRole rejects users with the wrong role', () => {
  const req = { user: { id: 2, role: 'STUDENT' } };
  const res = createMockResponse();
  let nextCalled = false;

  requireRole('ADMIN')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /permission/i);
});
