const { pool } = require('../config/database');
const {
  createUploadSignature,
  getSubmissionFolder,
  getUploadLimits
} = require('../config/cloudinary');

let tablesReady = false;
const SUBMITTED_STATUSES = ['SUBMITTED', 'GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED'];

function appError(message, status = 400, code = 'ASSIGNMENT_ERROR') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function normalizeDeadline(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw appError('Deadline must be a valid date.', 400, 'INVALID_DEADLINE');
  }
  return date;
}

function normalizeStudentIds(value) {
  const rawList = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const ids = [...new Set(rawList.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) {
    throw appError('Select at least one assigned student.', 400, 'STUDENT_IDS_REQUIRED');
  }
  return ids;
}

function normalizeSubmissionStatus(status) {
  if (!status) return 'NOT_SUBMITTED';
  return status;
}

function getStudentFacingStatus(status) {
  switch (status) {
    case 'GRADED':
      return 'Graded';
    case 'RECHECKING':
      return 'Rechecking';
    case 'ESCALATED':
    case 'FINALIZED':
      return 'Final Result';
    case 'SUBMITTED':
      return 'Submitted';
    default:
      return 'Not Submitted';
  }
}

function validateSubmissionFile(filePath) {
  if (!filePath) return;
  const allowed = /\.(mp4|mov|webm)$/i;
  if (!allowed.test(filePath)) {
    throw appError('Unsupported submission video format.', 400, 'UNSUPPORTED_FILE_FORMAT');
  }
}

function isSubmittedStatus(status) {
  return SUBMITTED_STATUSES.includes(normalizeSubmissionStatus(status));
}

function detectUploadFormat(payload = {}) {
  const explicit = payload.format || payload.extension;
  if (explicit) return String(explicit).trim().replace(/^\./, '').toLowerCase();

  const fileName = String(payload.fileName || payload.filename || payload.originalFilename || '').trim();
  const match = fileName.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

function assertAllowedVideoFormat(format, limits = getUploadLimits()) {
  if (!format) {
    throw appError('Submission video format is required.', 400, 'UPLOAD_FORMAT_REQUIRED');
  }
  if (!limits.allowedFormats.includes(format)) {
    throw appError('Unsupported submission video format.', 400, 'UNSUPPORTED_FILE_FORMAT');
  }
}

function validateUploadRequest(payload = {}) {
  const limits = getUploadLimits();
  const format = detectUploadFormat(payload);
  assertAllowedVideoFormat(format, limits);

  const contentType = String(payload.contentType || payload.mimeType || '').toLowerCase();
  if (contentType && !['video/mp4', 'video/quicktime', 'video/webm'].includes(contentType)) {
    throw appError('Unsupported submission video type.', 400, 'UNSUPPORTED_FILE_TYPE');
  }

  const bytes = Number(payload.bytes ?? payload.fileSize ?? payload.size);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    throw appError('Submission video size is required.', 400, 'UPLOAD_SIZE_REQUIRED');
  }
  if (bytes > limits.maxBytes) {
    throw appError('Submission video is too large.', 400, 'UPLOAD_TOO_LARGE');
  }

  return { format, bytes };
}

function readCloudinaryPayload(payload = {}) {
  return payload.cloudinary || payload.media || payload.upload || payload;
}

function finitePositiveNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw appError(`${fieldName} is required.`, 400, 'INVALID_CLOUDINARY_METADATA');
  }
  return number;
}

