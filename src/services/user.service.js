const { pool } = require('../config/database');
const {
  createAvatarUploadSignature,
  getAvatarUploadLimits
} = require('../config/cloudinary');

let studentProfileColumnsReady = false;
let teacherProfileColumnsReady = false;
const AVATAR_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function appError(message, status = 400, code = 'USER_PROFILE_ERROR') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
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

async function ensureStudentProfileColumns() {
  if (studentProfileColumnsReady) return;

  const hasDateOfBirth = await hasColumn('students', 'date_of_birth');
  if (!hasDateOfBirth) {
    await pool.query('ALTER TABLE students ADD COLUMN date_of_birth DATE NULL');
  }

  studentProfileColumnsReady = true;
}

async function ensureTeacherProfileColumns() {
  if (teacherProfileColumnsReady) return;

  const hasBio = await hasColumn('teachers', 'bio');
  if (!hasBio) {
    await pool.query('ALTER TABLE teachers ADD COLUMN bio TEXT NULL');
  }

  teacherProfileColumnsReady = true;
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('Valid email is required.');
    error.status = 400;
    throw error;
  }
  return email;
}

function detectAvatarFormat(payload = {}) {
  const explicit = payload.format || payload.extension;
  if (explicit) return String(explicit).trim().replace(/^\./, '').toLowerCase();

  const fileName = String(payload.fileName || payload.filename || '').trim();
  const match = fileName.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

function validateAvatarUploadRequest(payload = {}) {
  const limits = getAvatarUploadLimits();
  const format = detectAvatarFormat(payload);
  if (!format || !limits.allowedFormats.includes(format)) {
    throw appError('Use JPG, PNG, or WEBP avatar images.', 400, 'UNSUPPORTED_AVATAR_FORMAT');
  }

  const contentType = String(payload.contentType || payload.mimeType || '').toLowerCase();
  if (contentType && !AVATAR_IMAGE_TYPES.includes(contentType)) {
    throw appError('Use JPG, PNG, or WEBP avatar images.', 400, 'UNSUPPORTED_AVATAR_TYPE');
  }

  const bytes = Number(payload.bytes ?? payload.fileSize ?? payload.size);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    throw appError('Avatar image size is required.', 400, 'AVATAR_SIZE_REQUIRED');
  }
  if (bytes > limits.maxBytes) {
    throw appError('Avatar image is too large.', 400, 'AVATAR_TOO_LARGE');
  }

  return { format, bytes };
}

function requestAvatarUploadSignature(user, payload = {}) {
  if (!['STUDENT', 'TEACHER'].includes(user?.role)) {
    throw appError('Avatar upload is only available for Students and Teachers.', 403, 'AVATAR_UPLOAD_FORBIDDEN');
  }

  validateAvatarUploadRequest(payload);
  return createAvatarUploadSignature({ user });
}

function normalizeDateOfBirth(value) {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const error = new Error('dateOfBirth must use YYYY-MM-DD format.');
    error.status = 400;
    throw error;
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    const error = new Error('dateOfBirth is invalid.');
    error.status = 400;
    throw error;
  }

  if (parsed.getTime() > Date.now()) {
    const error = new Error('dateOfBirth cannot be in the future.');
    error.status = 400;
    throw error;
  }

  return raw;
}

function normalizeTeacherBio(value) {
  if (value === undefined) return undefined;
  const bio = String(value || '').trim();
  if (bio.length > 1000) {
    const error = new Error('Bio must be 1000 characters or fewer.');
    error.status = 400;
    throw error;
  }
  return bio;
}

async function listUsers() {
  const [rows] = await pool.query(`
    SELECT
      u.id,
      u.username,
      u.email,
      u.display_name,
      u.role,
      u.status,
      u.created_at,
      t.id AS teacher_id,
      s.id AS student_id,
      s.teacher_id AS assigned_teacher_id,
      s.date_of_birth,
      teacher_user.display_name AS assigned_teacher_name
    FROM users u
    LEFT JOIN teachers t ON t.user_id = u.id
    LEFT JOIN students s ON s.user_id = u.id
    LEFT JOIN teachers assigned_teacher ON assigned_teacher.id = s.teacher_id
    LEFT JOIN users teacher_user ON teacher_user.id = assigned_teacher.user_id
    ORDER BY created_at DESC
  `);
  return rows;
}

