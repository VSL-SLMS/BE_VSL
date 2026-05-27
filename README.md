# BE_VSL

Backend API for SLMS, built with Express.js, MySQL, raw SQL, JWT auth, and Swagger docs.

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Local backend:

```txt
http://localhost:5050
```

Swagger:

```txt
http://localhost:5050/docs
```

Health check:

```txt
http://localhost:5050/api/health
```

## Railway Deployment

This backend is ready for Railway using `railway.json`.

Railway settings:

```txt
Build: Nixpacks
Start command: npm start
Healthcheck path: /api/health
Node.js: 20.x
```

Required Railway variables:

```bash
NODE_ENV=production
SESSION_SECRET=your-long-random-secret
BACKEND_PUBLIC_URL=https://bevsl-production.up.railway.app
CORS_ORIGINS=https://fe-vsl.vercel.app
FRONTEND_URL=https://fe-vsl.vercel.app
```

For MySQL, either connect a Railway MySQL service and expose these variables:

```bash
MYSQLHOST
MYSQLPORT
MYSQLUSER
MYSQLPASSWORD
MYSQLDATABASE
```

Or provide one connection string:

```bash
MYSQL_URL=mysql://user:password@host:port/database
```

`DATABASE_URL`, `MYSQL_PRIVATE_URL`, and `MYSQL_PUBLIC_URL` are supported too.

The backend also supports local-style variables:

```bash
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
```

If your MySQL provider requires SSL:

```bash
DB_SSL=true
```

## Database Import

Import the VSL content and LMS tables into MySQL:

```bash
./database/import_all.sh
```

The import script supports both local variable names and Railway MySQL names:

```bash
MYSQL_HOST / MYSQLHOST
MYSQL_PORT / MYSQLPORT
MYSQL_USER / MYSQLUSER
MYSQL_PASSWORD / MYSQLPASSWORD
DB_NAME / MYSQLDATABASE
```

For an existing database, apply migrations manually:

```bash
mysql -u root vsl_learning < database/migrations/001_lms_tables.sql
mysql -u root vsl_learning < database/migrations/002_fix_image_urls.sql
mysql -u root vsl_learning < database/migrations/003_auth_admin_teacher_controls.sql
```

On Railway MySQL, the default database is often named `railway`. Use this one-off command in Railway after the MySQL service variables are attached:

```bash
npm run db:import:railway
```

That command imports the VSL schema and seed data into the active Railway database instead of the hardcoded local `vsl_learning` database.

Seeded admin account:

```txt
Email: admin@slms.local
Password: Admin@123
```

Change this password after first deployment.

## Validation

```bash
npm run check
npm start
```
