import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import auth from '../middleware/auth.js';

dotenv.config();

const router = express.Router();

let cachedAdminHash = null;

async function waitForAdminPassword(timeoutMs = 5000) {
  const start = Date.now();
  while (!process.env.ADMIN_PASSWORD) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('ADMIN_PASSWORD environment variable is not set');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return process.env.ADMIN_PASSWORD;
}

async function getAdminHash() {
  if (!cachedAdminHash) {
    const adminPasswordPlain = await waitForAdminPassword();
    cachedAdminHash = await bcrypt.hash(adminPasswordPlain, 10);
  }
  return cachedAdminHash;
}

router.post('/login', async (req, res) => {
  const { userName, password } = req.body;

  const adminUser = process.env.ADMIN_USER;
  const adminPasswordHash = await getAdminHash();

  // just compares the username and password to the test credentials for demonstration purposes
  if (!adminUser || userName !== adminUser || !await bcrypt.compare(password, adminPasswordHash)) {
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

router.get('/check', auth, (req, res) => {
  console.log('Admin OK for user:', req.user);
  res.json({ ok: true, user: req.user });
});

router.post('/logout', (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

export default router;

