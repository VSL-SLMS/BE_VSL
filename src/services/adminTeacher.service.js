const { pool } = require('../config/database');

let teacherProfileColumnsReady = false;

function normalizeTeacher(row) {
  if (!row) return null;
  return {
    id: row.teacher_id,
    user_id: row.user_id,
    username: row.username,
    email: row.email,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    role: row.role,
    status: row.status,
    accuracy: row.accuracy,
    bio: row.bio || '',
    specialization: row.specialization || 'General VSL learning',
    availability_status: row.availability_status || 'OPEN',
    max_students: Number(row.max_students || 30),
    reliability_label: row.reliability_label || 'NEW',
    current_student_count: Number(row.current_student_count || 0),
    must_change_password: Boolean(row.must_change_password),
    created_at: row.created_at
  };
}

async function hasColumn(tableName, columnName) {
  const [rows] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
  `, [tableName, columnName]);
  return Number(rows[0]?.count || 0) > 0;
}

async function addTeacherProfileColumnIfMissing(columnName, ddl) {
  const exists = await hasColumn('teachers', columnName);
  if (!exists) {
    await pool.query(`ALTER TABLE teachers ADD COLUMN ${ddl}`);
  }
}

async function ensureTeacherProfileColumns() {
  if (teacherProfileColumnsReady) return;

  await addTeacherProfileColumnIfMissing('bio', 'bio TEXT NULL');
  await addTeacherProfileColumnIfMissing('specialization', 'specialization VARCHAR(255) NULL');
  await addTeacherProfileColumnIfMissing(
    'availability_status',
    "availability_status ENUM('OPEN', 'LIMITED', 'FULL') NOT NULL DEFAULT 'OPEN'"
  );
  await addTeacherProfileColumnIfMissing('max_students', 'max_students INT NOT NULL DEFAULT 30');
  await addTeacherProfileColumnIfMissing(
    'reliability_label',
    "reliability_label ENUM('NEW', 'RELIABLE', 'HIGHLY_RELIABLE') NOT NULL DEFAULT 'NEW'"
  );

  teacherProfileColumnsReady = true;
}

function normalizeAvailabilityStatus(value) {
  return ['OPEN', 'LIMITED', 'FULL'].includes(value) ? value : 'OPEN';
}

function normalizeReliabilityLabel(value) {
  return ['NEW', 'RELIABLE', 'HIGHLY_RELIABLE'].includes(value) ? value : 'NEW';
}

function normalizeMaxStudents(value) {
  const maxStudents = Number(value);
  if (!Number.isInteger(maxStudents) || maxStudents < 1 || maxStudents > 500) {
    const error = new Error('max_students must be an integer between 1 and 500.');
    error.status = 400;
    throw error;
  }
  return maxStudents;
}

async function listTeachers() {
  await ensureTeacherProfileColumns();

  const hasMustChangePassword = await hasColumn('users', 'must_change_password');
  const mustChangePasswordSelect = hasMustChangePassword ? ', u.must_change_password' : ', FALSE AS must_change_password';
  const mustChangePasswordGroupBy = hasMustChangePassword ? ', u.must_change_password' : '';

  const [rows] = await pool.query(`
    SELECT
      t.id AS teacher_id,
      t.user_id,
      t.accuracy,
      u.username,
      u.email,
      u.display_name,
      u.avatar_url,
      u.role,
      u.status,
      u.created_at,
      t.bio,
      t.specialization,
      t.availability_status,
      t.max_students,
      t.reliability_label,
      COUNT(DISTINCT s.id) AS current_student_count
      ${mustChangePasswordSelect}
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN students s ON s.teacher_id = t.id
    GROUP BY
      t.id,
      t.user_id,
      t.accuracy,
      u.username,
      u.email,
      u.display_name,
      u.avatar_url,
      u.role,
      u.status,
      u.created_at,
      t.bio,
      t.specialization,
      t.availability_status,
      t.max_students,
      t.reliability_label
      ${mustChangePasswordGroupBy}
    ORDER BY u.created_at DESC
  `);

  return rows.map(normalizeTeacher);
}

async function getTeacherById(teacherId) {
  await ensureTeacherProfileColumns();

  const id = Number(teacherId);
  if (!id) {
    const error = new Error('Teacher ID is required.');
    error.status = 400;
    throw error;
  }

  const hasMustChangePassword = await hasColumn('users', 'must_change_password');
  const mustChangePasswordSelect = hasMustChangePassword ? ', u.must_change_password' : ', FALSE AS must_change_password';

  const [rows] = await pool.query(`
    SELECT
      t.id AS teacher_id,
      t.user_id,
      t.accuracy,
      u.username,
      u.email,
      u.display_name,
      u.avatar_url,
      u.role,
      u.status,
      u.created_at,
      t.bio,
      t.specialization,
      t.availability_status,
      t.max_students,
      t.reliability_label,
      (
        SELECT COUNT(*)
        FROM students s
        WHERE s.teacher_id = t.id
      ) AS current_student_count
      ${mustChangePasswordSelect}
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    WHERE t.id = ?
    LIMIT 1
  `, [id]);

  const teacher = normalizeTeacher(rows[0]);
  if (!teacher) {
    const error = new Error('Teacher not found.');
    error.status = 404;
    throw error;
  }

  const [students] = await pool.query(`
    SELECT
      s.id AS student_id,
      u.id AS user_id,
      u.display_name,
      u.email,
      u.status
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.teacher_id = ?
    ORDER BY u.display_name
  `, [id]);

  return {
    ...teacher,
    students
  };
}

async function updateTeacherProfile(teacherId, payload) {
  await ensureTeacherProfileColumns();

  const teacher = await getTeacherById(teacherId);
  const displayName = String(payload.name || payload.displayName || payload.display_name || teacher.display_name || '').trim();
  const avatarUrl = String(payload.avatarUrl || payload.avatar_url || '').trim();
  const bio = String(payload.bio || '').trim();
  const specialization = String(payload.specialization || '').trim();
  const availabilityStatus = normalizeAvailabilityStatus(payload.availabilityStatus || payload.availability_status);
  const reliabilityLabel = normalizeReliabilityLabel(payload.reliabilityLabel || payload.reliability_label);
  const maxStudents = normalizeMaxStudents(payload.maxStudents ?? payload.max_students ?? teacher.max_students);

  if (!displayName) {
    const error = new Error('Teacher display name is required.');
    error.status = 400;
    throw error;
  }

  await pool.query(`
    UPDATE users
    SET display_name = ?,
        avatar_url = ?
    WHERE id = ? AND role = 'TEACHER'
  `, [displayName, avatarUrl || null, teacher.user_id]);

  await pool.query(`
    UPDATE teachers
    SET bio = ?,
        specialization = ?,
        availability_status = ?,
        max_students = ?,
        reliability_label = ?
    WHERE id = ?
  `, [
    bio || null,
    specialization || null,
    availabilityStatus,
    maxStudents,
    reliabilityLabel,
    teacher.id
  ]);

  return getTeacherById(teacher.id);
}

async function updateTeacherStatus(teacherId, status) {
  const normalizedStatus = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  const teacher = await getTeacherById(teacherId);

  await pool.query(`
    UPDATE users
    SET status = ?
    WHERE id = ? AND role = 'TEACHER'
  `, [normalizedStatus, teacher.user_id]);

  return getTeacherById(teacherId);
}

module.exports = {
  listTeachers,
  getTeacherById,
  updateTeacherProfile,
  updateTeacherStatus
};
