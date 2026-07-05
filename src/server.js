const app = require('./app');
const { testConnection } = require('./config/database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;

async function start() {
  const connected = await testConnection();
  if (!connected) {
    console.warn('Starting without a confirmed MySQL connection. Check your .env and database setup.');
  }

  app.listen(PORT, () => {
    console.log(`SLMS server running at http://localhost:${PORT}`);
  });
}

start();

