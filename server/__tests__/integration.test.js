/**
 * Integration tests against PostgreSQL. Skipped when DATABASE_URL is unset.
 * Run in WSL with a local DB, e.g.:
 *   export DATABASE_URL=postgres://user:pass@localhost:5432/nocarbuddy
 *   npm test
 */
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createApp } from '../app.js';
import { ensureSchema, query } from '../db.js';

const hasDb = Boolean(
  (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) ||
    (process.env.TEST_DATABASE_URL && process.env.TEST_DATABASE_URL.trim())
);

const dbDescribe = hasDb ? describe : describe.skip;

dbDescribe('API with PostgreSQL', () => {
  let app;
  let userId;
  const email = `jest-${Date.now()}@example.com`;
  const password = 'jest-test-password-123';

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-integration';
    await ensureSchema();
    app = createApp();
    const hash = await bcrypt.hash(password, 8);
    const result = await query(
      `INSERT INTO users (state, body) VALUES ('active', $1::jsonb) RETURNING id`,
      [JSON.stringify({ email, passwordHash: hash, firstName: 'Jest' })]
    );
    userId = result.rows[0].id;
  });

  afterAll(async () => {
    if (userId != null) {
      await query('DELETE FROM map_routes WHERE user_id = $1', [userId]);
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  it('logs in and returns profile from GET /api/users/me', async () => {
    const agent = request.agent(app);
    await agent.post('/api/users/login').send({ email, password }).expect(200);
    const me = await agent.get('/api/users/me').expect(200);
    expect(me.body.email).toBe(email);
    expect(me.body.firstName).toBe('Jest');
  });

  it('creates a map route for the logged-in user', async () => {
    const agent = request.agent(app);
    await agent.post('/api/users/login').send({ email, password });
    const res = await agent
      .post('/api/map-routes')
      .send({
        name: 'Jest test route',
        recordedAt: new Date().toISOString(),
        points: [],
        durationSeconds: null,
      })
      .expect(201);
    expect(res.body.name).toBe('Jest test route');
    expect(res.body.id).toBeDefined();
  });
});
