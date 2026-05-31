const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiRoutes = require('./routes/api.routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const swaggerSpec = require('./config/swagger');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
  const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');
  const configuredOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3000,https://fe-vsl.vercel.app';
  const allowedOrigins = configuredOrigins
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
  const origin = normalizeOrigin(req.headers.origin);

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

app.use('/images/images', express.static(path.join(__dirname, '../pdf_extracted/images')));
app.use('/images/pages_hires', express.static(path.join(__dirname, '../pdf_extracted/pages_hires')));
app.use('/images/signs_v2', express.static(path.join(__dirname, '../pdf_extracted/signs_v2')));

app.get('/api/docs.json', (req, res) => {
  res.json(swaggerSpec);
});
app.get('/', (req, res) => {
  res.redirect('/docs');
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'SLMS Backend API Docs'
}));
app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