function validateCloudinarySubmissionMetadata(payload = {}, { assignmentId, studentId }) {
  const source = readCloudinaryPayload(payload);
  const limits = getUploadLimits();
  const publicId = String(source.publicId || source.public_id || source.cloudinaryPublicId || '').trim();
  const assetId = String(source.assetId || source.asset_id || source.cloudinaryAssetId || '').trim() || null;
  const secureUrl = String(source.secureUrl || source.secure_url || source.url || '').trim();
  const resourceType = String(source.resourceType || source.resource_type || '').trim().toLowerCase();
  const format = String(source.format || '').trim().replace(/^\./, '').toLowerCase();
  const bytesValue = source.bytes ?? source.mediaBytes ?? source.size;
  const durationValue = source.durationSeconds ?? source.duration_seconds ?? source.duration;
  const originalFilename = String(source.originalFilename || source.original_filename || source.fileName || '').trim() || null;
  const deliveryType = String(source.type || source.deliveryType || source.delivery_type || 'authenticated').trim() || 'authenticated';
  const expectedPrefix = `${getSubmissionFolder(assignmentId, studentId)}/`;

  if (!publicId || !secureUrl || !resourceType || !format || bytesValue === undefined || durationValue === undefined) {
    throw appError('Cloudinary submission metadata is incomplete.', 400, 'CLOUDINARY_METADATA_REQUIRED');
  }
  const bytes = finitePositiveNumber(bytesValue, 'Cloudinary video size');
  const durationSeconds = finitePositiveNumber(durationValue, 'Cloudinary video duration');
  if (resourceType !== 'video') {
    throw appError('Submission media must be a Cloudinary video.', 400, 'INVALID_CLOUDINARY_RESOURCE_TYPE');
  }
  assertAllowedVideoFormat(format, limits);
  if (bytes > limits.maxBytes) {
    throw appError('Submission video is too large.', 400, 'UPLOAD_TOO_LARGE');
  }
  if (durationSeconds > limits.maxDurationSeconds) {
    throw appError('Submission video is too long.', 400, 'UPLOAD_TOO_LONG');
  }
  if (!publicId.startsWith(expectedPrefix) || publicId.includes('..')) {
    throw appError('Cloudinary public ID is outside the assigned upload folder.', 400, 'INVALID_CLOUDINARY_PUBLIC_ID');
  }
  if (!/^https:\/\//i.test(secureUrl)) {
    throw appError('Cloudinary secure URL must use HTTPS.', 400, 'INVALID_CLOUDINARY_SECURE_URL');
  }

  return {
    publicId,
    assetId,
    secureUrl,
    resourceType,
    format,
    bytes,
    durationSeconds,
    originalFilename,
    deliveryType
  };
}

function submissionMediaFromRow(row) {
  if (!row?.cloudinary_public_id) return null;
  return {
    public_id: row.cloudinary_public_id,
    asset_id: row.cloudinary_asset_id,
    secure_url: row.cloudinary_secure_url,
    playback_url: row.cloudinary_secure_url,
    resource_type: row.cloudinary_resource_type,
    format: row.cloudinary_format,
    bytes: row.media_bytes,
    duration_seconds: row.media_duration_seconds,
    original_filename: row.original_filename,
    delivery_type: row.media_delivery_type || 'authenticated'
  };
}

