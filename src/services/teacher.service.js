const { pool } = require('../config/database');
const assignmentService = require('./assignment.service');

async function getDashboard(userId) {
  await assignmentService.ensureAssignmentTables();
  const [rows] = await pool.query(`
    SELECT
      COUNT(DISTINCT s.id) AS student_count,
      COUNT(DISTINCT a.id) AS assignment_count,
      COUNT(DISTINCT CASE WHEN sub.status = 'SUBMITTED' THEN sub.id END) AS pending_submission_count
    FROM teachers t
    LEFT JOIN students s ON s.teacher_id = t.id
    LEFT JOIN assignments a ON a.teacher_id = t.id
    LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.status = 'SUBMITTED'
    WHERE t.user_id = ?
  `, [userId]);
  return rows[0];
}

async function getStudents(userId) {
  await assignmentService.ensureAssignmentTables();
  const [rows] = await pool.query(`
    SELECT
      s.id,
      u.display_name,
      u.email,
      u.status,
      s.created_at,
      COUNT(DISTINCT ast.assignment_id) AS assignment_count,
      COUNT(DISTINCT CASE WHEN sub.status = 'SUBMITTED' THEN sub.id END) AS submitted_count,
      COUNT(DISTINCT CASE WHEN sub.status = 'GRADED' THEN sub.id END) AS graded_count
    FROM teachers t
    JOIN students s ON s.teacher_id = t.id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN assignment_students ast ON ast.student_id = s.id
    LEFT JOIN submissions sub ON sub.assignment_id = ast.assignment_id AND sub.student_id = s.id
    WHERE t.user_id = ?
    GROUP BY s.id, u.display_name, u.email, u.status, s.created_at
    ORDER BY u.display_name
  `, [userId]);
  return rows;
}

async function getAssignments(userId) {
  return assignmentService.listTeacherAssignments(userId);
}

async function getAccuracy(userId) {
  const [rows] = await pool.query(`
    SELECT t.accuracy, tal.*
    FROM teachers t
    LEFT JOIN teacher_accuracy_logs tal ON tal.teacher_id = t.id
    WHERE t.user_id = ?
    ORDER BY tal.created_at DESC
  `, [userId]);
  return rows;
}

module.exports = { getDashboard, getStudents, getAssignments, getAccuracy };
