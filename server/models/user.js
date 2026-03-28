import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, ensureSchema } from '../db.js';

export function rowToUser(row) {
  const { id, state, body = {} } = row;
  return { id, state, ...body };
}

export async function findUserForLogin(email) {
  const result = await query(
    "SELECT id, state, body FROM users WHERE body->>'email' = $1 AND body->>'passwordHash' IS NOT NULL AND state = $2",
    [email, 'active']
  );
  return result.rows[0] ? rowToUser(result.rows[0]) : null;
}

export async function findUserById(id) {
  const result = await query('SELECT id, state, body FROM users WHERE id = $1', [id]);
  return result.rows[0] ? rowToUser(result.rows[0]) : null;
}

export async function listUsersOrdered() {
  const result = await query('SELECT id, state, body FROM users ORDER BY id');
  return result.rows.map(rowToUser);
}

export async function insertUser(state, body) {
  const result = await query(
    'INSERT INTO users (state, body) VALUES ($1, $2) RETURNING id, state, body',
    [state, JSON.stringify(body)]
  );
  return rowToUser(result.rows[0]);
}

export async function updateUserBody(userId, bodyObj) {
  await query('UPDATE users SET body = $1 WHERE id = $2', [JSON.stringify(bodyObj), userId]);
}

export async function deleteMapRoutesForUser(userId) {
  await query('DELETE FROM map_routes WHERE user_id = $1', [userId]);
}

export async function deleteUserById(userId) {
  const result = await query('DELETE FROM users WHERE id = $1 RETURNING id, state, body', [userId]);
  return result.rows[0] ? rowToUser(result.rows[0]) : null;
}

export async function updateUserStateAndBody(userId, state, body) {
  const result = await query(
    'UPDATE users SET state = $1, body = $2 WHERE id = $3 RETURNING id, state, body',
    [state, JSON.stringify(body), userId]
  );
  return result.rows[0] ? rowToUser(result.rows[0]) : null;
}

export async function buildSignUpTokenBody(body) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const placeholderPassword = crypto.randomBytes(64).toString('hex');
  const placeholderHash = await bcrypt.hash(placeholderPassword, 10);
  return {
    bodyWithToken: {
      ...body,
      passwordSetToken: token,
      passwordSetTokenExpiresAt: expiresAt,
      passwordHash: placeholderHash,
    },
    token,
  };
}

export async function findUserByValidPasswordToken(token) {
  if (!token || typeof token !== 'string') return null;
  await ensureSchema();

  const result = await query(
    "SELECT id, state, body FROM users WHERE body->>'passwordSetToken' = $1",
    [token]
  );
  if (result.rows.length === 0) return null;

  const user = rowToUser(result.rows[0]);
  const expiresAt = user.passwordSetTokenExpiresAt;
  if (!expiresAt) return null;
  if (Date.now() > new Date(expiresAt).getTime()) return null;

  return { row: result.rows[0], user };
}
