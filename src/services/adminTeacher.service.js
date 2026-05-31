const { pool } = require('../config/database');

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

async function listTeachers() {
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
      u.created_at
      ${mustChangePasswordSelect}
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    ORDER BY u.created_at DESC
  `);

  return rows.map(normalizeTeacher);
}

async function getTeacherById(teacherId) {
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
      u.created_at
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
  updateTeacherStatus
};
