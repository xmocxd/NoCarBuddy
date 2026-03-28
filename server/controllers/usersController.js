import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ensureSchema } from '../db.js';
import { sendSetPasswordEmail } from '../email.js';
import {
  findUserForLogin,
  findUserById,
  listUsersOrdered,
  insertUser,
  updateUserBody,
  insertSampleMapRoute,
  deleteMapRoutesForUser,
  deleteUserById,
  updateUserStateAndBody,
  buildSignUpTokenBody,
} from '../models/user.js';

export async function login(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  await ensureSchema();
  try {
    const user = await findUserForLogin(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload = {
      userType: 'user',
      userId: user.id,
      email: user.email,
      firstName: user.firstName || '',
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ message: 'Logged in successfully' });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  if (req.user.userType !== 'user' || req.user.userId == null) {
    return res.status(403).json({ error: 'Not a user session' });
  }

  await ensureSchema();
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { passwordHash, passwordSetToken, passwordSetTokenExpiresAt, ...profile } = user;
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out successfully' });
}

export async function list(req, res, next) {
  await ensureSchema();
  try {
    const users = await listUsersOrdered();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  await ensureSchema();

  const state = req.body.state || 'pending';
  const { id: _id, state: _s, ...rest } = req.body;
  const body = Object.keys(rest).length ? rest : {};

  try {
    const user = await insertUser(state, body);
    const { bodyWithToken, token } = await buildSignUpTokenBody(body);
    await updateUserBody(user.id, bodyWithToken);

    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
    const setPasswordLink = `${baseUrl}/set-password/?token=${token}`;

    const emailResult = await sendSetPasswordEmail(user.email, setPasswordLink);
    if (!emailResult.sent && emailResult.error) {
      console.warn('[users] Sign up succeeded but set-password email failed:', emailResult.error);
    }

    await insertSampleMapRoute(user.id);

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  await ensureSchema();
  try {
    const user = await findUserById(req.params.id);
    if (!user) return next();
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  await ensureSchema();
  try {
    const userId = req.params.id;
    await deleteMapRoutesForUser(userId);
    const deleted = await deleteUserById(userId);
    if (!deleted) return next();
    res.status(204).json(deleted);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  const user = req.body;

  if (user.id != null && String(user.id) !== String(req.params.id)) {
    return next(new Error('ID parameter does not match body'));
  }

  await ensureSchema();

  const state = user.state ?? 'pending';
  const { id: _id, state: _s, ...rest } = user;
  const body = Object.keys(rest).length ? rest : {};

  try {
    const updated = await updateUserStateAndBody(req.params.id, state, body);
    if (!updated) return next();
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
