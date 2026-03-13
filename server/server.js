// server.js
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import ViteExpress from 'vite-express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser  from 'cookie-parser';

import users from './routes/users.js';
import auth from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

const adminUser = 'admin'; // admin username for testing purposes
const adminPassword = await bcrypt.hash('1234', 10); // 1234 - admin password for testing purposes

app.use(express.json()); 

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(cookieParser());

app.use('/users', users);

app.get('/message', (req, res) => {
  res.send('Hello World!');
  console.log(`Hello World! - port ${PORT}`);
});


app.post('/admin/login', async (req, res) => {
  const { userName, password } = req.body;
  
  // just compares the username and password to the test creditials for demonstration purposes
  if (userName !== adminUser || !await bcrypt.compare(password, adminPassword)) {
    console.log('Invalid admin login attempt:', req.body);
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { userName },
    process.env.JWT_SECRET, // add .env file ROOT dir
    { expiresIn: '1h' }
  );
  
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax', 
    maxAge: 3600000
  });
  res.status(200).json({ message: 'Logged in successfully' });
});

app.get('/admin/check', auth, (req, res) => {
  console.log('Admin OK for user:', req.user);
  res.json({ ok: true, user: req.user });
});

app.post('/admin/logout', (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

ViteExpress.listen(app, PORT, () =>
  console.log(`Server listening on port ${PORT}`)
);