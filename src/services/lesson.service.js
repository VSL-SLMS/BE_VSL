const { pool } = require('../config/database');

async function getCourseOverview() {
  const [parts] = await pool.query(`
    SELECT
      p.*,
      COUNT(DISTINCT c.id) AS chapter_count,
      COUNT(DISTINCT l.id) AS lesson_count
    FROM parts p
    LEFT JOIN chapters c ON c.part_id = p.id
    LEFT JOIN lessons l ON l.chapter_id = c.id
    GROUP BY p.id
    ORDER BY p.order_index
  `);

  return parts;
}

async function getAllPartsWithChapters() {
  const [parts] = await pool.query('SELECT * FROM parts ORDER BY order_index');
  const [chapters] = await pool.query(`
    SELECT
      c.*,
      COUNT(l.id) AS lesson_count
    FROM chapters c
    LEFT JOIN lessons l ON l.chapter_id = c.id
    GROUP BY c.id
    ORDER BY c.part_id, c.order_index
  `);
  const [lessons] = await pool.query(`
    SELECT id, chapter_id, title, slug, lesson_type, estimated_minutes, order_index
    FROM lessons
    ORDER BY chapter_id, order_index
  `);

  return parts.map((part) => ({
    ...part,
    chapters: chapters
      .filter((chapter) => chapter.part_id === part.id)
      .map((chapter) => ({
        ...chapter,
        lessons: lessons.filter((lesson) => lesson.chapter_id === chapter.id)
      }))
  }));
}

async function getLessonBySlug(slug) {
  const [rows] = await pool.query(`
    SELECT
      l.*,
      c.title AS chapter_title,
      c.slug AS chapter_slug,
      p.title AS part_title,
      p.slug AS part_slug
    FROM lessons l
    JOIN chapters c ON c.id = l.chapter_id
    JOIN parts p ON p.id = c.part_id
    WHERE l.slug = ?
    LIMIT 1
  `, [slug]);

  return rows[0] || null;
}

async function getLessonContent(lessonId) {
  const [sections] = await pool.query(`
    SELECT *
    FROM lesson_contents
    WHERE lesson_id = ?
    ORDER BY order_index
  `, [lessonId]);

  if (!sections.length) return [];

  const articleSectionIds = sections.filter(s => s.type === 'article').map(s => s.id);
  const gridSectionIds = sections.filter(s => s.type === 'grid').map(s => s.id);

  let allBlocks = [];
  if (articleSectionIds.length > 0) {
    const [blocks] = await pool.query(`
      SELECT *
      FROM content_blocks
      WHERE content_id IN (?)
      ORDER BY order_index
    `, [articleSectionIds]);
    allBlocks = blocks;
  }

  let allItems = [];
  if (gridSectionIds.length > 0) {
    const [items] = await pool.query(`
      SELECT *
      FROM content_items
      WHERE content_id IN (?)
      ORDER BY order_index
    `, [gridSectionIds]);
    allItems = items;
  }

  return sections.map(section => {
    if (section.type === 'article') {
      return {
        ...section,
        blocks: allBlocks.filter(b => b.content_id === section.id)
      };
    }
    if (section.type === 'grid') {
      return {
        ...section,
        items: allItems
          .filter(i => i.content_id === section.id)
          .map(normalizeContentItemImage)
      };
    }
    return section;
  });
}

async function getPageImagesByLessonId(lessonId) {
  const [pages] = await pool.query(`
    SELECT *
    FROM page_images
    WHERE lesson_id = ?
    ORDER BY order_index
  `, [lessonId]);

  return pages.map((page) => ({
    ...page,
    image_path: normalizePageImagePath(page.image_path)
  }));
}

async function getLessonNavigation(lesson) {
  const [rows] = await pool.query(`
    (SELECT slug, title, 'prev' AS direction
     FROM lessons
     WHERE chapter_id = ? AND order_index < ?
     ORDER BY order_index DESC
     LIMIT 1)
    UNION ALL
    (SELECT slug, title, 'next' AS direction
     FROM lessons
     WHERE chapter_id = ? AND order_index > ?
     ORDER BY order_index ASC
     LIMIT 1)
  `, [lesson.chapter_id, lesson.order_index, lesson.chapter_id, lesson.order_index]);

  return {
    prev: rows.find((item) => item.direction === 'prev') || null,
    next: rows.find((item) => item.direction === 'next') || null
  };
}

async function searchContent(query) {
  const q = String(query || '').trim();
  if (q.length < 2) {
    return { query: q, total: 0, chapters: [], lessons: [], items: [] };
  }

  const like = `%${q}%`;

  const [chapters] = await pool.query(`
    SELECT c.id, c.title, c.slug, c.description, p.title AS part_title, p.slug AS part_slug
    FROM chapters c
    JOIN parts p ON p.id = c.part_id
    WHERE c.title LIKE ? OR c.description LIKE ?
    ORDER BY c.order_index
    LIMIT 10
  `, [like, like]);

  const [lessons] = await pool.query(`
    SELECT l.id, l.title, l.slug, l.lesson_type, l.description, c.title AS chapter_title
    FROM lessons l
    JOIN chapters c ON c.id = l.chapter_id
    WHERE l.title LIKE ? OR l.description LIKE ?
    ORDER BY l.order_index
    LIMIT 10
  `, [like, like]);

  const [items] = await pool.query(`
    SELECT
      ci.id,
      ci.title,
      ci.description,
      ci.image_url,
      ci.keywords,
      lc.title AS section_title,
      l.title AS lesson_title,
      l.slug AS lesson_slug,
      c.title AS chapter_title
    FROM content_items ci
    JOIN lesson_contents lc ON lc.id = ci.content_id
    JOIN lessons l ON l.id = lc.lesson_id
    JOIN chapters c ON c.id = l.chapter_id
    WHERE ci.title LIKE ? OR ci.description LIKE ? OR ci.keywords LIKE ?
    ORDER BY ci.title
    LIMIT 30
  `, [like, like, like]);

  const normalizedItems = items.map(normalizeContentItemImage);

  return {
    query: q,
    total: chapters.length + lessons.length + normalizedItems.length,
    chapters,
    lessons,
    items: normalizedItems
  };
}

function normalizePageImagePath(imagePath) {
  if (!imagePath) return imagePath;
  const match = imagePath.match(/page_?(\d{4})|page(\d{4})_img01/);
  const page = match && (match[1] || match[2]);
  if (!page) return imagePath;
  return `/images/pages_hires/page_${page}.png`;
}

function normalizeContentItemImage(item) {
  return {
    ...item,
    normalized_image_url: normalizeExtractedImagePath(item.image_url)
  };
}

function normalizeExtractedImagePath(imageUrl) {
  if (!imageUrl) return '';

  if (imageUrl.includes('/signs_v2/')) {
    return imageUrl;
  }

  const oldPageImage = imageUrl.match(/page(\d{4})_img01\.png/);
  if (oldPageImage) {
    return `/images/images/page${oldPageImage[1]}_img01.png`;
  }

  const highResPage = imageUrl.match(/page_(\d{4})\.png/);
  if (highResPage) {
    return `/images/pages_hires/page_${highResPage[1]}.png`;
  }

  return imageUrl;
}

module.exports = {
  getCourseOverview,
  getAllPartsWithChapters,
  getLessonBySlug,
  getLessonContent,
  getPageImagesByLessonId,
  getLessonNavigation,
  searchContent,
  normalizeExtractedImagePath,
  normalizePageImagePath
};

