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

/** Map routes (GPS recorded tracks) per user. Each row is one map route (a list of points). duration_seconds = recording length. */
const CREATE_MAP_ROUTES_TABLE = `
  CREATE TABLE IF NOT EXISTS map_routes (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    location         TEXT,
    points           JSONB NOT NULL DEFAULT '[]',
    duration_seconds INTEGER
  );
`;

/**
 * Ensure the users and map_routes tables exist. Called once when this module is first used.
 * Uses IF NOT EXISTS so it is safe to run on every startup.
 */
let schemaInitialized = false;

/** Add duration_seconds to map_routes if the table exists but the column is missing (e.g. existing DBs). */
const ADD_DURATION_COLUMN = `
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_routes')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_routes' AND column_name = 'duration_seconds') THEN
      ALTER TABLE map_routes ADD COLUMN duration_seconds INTEGER;
    END IF;
  END $$;
`;

/** distance_meters, estimated_steps (6000/h), pace_seconds_per_km — added for existing deployments. */
const ADD_MAP_ROUTE_METRICS_COLUMNS = `
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_routes')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_routes' AND column_name = 'distance_meters') THEN
      ALTER TABLE map_routes ADD COLUMN distance_meters DOUBLE PRECISION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_routes')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_routes' AND column_name = 'estimated_steps') THEN
      ALTER TABLE map_routes ADD COLUMN estimated_steps INTEGER;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_routes')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_routes' AND column_name = 'pace_seconds_per_km') THEN
      ALTER TABLE map_routes ADD COLUMN pace_seconds_per_km DOUBLE PRECISION;
    END IF;
  END $$;
`;

/** pace_seconds_per_mi — preferred; migrate from pace_seconds_per_km where present. */
const ADD_PACE_SECONDS_PER_MI = `
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_routes')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_routes' AND column_name = 'pace_seconds_per_mi') THEN
      ALTER TABLE map_routes ADD COLUMN pace_seconds_per_mi DOUBLE PRECISION;
    END IF;
  END $$;
`;

/** Convert legacy km-based pace to seconds per mile (same duration / distance in miles). */
const MIGRATE_PACE_KM_TO_MI = `
  UPDATE map_routes
  SET pace_seconds_per_mi = pace_seconds_per_km * (1609.344 / 1000.0)
  WHERE pace_seconds_per_mi IS NULL
    AND pace_seconds_per_km IS NOT NULL;
`;

export async function ensureSchema() {
  if (schemaInitialized) return;
  const client = await pool.connect();
  try {
    await client.query(CREATE_USERS_TABLE);
    await client.query(CREATE_MAP_ROUTES_TABLE);
    await client.query(ADD_DURATION_COLUMN);
    await client.query(ADD_MAP_ROUTE_METRICS_COLUMNS);
    await client.query(ADD_PACE_SECONDS_PER_MI);
    await client.query(MIGRATE_PACE_KM_TO_MI);
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
