import bcrypt from 'bcryptjs';
import { ensureSchema, query } from '../db.js';
import { findUserByValidPasswordToken } from '../models/user.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';

export async function validateToken(req, res, next) {
  try {
    const found = await findUserByValidPasswordToken(req.params.token);
    if (!found) {
      return res.json({ valid: false });
    }
    res.json({ valid: true, email: found.user.email });
  } catch (err) {
    next(err);
  }
}

export async function setPassword(req, res, next) {
  const { token, password } = req.body || {};

  if (!token || !password) {
    return res.status(400).json({ error: 'Missing token or password' });
  }

  try {
    const found = await findUserByValidPasswordToken(token);
    if (!found) {
      return res.status(400).json({ error: 'Invalid or expired link. Please request a new one.' });
    }

    const { user } = found;
    const passwordHash = await bcrypt.hash(password, 10);
    const { id: _id, state: _s, passwordSetToken: _t, passwordSetTokenExpiresAt: _e, ...rest } = user;
    const bodyForDb = { ...rest, passwordHash };
    if (bodyForDb.email != null) {
      bodyForDb.email = normalizeEmail(String(bodyForDb.email));
    }

    await ensureSchema();
    await query('UPDATE users SET state = $1, body = $2 WHERE id = $3', [
      'active',
      JSON.stringify(bodyForDb),
      user.id,
    ]);

    res.json({ success: true, message: 'Password set. You can now sign in.' });
  } catch (err) {
    next(err);
  }
}
