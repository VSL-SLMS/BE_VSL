const { pool } = require('../config/database');

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
      current_user.display_name AS current_teacher_name,
      current_user.email AS current_teacher_email,
      requested_user.display_name AS requested_teacher_name,
      requested_user.email AS requested_teacher_email
    FROM teacher_change_requests tcr
    JOIN students s ON s.id = tcr.student_id
    JOIN users student_user ON student_user.id = s.user_id
    LEFT JOIN teachers current_teacher ON current_teacher.id = tcr.current_teacher_id
    LEFT JOIN users current_user ON current_user.id = current_teacher.user_id
    LEFT JOIN teachers requested_teacher ON requested_teacher.id = tcr.requested_teacher_id
    LEFT JOIN users requested_user ON requested_user.id = requested_teacher.user_id
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
      SELECT id, student_id, requested_teacher_id, status
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
        'UPDATE students SET teacher_id = ? WHERE id = ?',
        [request.requested_teacher_id, request.student_id]
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

module.exports = { listUsers, listTeacherChangeRequests, reviewTeacherChangeRequest };
