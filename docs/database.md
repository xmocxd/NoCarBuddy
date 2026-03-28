# Database implementation

NoCarBuddy stores user data in **PostgreSQL**.

## Overview

- **Engine:** PostgreSQL, accessed via the Node.js `pg` client.
- **Connection:** A single connection pool (`pg.Pool`) in `server/db.js` is used for all database access. The pool is reused across requests and avoids opening a new connection per request.
- **Schema:** Two tables, `users` and `map_routes`. Both are created automatically when the app first uses the database (`CREATE TABLE IF NOT EXISTS`), so no manual migration or SQL script is required to run the app.

## Configuration

Connection settings come from the environment. See [config-env.md](config-env.md) for full setup.

- **Option 1:** Set `DATABASE_URL` (e.g. `postgresql://user:password@localhost:5432/nocarbuddy`).
- **Option 2:** Set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`; the server builds the connection config from these if `DATABASE_URL` is not set.

Default database name is `nocarbuddy` when using the individual vars. Create the database if needed (e.g. `createdb nocarbuddy`).

## Schema

### Table: `users`

| Column  | Type         | Description |
|---------|--------------|-------------|
| `id`    | SERIAL       | Primary key; auto-incremented integer. |
| `state` | VARCHAR(50)  | User state (e.g. `pending`, `confirmed`). Not null, default `'pending'`. Stored as a real column so it can be indexed and filtered. |
| `body`  | JSONB        | All other user fields (name, email, etc.) as a JSON object. Not null, default `'{}'`. Allows flexible request-body shape without schema changes. |

Equivalent SQL:

```sql
CREATE TABLE IF NOT EXISTS users (
  id    SERIAL PRIMARY KEY,
  state VARCHAR(50) NOT NULL DEFAULT 'pending',
  body  JSONB NOT NULL DEFAULT '{}'
);
```

This table is created in code when `ensureSchema()` runs (see below); there is no separate migration file to run.

### Table: `map_routes`

Stores GPS-recorded map routes (tracks) per user.

| Column       | Type         | Description |
|--------------|--------------|-------------|
| `id`         | SERIAL       | Primary key. |
| `user_id`    | INTEGER      | Foreign key to `users(id)`. Not null. |
| `name`       | VARCHAR(255) | Display name for the map route. Not null. |
| `recorded_at`| TIMESTAMPTZ  | When the map route was recorded. Not null, default `now()`. |
| `location`   | TEXT         | Legacy column; not used by the app (always stored as empty). |
| `points`     | JSONB        | Array of points (e.g. `[{ lat, lng }]`). Not null, default `'[]'`. |

The table is created in `server/db.js` together with `users` when `ensureSchema()` runs. Map route CRUD is handled by `server/routes/mapRoutes.js` and mounted at `/map-routes`.

## Code layout

### `server/db.js`

- **Single place** for PostgreSQL configuration and schema.
- **Exports:**
  - `pool` – the shared `pg.Pool`. Use this or the `query` helper for all DB access.
  - `query(text, params)` – runs a parameterized query (`$1`, `$2`, …) via the pool. Use it to avoid SQL injection and to share the same pool.
  - `ensureSchema()` – creates the `users` and `map_routes` tables if they do not exist (`CREATE TABLE IF NOT EXISTS`). Idempotent; safe to call on every request (no-op after the first successful run).
- Schema is applied on first use by the routes that need the database, not at server startup.

### `server/routes/users.js`

All user CRUD goes through the database:

- **GET /** – List users. `SELECT id, state, body FROM users ORDER BY id`; each row is mapped to the API shape (see below).
- **POST /** – Create user. Inserts `state` and `body` (remaining request-body fields); returns the new row with generated `id`.
- **GET /:id** – One user by `id`; 404 if not found.
- **PUT /:id** – Update user; `req.body.id` must match `:id`. Updates `state` and `body`; 404 if no row.
- **DELETE /:id** – Delete user; returns the deleted row; 404 if not found.

Each handler calls `await ensureSchema()` then uses `query()` (or the pool) for database access.

## API shape vs. database rows

A database row is stored as `(id, state, body)`. The API exposes a single user object as:

```json
{ "id": 1, "state": "pending", "name": "Jane", "email": "jane@example.com" }
```

So `id` and `state` are first-class columns; everything else from the request (e.g. `name`, `email`) lives in the `body` JSONB column. When reading, the server merges them into one object: `{ id, state, ...body }`. The helper that does this in the routes is `rowToUser(row)`.

## Data flow

```
Client  →  Express (server/routes/users.js)  →  server/db.js (pool / query)  →  PostgreSQL
```

All user persistence goes through the user routes and the shared pool; there is no in-memory or file-based user store.

## Dependencies

- **pg** – PostgreSQL client; provides `Pool` and the ability to run parameterized queries. Declared in `server/package.json`.

Admin login and JWT auth are separate from this database; admin credentials are not stored in PostgreSQL in the current implementation.
