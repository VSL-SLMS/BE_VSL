const test = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../src/config/database');
const userService = require('../src/services/user.service');

const originalGetConnection = pool.getConnection;

test.afterEach(() => {
  pool.getConnection = originalGetConnection;
});

function mockConnection(results) {
  const calls = [];
  let index = 0;
  return {
    calls,
    async beginTransaction() {
      calls.push({ sql: 'BEGIN' });
    },
    async query(sql, params) {
      calls.push({ sql, params });
      const result = results[index];
      index += 1;
      if (!result) throw new Error(`Unexpected query: ${sql}`);
      return result;
    },
    async commit() {
      calls.push({ sql: 'COMMIT' });
    },
    async rollback() {
      calls.push({ sql: 'ROLLBACK' });
    },
    release() {
      calls.push({ sql: 'RELEASE' });
    }
  };
}

test('UC-STU-02: Teacher change approval preserves progress, submissions, grades, and course access', async () => {
  const connection = mockConnection([
    [[{ id: 9, student_id: 5, status: 'PENDING' }]],
    [{ affectedRows: 1 }],
    [{ affectedRows: 1 }]
  ]);
  pool.getConnection = async () => connection;

  const result = await userService.reviewTeacherChangeRequest(9, 'APPROVED');

  assert.deepEqual(result, { id: 9, status: 'APPROVED' });
  const sqlText = connection.calls.map((call) => String(call.sql)).join('\n');
  assert.match(sqlText, /UPDATE students SET teacher_id = NULL/);
  assert.doesNotMatch(sqlText, /DELETE/i);
  assert.doesNotMatch(sqlText, /lesson_progress/i);
  assert.doesNotMatch(sqlText, /student_topic_progress/i);
  assert.doesNotMatch(sqlText, /payments/i);
  assert.doesNotMatch(sqlText, /submissions/i);
  assert.doesNotMatch(sqlText, /submission_grades/i);
});
