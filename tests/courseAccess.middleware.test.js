const test = require('node:test');
const assert = require('node:assert/strict');
const paymentService = require('../src/services/payment.service');
const { requireCourseAccess } = require('../src/middlewares/courseAccess.middleware');
const { createMockResponse } = require('./helpers');

const originalGetUserCourseAccess = paymentService.getUserCourseAccess;

test.afterEach(() => {
  paymentService.getUserCourseAccess = originalGetUserCourseAccess;
});

test('UC-STU-03: course access middleware requires authentication', async () => {
  const res = createMockResponse();
  let nextCalled = false;

  await requireCourseAccess({}, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'AUTHENTICATION_REQUIRED');
});

test('UC-STU-03: course access middleware bypasses staff roles', async () => {
  const roles = ['ADMIN', 'TEACHER'];

  for (const role of roles) {
    const res = createMockResponse();
    let nextCalled = false;

    await requireCourseAccess({ user: { id: 1, role } }, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  }
});

test('UC-STU-03: course access middleware checks student purchase state', async () => {
  paymentService.getUserCourseAccess = async () => false;
  const denied = createMockResponse();

  await requireCourseAccess({ user: { id: 1, role: 'STUDENT' } }, denied, () => {});
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.body.code, 'COURSE_PURCHASE_REQUIRED');

  paymentService.getUserCourseAccess = async () => true;
  const allowed = createMockResponse();
  let nextCalled = false;

  await requireCourseAccess({ user: { id: 1, role: 'STUDENT' } }, allowed, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('UC-STU-03: course access middleware forwards payment lookup errors', async () => {
  const expected = new Error('db down');
  paymentService.getUserCourseAccess = async () => {
    throw expected;
  };

  let forwarded;
  await requireCourseAccess({ user: { id: 1, role: 'STUDENT' } }, createMockResponse(), (error) => {
    forwarded = error;
  });

  assert.equal(forwarded, expected);
});
