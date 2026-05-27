const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { getDatabaseConfig, pool } = require('../src/config/database');

const databaseDir = path.join(__dirname, '../database');
const sqlFiles = [
  'schema.sql',
  'seed_01_structure.sql',
  'seed_02_alphabet_numbers.sql',
  'seed_03_banthan.sql',
  'seed_03_missing.sql',
  'seed_04_giadinh_nghenghiep.sql',
  'seed_04_giadinh_full.sql',
  'seed_05_tunhien_thucvat_dongvat.sql',
  'seed_06_truonghoc_giaothong_quehuong.sql',
  'seed_05_nghenghiep_full.sql',
  'migrations/001_lms_tables.sql',
  'migrations/002_fix_image_urls.sql',
  'migrations/003_auth_admin_teacher_controls.sql'
];

function readEnv(...keys) {
  return keys.map((key) => process.env[key]).find((value) => value !== undefined && value !== '');
}

function parseBoolean(value) {
  return ['true', '1', 'yes'].includes(String(value || '').toLowerCase());
}

function getDatabaseName(config) {
  const explicitName = readEnv('DB_NAME', 'MYSQLDATABASE', 'MYSQL_DATABASE');
  if (explicitName) return explicitName;

  const uri = config.uri || readEnv('DATABASE_URL', 'MYSQL_URL', 'MYSQL_PRIVATE_URL', 'MYSQL_PUBLIC_URL');
  if (uri) {
    const parsedUrl = new URL(uri);
    return parsedUrl.pathname.replace(/^\//, '') || 'vsl_learning';
  }

  return config.database || 'vsl_learning';
}

function normalizeSql(sql, databaseName, createDatabase) {
  const escapedDatabaseName = `\`${databaseName}\``;
  const createDatabaseStatement =
    /CREATE DATABASE IF NOT EXISTS\s+vsl_learning\s+CHARACTER SET utf8mb4\s+COLLATE utf8mb4_unicode_ci;/g;

  return sql
    .replace(
      createDatabaseStatement,
      createDatabase
        ? `CREATE DATABASE IF NOT EXISTS ${escapedDatabaseName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        : '-- CREATE DATABASE skipped by CREATE_DATABASE=false'
    )
    .replace(/USE vsl_learning;/g, `USE ${escapedDatabaseName};`);
}

async function runSqlFile(connection, file, databaseName, createDatabase) {
  const filePath = path.join(databaseDir, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing SQL file: ${filePath}`);
  }

  const sql = normalizeSql(fs.readFileSync(filePath, 'utf8'), databaseName, createDatabase);
  console.log(`Importing ${file}...`);
  await connection.query(sql);
}

async function main() {
  const config = getDatabaseConfig();
  const databaseName = getDatabaseName(config);
  const skipDropDatabase = parseBoolean(process.env.SKIP_DROP_DATABASE);
  const createDatabase = !parseBoolean(process.env.SKIP_CREATE_DATABASE) && process.env.CREATE_DATABASE !== 'false';

  if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error(`Invalid database name: ${databaseName}`);
  }

  const connection = await mysql.createConnection({
    ...config,
    multipleStatements: true
  });

  try {
    console.log(`Target database: ${databaseName}`);

    if (skipDropDatabase) {
      console.log('Skipping database drop.');
    } else {
      console.log(`Dropping database ${databaseName}...`);
      await connection.query(`DROP DATABASE IF EXISTS \`${databaseName}\`;`);
    }

    for (const file of sqlFiles) {
      await runSqlFile(connection, file, databaseName, createDatabase);
    }

    const [rows] = await connection.query(`
      SELECT 'Parts' AS entity, COUNT(*) AS total FROM \`${databaseName}\`.parts
      UNION ALL SELECT 'Chapters', COUNT(*) FROM \`${databaseName}\`.chapters
      UNION ALL SELECT 'Lessons', COUNT(*) FROM \`${databaseName}\`.lessons
      UNION ALL SELECT 'Page Images', COUNT(*) FROM \`${databaseName}\`.page_images
      UNION ALL SELECT 'Lesson Contents', COUNT(*) FROM \`${databaseName}\`.lesson_contents
      UNION ALL SELECT 'Content Items', COUNT(*) FROM \`${databaseName}\`.content_items;
    `);

    console.table(rows);
    console.log('Database import completed successfully.');
  } finally {
    await connection.end();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
