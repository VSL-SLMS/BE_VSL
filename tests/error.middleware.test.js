const test = require('node:test');
const assert = require('node:assert/strict');
const { notFound, errorHandler } = require('../src/middlewares/error.middleware');
const { createMockResponse } = require('./helpers');

const originalConsoleError = console.error;

test.afterEach(() => {
  console.error = originalConsoleError;
});

test('UC-SYS-01: notFound returns a JSON 404 response', () => {
  const res = createMockResponse();

  notFound({}, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, true);
  assert.equal(res.body.message, 'API endpoint not found.');
});

test('UC-SYS-01: errorHandler returns explicit and fallback error responses', () => {
  console.error = () => {};

  const explicit = createMockResponse();
  errorHandler(Object.assign(new Error('Nope'), { status: 418 }), {}, explicit, () => {});
  assert.equal(explicit.statusCode, 418);
  assert.equal(explicit.body.message, 'Nope');

  const fallback = createMockResponse();
  errorHandler({ status: 0 }, {}, fallback, () => {});
  assert.equal(fallback.statusCode, 500);
  assert.equal(fallback.body.message, 'Internal server error.');
});
