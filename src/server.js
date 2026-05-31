const app = require('./app');
const { testConnection } = require('./config/database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;

async function start() {
  app.listen(PORT, () => {
    console.log(`SLMS server running at http://localhost:${PORT}`);

    testConnection().then((connected) => {
      if (!connected) {
        console.warn('Started without a confirmed MySQL connection. Check your environment and database setup.');
      }
    });
  });
}

start();
