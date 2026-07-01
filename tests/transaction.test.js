const test = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../src/config/database');
const { withTransaction } = require('../src/utils/transaction');

const originalGetConnection = pool.getConnection;

test.afterEach(() => {
  pool.getConnection = originalGetConnection;
});

function mockConnection() {
  const calls = [];
  return {
    calls,
    async beginTransaction() {
      calls.push('begin');
    },
    async commit() {
      calls.push('commit');
    },
    async rollback() {
      calls.push('rollback');
    },
    release() {
      calls.push('release');
    }
  };
}

test('UC-SYS-01: withTransaction commits successful callbacks', async () => {
  const connection = mockConnection();
  pool.getConnection = async () => connection;

  const result = await withTransaction(async (tx) => {
    assert.equal(tx, connection);
    return 42;
  });

  assert.equal(result, 42);
  assert.deepEqual(connection.calls, ['begin', 'commit', 'release']);
});

test('UC-SYS-01: withTransaction rolls back failed callbacks', async () => {
  const connection = mockConnection();
  const expected = new Error('nope');
  pool.getConnection = async () => connection;

  await assert.rejects(
    () => withTransaction(async () => {
      throw expected;
    }),
    expected
  );

  assert.deepEqual(connection.calls, ['begin', 'rollback', 'release']);
});

test('UC-SYS-01: withTransaction rolls back failed commits', async () => {
  const connection = mockConnection();
  const expected = new Error('commit failed');
  connection.commit = async () => {
    connection.calls.push('commit');
    throw expected;
  };
  pool.getConnection = async () => connection;

  await assert.rejects(
    () => withTransaction(async () => 1),
    expected
  );

  assert.deepEqual(connection.calls, ['begin', 'commit', 'rollback', 'release']);
});
