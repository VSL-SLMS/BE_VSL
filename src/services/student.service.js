const { pool } = require('../config/database');
const lessonService = require('./lesson.service');
const paymentService = require('./payment.service');
const assignmentService = require('./assignment.service');

let teacherProfileColumnsReady = false;

function normalizeTeacherProfile(row) {
  const maxStudents = Number(row.max_students || 30);
  const currentStudentCount = Number(row.current_student_count || 0);
  const verificationCount = Number(row.accuracy_verification_count || 0);
  const hasVerifiedAccuracy = verificationCount > 0;
  const reliabilityLabel = hasVerifiedAccuracy ? (row.reliability_label || 'NEW') : 'NEW';
  const isAcceptingStudents = row.availability_status !== 'FULL' && currentStudentCount < maxStudents;

  return {
    id: row.id,
    full_name: row.full_name,
    display_name: row.full_name,
    email: row.email,
    avatar_url: row.avatar_url,
    bio: row.bio || '',
    specialization: row.specialization || 'General VSL learning',
    current_student_count: currentStudentCount,
    max_students: maxStudents,
    availability_status: row.availability_status || 'OPEN',
    reliability_label: reliabilityLabel,
    accuracy: hasVerifiedAccuracy ? Number(row.accuracy) : null,
    accuracy_verified: hasVerifiedAccuracy,
    accuracy_verification_count: verificationCount,
    is_accepting_students: isAcceptingStudents,
    is_recommended: false
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

async function ensureLessonProgressTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      lesson_id INT NOT NULL,
      status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
      UNIQUE KEY unique_student_lesson (student_id, lesson_id),
      INDEX idx_lesson_progress_student (student_id)
    ) ENGINE=InnoDB
  `);
}

async function getStudentProfile(userId) {
  const [rows] = await pool.query(`
    SELECT id, teacher_id
    FROM students
    WHERE user_id = ?
    LIMIT 1
  `, [userId]);
  return rows[0] || null;
}

async function assertStudentCanLearn(userId) {
  await ensureLessonProgressTable();

  const student = await getStudentProfile(userId);
  if (!student) {
    const error = new Error('Student profile not found.');
    error.status = 404;
    error.code = 'STUDENT_PROFILE_NOT_FOUND';
    throw error;
  }

  if (!student.teacher_id) {
    const error = new Error('Choose a Teacher before accessing lessons.');
    error.status = 403;
    error.code = 'TEACHER_REQUIRED';
    throw error;
  }

  const hasAccess = await paymentService.getUserCourseAccess(userId);
  if (!hasAccess) {
    const error = new Error('Purchase the course to unlock full lesson content.');
    error.status = 403;
    error.code = 'COURSE_PURCHASE_REQUIRED';
    throw error;
  }

  return student;
}

async function getDashboard(userId) {
  await ensureLessonProgressTable();
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

  const completedLessons = Number(progress[0]?.completed_lessons || 0);
  const total = Number(totalLessons[0].total || 0);

  return {
    student,
    progress: {
      ...progress[0],
      completed_lessons: completedLessons,
      progress_percent: total ? Math.round((completedLessons / total) * 100) : 0
    },
    totalLessons: total,
    teacherChangeRequests: changeRequests
  };
}

async function listTeachers({ recommend = false } = {}) {
  await ensureTeacherProfileColumns();

  const [rows] = await pool.query(`
    SELECT
      t.id,
      u.display_name AS full_name,
      u.email,
      u.avatar_url,
      t.bio,
      t.specialization,
      t.accuracy,
      t.availability_status,
      t.max_students,
      t.reliability_label,
      COUNT(DISTINCT assigned_students.id) AS current_student_count,
      COUNT(DISTINCT tal.id) AS accuracy_verification_count
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN students assigned_students ON assigned_students.teacher_id = t.id
    LEFT JOIN teacher_accuracy_logs tal ON tal.teacher_id = t.id
    WHERE u.status = 'ACTIVE'
    GROUP BY
      t.id,
      u.display_name,
      u.email,
      u.avatar_url,
      t.bio,
      t.specialization,
      t.accuracy,
      t.availability_status,
      t.max_students,
      t.reliability_label
    ORDER BY u.display_name
  `);

  const teachers = rows.map(normalizeTeacherProfile);

  if (!recommend) {
    return teachers;
  }

  const reliabilityScore = {
    HIGHLY_RELIABLE: 3,
    RELIABLE: 2,
    NEW: 1
  };

  return teachers
    .filter((teacher) => teacher.is_accepting_students)
    .sort((a, b) => {
      const capacityDelta = (a.current_student_count / a.max_students) - (b.current_student_count / b.max_students);
      if (capacityDelta !== 0) return capacityDelta;
      if (a.current_student_count !== b.current_student_count) return a.current_student_count - b.current_student_count;
      return (reliabilityScore[b.reliability_label] || 0) - (reliabilityScore[a.reliability_label] || 0);
    })
    .map((teacher, index) => ({
      ...teacher,
      is_recommended: index === 0
    }));
}

async function chooseTeacher(userId, teacherId) {
  const [students] = await pool.query('SELECT id, teacher_id FROM students WHERE user_id = ? LIMIT 1', [userId]);
  const student = students[0];
  if (!student) throw new Error('Student profile not found.');
  if (student.teacher_id) throw new Error('Teacher already selected.');

  await ensureTeacherProfileColumns();

  const [teachers] = await pool.query(`
    SELECT
      t.id,
      t.availability_status,
      t.max_students,
      COUNT(assigned_students.id) AS current_student_count
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN students assigned_students ON assigned_students.teacher_id = t.id
    WHERE t.id = ? AND u.status = 'ACTIVE'
    GROUP BY t.id, t.availability_status, t.max_students
    LIMIT 1
  `, [teacherId]);
  if (!teachers.length) throw new Error('Teacher not found or inactive.');
  const teacher = teachers[0];
  if (teacher.availability_status === 'FULL' || Number(teacher.current_student_count || 0) >= Number(teacher.max_students || 30)) {
    throw new Error('Teacher is currently full.');
  }

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
  if (pending.length) {
    return { id: pending[0].id, status: 'PENDING', alreadyPending: true };
  }

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
  await ensureLessonProgressTable();
  const student = await getStudentProfile(userId);
  if (!student) {
    const error = new Error('Student profile not found.');
    error.status = 404;
    throw error;
  }

  const [rows] = await pool.query(`
    SELECT
      l.id AS lesson_id,
      l.title,
      l.slug,
      l.order_index,
      c.title AS chapter_title,
      p.title AS part_title,
      lp.status,
      lp.started_at,
      lp.completed_at
    FROM lessons l
    JOIN chapters c ON c.id = l.chapter_id
    JOIN parts p ON p.id = c.part_id
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = ?
    ORDER BY p.order_index, c.order_index, l.order_index
  `, [student.id]);

  const totalLessons = rows.length;
  const completedLessons = rows.filter((row) => row.status === 'COMPLETED').length;

  return {
    summary: {
      totalLessons,
      completedLessons,
      progressPercent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
    },
    lessons: rows.map((row) => ({
      ...row,
      status: row.status || 'NOT_STARTED'
    }))
  };
}

async function getLessons(userId) {
  const student = await assertStudentCanLearn(userId);
  const parts = await lessonService.getAllPartsWithChapters();
  const [progressRows] = await pool.query(`
    SELECT lesson_id, status, completed_at
    FROM lesson_progress
    WHERE student_id = ?
  `, [student.id]);
  const progressByLessonId = new Map(progressRows.map((row) => [Number(row.lesson_id), row]));

  return {
    parts: parts.map((part) => ({
      ...part,
      chapters: (part.chapters || []).map((chapter) => ({
        ...chapter,
        lessons: (chapter.lessons || []).map((lesson) => {
          const progress = progressByLessonId.get(Number(lesson.id));
          return {
            ...lesson,
            progress_status: progress?.status || 'NOT_STARTED',
            completed_at: progress?.completed_at || null
          };
        })
      }))
    }))
  };
}

async function getLessonDetail(userId, slug) {
  const student = await assertStudentCanLearn(userId);
  const lesson = await lessonService.getLessonBySlug(slug);
  if (!lesson) {
    const error = new Error('Lesson not found.');
    error.status = 404;
    throw error;
  }

  await pool.query(`
    INSERT INTO lesson_progress (student_id, lesson_id, status, started_at)
    VALUES (?, ?, 'IN_PROGRESS', NOW())
    ON DUPLICATE KEY UPDATE
      status = IF(status = 'COMPLETED', status, 'IN_PROGRESS'),
      started_at = COALESCE(started_at, NOW())
  `, [student.id, lesson.id]);

  const [content, pages, navigation, progressRows] = await Promise.all([
    lessonService.getLessonContent(lesson.id),
    lessonService.getPageImagesByLessonId(lesson.id),
    lessonService.getLessonNavigation(lesson),
    pool.query(`
      SELECT status, started_at, completed_at
      FROM lesson_progress
      WHERE student_id = ? AND lesson_id = ?
      LIMIT 1
    `, [student.id, lesson.id])
  ]);

  return {
    lesson,
    content,
    pages,
    navigation,
    progress: progressRows[0][0] || null
  };
}

async function completeLesson(userId, lessonId) {
  const student = await assertStudentCanLearn(userId);
  const id = Number(lessonId);
  if (!id) {
    const error = new Error('Lesson ID is required.');
    error.status = 400;
    throw error;
  }

  const [lessons] = await pool.query('SELECT id, title, slug FROM lessons WHERE id = ? LIMIT 1', [id]);
  const lesson = lessons[0];
  if (!lesson) {
    const error = new Error('Lesson not found.');
    error.status = 404;
    throw error;
  }

  await pool.query(`
    INSERT INTO lesson_progress (student_id, lesson_id, status, started_at, completed_at)
    VALUES (?, ?, 'COMPLETED', COALESCE(NOW(), CURRENT_TIMESTAMP), NOW())
    ON DUPLICATE KEY UPDATE
      status = 'COMPLETED',
      started_at = COALESCE(started_at, NOW()),
      completed_at = COALESCE(completed_at, NOW())
  `, [student.id, id]);

  const progress = await getProgress(userId);

  return {
    lesson,
    completedAt: new Date().toISOString(),
    progress: progress.summary
  };
}

async function getAssignments(userId) {
  return assignmentService.listStudentAssignments(userId);
}

module.exports = {
  getDashboard,
  listTeachers,
  chooseTeacher,
  requestTeacherChange,
  getLessons,
  getLessonDetail,
  completeLesson,
  getProgress,
  getAssignments,
  __testing: {
    resetTeacherProfileColumnsReady() {
      teacherProfileColumnsReady = false;
    },
    normalizeTeacherProfile
  }
};
