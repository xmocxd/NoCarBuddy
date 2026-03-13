/**
 * User routes: all user data is stored in PostgreSQL (see server/db.js).
 * Each row is stored as (id, state, body). We map to API shape as { id, state, ...body }.
 */

import express from 'express';
import auth from '../middleware/auth.js';
import { query, ensureSchema } from '../db.js';

const router = express.Router();

/** Turn a DB row (id, state, body) into the API user object { id, state, ...body }. */
function rowToUser(row) {
  const { id, state, body = {} } = row;
  return { id, state, ...body };
}

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

/* Create a new user – unauthenticated. Inserts state and body into Postgres, returns full user with generated id. */
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
    res.json(rowToUser(row));
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
