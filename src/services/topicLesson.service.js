const { pool } = require('../config/database');
const paymentService = require('./payment.service');
const cloudinaryTopicLessons = require('../data/cloudinaryTopicLessons.json');

let tablesReady = false;
let seedReady = false;

function appError(message, status = 400, code = 'TOPIC_LESSON_ERROR') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeVideoKey(videoName) {
  return String(videoName || '').replace(/\.[^.]+$/, '');
}

function buildItemDescription(row) {
  return `Video minh hoa ky hieu cho tu/cum tu "${row.label}" trong chu de "${row.topic}".`;
}

async function ensureTopicLessonTables() {
  if (tablesReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS topic_lessons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      topic_slug VARCHAR(100) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      order_index INT NOT NULL DEFAULT 0,
      estimated_minutes INT NOT NULL DEFAULT 10,
      source VARCHAR(100) NOT NULL DEFAULT 'CLOUDINARY_VSL_SAMPLE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_topic_lessons_order (order_index)
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS topic_lesson_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      topic_lesson_id INT NOT NULL,
      video_key VARCHAR(100) NOT NULL,
      word VARCHAR(255) NOT NULL,
      description TEXT NULL,
      cloudinary_public_id VARCHAR(255) NOT NULL,
      cloudinary_secure_url TEXT NOT NULL,
      cloudinary_resource_type VARCHAR(50) NOT NULL DEFAULT 'video',
      cloudinary_format VARCHAR(30) NULL,
      width INT NULL,
      height INT NULL,
      duration_seconds DECIMAL(8,3) NULL,
      bytes INT NULL,
      source_dataset VARCHAR(255) NULL,
      source_file VARCHAR(255) NULL,
      order_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_lesson_id) REFERENCES topic_lessons(id) ON DELETE CASCADE,
      UNIQUE KEY unique_topic_video_key (topic_lesson_id, video_key),
      INDEX idx_topic_lesson_items_topic (topic_lesson_id, order_index),
      INDEX idx_topic_lesson_items_word (word)
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_topic_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      topic_lesson_id INT NOT NULL,
      status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_lesson_id) REFERENCES topic_lessons(id) ON DELETE CASCADE,
      UNIQUE KEY unique_student_topic (student_id, topic_lesson_id),
      INDEX idx_student_topic_progress_student (student_id),
      INDEX idx_student_topic_progress_status (status)
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_topic_video_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      topic_lesson_id INT NOT NULL,
      topic_lesson_item_id INT NOT NULL,
      status ENUM('NOT_STARTED', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_lesson_id) REFERENCES topic_lessons(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_lesson_item_id) REFERENCES topic_lesson_items(id) ON DELETE CASCADE,
      UNIQUE KEY unique_student_topic_video (student_id, topic_lesson_item_id),
      INDEX idx_topic_video_progress_student_topic (student_id, topic_lesson_id),
      INDEX idx_topic_video_progress_status (status)
    ) ENGINE=InnoDB
  `);

  tablesReady = true;
}

function groupDatasetByTopic() {
  const topics = new Map();

  for (const row of cloudinaryTopicLessons) {
    if (!row.topic_slug || !row.label || !row.cloudinary_public_id || !row.secure_url) continue;

    if (!topics.has(row.topic_slug)) {
      topics.set(row.topic_slug, {
        topic_slug: row.topic_slug,
        title: row.topic,
        description: row.topic_description,
        order_index: Number(row.topic_order || 0),
        items: []
      });
    }

    topics.get(row.topic_slug).items.push(row);
  }

  return [...topics.values()].sort((a, b) => a.order_index - b.order_index);
}

async function seedTopicLessonContent() {
  if (seedReady) return;
  await ensureTopicLessonTables();

  const topics = groupDatasetByTopic();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const topic of topics) {
      const estimatedMinutes = Math.max(5, Math.ceil(topic.items.reduce((sum, item) => {
        return sum + Number(item.duration || 0);
      }, 0) / 60));

      await connection.query(`
        INSERT INTO topic_lessons (
          topic_slug,
          title,
          description,
          order_index,
          estimated_minutes,
          source
        )
        VALUES (?, ?, ?, ?, ?, 'CLOUDINARY_VSL_SAMPLE')
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          order_index = VALUES(order_index),
          estimated_minutes = VALUES(estimated_minutes),
          source = VALUES(source)
      `, [
        topic.topic_slug,
        topic.title,
        topic.description,
        topic.order_index,
        estimatedMinutes
      ]);

      const [topicRows] = await connection.query(`
        SELECT id
        FROM topic_lessons
        WHERE topic_slug = ?
        LIMIT 1
      `, [topic.topic_slug]);
      const topicLessonId = topicRows[0].id;

      for (const [index, item] of topic.items.entries()) {
        await connection.query(`
          INSERT INTO topic_lesson_items (
            topic_lesson_id,
            video_key,
            word,
            description,
            cloudinary_public_id,
            cloudinary_secure_url,
            cloudinary_resource_type,
            cloudinary_format,
            width,
            height,
            duration_seconds,
            bytes,
            source_dataset,
            source_file,
            order_index
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            word = VALUES(word),
            description = VALUES(description),
            cloudinary_public_id = VALUES(cloudinary_public_id),
            cloudinary_secure_url = VALUES(cloudinary_secure_url),
            cloudinary_resource_type = VALUES(cloudinary_resource_type),
            cloudinary_format = VALUES(cloudinary_format),
            width = VALUES(width),
            height = VALUES(height),
            duration_seconds = VALUES(duration_seconds),
            bytes = VALUES(bytes),
            source_dataset = VALUES(source_dataset),
            source_file = VALUES(source_file),
            order_index = VALUES(order_index)
        `, [
          topicLessonId,
          normalizeVideoKey(item.video),
          item.label,
          buildItemDescription(item),
          item.cloudinary_public_id,
          item.secure_url,
          item.resource_type || 'video',
          item.format || 'mp4',
          item.width || null,
          item.height || null,
          item.duration || null,
          item.bytes || null,
          'aresusayhi/vsl-vietnamese-sign-languages',
          item.source_file || null,
          index + 1
        ]);
      }
    }

    await connection.commit();
    seedReady = true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

async function assertStudentCanLearnTopic(userId) {
  await seedTopicLessonContent();

  const student = await getStudentProfile(userId);
  if (!student) throw appError('Student profile not found.', 404, 'STUDENT_PROFILE_NOT_FOUND');
  if (!student.teacher_id) throw appError('Choose a Teacher before accessing topic lessons.', 403, 'TEACHER_REQUIRED');

  const hasAccess = await paymentService.getUserCourseAccess(userId);
  if (!hasAccess) {
    throw appError('Purchase the course to unlock topic lessons.', 403, 'COURSE_PURCHASE_REQUIRED');
  }

  return student;
}

function mapTopicRow(row) {
  const totalItems = Number(row.total_items || 0);
  const completedItems = Number(row.completed_items || 0);
  return {
    id: row.id,
    topic_slug: row.topic_slug,
    title: row.title,
    description: row.description,
    order_index: row.order_index,
    estimated_minutes: row.estimated_minutes,
    total_items: totalItems,
    completed_items: completedItems,
    progress_percent: totalItems ? Math.round((completedItems / totalItems) * 100) : 0,
    status: row.progress_status || 'NOT_STARTED',
    started_at: row.started_at || null,
    completed_at: row.completed_at || null
  };
}

async function listStudentTopicLessons(userId) {
  const student = await assertStudentCanLearnTopic(userId);

  const [rows] = await pool.query(`
    SELECT
      tl.id,
      tl.topic_slug,
      tl.title,
      tl.description,
      tl.order_index,
      tl.estimated_minutes,
      COUNT(DISTINCT tli.id) AS total_items,
      COUNT(DISTINCT CASE WHEN stvp.status = 'COMPLETED' THEN stvp.topic_lesson_item_id END) AS completed_items,
      stp.status AS progress_status,
      stp.started_at,
      stp.completed_at
    FROM topic_lessons tl
    LEFT JOIN topic_lesson_items tli ON tli.topic_lesson_id = tl.id
    LEFT JOIN student_topic_progress stp
      ON stp.topic_lesson_id = tl.id AND stp.student_id = ?
    LEFT JOIN student_topic_video_progress stvp
      ON stvp.topic_lesson_item_id = tli.id AND stvp.student_id = ?
    GROUP BY
      tl.id,
      tl.topic_slug,
      tl.title,
      tl.description,
      tl.order_index,
      tl.estimated_minutes,
      stp.status,
      stp.started_at,
      stp.completed_at
    ORDER BY tl.order_index, tl.title
  `, [student.id, student.id]);

  const topics = rows.map(mapTopicRow);
  const completedTopics = topics.filter((topic) => topic.status === 'COMPLETED').length;

  return {
    summary: {
      total_topics: topics.length,
      completed_topics: completedTopics,
      progress_percent: topics.length ? Math.round((completedTopics / topics.length) * 100) : 0
    },
    topics
  };
}

async function getTopicLessonBySlug(userId, topicSlug) {
  const student = await assertStudentCanLearnTopic(userId);

  const [topics] = await pool.query(`
    SELECT *
    FROM topic_lessons
    WHERE topic_slug = ?
    LIMIT 1
  `, [topicSlug]);
  const topic = topics[0];
  if (!topic) throw appError('Topic lesson not found.', 404, 'TOPIC_NOT_FOUND');

  await pool.query(`
    INSERT INTO student_topic_progress (student_id, topic_lesson_id, status, started_at)
    VALUES (?, ?, 'IN_PROGRESS', NOW())
    ON DUPLICATE KEY UPDATE
      status = IF(status = 'COMPLETED', status, 'IN_PROGRESS'),
      started_at = COALESCE(started_at, NOW())
  `, [student.id, topic.id]);

  const [items] = await pool.query(`
    SELECT
      tli.id,
      tli.video_key,
      tli.word,
      tli.description,
      tli.cloudinary_public_id,
      tli.cloudinary_secure_url,
      tli.cloudinary_resource_type,
      tli.cloudinary_format,
      tli.width,
      tli.height,
      tli.duration_seconds,
      tli.bytes,
      tli.source_dataset,
      tli.source_file,
      tli.order_index,
      stvp.status AS progress_status,
      stvp.completed_at
    FROM topic_lesson_items tli
    LEFT JOIN student_topic_video_progress stvp
      ON stvp.topic_lesson_item_id = tli.id AND stvp.student_id = ?
    WHERE tli.topic_lesson_id = ?
    ORDER BY tli.order_index, tli.word
  `, [student.id, topic.id]);

  const completedItems = items.filter((item) => item.progress_status === 'COMPLETED').length;
  return {
    topic: {
      ...topic,
      total_items: items.length,
      completed_items: completedItems,
      progress_percent: items.length ? Math.round((completedItems / items.length) * 100) : 0,
      status: completedItems === items.length && items.length > 0 ? 'COMPLETED' : 'IN_PROGRESS'
    },
    items: items.map((item) => ({
      ...item,
      progress_status: item.progress_status || 'NOT_STARTED'
    }))
  };
}

async function updateTopicCompletionFromItems(connection, studentId, topicLessonId) {
  const [counts] = await connection.query(`
    SELECT
      COUNT(*) AS total_items,
      COUNT(CASE WHEN stvp.status = 'COMPLETED' THEN 1 END) AS completed_items
    FROM topic_lesson_items tli
    LEFT JOIN student_topic_video_progress stvp
      ON stvp.topic_lesson_item_id = tli.id AND stvp.student_id = ?
    WHERE tli.topic_lesson_id = ?
  `, [studentId, topicLessonId]);

  const totalItems = Number(counts[0]?.total_items || 0);
  const completedItems = Number(counts[0]?.completed_items || 0);
  const isCompleted = totalItems > 0 && totalItems === completedItems;

  await connection.query(`
    INSERT INTO student_topic_progress (
      student_id,
      topic_lesson_id,
      status,
      started_at,
      completed_at
    )
    VALUES (?, ?, ?, NOW(), IF(? = TRUE, NOW(), NULL))
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      started_at = COALESCE(started_at, NOW()),
      completed_at = IF(? = TRUE, COALESCE(completed_at, NOW()), completed_at)
  `, [
    studentId,
    topicLessonId,
    isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
    isCompleted,
    isCompleted
  ]);

  return {
    total_items: totalItems,
    completed_items: completedItems,
    progress_percent: totalItems ? Math.round((completedItems / totalItems) * 100) : 0,
    status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS'
  };
}

async function completeTopicLessonItem(userId, topicSlug, itemId) {
  const student = await assertStudentCanLearnTopic(userId);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [items] = await connection.query(`
      SELECT
        tli.id,
        tli.topic_lesson_id,
        tli.word,
        tl.topic_slug
      FROM topic_lesson_items tli
      JOIN topic_lessons tl ON tl.id = tli.topic_lesson_id
      WHERE tl.topic_slug = ? AND tli.id = ?
      LIMIT 1
      FOR UPDATE
    `, [topicSlug, itemId]);

    const item = items[0];
    if (!item) throw appError('Topic video item not found.', 404, 'TOPIC_ITEM_NOT_FOUND');

    await connection.query(`
      INSERT INTO student_topic_video_progress (
        student_id,
        topic_lesson_id,
        topic_lesson_item_id,
        status,
        completed_at
      )
      VALUES (?, ?, ?, 'COMPLETED', NOW())
      ON DUPLICATE KEY UPDATE
        status = 'COMPLETED',
        completed_at = COALESCE(completed_at, NOW())
    `, [student.id, item.topic_lesson_id, item.id]);

    const progress = await updateTopicCompletionFromItems(connection, student.id, item.topic_lesson_id);
    await connection.commit();

    return {
      item: {
        id: item.id,
        word: item.word,
        progress_status: 'COMPLETED'
      },
      progress
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function completeTopicLesson(userId, topicSlug) {
  const student = await assertStudentCanLearnTopic(userId);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [topics] = await connection.query(`
      SELECT id, topic_slug, title
      FROM topic_lessons
      WHERE topic_slug = ?
      LIMIT 1
      FOR UPDATE
    `, [topicSlug]);
    const topic = topics[0];
    if (!topic) throw appError('Topic lesson not found.', 404, 'TOPIC_NOT_FOUND');

    const [items] = await connection.query(`
      SELECT id
      FROM topic_lesson_items
      WHERE topic_lesson_id = ?
    `, [topic.id]);

    for (const item of items) {
      await connection.query(`
        INSERT INTO student_topic_video_progress (
          student_id,
          topic_lesson_id,
          topic_lesson_item_id,
          status,
          completed_at
        )
        VALUES (?, ?, ?, 'COMPLETED', NOW())
        ON DUPLICATE KEY UPDATE
          status = 'COMPLETED',
          completed_at = COALESCE(completed_at, NOW())
      `, [student.id, topic.id, item.id]);
    }

    await connection.query(`
      INSERT INTO student_topic_progress (
        student_id,
        topic_lesson_id,
        status,
        started_at,
        completed_at
      )
      VALUES (?, ?, 'COMPLETED', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        status = 'COMPLETED',
        started_at = COALESCE(started_at, NOW()),
        completed_at = COALESCE(completed_at, NOW())
    `, [student.id, topic.id]);

    await connection.commit();

    return {
      topic: {
        ...topic,
        status: 'COMPLETED',
        completed_items: items.length,
        total_items: items.length,
        progress_percent: 100
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getStudentTopicProgress(userId) {
  return listStudentTopicLessons(userId);
}

module.exports = {
  listStudentTopicLessons,
  getTopicLessonBySlug,
  completeTopicLessonItem,
  completeTopicLesson,
  getStudentTopicProgress,
  __testing: {
    buildItemDescription,
    groupDatasetByTopic,
    normalizeVideoKey
  }
};
