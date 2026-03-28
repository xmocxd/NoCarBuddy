import dotenv from 'dotenv';
dotenv.config();

import ViteExpress from 'vite-express';

import { ensureSchema } from './db.js';
import { createApp } from './app.js';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = createApp();

(async () => {
  try {
    await ensureSchema();
    console.log('Database schema initialized (users table ensured).');

    if (isProduction) {
      app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
    } else {
      ViteExpress.listen(app, PORT, () =>
        console.log(`Server listening on port ${PORT}`)
      );
    }
  } catch (err) {
    console.error('Failed to initialize database schema. Server will not start.', err);
    process.exit(1);
  }
})();