async function updateUserProfile(requestUser, userId, { name, email, avatarUrl, dateOfBirth, bio }) {
  const targetId = Number(userId);
  if (!targetId) {
    const error = new Error('User ID is required.');
    error.status = 400;
    throw error;
  }

  if (requestUser.role !== 'ADMIN' && Number(requestUser.id) !== targetId) {
    const error = new Error('You can only update your own profile.');
    error.status = 403;
    throw error;
  }

  const [users] = await pool.query(`
    SELECT id, role, email
    FROM users
    WHERE id = ? AND role IN ('STUDENT', 'TEACHER')
    LIMIT 1
  `, [targetId]);

  if (!users.length) {
    const error = new Error('Student or Teacher user not found.');
    error.status = 404;
    throw error;
  }

  const displayName = String(name || '').trim();
  const normalizedEmail = email === undefined ? users[0].email : normalizeEmail(email);
  const avatar = String(avatarUrl || '').trim();
  const shouldUpdateDateOfBirth = users[0].role === 'STUDENT' && dateOfBirth !== undefined;
  const normalizedDateOfBirth = shouldUpdateDateOfBirth
    ? normalizeDateOfBirth(dateOfBirth)
    : null;
  const normalizedBio = users[0].role === 'TEACHER' ? normalizeTeacherBio(bio) : undefined;

  if (!displayName && !normalizedEmail && !avatar && !shouldUpdateDateOfBirth && normalizedBio === undefined) {
    const error = new Error('Name, email, avatarUrl, dateOfBirth, or bio is required.');
    error.status = 400;
    throw error;
  }

  if (users[0].role === 'STUDENT') {
    await ensureStudentProfileColumns();
  }
  if (users[0].role === 'TEACHER') {
    await ensureTeacherProfileColumns();
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(`
      UPDATE users
      SET display_name = COALESCE(NULLIF(?, ''), display_name),
          email = ?,
          avatar_url = ?
      WHERE id = ?
    `, [displayName, normalizedEmail, avatar || null, targetId]);

    if (shouldUpdateDateOfBirth) {
      await connection.query(`
        UPDATE students
        SET date_of_birth = ?
        WHERE user_id = ?
      `, [normalizedDateOfBirth, targetId]);
    }

    if (normalizedBio !== undefined) {
      await connection.query(`
        UPDATE teachers
        SET bio = ?
        WHERE user_id = ?
      `, [normalizedBio || null, targetId]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      error.status = 409;
      error.message = 'Email already exists.';
    }
    throw error;
  } finally {
    connection.release();
  }

  const [updated] = await pool.query(`
    SELECT
      u.id,
      u.username,
      u.email,
      u.display_name,
      u.avatar_url,
      u.role,
      u.status,
      u.token_version,
      u.created_at,
      s.date_of_birth,
      t.bio
    FROM users u
    LEFT JOIN students s ON s.user_id = u.id
    LEFT JOIN teachers t ON t.user_id = u.id
    WHERE u.id = ?
    LIMIT 1
  `, [targetId]);

  return updated[0];
}

async function deleteUserAvatar(requestUser, userId) {
  const targetId = Number(userId);
  if (!targetId) {
    const error = new Error('User ID is required.');
    error.status = 400;
    throw error;
  }

  if (requestUser.role !== 'ADMIN' && Number(requestUser.id) !== targetId) {
    const error = new Error('You can only update your own profile.');
    error.status = 403;
    throw error;
  }

  const [result] = await pool.query(`
    UPDATE users
    SET avatar_url = NULL
    WHERE id = ? AND role IN ('STUDENT', 'TEACHER')
  `, [targetId]);

  if (!result.affectedRows) {
    const error = new Error('Student or Teacher user not found.');
    error.status = 404;
    throw error;
  }

  const [updated] = await pool.query(`
    SELECT id, username, email, display_name, avatar_url, role, status, token_version, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `, [targetId]);

  return updated[0];
}

async function listTeacherChangeRequests() {
  const [rows] = await pool.query(`
    SELECT
      tcr.id,
      tcr.status,
      tcr.reason,
      tcr.created_at,
      tcr.reviewed_at,
      student_user.display_name AS student_name,
      student_user.email AS student_email,
      current_teacher_user.display_name AS current_teacher_name,
      current_teacher_user.email AS current_teacher_email,
      requested_teacher_user.display_name AS requested_teacher_name,
      requested_teacher_user.email AS requested_teacher_email
    FROM teacher_change_requests tcr
    JOIN students s ON s.id = tcr.student_id
    JOIN users student_user ON student_user.id = s.user_id
    LEFT JOIN teachers current_teacher ON current_teacher.id = tcr.current_teacher_id
    LEFT JOIN users current_teacher_user ON current_teacher_user.id = current_teacher.user_id
    LEFT JOIN teachers requested_teacher ON requested_teacher.id = tcr.requested_teacher_id
    LEFT JOIN users requested_teacher_user ON requested_teacher_user.id = requested_teacher.user_id
    ORDER BY tcr.created_at DESC
  `);
  return rows;
}

async function reviewTeacherChangeRequest(requestId, status) {
  const normalizedStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [requests] = await connection.query(`
      SELECT id, student_id, status
      FROM teacher_change_requests
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `, [requestId]);

    const request = requests[0];
    if (!request) {
      const error = new Error('Teacher change request not found.');
      error.status = 404;
      throw error;
    }

    if (request.status !== 'PENDING') {
      const error = new Error('Teacher change request was already reviewed.');
      error.status = 400;
      throw error;
    }

    if (normalizedStatus === 'APPROVED') {
      await connection.query(
        'UPDATE students SET teacher_id = NULL WHERE id = ?',
        [request.student_id]
      );
    }

    await connection.query(`
      UPDATE teacher_change_requests
      SET status = ?, reviewed_at = NOW()
      WHERE id = ?
    `, [normalizedStatus, requestId]);

    await connection.commit();
    return { id: requestId, status: normalizedStatus };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listUsers,
  updateUserProfile,
  deleteUserAvatar,
  requestAvatarUploadSignature,
  listTeacherChangeRequests,
  reviewTeacherChangeRequest,
  __testing: {
    detectAvatarFormat,
    validateAvatarUploadRequest,
    normalizeTeacherBio
  }
};
