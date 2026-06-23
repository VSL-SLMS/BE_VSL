const test = require('node:test');
const assert = require('node:assert/strict');
const { __testing } = require('../src/services/assignment.service');
const { pool } = require('../src/config/database');

test.after(async () => {
  await pool.end();
});

test('UC-STU-07: Student-facing submission status hides internal lifecycle details', () => {
  assert.equal(__testing.getStudentFacingStatus(undefined), 'Not Submitted');
  assert.equal(__testing.getStudentFacingStatus('SUBMITTED'), 'Submitted');
  assert.equal(__testing.getStudentFacingStatus('GRADED'), 'Graded');
  assert.equal(__testing.getStudentFacingStatus('RECHECKING'), 'Rechecking');
  assert.equal(__testing.getStudentFacingStatus('ESCALATED'), 'Final Result');
  assert.equal(__testing.getStudentFacingStatus('FINALIZED'), 'Final Result');
});

test('UC-TEA-04: Assignment student IDs are normalized and deduplicated', () => {
  assert.deepEqual(__testing.normalizeStudentIds(['1', 2, '2', 'abc', 3]), [1, 2, 3]);
  assert.deepEqual(__testing.normalizeStudentIds('1, 2, 2, 3'), [1, 2, 3]);
});

test('UC-TEA-04: Assignment must target at least one Student', () => {
  assert.throws(
    () => __testing.normalizeStudentIds([]),
    /Select at least one assigned student/
  );
});

test('UC-STU-08: Student can submit before deadline or when late submission is allowed', () => {
  assert.equal(__testing.canSubmit({ submission_status: null }), true);
  assert.equal(__testing.canSubmit({
    submission_status: 'DRAFT',
    deadline: new Date(Date.now() + 60_000),
    allow_late_submission: false
  }), true);
  assert.equal(__testing.canSubmit({
    submission_status: 'DRAFT',
    deadline: new Date(Date.now() - 60_000),
    allow_late_submission: true
  }), true);
});

test('UC-STU-08: Student cannot resubmit locked, graded, or late assignments', () => {
  assert.equal(__testing.canSubmit({ submission_status: 'SUBMITTED' }), false);
  assert.equal(__testing.canSubmit({ submission_status: 'GRADED' }), false);
  assert.equal(__testing.canSubmit({ submission_status: 'DRAFT', is_locked: true }), false);
  assert.equal(__testing.canSubmit({
    submission_status: 'DRAFT',
    deadline: new Date(Date.now() - 60_000),
    allow_late_submission: false
  }), false);
});

test('UC-STU-08: Submission file format is validated', () => {
  assert.doesNotThrow(() => __testing.validateSubmissionFile('https://cdn.test/sign-practice.mp4'));
  assert.doesNotThrow(() => __testing.validateSubmissionFile('/uploads/answer.pdf'));
  assert.throws(
    () => __testing.validateSubmissionFile('/uploads/malware.exe'),
    /Unsupported submission file format/
  );
});

test('UC-TEA-04: Invalid deadline is rejected', () => {
  assert.throws(
    () => __testing.normalizeDeadline('not-a-date'),
    /Deadline must be a valid date/
  );
});
