import pg from 'pg';

const { Pool } = pg;

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

export const pool = new Pool(getPoolConfig());

const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id    SERIAL PRIMARY KEY,
    state VARCHAR(50) NOT NULL DEFAULT 'pending',
    body  JSONB NOT NULL DEFAULT '{}'
  );
`;

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

let schemaInitialized = false;

const ADD_DURATION_COLUMN = `
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_routes')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_routes' AND column_name = 'duration_seconds') THEN
      ALTER TABLE map_routes ADD COLUMN duration_seconds INTEGER;
    END IF;
  END $$;
`;

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

const ADD_PACE_SECONDS_PER_MI = `
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_routes')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_routes' AND column_name = 'pace_seconds_per_mi') THEN
      ALTER TABLE map_routes ADD COLUMN pace_seconds_per_mi DOUBLE PRECISION;
    END IF;
  END $$;
`;

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

export async function query(text, params = []) {
  return pool.query(text, params);
}

export default { pool, query, ensureSchema };
