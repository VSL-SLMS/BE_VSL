const { pool } = require('../config/database');

async function getDashboard(userId) {
  const [rows] = await pool.query(`
    SELECT
      COUNT(DISTINCT s.id) AS student_count,
      COUNT(DISTINCT a.id) AS assignment_count
    FROM teachers t
    LEFT JOIN students s ON s.teacher_id = t.id
    LEFT JOIN assignments a ON a.teacher_id = t.id
    WHERE t.user_id = ?
  `, [userId]);
  return rows[0];
}

async function getStudents(userId) {
  const [rows] = await pool.query(`
    SELECT s.id, u.display_name, u.email, u.status, s.created_at
    FROM teachers t
    JOIN students s ON s.teacher_id = t.id
    JOIN users u ON u.id = s.user_id
    WHERE t.user_id = ?
    ORDER BY u.display_name
  `, [userId]);
  return rows;
}

async function getAssignments(userId) {
  const [rows] = await pool.query(`
    SELECT a.*, COUNT(ast.student_id) AS assigned_count
    FROM teachers t
    JOIN assignments a ON a.teacher_id = t.id
    LEFT JOIN assignment_students ast ON ast.assignment_id = a.id
    WHERE t.user_id = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `, [userId]);
  return rows;
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

