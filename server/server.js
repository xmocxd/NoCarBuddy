// server.js
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import ViteExpress from 'vite-express';
import cookieParser  from 'cookie-parser';

// Database schema helper: ensures the users table exists before the app starts serving requests.
import { ensureSchema } from './db.js';

import users from './routes/users.js';
import admin from './routes/admin.js';
import setPassword from './routes/setPassword.js';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json()); 

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(cookieParser());

app.use('/users', users);
app.use('/set-password', setPassword);
app.use('/admin', admin);

app.get('/message', (req, res) => {
  res.send('Hello World!');
  console.log(`Hello World! - port ${PORT}`);
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Initialize database schema once on startup, then start the HTTP server.
// This guarantees the users table exists as soon as the app is up, instead of waiting for the first /users request.
(async () => {
  try {
    await ensureSchema();
    console.log('Database schema initialized (users table ensured).');

    ViteExpress.listen(app, PORT, () =>
      console.log(`Server listening on port ${PORT}`)
    );
  } catch (err) {
    console.error('Failed to initialize database schema. Server will not start.', err);
    process.exit(1);
  }
})();