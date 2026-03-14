/**
 * User routes: all user data is stored in PostgreSQL (see server/db.js).
 * Each row is stored as (id, state, body). We map to API shape as { id, state, ...body }.
 *
 * - After sign up (POST /), we generate a one-time token, store it in the user's body
 *   with an expiry (30 minutes), and send an email with a link to set their password.
 * - POST /login: user logs in with email + password (if they have set a password); we set a JWT cookie.
 * - GET /me: return the currently logged-in user's profile (requires JWT from a user login, not admin).
 * - POST /logout: clear the JWT cookie so the user is logged out.
 */

import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import auth from '../middleware/auth.js';
import { query, ensureSchema } from '../db.js';
import { sendSetPasswordEmail } from '../email.js';

const router = express.Router();

/** Turn a DB row (id, state, body) into the API user object { id, state, ...body }. */
function rowToUser(row) {
  const { id, state, body = {} } = row;
  return { id, state, ...body };
}

/**
 * POST /users/login – Log in with email and password.
 * Body: { email, password }. We find the user by email, check that they have a password set,
 * verify the password with bcrypt, then issue a JWT and set it in an httpOnly cookie.
 * Only users who have set their password (via the email link) can log in.
 */
router.post('/login', async function (req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  await ensureSchema();
  try {
    // Find user by email. We need a row where body contains email and a passwordHash (they completed set-password).
    const result = await query(
      'SELECT id, state, body FROM users WHERE body->>\'email\' = $1 AND body->>\'passwordHash\' IS NOT NULL',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const row = result.rows[0];
    const user = rowToUser(row);
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Build a JWT payload that identifies this user. We use userType so we can tell user vs admin later.
    const payload = {
      userType: 'user',
      userId: user.id,
      email: user.email,
      firstName: user.firstName || '',
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Same cookie pattern as admin: httpOnly, so the browser sends it with every request to our API.
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.json({ message: 'Logged in successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /users/me – Return the profile of the currently logged-in user.
 * Requires a valid JWT cookie from a user login (not admin). Used by the dashboard to show a welcome message.
 * We do not return passwordHash or any sensitive fields.
 */
router.get('/me', auth, async function (req, res, next) {
  // Only allow if the JWT was issued for a user (not admin). Admin tokens have userName, not userId.
  if (req.user.userType !== 'user' || req.user.userId == null) {
    return res.status(403).json({ error: 'Not a user session' });
  }

  await ensureSchema();
  try {
    const result = await query('SELECT id, state, body FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = rowToUser(result.rows[0]);
    // Return only safe profile fields (no passwordHash, no set-password tokens).
    const { passwordHash, passwordSetToken, passwordSetTokenExpiresAt, ...profile } = user;
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /users/logout – Clear the JWT cookie so the user is logged out.
 * Same idea as admin logout; one cookie name is used for both admin and user sessions.
 */
router.post('/logout', function (req, res) {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out successfully' });
});

/* GET users listing – requires auth. Reads all users from Postgres, maps rows to API shape. */
router.get('/', auth, async function (req, res, next) {
  await ensureSchema();
  try {
    const result = await query('SELECT id, state, body FROM users ORDER BY id');
    const users = result.rows.map(rowToUser);
    res.json(users);
  } catch (err) {
    next(err);
  }
});

/* Create a new user – unauthenticated. Inserts state and body into Postgres, returns full user with generated id.
 * Then we generate a 30-minute set-password token, save it in the user's body, and send an email with the link.
 */
router.post('/', async function (req, res, next) {
  console.log('Creating user:', req.body);
  await ensureSchema();

  const state = req.body.state || 'pending';
  // Store everything except id and state in body (id is SERIAL; state is its own column).
  const { id: _id, state: _s, ...rest } = req.body;
  const body = Object.keys(rest).length ? rest : {};

  try {
    const result = await query(
      'INSERT INTO users (state, body) VALUES ($1, $2) RETURNING id, state, body',
      [state, JSON.stringify(body)]
    );
    const row = result.rows[0];
    const user = rowToUser(row);

    // Generate a secure random token for the "set password" link. Valid for 30 minutes.
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Merge token and expiry into body and update the user row so the link in the email can be validated later.
    const bodyWithToken = { ...body, passwordSetToken: token, passwordSetTokenExpiresAt: expiresAt };
    await query(
      'UPDATE users SET body = $1 WHERE id = $2',
      [JSON.stringify(bodyWithToken), user.id]
    );

    // Build the link the user will click in the email. APP_BASE_URL is e.g. http://localhost:5173 in dev.
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
    const setPasswordLink = `${baseUrl}/set-password/?token=${token}`;

    // Send email (non-blocking: we don't fail sign up if email fails; we still return the user).
    const emailResult = await sendSetPasswordEmail(user.email, setPasswordLink);
    if (!emailResult.sent && emailResult.error) {
      console.warn('[users] Sign up succeeded but set-password email failed:', emailResult.error);
    }

    // Give the new user one test map route with a single random point so the dashboard has something to show.
    const lat = 37 + Math.random() * 2;
    const lng = -122 + Math.random() * 2;
    const testPoints = JSON.stringify([{ lat, lng }]);
    await query(
      'INSERT INTO map_routes (user_id, name, recorded_at, location, points) VALUES ($1, $2, now(), $3, $4)',
      [user.id, 'Sample map route', 'Sample location', testPoints]
    );

    // Return the user without the token in the response (the token is only in the email).
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/* Get a specific user by id – requires auth. Single row from Postgres, 404 if not found. */
router.get('/:id', auth, async function (req, res, next) {
  await ensureSchema();
  try {
    const result = await query('SELECT id, state, body FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return next();
    res.json(rowToUser(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

/* Delete a user by id – requires auth. Delete in Postgres, return deleted user (204 + body per original behavior). */
router.delete('/:id', auth, async function (req, res, next) {
  await ensureSchema();
  try {
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, state, body',
      [req.params.id]
    );
    if (result.rows.length === 0) return next();
    res.status(204).json(rowToUser(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

/* Update a user by id – requires auth. Body must include id matching :id. Update state and body in Postgres. */
router.put('/:id', auth, async function (req, res, next) {
  const user = req.body;
  console.log('Updating user:', req.body);
  console.log('Param id:', req.params.id);
  console.log('Body id:', user.id);

  if (user.id != null && String(user.id) !== String(req.params.id)) {
    return next(new Error('ID parameter does not match body'));
  }

  await ensureSchema();

  const state = user.state ?? 'pending';
  const { id: _id, state: _s, ...rest } = user;
  const body = Object.keys(rest).length ? rest : {};

  try {
    const result = await query(
      'UPDATE users SET state = $1, body = $2 WHERE id = $3 RETURNING id, state, body',
      [state, JSON.stringify(body), req.params.id]
    );
    if (result.rows.length === 0) return next();
    res.json(rowToUser(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

export default router;
