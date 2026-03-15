/**
 * Map routes API: CRUD for map routes (GPS recorded tracks) belonging to the logged-in user.
 * All endpoints require a valid user JWT (not admin). Map routes are scoped by req.user.userId.
 *
 * - GET /map-routes – List all map routes for the current user.
 * - POST /map-routes – Create a new map route. Body: { name, recordedAt?, location?, points?, durationSeconds? }.
 * - PUT /map-routes/:id – Update a map route's name (only if it belongs to the current user).
 * - DELETE /map-routes/:id – Delete a map route (only if it belongs to the current user).
 */

import express from 'express';
import auth from '../middleware/auth.js';
import { query, ensureSchema } from '../db.js';

const router = express.Router();

/** Require that the request has a valid user session (not admin). */
function requireUser(req, res, next) {
  if (req.user?.userType !== 'user' || req.user?.userId == null) {
    return res.status(403).json({ error: 'Not a user session' });
  }
  next();
}

/** GET /map-routes – List map routes for the current user. */
router.get('/', auth, requireUser, async function (req, res, next) {
  await ensureSchema();
  try {
    const result = await query(
      'SELECT id, user_id, name, recorded_at, location, points, duration_seconds FROM map_routes WHERE user_id = $1 ORDER BY recorded_at DESC',
      [req.user.userId]
    );
    const mapRoutes = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      recordedAt: row.recorded_at,
      location: row.location || '',
      points: row.points || [],
      durationSeconds: row.duration_seconds ?? null,
    }));
    res.json(mapRoutes);
  } catch (err) {
    next(err);
  }
});

/** GET /map-routes/:id – Get a single map route by id. Only allowed if it belongs to the current user. */
router.get('/:id', auth, requireUser, async function (req, res, next) {
  await ensureSchema();
  try {
    const result = await query(
      'SELECT id, user_id, name, recorded_at, location, points, duration_seconds FROM map_routes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map route not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      recordedAt: row.recorded_at,
      location: row.location || '',
      points: row.points || [],
      durationSeconds: row.duration_seconds ?? null,
    });
  } catch (err) {
    next(err);
  }
});

/** POST /map-routes – Create a new map route. Body: name (required), recordedAt (ISO string, optional), location, points, durationSeconds. */
router.post('/', auth, requireUser, async function (req, res, next) {
  const { name, recordedAt, location, points, durationSeconds } = req.body || {};
  if (name == null || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  await ensureSchema();
  try {
    const recordedAtVal = recordedAt ? new Date(recordedAt) : new Date();
    const locationVal = location != null ? String(location) : '';
    const pointsVal = Array.isArray(points) ? points : [];
    const durationVal = durationSeconds != null && Number.isInteger(Number(durationSeconds)) ? Number(durationSeconds) : null;

    const result = await query(
      `INSERT INTO map_routes (user_id, name, recorded_at, location, points, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, name, recorded_at, location, points, duration_seconds`,
      [req.user.userId, name.trim(), recordedAtVal, locationVal, JSON.stringify(pointsVal), durationVal]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      recordedAt: row.recorded_at,
      location: row.location || '',
      points: row.points || [],
      durationSeconds: row.duration_seconds ?? null,
    });
  } catch (err) {
    next(err);
  }
});

/** PATCH /map-routes/:id/points – Append one point to the route. Body: { lat, lng }. */
router.patch('/:id/points', auth, requireUser, async function (req, res, next) {
  const routeId = req.params.id;
  const { lat, lng } = req.body || {};
  const latNum = lat != null ? Number(lat) : NaN;
  const lngNum = lng != null ? Number(lng) : NaN;
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return res.status(400).json({ error: 'lat and lng are required numbers' });
  }

  await ensureSchema();
  try {
    const result = await query(
      'SELECT id, points FROM map_routes WHERE id = $1 AND user_id = $2',
      [routeId, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map route not found' });
    }
    const currentPoints = result.rows[0].points || [];
    const updatedPoints = [...currentPoints, { lat: latNum, lng: lngNum }];
    await query(
      'UPDATE map_routes SET points = $1 WHERE id = $2 AND user_id = $3',
      [JSON.stringify(updatedPoints), routeId, req.user.userId]
    );
    res.json({ points: updatedPoints });
  } catch (err) {
    next(err);
  }
});

/** PATCH /map-routes/:id – Update map route duration and/or name (e.g. when recording stops). Body: { durationSeconds?, name? }. */
router.patch('/:id', auth, requireUser, async function (req, res, next) {
  const routeId = req.params.id;
  const { durationSeconds, name } = req.body || {};
  const durationVal = durationSeconds != null && Number.isInteger(Number(durationSeconds)) ? Number(durationSeconds) : null;
  const nameVal = name != null && typeof name === 'string' && name.trim() !== '' ? name.trim() : null;

  await ensureSchema();
  try {
    const updates = [];
    const values = [];
    let i = 1;
    if (durationVal !== null) {
      updates.push(`duration_seconds = $${i++}`);
      values.push(durationVal);
    }
    if (nameVal !== null) {
      updates.push(`name = $${i++}`);
      values.push(nameVal);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'At least one of durationSeconds or name is required' });
    }
    values.push(routeId, req.user.userId);
    const result = await query(
      `UPDATE map_routes SET ${updates.join(', ')} WHERE id = $${i++} AND user_id = $${i} RETURNING id, user_id, name, recorded_at, location, points, duration_seconds`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map route not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      recordedAt: row.recorded_at,
      location: row.location || '',
      points: row.points || [],
      durationSeconds: row.duration_seconds ?? null,
    });
  } catch (err) {
    next(err);
  }
});

/** PUT /map-routes/:id – Update map route name. Only allowed if the map route belongs to the current user. */
router.put('/:id', auth, requireUser, async function (req, res, next) {
  const { name } = req.body || {};
  if (name == null || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  await ensureSchema();
  try {
    const result = await query(
      'UPDATE map_routes SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id, user_id, name, recorded_at, location, points, duration_seconds',
      [name.trim(), req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map route not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      recordedAt: row.recorded_at,
      location: row.location || '',
      points: row.points || [],
      durationSeconds: row.duration_seconds ?? null,
    });
  } catch (err) {
    next(err);
  }
});

/** DELETE /map-routes/:id – Delete a map route. Only allowed if it belongs to the current user. */
router.delete('/:id', auth, requireUser, async function (req, res, next) {
  await ensureSchema();
  try {
    const result = await query(
      'DELETE FROM map_routes WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Map route not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
