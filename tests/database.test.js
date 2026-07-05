const test = require('node:test');
const assert = require('node:assert/strict');
const { pool, testConnection } = require('../src/config/database');

const originalGetConnection = pool.getConnection;
const originalConsoleError = console.error;

test.afterEach(() => {
  pool.getConnection = originalGetConnection;
  console.error = originalConsoleError;
});

test('UC-SYS-01: testConnection releases healthy connections', async () => {
  let released = false;
  pool.getConnection = async () => ({
    release() {
      released = true;
    }
  });

  assert.equal(await testConnection(), true);
  assert.equal(released, true);
});

test('UC-SYS-01: testConnection reports failed connections', async () => {
  let logged = false;
  console.error = () => {
    logged = true;
  };
  pool.getConnection = async () => {
    throw new Error('offline');
  };

  assert.equal(await testConnection(), false);
  assert.equal(logged, true);
});

test('UC-SYS-01: pool.end is a no-op before lazy pool creation', async () => {
  await assert.doesNotReject(() => pool.end());
});
