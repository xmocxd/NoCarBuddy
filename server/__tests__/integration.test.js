// Runs when DATABASE_URL, TEST_DATABASE_URL, or PG* (see hasDb) is set — requires a reachable DB.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createApp } from '../app.js';
import { ensureSchema, query, pool } from '../db.js';
import { computeRouteMetrics } from '../routeMetrics.js';

const hasDb = Boolean(
  (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) ||
    (process.env.TEST_DATABASE_URL && process.env.TEST_DATABASE_URL.trim()) ||
    (process.env.PGUSER && process.env.PGDATABASE)
);

const dbDescribe = hasDb ? describe : describe.skip;

dbDescribe('User-facing API (PostgreSQL)', () => {
  let app;
  let userAId;
  let userBId;
  const password = 'jest-test-password-123';
  const emailA = `jest-a-${Date.now()}@example.com`;
  const emailB = `jest-b-${Date.now()}@example.com`;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-integration';
    await ensureSchema();
    app = createApp();

    const hash = await bcrypt.hash(password, 8);
    const a = await query(
      `INSERT INTO users (state, body) VALUES ('active', $1::jsonb) RETURNING id`,
      [JSON.stringify({ email: emailA, passwordHash: hash, firstName: 'Alpha' })]
    );
    userAId = a.rows[0].id;

    const b = await query(
      `INSERT INTO users (state, body) VALUES ('active', $1::jsonb) RETURNING id`,
      [JSON.stringify({ email: emailB, passwordHash: hash, firstName: 'Beta' })]
    );
    userBId = b.rows[0].id;
  });

  afterAll(async () => {
    if (userAId != null) {
      await query('DELETE FROM map_routes WHERE user_id = $1', [userAId]);
      await query('DELETE FROM users WHERE id = $1', [userAId]);
    }
    if (userBId != null) {
      await query('DELETE FROM map_routes WHERE user_id = $1', [userBId]);
      await query('DELETE FROM users WHERE id = $1', [userBId]);
    }
  });

  function agentForUserA() {
    const agent = request.agent(app);
    return agent.post('/api/users/login').send({ email: emailA, password }).then(() => agent);
  }

  function agentForUserB() {
    const agent = request.agent(app);
    return agent.post('/api/users/login').send({ email: emailB, password }).then(() => agent);
  }

  describe('POST /api/users (sign up)', () => {
    let signUpUserId;
    const signUpEmail = `jest-signup-${Date.now()}@example.com`;

    afterAll(async () => {
      if (signUpUserId != null) {
        await query('DELETE FROM map_routes WHERE user_id = $1', [signUpUserId]);
        await query('DELETE FROM users WHERE id = $1', [signUpUserId]);
      }
    });

    it('creates user without inserting a sample map route', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          email: signUpEmail,
          firstName: 'SignUp',
          lastName: 'Test',
          state: 'pending',
        })
        .expect(200);
      signUpUserId = res.body.id;
      expect(signUpUserId).toBeDefined();

      const count = await query('SELECT COUNT(*)::int AS c FROM map_routes WHERE user_id = $1', [signUpUserId]);
      expect(count.rows[0].c).toBe(0);
    });
  });

  describe('POST /api/users/login', () => {
    it('returns 401 for wrong password', async () => {
      await request(app)
        .post('/api/users/login')
        .send({ email: emailA, password: 'wrong-password' })
        .expect(401);
    });

    it('returns 401 for unknown email', async () => {
      await request(app)
        .post('/api/users/login')
        .send({ email: 'nobody@example.com', password })
        .expect(401);
    });

    it('returns 200 and sets cookie on success', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: emailA, password })
        .expect(200);
      expect(res.body.message).toMatch(/success/i);
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('GET /api/users/me', () => {
    it('returns profile without password fields after login', async () => {
      const agent = await agentForUserA();
      const me = await agent.get('/api/users/me').expect(200);
      expect(me.body.email).toBe(emailA);
      expect(me.body.firstName).toBe('Alpha');
      expect(me.body.passwordHash).toBeUndefined();
      expect(me.body.passwordSetToken).toBeUndefined();
    });

    it('returns 404 when user id in JWT no longer exists', async () => {
      const orphanToken = jwt.sign(
        { userType: 'user', userId: 999999999, email: 'ghost@example.com', firstName: '' },
        process.env.JWT_SECRET
      );
      await request(app)
        .get('/api/users/me')
        .set('Cookie', `jwt=${orphanToken}`)
        .expect(404);
    });
  });

  describe('POST /api/users/logout', () => {
    it('clears session so GET /me returns 401', async () => {
      const agent = await agentForUserA();
      await agent.get('/api/users/me').expect(200);
      await agent.post('/api/users/logout').expect(200);
      await agent.get('/api/users/me').expect(401);
    });
  });

  describe('Map routes CRUD', () => {
    let routeId;

    it('GET /api/map-routes returns an array (may be empty)', async () => {
      const agent = await agentForUserA();
      const res = await agent.get('/api/map-routes').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST returns 400 when name is missing or blank', async () => {
      const agent = await agentForUserA();
      await agent.post('/api/map-routes').send({ name: '' }).expect(400);
      await agent.post('/api/map-routes').send({}).expect(400);
    });

    it('POST creates a route and GET by id returns it', async () => {
      const agent = await agentForUserA();
      const created = await agent
        .post('/api/map-routes')
        .send({
          name: 'Integration route',
          recordedAt: new Date().toISOString(),
          points: [],
          durationSeconds: null,
        })
        .expect(201);
      routeId = created.body.id;
      expect(created.body.name).toBe('Integration route');
      expect(created.body.points).toEqual([]);
      expect(created.body.location).toBeUndefined();

      const one = await agent.get(`/api/map-routes/${routeId}`).expect(200);
      expect(one.body.id).toBe(routeId);
      expect(one.body.name).toBe('Integration route');
    });

    it('PATCH /points appends a coordinate', async () => {
      const agent = await agentForUserA();
      const patch = await agent
        .patch(`/api/map-routes/${routeId}/points`)
        .send({ lat: 40.7128, lng: -74.006 })
        .expect(200);
      expect(patch.body.points).toHaveLength(1);
      expect(patch.body.points[0].lat).toBe(40.7128);

      await agent
        .patch(`/api/map-routes/${routeId}/points`)
        .send({ lat: 40.713, lng: -74.0061 })
        .expect(200);

      const route = await agent.get(`/api/map-routes/${routeId}`).expect(200);
      expect(route.body.points.length).toBe(2);
    });

    it('PATCH /points returns 400 when lat/lng invalid', async () => {
      const agent = await agentForUserA();
      await agent.patch(`/api/map-routes/${routeId}/points`).send({}).expect(400);
    });

    it('PATCH /points returns 404 for another user route', async () => {
      const agentB = await agentForUserB();
      await agentB.patch(`/api/map-routes/${routeId}/points`).send({ lat: 1, lng: 2 }).expect(404);
    });

    it('PATCH /:id with durationSeconds computes metrics', async () => {
      const agent = await agentForUserA();
      const updated = await agent
        .patch(`/api/map-routes/${routeId}`)
        .send({ durationSeconds: 3600, name: 'Renamed on patch' })
        .expect(200);
      expect(updated.body.durationSeconds).toBe(3600);
      expect(updated.body.name).toBe('Renamed on patch');
      expect(updated.body.distanceMeters).toBeGreaterThan(0);
      const pts = [
        { lat: 40.7128, lng: -74.006 },
        { lat: 40.713, lng: -74.0061 },
      ];
      expect(updated.body.estimatedSteps).toBe(computeRouteMetrics(pts, 3600).estimatedSteps);
      expect(updated.body.paceSecondsPerMi).not.toBeNull();
    });

    it('PATCH /:id returns 400 when neither duration nor name provided', async () => {
      const agent = await agentForUserA();
      await agent.patch(`/api/map-routes/${routeId}`).send({}).expect(400);
    });

    it('PUT /:id updates name only', async () => {
      const agent = await agentForUserA();
      const res = await agent.put(`/api/map-routes/${routeId}`).send({ name: 'Dashboard edit name' }).expect(200);
      expect(res.body.name).toBe('Dashboard edit name');
    });

    it('PUT returns 400 when name empty', async () => {
      const agent = await agentForUserA();
      await agent.put(`/api/map-routes/${routeId}`).send({ name: '' }).expect(400);
    });

    it('GET /:id returns 404 for other user', async () => {
      const agentB = await agentForUserB();
      await agentB.get(`/api/map-routes/${routeId}`).expect(404);
    });

    it('DELETE /:id removes route', async () => {
      const agent = await agentForUserA();
      await agent.delete(`/api/map-routes/${routeId}`).expect(204);
      await agent.get(`/api/map-routes/${routeId}`).expect(404);
    });

    it('DELETE returns 404 for unknown id', async () => {
      const agent = await agentForUserA();
      await agent.delete('/api/map-routes/999999999').expect(404);
    });
  });

  describe('POST /api/set-password', () => {
    let setPasswordUserId;
    const setPwEmail = `jest-setpw-${Date.now()}@example.com`;
    const rawToken = `token-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newPassword = 'brand-new-password-456';

    beforeAll(async () => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const placeholder = await bcrypt.hash('placeholder', 8);
      const ins = await query(
        `INSERT INTO users (state, body) VALUES ('pending', $1::jsonb) RETURNING id`,
        [
          JSON.stringify({
            email: setPwEmail,
            firstName: 'SetPw',
            passwordHash: placeholder,
            passwordSetToken: rawToken,
            passwordSetTokenExpiresAt: expiresAt,
          }),
        ]
      );
      setPasswordUserId = ins.rows[0].id;
    });

    afterAll(async () => {
      if (setPasswordUserId != null) {
        await query('DELETE FROM map_routes WHERE user_id = $1', [setPasswordUserId]);
        await query('DELETE FROM users WHERE id = $1', [setPasswordUserId]);
      }
    });

    it('GET /api/set-password/validate/:token returns valid false for unknown token', async () => {
      const res = await request(app).get('/api/set-password/validate/no-such-token-xyz').expect(200);
      expect(res.body.valid).toBe(false);
    });

    it('GET validate returns valid true and email for good token', async () => {
      const res = await request(app).get(`/api/set-password/validate/${rawToken}`).expect(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.email).toBe(setPwEmail);
    });

    it('POST sets password and user can log in', async () => {
      const res = await request(app)
        .post('/api/set-password')
        .send({ token: rawToken, password: newPassword })
        .expect(200);
      expect(res.body.success).toBe(true);

      await request(app).post('/api/users/login').send({ email: setPwEmail, password: newPassword }).expect(200);
    });

    it('POST returns 400 when token already used', async () => {
      await request(app)
        .post('/api/set-password')
        .send({ token: rawToken, password: 'another' })
        .expect(400);
    });
  });

  afterAll(async () => {
    await pool.end();
  });
});