async function ensureColumn(tableName, columnName, definition) {
  const [rows] = await pool.query(`
    SELECT COUNT(*) AS found
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [tableName, columnName]);

  if (!Number(rows[0]?.found)) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function ensureIndex(tableName, indexName, createSql) {
  const [rows] = await pool.query(`
    SELECT COUNT(*) AS found
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
  `, [tableName, indexName]);

  if (!Number(rows[0]?.found)) {
    await pool.query(createSql);
  }
}

async function ensureSubmissionCloudinaryColumns() {
  await ensureColumn('submissions', 'cloudinary_public_id', 'VARCHAR(255) NULL');
  await ensureColumn('submissions', 'cloudinary_asset_id', 'VARCHAR(255) NULL');
  await ensureColumn('submissions', 'cloudinary_secure_url', 'TEXT NULL');
  await ensureColumn('submissions', 'cloudinary_resource_type', 'VARCHAR(50) NULL');
  await ensureColumn('submissions', 'cloudinary_format', 'VARCHAR(30) NULL');
  await ensureColumn('submissions', 'media_bytes', 'BIGINT NULL');
  await ensureColumn('submissions', 'media_duration_seconds', 'DECIMAL(10,3) NULL');
  await ensureColumn('submissions', 'original_filename', 'VARCHAR(255) NULL');
  await ensureColumn('submissions', 'media_delivery_type', "VARCHAR(30) NULL DEFAULT 'authenticated'");
  await ensureIndex(
    'submissions',
    'idx_submissions_cloudinary_public_id',
    'CREATE INDEX idx_submissions_cloudinary_public_id ON submissions (cloudinary_public_id)'
  );
}

async function ensureAssignmentTables() {
  if (tablesReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      teacher_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      instructions TEXT NOT NULL,
      deadline DATETIME NULL,
      allow_late_submission BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      INDEX idx_assignments_teacher (teacher_id)
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignment_students (
      assignment_id INT NOT NULL,
      student_id INT NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (assignment_id, student_id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      assignment_id INT NOT NULL,
      student_id INT NOT NULL,
      content TEXT,
      file_path VARCHAR(500),
      cloudinary_public_id VARCHAR(255) NULL,
      cloudinary_asset_id VARCHAR(255) NULL,
      cloudinary_secure_url TEXT NULL,
      cloudinary_resource_type VARCHAR(50) NULL,
      cloudinary_format VARCHAR(30) NULL,
      media_bytes BIGINT NULL,
      media_duration_seconds DECIMAL(10,3) NULL,
      original_filename VARCHAR(255) NULL,
      media_delivery_type VARCHAR(30) NULL DEFAULT 'authenticated',
      status ENUM('DRAFT', 'SUBMITTED', 'GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED') NOT NULL DEFAULT 'DRAFT',
      score DECIMAL(5,2) NULL,
      feedback TEXT,
      appeal_count INT NOT NULL DEFAULT 0,
      is_locked BOOLEAN NOT NULL DEFAULT FALSE,
      submitted_at DATETIME NULL,
      graded_at DATETIME NULL,
      finalized_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE KEY unique_student_assignment_submission (assignment_id, student_id),
      INDEX idx_submissions_status (status),
      INDEX idx_submissions_cloudinary_public_id (cloudinary_public_id)
    ) ENGINE=InnoDB
  `);

  await ensureSubmissionCloudinaryColumns();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS submission_grades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      submission_id INT NOT NULL,
      graded_by_user_id INT NOT NULL,
      score DECIMAL(5,2) NOT NULL,
      feedback TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (graded_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_submission_grades_submission (submission_id)
    ) ENGINE=InnoDB
  `);

  tablesReady = true;
}

async function getTeacherProfile(userId, connection = pool) {
  const [rows] = await connection.query(`
    SELECT t.id, t.user_id, u.status
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    WHERE t.user_id = ?
    LIMIT 1
  `, [userId]);

  const teacher = rows[0];
  if (!teacher) {
    throw appError('Teacher profile not found.', 404, 'TEACHER_PROFILE_NOT_FOUND');
  }
  if (teacher.status !== 'ACTIVE') {
    throw appError('Teacher account is not active.', 403, 'TEACHER_INACTIVE');
  }
  return teacher;
}

async function getStudentProfile(userId, connection = pool) {
  const [rows] = await connection.query(`
    SELECT s.id, s.teacher_id, s.user_id, u.status
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.user_id = ?
    LIMIT 1
  `, [userId]);

  const student = rows[0];
  if (!student) {
    throw appError('Student profile not found.', 404, 'STUDENT_PROFILE_NOT_FOUND');
  }
  if (student.status !== 'ACTIVE') {
    throw appError('Student account is not active.', 403, 'STUDENT_INACTIVE');
  }
  return student;
}

async function assertStudentsBelongToTeacher(connection, teacherId, studentIds) {
  const placeholders = studentIds.map(() => '?').join(',');
  const [rows] = await connection.query(`
    SELECT s.id
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.teacher_id = ?
      AND s.id IN (${placeholders})
      AND u.status = 'ACTIVE'
  `, [teacherId, ...studentIds]);

  if (rows.length !== studentIds.length) {
    throw appError('Teacher can only assign work to active students under their supervision.', 403, 'STUDENT_NOT_ASSIGNED_TO_TEACHER');
  }
}

async function createNotification(userId, title, body, type = 'ASSIGNMENT') {
  try {
    await pool.query(`
      INSERT INTO notifications (user_id, title, body, type)
      VALUES (?, ?, ?, ?)
    `, [userId, title, body, type]);
  } catch (error) {
    console.warn('Notification creation failed:', error.message);
  }
}

async function createAuditLog(actorUserId, action, entity, entityId, metadata = {}) {
  try {
    await pool.query(`
      INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, metadata)
      VALUES (?, ?, ?, ?, ?)
    `, [actorUserId, action, entity, entityId, JSON.stringify(metadata)]);
  } catch (error) {
    console.warn('Audit log creation failed:', error.message);
  }
}

async function createTeacherAssignment(userId, payload) {
  await ensureAssignmentTables();

  const title = String(payload.title || '').trim();
  const instructions = String(payload.instructions || '').trim();
  const studentIds = normalizeStudentIds(payload.studentIds || payload.student_ids);
  const deadline = normalizeDeadline(payload.deadline);
  const allowLateSubmission = normalizeBoolean(payload.allowLateSubmission ?? payload.allow_late_submission);

  if (!title) throw appError('Assignment title is required.', 400, 'TITLE_REQUIRED');
  if (!instructions) throw appError('Assignment instructions are required.', 400, 'INSTRUCTIONS_REQUIRED');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const teacher = await getTeacherProfile(userId, connection);
    await assertStudentsBelongToTeacher(connection, teacher.id, studentIds);

    const [result] = await connection.query(`
      INSERT INTO assignments (teacher_id, title, instructions, deadline, allow_late_submission)
      VALUES (?, ?, ?, ?, ?)
    `, [teacher.id, title, instructions, deadline, allowLateSubmission]);

    const assignmentId = result.insertId;
    const assignmentStudentPlaceholders = studentIds.map(() => '(?, ?)').join(', ');
    const assignmentStudentValues = studentIds.flatMap((studentId) => [assignmentId, studentId]);
    await connection.query(`
      INSERT INTO assignment_students (assignment_id, student_id)
      VALUES ${assignmentStudentPlaceholders}
    `, assignmentStudentValues);
    await connection.commit();

    const assignment = await getTeacherAssignmentById(userId, assignmentId);

    const [studentUsers] = await pool.query(`
      SELECT u.id
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id IN (${studentIds.map(() => '?').join(',')})
    `, studentIds);

    await Promise.all(studentUsers.map((row) => createNotification(
      row.id,
      'New assignment assigned',
      `Your Teacher assigned: ${title}`,
      'ASSIGNMENT'
    )));
    await createAuditLog(userId, 'CREATE_ASSIGNMENT', 'assignment', assignmentId, { studentIds });

    return assignment;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getTeacherAssignmentById(userId, assignmentId) {
  await ensureAssignmentTables();
  const teacher = await getTeacherProfile(userId);

  const [rows] = await pool.query(`
    SELECT
      a.*,
      (
        SELECT COUNT(*)
        FROM assignment_students ast
        WHERE ast.assignment_id = a.id
      ) AS assigned_count,
      (
        SELECT COUNT(*)
        FROM submissions s
        WHERE s.assignment_id = a.id AND s.status IN ('SUBMITTED', 'GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED')
      ) AS submitted_count,
      (
        SELECT COUNT(*)
        FROM submissions s
        WHERE s.assignment_id = a.id AND s.status IN ('GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED')
      ) AS graded_count
    FROM assignments a
    WHERE a.id = ? AND a.teacher_id = ?
    LIMIT 1
  `, [assignmentId, teacher.id]);

  const assignment = rows[0];
  if (!assignment) {
    throw appError('Assignment not found.', 404, 'ASSIGNMENT_NOT_FOUND');
  }

  const [students] = await pool.query(`
    SELECT
      s.id AS student_id,
      u.display_name,
      u.email,
      ast.assigned_at,
      sub.id AS submission_id,
      sub.status AS submission_status,
      sub.score,
      sub.graded_at,
      sub.submitted_at
    FROM assignment_students ast
    JOIN students s ON s.id = ast.student_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN submissions sub ON sub.assignment_id = ast.assignment_id AND sub.student_id = ast.student_id
    WHERE ast.assignment_id = ?
    ORDER BY u.display_name
  `, [assignment.id]);

  return {
    ...assignment,
    students: students.map((row) => ({
      ...row,
      submission_status: normalizeSubmissionStatus(row.submission_status),
      student_facing_status: getStudentFacingStatus(row.submission_status)
    }))
  };
}

async function listTeacherAssignments(userId) {
  await ensureAssignmentTables();
  const teacher = await getTeacherProfile(userId);

  const [rows] = await pool.query(`
    SELECT
      a.*,
      (
        SELECT COUNT(*)
        FROM assignment_students ast
        WHERE ast.assignment_id = a.id
      ) AS assigned_count,
      (
        SELECT COUNT(*)
        FROM submissions s
        WHERE s.assignment_id = a.id AND s.status IN ('SUBMITTED', 'GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED')
      ) AS submitted_count,
      (
        SELECT COUNT(*)
        FROM submissions s
        WHERE s.assignment_id = a.id AND s.status IN ('GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED')
      ) AS graded_count
    FROM assignments a
    WHERE a.teacher_id = ?
    ORDER BY a.created_at DESC
  `, [teacher.id]);

  return rows;
}

async function listTeacherSubmissions(userId) {
  await ensureAssignmentTables();
  const teacher = await getTeacherProfile(userId);

  const [rows] = await pool.query(`
    SELECT
      a.id AS assignment_id,
      a.title AS assignment_title,
      a.deadline,
      s.id AS student_id,
      su.display_name AS student_name,
      su.email AS student_email,
      sub.id AS submission_id,
      sub.content,
      sub.file_path,
      sub.cloudinary_public_id,
      sub.cloudinary_asset_id,
      sub.cloudinary_secure_url,
      sub.cloudinary_resource_type,
      sub.cloudinary_format,
      sub.media_bytes,
      sub.media_duration_seconds,
      sub.original_filename,
      sub.media_delivery_type,
      sub.status AS submission_status,
      sub.score,
      sub.feedback,
      sub.is_locked,
      sub.submitted_at,
      sub.graded_at
    FROM assignment_students ast
    JOIN assignments a ON a.id = ast.assignment_id
    JOIN students s ON s.id = ast.student_id
    JOIN users su ON su.id = s.user_id
    JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
    WHERE a.teacher_id = ?
      AND sub.status IN ('SUBMITTED', 'GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED')
      AND sub.cloudinary_public_id IS NOT NULL
    ORDER BY sub.submitted_at DESC
  `, [teacher.id]);

  return rows.map((row) => ({
    ...row,
    submission_status: normalizeSubmissionStatus(row.submission_status),
    media: submissionMediaFromRow(row),
    can_grade: row.submission_status === 'SUBMITTED' && !row.is_locked
  }));
}

async function getTeacherSubmissionDetail(userId, submissionId) {
  await ensureAssignmentTables();
  const teacher = await getTeacherProfile(userId);

  const [rows] = await pool.query(`
    SELECT
      a.id AS assignment_id,
      a.title AS assignment_title,
      a.instructions AS assignment_instructions,
      a.deadline,
      s.id AS student_id,
      su.display_name AS student_name,
      su.email AS student_email,
      sub.*
    FROM submissions sub
    JOIN assignments a ON a.id = sub.assignment_id
    JOIN assignment_students ast ON ast.assignment_id = a.id AND ast.student_id = sub.student_id
    JOIN students s ON s.id = sub.student_id
    JOIN users su ON su.id = s.user_id
    WHERE sub.id = ?
      AND a.teacher_id = ?
      AND sub.status IN ('SUBMITTED', 'GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED')
      AND sub.cloudinary_public_id IS NOT NULL
    LIMIT 1
  `, [submissionId, teacher.id]);

  const submission = rows[0];
  if (!submission) {
    throw appError('Submission not found for this Teacher.', 404, 'SUBMISSION_NOT_FOUND');
  }

  return {
    ...submission,
    submission_status: normalizeSubmissionStatus(submission.status),
    media: submissionMediaFromRow(submission),
    can_grade: submission.status === 'SUBMITTED' && !submission.is_locked
  };
}

async function getSubmissionMedia(user, submissionId) {
  await ensureAssignmentTables();
  const role = String(user?.role || '').toUpperCase();
  const params = [submissionId, user?.id];
  let scopeJoin = '';
  let scopeWhere = '';

  if (role === 'TEACHER') {
    scopeJoin = 'JOIN teachers owner_t ON owner_t.id = a.teacher_id';
    scopeWhere = 'AND owner_t.user_id = ?';
  } else if (role === 'STUDENT') {
    scopeJoin = 'JOIN students owner_s ON owner_s.id = sub.student_id';
    scopeWhere = 'AND owner_s.user_id = ?';
  } else {
    throw appError('Submission media is only available to the owner Student or Teacher.', 403, 'SUBMISSION_MEDIA_FORBIDDEN');
  }

  const [rows] = await pool.query(`
    SELECT sub.*
    FROM submissions sub
    JOIN assignments a ON a.id = sub.assignment_id
    JOIN assignment_students ast ON ast.assignment_id = a.id AND ast.student_id = sub.student_id
    ${scopeJoin}
    WHERE sub.id = ?
      ${scopeWhere}
      AND sub.status IN ('SUBMITTED', 'GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED')
      AND sub.cloudinary_public_id IS NOT NULL
    LIMIT 1
  `, params);

  const submission = rows[0];
  if (!submission) {
    throw appError('Submission media not found.', 404, 'SUBMISSION_MEDIA_NOT_FOUND');
  }

  return submissionMediaFromRow(submission);
}

async function gradeSubmission(userId, submissionId, payload) {
  await ensureAssignmentTables();

  const score = Number(payload.score);
  const feedback = String(payload.feedback || '').trim();
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw appError('Score must be a number between 0 and 100.', 400, 'INVALID_SCORE');
  }
  if (!feedback) {
    throw appError('Feedback is required.', 400, 'FEEDBACK_REQUIRED');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const teacher = await getTeacherProfile(userId, connection);

    const [rows] = await connection.query(`
      SELECT
        sub.*,
        a.teacher_id,
        a.title AS assignment_title,
        stu.user_id AS student_user_id
      FROM submissions sub
      JOIN assignments a ON a.id = sub.assignment_id
      JOIN assignment_students ast ON ast.assignment_id = a.id AND ast.student_id = sub.student_id
      JOIN students stu ON stu.id = sub.student_id
      WHERE sub.id = ? AND a.teacher_id = ?
      LIMIT 1
      FOR UPDATE
    `, [submissionId, teacher.id]);

    const submission = rows[0];
    if (!submission) {
      throw appError('Submission not found for this Teacher.', 404, 'SUBMISSION_NOT_FOUND');
    }
    if (submission.status !== 'SUBMITTED') {
      throw appError('Teacher may only grade submitted assignments.', 400, 'SUBMISSION_NOT_SUBMITTED');
    }
    if (submission.is_locked) {
      throw appError('Submission is locked and cannot be graded again.', 409, 'SUBMISSION_LOCKED');
    }
    if (!submission.cloudinary_public_id || !submission.cloudinary_secure_url) {
      throw appError('Teacher can only grade finalized media submissions.', 400, 'SUBMISSION_MEDIA_REQUIRED');
    }

    await connection.query(`
      UPDATE submissions
      SET status = 'GRADED',
          score = ?,
          feedback = ?,
          is_locked = TRUE,
          graded_at = NOW()
      WHERE id = ?
    `, [score, feedback, submission.id]);

    await connection.query(`
      INSERT INTO submission_grades (submission_id, graded_by_user_id, score, feedback)
      VALUES (?, ?, ?, ?)
    `, [submission.id, userId, score, feedback]);

    await connection.commit();

    await createNotification(
      submission.student_user_id,
      'Assignment graded',
      `Your assignment "${submission.assignment_title}" has been graded.`,
      'GRADING'
    );
    await createAuditLog(userId, 'GRADE_SUBMISSION', 'submission', submission.id, { score });

    return getGradedSubmission(userId, submission.id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getGradedSubmission(userId, submissionId) {
  const [rows] = await pool.query(`
    SELECT
      sub.*,
      a.title AS assignment_title,
      su.display_name AS student_name,
      su.email AS student_email
    FROM teachers t
    JOIN assignments a ON a.teacher_id = t.id
    JOIN submissions sub ON sub.assignment_id = a.id
    JOIN students s ON s.id = sub.student_id
    JOIN users su ON su.id = s.user_id
    WHERE t.user_id = ? AND sub.id = ?
    LIMIT 1
  `, [userId, submissionId]);

  const submission = rows[0];
  return submission ? { ...submission, media: submissionMediaFromRow(submission) } : null;
}

async function listStudentAssignments(userId) {
  await ensureAssignmentTables();
  const student = await getStudentProfile(userId);

  const [rows] = await pool.query(`
    SELECT
      a.id,
      a.title,
      a.instructions,
      a.deadline,
      a.allow_late_submission,
      a.created_at,
      tu.display_name AS teacher_name,
      sub.id AS submission_id,
      sub.cloudinary_public_id,
      sub.cloudinary_asset_id,
      sub.cloudinary_secure_url,
      sub.cloudinary_resource_type,
      sub.cloudinary_format,
      sub.media_bytes,
      sub.media_duration_seconds,
      sub.original_filename,
      sub.media_delivery_type,
      sub.status AS submission_status,
      sub.score,
      sub.feedback,
      sub.submitted_at,
      sub.graded_at,
      sub.is_locked
    FROM assignment_students ast
    JOIN assignments a ON a.id = ast.assignment_id
    JOIN teachers t ON t.id = a.teacher_id
    JOIN users tu ON tu.id = t.user_id
    LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ast.student_id
    WHERE ast.student_id = ?
    ORDER BY a.created_at DESC
  `, [student.id]);

  return rows.map((row) => ({
    ...row,
    submission_status: normalizeSubmissionStatus(row.submission_status),
    student_facing_status: getStudentFacingStatus(row.submission_status),
    media: submissionMediaFromRow(row),
    can_submit: canSubmit(row)
  }));
}

function canSubmit(row) {
  const status = normalizeSubmissionStatus(row.submission_status);
  if (SUBMITTED_STATUSES.includes(status)) return false;
  if (row.is_locked) return false;
  if (!row.deadline || row.allow_late_submission) return true;
  return new Date(row.deadline).getTime() >= Date.now();
}

async function getStudentAssignmentDetail(userId, assignmentId) {
  await ensureAssignmentTables();
  const student = await getStudentProfile(userId);

  const [rows] = await pool.query(`
    SELECT
      a.*,
      ast.assigned_at,
      tu.display_name AS teacher_name,
      tu.email AS teacher_email,
      sub.id AS submission_id,
      sub.content AS submission_content,
      sub.file_path,
      sub.cloudinary_public_id,
      sub.cloudinary_asset_id,
      sub.cloudinary_secure_url,
      sub.cloudinary_resource_type,
      sub.cloudinary_format,
      sub.media_bytes,
      sub.media_duration_seconds,
      sub.original_filename,
      sub.media_delivery_type,
      sub.status AS submission_status,
      sub.score,
      sub.feedback,
      sub.submitted_at,
      sub.graded_at,
      sub.is_locked
    FROM assignment_students ast
    JOIN assignments a ON a.id = ast.assignment_id
    JOIN teachers t ON t.id = a.teacher_id
    JOIN users tu ON tu.id = t.user_id
    LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ast.student_id
    WHERE ast.student_id = ? AND a.id = ?
    LIMIT 1
  `, [student.id, assignmentId]);

  const assignment = rows[0];
  if (!assignment) {
    throw appError('Assignment not found for this Student.', 404, 'ASSIGNMENT_NOT_FOUND');
  }

  return {
    ...assignment,
    submission_status: normalizeSubmissionStatus(assignment.submission_status),
    student_facing_status: getStudentFacingStatus(assignment.submission_status),
    media: submissionMediaFromRow(assignment),
    can_submit: canSubmit(assignment)
  };
}

async function requestSubmissionUploadSignature(userId, assignmentId, payload = {}) {
  await ensureAssignmentTables();
  const student = await getStudentProfile(userId);
  validateUploadRequest(payload);

  const [rows] = await pool.query(`
    SELECT
      a.id,
      a.deadline,
      a.allow_late_submission,
      sub.status AS submission_status,
      sub.is_locked
    FROM assignment_students ast
    JOIN assignments a ON a.id = ast.assignment_id
    LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ast.student_id
    WHERE ast.student_id = ? AND a.id = ?
    LIMIT 1
  `, [student.id, assignmentId]);

  const assignment = rows[0];
  if (!assignment) {
    throw appError('Assignment not found for this Student.', 404, 'ASSIGNMENT_NOT_FOUND');
  }
  if (!canSubmit(assignment)) {
    throw appError('Assignment is not open for submission.', 409, 'SUBMISSION_NOT_OPEN');
  }

  return createUploadSignature({
    assignmentId: assignment.id,
    studentId: student.id
  });
}

async function submitAssignment(userId, assignmentId, payload) {
  await ensureAssignmentTables();

  const content = String(payload.content || payload.answer || '').trim();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const student = await getStudentProfile(userId, connection);
    const media = validateCloudinarySubmissionMetadata(payload, {
      assignmentId,
      studentId: student.id
    });

    const [assignmentRows] = await connection.query(`
      SELECT
        a.id,
        a.title,
        a.deadline,
        a.allow_late_submission,
        t.user_id AS teacher_user_id
      FROM assignment_students ast
      JOIN assignments a ON a.id = ast.assignment_id
      JOIN teachers t ON t.id = a.teacher_id
      WHERE ast.student_id = ? AND a.id = ?
      LIMIT 1
      FOR UPDATE
    `, [student.id, assignmentId]);

    const assignment = assignmentRows[0];
    if (!assignment) {
      throw appError('Assignment not found for this Student.', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    if (assignment.deadline && !assignment.allow_late_submission && new Date(assignment.deadline).getTime() < Date.now()) {
      throw appError('Assignment deadline has passed.', 400, 'ASSIGNMENT_DEADLINE_PASSED');
    }

    const [existingRows] = await connection.query(`
      SELECT *
      FROM submissions
      WHERE assignment_id = ? AND student_id = ?
      LIMIT 1
      FOR UPDATE
    `, [assignment.id, student.id]);

    const existing = existingRows[0];
    if (existing && existing.status !== 'DRAFT') {
      throw appError('This assignment has already been submitted.', 409, 'SUBMISSION_ALREADY_SUBMITTED');
    }
    if (existing?.is_locked) {
      throw appError('Submission is locked.', 409, 'SUBMISSION_LOCKED');
    }

    let submissionId;
    if (existing) {
      await connection.query(`
        UPDATE submissions
        SET content = ?,
            file_path = NULL,
            cloudinary_public_id = ?,
            cloudinary_asset_id = ?,
            cloudinary_secure_url = ?,
            cloudinary_resource_type = ?,
            cloudinary_format = ?,
            media_bytes = ?,
            media_duration_seconds = ?,
            original_filename = ?,
            media_delivery_type = ?,
            status = 'SUBMITTED',
            submitted_at = NOW()
        WHERE id = ?
      `, [
        content || null,
        media.publicId,
        media.assetId,
        media.secureUrl,
        media.resourceType,
        media.format,
        media.bytes,
        media.durationSeconds,
        media.originalFilename,
        media.deliveryType,
        existing.id
      ]);
      submissionId = existing.id;
    } else {
      const [result] = await connection.query(`
        INSERT INTO submissions (
          assignment_id,
          student_id,
          content,
          file_path,
          cloudinary_public_id,
          cloudinary_asset_id,
          cloudinary_secure_url,
          cloudinary_resource_type,
          cloudinary_format,
          media_bytes,
          media_duration_seconds,
          original_filename,
          media_delivery_type,
          status,
          submitted_at
        )
        VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', NOW())
      `, [
        assignment.id,
        student.id,
        content || null,
        media.publicId,
        media.assetId,
        media.secureUrl,
        media.resourceType,
        media.format,
        media.bytes,
        media.durationSeconds,
        media.originalFilename,
        media.deliveryType
      ]);
      submissionId = result.insertId;
    }

    await connection.commit();

    await createNotification(
      assignment.teacher_user_id,
      'New assignment submission',
      `A Student submitted "${assignment.title}".`,
      'SUBMISSION'
    );
    await createAuditLog(userId, 'SUBMIT_ASSIGNMENT', 'submission', submissionId, { assignmentId: assignment.id });

    return getStudentAssignmentDetail(userId, assignment.id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createTeacherAssignment,
  getTeacherAssignmentById,
  listTeacherAssignments,
  listTeacherSubmissions,
  getTeacherSubmissionDetail,
  getSubmissionMedia,
  gradeSubmission,
  listStudentAssignments,
  getStudentAssignmentDetail,
  requestSubmissionUploadSignature,
  submitAssignment,
  ensureAssignmentTables,
  __testing: {
    canSubmit,
    getStudentFacingStatus,
    isSubmittedStatus,
    normalizeDeadline,
    normalizeStudentIds,
    submissionMediaFromRow,
    validateCloudinarySubmissionMetadata,
    validateSubmissionFile,
    validateUploadRequest
  }
};
