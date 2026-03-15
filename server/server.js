// server.js
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import ViteExpress from 'vite-express';
import cookieParser from 'cookie-parser';

// Database schema helper: ensures the users table exists before the app starts serving requests.
import { ensureSchema } from './db.js';

import users from './routes/users.js';
import mapRoutes from './routes/mapRoutes.js';
import admin from './routes/admin.js';
import setPassword from './routes/setPassword.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || (isProduction ? true : 'http://localhost:5173'),
    credentials: true,
  })
);

app.use(cookieParser());

// API routes mounted under /api so the same client paths work in dev (Vite proxy) and production (same host).
app.use('/api/users', users);
app.use('/api/map-routes', mapRoutes);
app.use('/api/set-password', setPassword);
app.use('/api/admin', admin);

app.get('/api/message', (req, res) => {
  res.send('Hello World!');
  console.log(`Hello World! - port ${PORT}`);
});

// Production: serve built frontend and SPA fallback.
if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Initialize database schema once on startup, then start the HTTP server.
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