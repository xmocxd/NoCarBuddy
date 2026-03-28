/**
 * HTTP smoke tests: no PostgreSQL required (routes return before DB or without hitting DB).
 */
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { createApp } from '../app.js';

let app;

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  app = createApp();
});

describe('GET /api/message', () => {
  it('returns Hello World!', async () => {
    const res = await request(app).get('/api/message').expect(200);
    expect(res.text).toBe('Hello World!');
  });
});

describe('POST /api/users/login', () => {
  it('returns 400 when email or password is missing', async () => {
    const res = await request(app).post('/api/users/login').send({}).expect(400);
    expect(res.body.error).toMatch(/required/i);
  });
});

describe('GET /api/users/me', () => {
  it('returns 401 without a session cookie', async () => {
    await request(app).get('/api/users/me').expect(401);
  });
});

describe('POST /api/map-routes', () => {
  it('returns 401 without authentication', async () => {
    await request(app)
      .post('/api/map-routes')
      .send({ name: 'Route' })
      .expect(401);
  });
});

describe('GET /api/map-routes (unauthenticated)', () => {
  it('returns 401 without a session cookie', async () => {
    await request(app).get('/api/map-routes').expect(401);
  });

  it('returns 401 for GET /api/map-routes/:id', async () => {
    await request(app).get('/api/map-routes/1').expect(401);
  });
});

describe('JWT edge cases (no DB)', () => {
  it('returns 403 when cookie is not a valid JWT', async () => {
    await request(app).get('/api/users/me').set('Cookie', 'jwt=not-a-valid-jwt').expect(403);
  });

  it('returns 403 for admin JWT on GET /api/users/me (not a user session)', async () => {
    const adminToken = jwt.sign({ userName: 'admin' }, process.env.JWT_SECRET);
    await request(app).get('/api/users/me').set('Cookie', `jwt=${adminToken}`).expect(403);
  });

  it('returns 403 for admin JWT on GET /api/map-routes', async () => {
    const adminToken = jwt.sign({ userName: 'admin' }, process.env.JWT_SECRET);
    await request(app).get('/api/map-routes').set('Cookie', `jwt=${adminToken}`).expect(403);
  });
});
