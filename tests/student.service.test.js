const test = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../src/config/database');
const studentService = require('../src/services/student.service');
const { expectRejectsWithMessage } = require('./helpers');

const originalQuery = pool.query;

function mockPoolQueries(results, assertions = []) {
  const calls = [];
  let resultIndex = 0;
  pool.query = async (sql, params) => {
    calls.push({ sql, params });

    if (String(sql).includes('information_schema.columns')) {
      return [[{ count: 1 }]];
    }

    const assertion = assertions[resultIndex];
    if (assertion) assertion({ sql, params });

    if (resultIndex >= results.length) {
      throw new Error(`Unexpected query #${calls.length}: ${sql}`);
    }
    const result = results[resultIndex];
    resultIndex += 1;
    return result;
  };
  return calls;
}

test.beforeEach(() => {
  studentService.__testing.resetTeacherProfileColumnsReady();
});

test.afterEach(() => {
  pool.query = originalQuery;
});

test('UC-STU-01: Student can select exactly one active Teacher', async () => {
  const calls = mockPoolQueries([
    [[{ id: 5, teacher_id: null }]],
    [[{
      id: 2,
      availability_status: 'OPEN',
      max_students: 30,
      current_student_count: 3
    }]],
    [{ affectedRows: 1 }]
  ]);

  await studentService.chooseTeacher(100, 2);

  assert.equal(calls.length, 8);
  assert.deepEqual(calls[7].params, [2, 5]);
});

test('UC-STU-01: Student cannot select a second Teacher', async () => {
  const calls = mockPoolQueries([
    [[{ id: 5, teacher_id: 2 }]]
  ]);

  await expectRejectsWithMessage(
    () => studentService.chooseTeacher(100, 3),
    'Teacher already selected.'
  );

  assert.equal(calls.length, 1);
});

test('UC-STU-01: Student cannot select an inactive or missing Teacher', async () => {
  mockPoolQueries([
    [[{ id: 5, teacher_id: null }]],
    [[]]
  ]);

  await expectRejectsWithMessage(
    () => studentService.chooseTeacher(100, 999),
    'Teacher not found or inactive.'
  );
});

test('UC-STU-01: Student cannot select a FULL Teacher', async () => {
  mockPoolQueries([
    [[{ id: 5, teacher_id: null }]],
    [[{
      id: 2,
      availability_status: 'FULL',
      max_students: 30,
      current_student_count: 12
    }]]
  ]);

  await expectRejectsWithMessage(
    () => studentService.chooseTeacher(100, 2),
    'Teacher is currently full.'
  );
});

test('UC-STU-01: Teacher list returns practical profile data and hides unverified accuracy', async () => {
  mockPoolQueries([
    [[{
      id: 7,
      full_name: 'New Teacher',
      email: 'new.teacher@example.com',
      avatar_url: null,
      bio: 'Beginner support',
      specialization: 'Alphabet and daily signs',
      accuracy: '100.00',
      availability_status: 'OPEN',
      max_students: 20,
      reliability_label: 'HIGHLY_RELIABLE',
      current_student_count: 0,
      accuracy_verification_count: 0
    }]]
  ]);

  const teachers = await studentService.listTeachers();

  assert.equal(teachers.length, 1);
  assert.equal(teachers[0].full_name, 'New Teacher');
  assert.equal(teachers[0].reliability_label, 'NEW');
  assert.equal(teachers[0].accuracy, null);
  assert.equal(teachers[0].accuracy_verified, false);
  assert.equal(teachers[0].is_accepting_students, true);
});

test('UC-STU-01: Teacher recommendation prefers accepting Teachers with lower student count', async () => {
  mockPoolQueries([
    [[
      {
        id: 1,
        full_name: 'Busy Reliable',
        email: 'busy@example.com',
        avatar_url: null,
        bio: '',
        specialization: '',
        accuracy: '98.00',
        availability_status: 'OPEN',
        max_students: 30,
        reliability_label: 'HIGHLY_RELIABLE',
        current_student_count: 20,
        accuracy_verification_count: 5
      },
      {
        id: 2,
        full_name: 'Available New',
        email: 'available@example.com',
        avatar_url: null,
        bio: '',
        specialization: '',
        accuracy: '100.00',
        availability_status: 'OPEN',
        max_students: 30,
        reliability_label: 'NEW',
        current_student_count: 2,
        accuracy_verification_count: 0
      },
      {
        id: 3,
        full_name: 'Full Teacher',
        email: 'full@example.com',
        avatar_url: null,
        bio: '',
        specialization: '',
        accuracy: '99.00',
        availability_status: 'FULL',
        max_students: 30,
        reliability_label: 'HIGHLY_RELIABLE',
        current_student_count: 30,
        accuracy_verification_count: 4
      }
    ]]
  ]);

  const teachers = await studentService.listTeachers({ recommend: true });

  assert.deepEqual(teachers.map((teacher) => teacher.id), [2, 1]);
  assert.equal(teachers[0].is_recommended, true);
  assert.equal(teachers[0].reliability_label, 'NEW');
});

test('UC-STU-02: Student can request Teacher change when assigned', async () => {
  const calls = mockPoolQueries([
    [[{ id: 5, teacher_id: 2 }]],
    [[]],
    [{ insertId: 11 }]
  ]);

  const result = await studentService.requestTeacherChange(100, 'Need another schedule.');

  assert.deepEqual(result, { id: 11, status: 'PENDING' });
  assert.deepEqual(calls[2].params, [5, 2, null, 'Need another schedule.']);
});

test('UC-STU-02: Student cannot request Teacher change without current Teacher', async () => {
  mockPoolQueries([
    [[{ id: 5, teacher_id: null }]]
  ]);

  await expectRejectsWithMessage(
    () => studentService.requestTeacherChange(100, 'Need another schedule.'),
    'Select a teacher before requesting a change.'
  );
});

test('UC-STU-02: Existing pending Teacher change request is reused', async () => {
  mockPoolQueries([
    [[{ id: 5, teacher_id: 2 }]],
    [[{ id: 44 }]]
  ]);

  const result = await studentService.requestTeacherChange(100, 'Need another schedule.');

  assert.deepEqual(result, {
    id: 44,
    status: 'PENDING',
    alreadyPending: true
  });
});
