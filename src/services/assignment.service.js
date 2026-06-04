const { pool } = require('../config/database');

let tablesReady = false;

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
  const allowed = /\.(pdf|png|jpe?g|webp|mp4|mov|webm|txt|docx?)$/i;
  if (!allowed.test(filePath)) {
    throw appError('Unsupported submission file format.', 400, 'UNSUPPORTED_FILE_FORMAT');
  }
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
      INDEX idx_submissions_status (status)
    ) ENGINE=InnoDB
  `);

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
    LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
    WHERE a.teacher_id = ?
    ORDER BY COALESCE(sub.submitted_at, ast.assigned_at) DESC
  `, [teacher.id]);

  return rows.map((row) => ({
    ...row,
    submission_status: normalizeSubmissionStatus(row.submission_status),
    can_grade: row.submission_id && row.submission_status === 'SUBMITTED' && !row.is_locked
  }));
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

  return rows[0] || null;
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
    can_submit: canSubmit(row)
  }));
}

function canSubmit(row) {
  const status = normalizeSubmissionStatus(row.submission_status);
  if (['SUBMITTED', 'GRADED', 'RECHECKING', 'ESCALATED', 'FINALIZED'].includes(status)) return false;
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
    can_submit: canSubmit(assignment)
  };
}

async function submitAssignment(userId, assignmentId, payload) {
  await ensureAssignmentTables();

  const content = String(payload.content || payload.answer || '').trim();
  const filePath = String(payload.filePath || payload.file_path || payload.fileUrl || '').trim() || null;
  if (!content && !filePath) {
    throw appError('Submission content or file URL is required.', 400, 'SUBMISSION_CONTENT_REQUIRED');
  }
  validateSubmissionFile(filePath);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const student = await getStudentProfile(userId, connection);

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
            file_path = ?,
            status = 'SUBMITTED',
            submitted_at = NOW()
        WHERE id = ?
      `, [content || null, filePath, existing.id]);
      submissionId = existing.id;
    } else {
      const [result] = await connection.query(`
        INSERT INTO submissions (assignment_id, student_id, content, file_path, status, submitted_at)
        VALUES (?, ?, ?, ?, 'SUBMITTED', NOW())
      `, [assignment.id, student.id, content || null, filePath]);
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
  gradeSubmission,
  listStudentAssignments,
  getStudentAssignmentDetail,
  submitAssignment,
  ensureAssignmentTables
};
