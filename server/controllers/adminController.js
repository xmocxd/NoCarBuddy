import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ensureSchema, query } from '../db.js';
import { getAdminPasswordHash } from '../models/adminCredentials.js';

export async function login(req, res) {
  const { userName, password } = req.body;

  const adminUser = process.env.ADMIN_USER;
  const adminPasswordHash = await getAdminPasswordHash();

  if (!adminUser || userName !== adminUser || !(await bcrypt.compare(password, adminPasswordHash))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ userName }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 3600000,
  });
  res.status(200).json({ message: 'Logged in successfully' });
}

export function check(req, res) {
  res.json({ ok: true, user: req.user });
}

export function logout(req, res) {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });
  res.status(200).json({ message: 'Logged out successfully' });
}

export async function deleteUserMapRoutes(req, res, next) {
  const userId = req.params.id;
  if (!userId || !/^\d+$/.test(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  await ensureSchema();
  try {
    await query('DELETE FROM map_routes WHERE user_id = $1', [userId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
