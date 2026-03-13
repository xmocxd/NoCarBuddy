/**
 * Database module: single place for PostgreSQL connection and schema.
 *
 * We use a connection pool (pg.Pool) so the server can handle many concurrent
 * requests without opening a new connection per request. The pool reuses
 * connections and limits total open connections.
 *
 * Config comes from environment: DATABASE_URL or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE.
 * See docs/config-env.md.
 */

import pg from 'pg';

const { Pool } = pg;

// Build connection config: prefer DATABASE_URL; otherwise use individual env vars.
function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || process.env.USER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'nocarbuddy',
  };
}

/** Shared pool used by all routes. Do not create a new Pool elsewhere. */
export const pool = new Pool(getPoolConfig());

/**
 * SQL for the users table. We run this on load so the app works without a separate migration.
 * - id: auto-increment primary key (same as previous in-memory curId behavior).
 * - state: explicit column so we can filter/index (e.g. 'pending', 'confirmed').
 * - body: JSONB holds all other request-body fields (name, email, etc.) for flexibility.
 */
const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id    SERIAL PRIMARY KEY,
    state VARCHAR(50) NOT NULL DEFAULT 'pending',
    body  JSONB NOT NULL DEFAULT '{}'
  );
`;

/**
 * Ensure the users table exists. Called once when this module is first used.
 * Uses IF NOT EXISTS so it is safe to run on every startup.
 */
let schemaInitialized = false;

export async function ensureSchema() {
  if (schemaInitialized) return;
  const client = await pool.connect();
  try {
    await client.query(CREATE_USERS_TABLE);
    schemaInitialized = true;
  } finally {
    client.release();
  }
}

/**
 * Run a parameterized query using the shared pool.
 * Use this (or pool.query) for all DB access so we use the same pool and avoid SQL injection.
 *
 * @param {string} text - SQL with $1, $2, ... placeholders
 * @param {unknown[]} [params] - Values for the placeholders
 * @returns {Promise<pg.QueryResult>} - result.rows, result.rowCount, etc.
 */
export async function query(text, params = []) {
  return pool.query(text, params);
}

export default { pool, query, ensureSchema };
