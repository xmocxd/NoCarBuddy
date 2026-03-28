import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import users from './routes/users.js';
import mapRoutes from './routes/mapRoutes.js';
import admin from './routes/admin.js';
import setPassword from './routes/setPassword.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(options = {}) {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';

  const app = express();
  app.use(express.json());

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || (isProduction ? true : 'http://localhost:5173'),
      credentials: true,
    })
  );

  app.use(cookieParser());

  app.use('/api/users', users);
  app.use('/api/map-routes', mapRoutes);
  app.use('/api/set-password', setPassword);
  app.use('/api/admin', admin);

  app.get('/api/message', (req, res) => res.send('Hello World!'));

  if (isProduction) {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    // Express 5 / path-to-regexp v8 rejects bare '*'; named wildcard is required.
    app.get('/*splat', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(function (req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  return app;
}
