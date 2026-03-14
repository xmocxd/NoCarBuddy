/**
 * Set-password routes: allow a user who signed up to set their password using
 * the one-time token they received by email. The token is valid for 30 minutes.
 *
 * - GET /validate/:token – Check if a token is valid (exists and not expired). Used by the set-password page to show a friendly message if the link is bad or expired.
 * - POST / – Accept { token, password }. Validate token, hash password, update user, clear token. No auth required (the token is the proof).
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query, ensureSchema } from '../db.js';

const router = express.Router();

/** Turn a DB row (id, state, body) into a plain user object { id, state, ...body }. */
function rowToUser(row) {
  const { id, state, body = {} } = row;
  return { id, state, ...body };
}

/**
 * Find a user by their set-password token and check that the token has not expired.
 * Returns the user row if valid, null otherwise.
 */
async function findUserByValidToken(token) {
  if (!token || typeof token !== 'string') return null;
  await ensureSchema();

  const result = await query(
    'SELECT id, state, body FROM users WHERE body->>\'passwordSetToken\' = $1',
    [token]
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const user = rowToUser(row);
  const expiresAt = user.passwordSetTokenExpiresAt;
  if (!expiresAt) return null;

  const expiry = new Date(expiresAt).getTime();
  if (Date.now() > expiry) return null; // Token has expired.

  return { row, user };
}

/* GET /set-password/validate/:token – Check if token is valid. Returns { valid: boolean, email?: string }. */
router.get('/validate/:token', async function (req, res, next) {
  try {
    const found = await findUserByValidToken(req.params.token);
    if (!found) {
      return res.json({ valid: false });
    }
    // Don't expose the full user; just confirm validity and optionally the email for display.
    res.json({ valid: true, email: found.user.email });
  } catch (err) {
    next(err);
  }
});

/* POST /set-password – Body: { token, password }. Set the user's password and clear the one-time token. */
router.post('/', async function (req, res, next) {
  const { token, password } = req.body || {};

  if (!token || !password) {
    return res.status(400).json({ error: 'Missing token or password' });
  }

  try {
    const found = await findUserByValidToken(token);
    if (!found) {
      return res.status(400).json({ error: 'Invalid or expired link. Please request a new one.' });
    }

    const { user } = found;
    // Hash the password so we never store plain text. Salt is included in the hash.
    const passwordHash = await bcrypt.hash(password, 10);

    // Build new body: keep existing user fields (name, email, etc.), drop token fields, add password hash.
    const { id: _id, state: _s, passwordSetToken: _t, passwordSetTokenExpiresAt: _e, ...rest } = user;
    const bodyForDb = { ...rest, passwordHash };

    await query(
      'UPDATE users SET body = $1 WHERE id = $2',
      [JSON.stringify(bodyForDb), user.id]
    );

    res.json({ success: true, message: 'Password set. You can now sign in.' });
  } catch (err) {
    next(err);
  }
});

export default router;
