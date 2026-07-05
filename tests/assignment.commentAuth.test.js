const test = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../src/config/database');
const assignmentService = require('../src/services/assignment.service');

const originalQuery = pool.query;

test.afterEach(() => {
  pool.query = originalQuery;
});

function mockSubmissionAccessRow(row) {
  pool.query = async () => [[row]];
}

test('UC-STU-08: Submission comments allow the owner Student and owner Teacher only', async () => {
  mockSubmissionAccessRow({
    id: 4,
    student_user_id: 10,
    teacher_user_id: 20
  });

  await assert.doesNotReject(() =>
    assignmentService.__testing.getSubmissionCommentAccess({ id: 10, role: 'STUDENT' }, 4)
  );
  await assert.doesNotReject(() =>
    assignmentService.__testing.getSubmissionCommentAccess({ id: 20, role: 'TEACHER' }, 4)
  );
  await assert.rejects(
    () => assignmentService.__testing.getSubmissionCommentAccess({ id: 11, role: 'STUDENT' }, 4),
    /cannot access comments/
  );
  await assert.rejects(
    () => assignmentService.__testing.getSubmissionCommentAccess({ id: 21, role: 'TEACHER' }, 4),
    /cannot access comments/
  );
});
