const { pool } = require('../config/database');

async function getDashboard(userId) {
  const [studentRows] = await pool.query(`
    SELECT
      s.id,
      s.teacher_id,
      tu.display_name AS teacher_name,
      tu.email AS teacher_email
    FROM students s
    LEFT JOIN teachers t ON t.id = s.teacher_id
    LEFT JOIN users tu ON tu.id = t.user_id
    WHERE s.user_id = ?
    LIMIT 1
  `, [userId]);

  const student = studentRows[0] || null;
  const [progress] = await pool.query(`
    SELECT
      COUNT(*) AS tracked_lessons,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_lessons
    FROM lesson_progress
    WHERE student_id = (SELECT id FROM students WHERE user_id = ?)
  `, [userId]);

  const [totalLessons] = await pool.query('SELECT COUNT(*) AS total FROM lessons');
  const [changeRequests] = await pool.query(`
    SELECT
      tcr.id,
      tcr.status,
      tcr.reason,
      tcr.created_at,
      requested_user.display_name AS requested_teacher_name,
      requested_user.email AS requested_teacher_email
    FROM teacher_change_requests tcr
    LEFT JOIN teachers requested_teacher ON requested_teacher.id = tcr.requested_teacher_id
    LEFT JOIN users requested_user ON requested_user.id = requested_teacher.user_id
    WHERE tcr.student_id = ?
    ORDER BY tcr.created_at DESC
    LIMIT 3
  `, [student?.id || 0]);

  return {
    student,
    progress: progress[0],
    totalLessons: totalLessons[0].total,
    teacherChangeRequests: changeRequests
  };
}

async function listTeachers() {
  const [rows] = await pool.query(`
    SELECT t.id, u.display_name, u.email, t.accuracy
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    WHERE u.status = 'ACTIVE'
    ORDER BY u.display_name
  `);
  return rows;
}

async function chooseTeacher(userId, teacherId) {
  const [students] = await pool.query('SELECT id, teacher_id FROM students WHERE user_id = ? LIMIT 1', [userId]);
  const student = students[0];
  if (!student) throw new Error('Student profile not found.');
  if (student.teacher_id) throw new Error('Teacher already selected.');

  const [teachers] = await pool.query(`
    SELECT t.id
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    WHERE t.id = ? AND u.status = 'ACTIVE'
    LIMIT 1
  `, [teacherId]);
  if (!teachers.length) throw new Error('Teacher not found or inactive.');

  await pool.query('UPDATE students SET teacher_id = ? WHERE id = ?', [teacherId, student.id]);
}

async function requestTeacherChange(userId, reason) {
  const [students] = await pool.query('SELECT id, teacher_id FROM students WHERE user_id = ? LIMIT 1', [userId]);
  const student = students[0];
  if (!student) throw new Error('Student profile not found.');
  if (!student.teacher_id) throw new Error('Select a teacher before requesting a change.');

  const [pending] = await pool.query(`
    SELECT id
    FROM teacher_change_requests
    WHERE student_id = ? AND status = 'PENDING'
    LIMIT 1
  `, [student.id]);
  if (pending.length) throw new Error('You already have a pending teacher change request.');

  const [result] = await pool.query(`
    INSERT INTO teacher_change_requests (
      student_id,
      current_teacher_id,
      requested_teacher_id,
      reason
    )
    VALUES (?, ?, ?, ?)
  `, [student.id, student.teacher_id, null, reason]);

  return { id: result.insertId, status: 'PENDING' };
}

async function getProgress(userId) {
  const [rows] = await pool.query(`
    SELECT lp.*, l.title, l.slug, c.title AS chapter_title
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    JOIN chapters c ON c.id = l.chapter_id
    WHERE lp.student_id = (SELECT id FROM students WHERE user_id = ?)
    ORDER BY lp.completed_at DESC, lp.started_at DESC
  `, [userId]);
  return rows;
}

async function getAssignments(userId) {
  const [rows] = await pool.query(`
    SELECT a.*, s.status AS submission_status, s.score
    FROM assignment_students ast
    JOIN assignments a ON a.id = ast.assignment_id
    LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ast.student_id
    WHERE ast.student_id = (SELECT id FROM students WHERE user_id = ?)
    ORDER BY a.created_at DESC
  `, [userId]);
  return rows;
}

module.exports = {
  getDashboard,
  listTeachers,
  chooseTeacher,
  requestTeacherChange,
  getProgress,
  getAssignments
};
