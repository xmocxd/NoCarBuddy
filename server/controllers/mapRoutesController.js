import { ensureSchema } from '../db.js';
import {
  listMapRoutesForUser,
  getMapRouteByIdForUser,
  createMapRoute,
  getPointsForRoute,
  updateMapRoutePoints,
  patchMapRouteDurationAndName,
  updateMapRouteNameOnly,
  deleteMapRouteByIdForUser,
} from '../models/mapRoute.js';

export async function list(req, res, next) {
  await ensureSchema();
  try {
    const mapRoutes = await listMapRoutesForUser(req.user.userId);
    res.json(mapRoutes);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  await ensureSchema();
  try {
    const route = await getMapRouteByIdForUser(req.params.id, req.user.userId);
    if (!route) {
      return res.status(404).json({ error: 'Map route not found' });
    }
    res.json(route);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  const { name, recordedAt, points, durationSeconds } = req.body || {};
  if (name == null || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  await ensureSchema();
  try {
    const recordedAtVal = recordedAt ? new Date(recordedAt) : new Date();
    const locationVal = '';
    const pointsVal = Array.isArray(points) ? points : [];
    const durationVal =
      durationSeconds != null && Number.isInteger(Number(durationSeconds))
        ? Number(durationSeconds)
        : null;

    const row = await createMapRoute(req.user.userId, {
      name,
      recordedAtVal,
      locationVal,
      pointsVal,
      durationVal,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

export async function patchPoints(req, res, next) {
  const routeId = req.params.id;
  const { lat, lng } = req.body || {};
  const latNum = lat != null ? Number(lat) : NaN;
  const lngNum = lng != null ? Number(lng) : NaN;
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return res.status(400).json({ error: 'lat and lng are required numbers' });
  }

  await ensureSchema();
  try {
    const row = await getPointsForRoute(routeId, req.user.userId);
    if (!row) {
      return res.status(404).json({ error: 'Map route not found' });
    }
    const currentPoints = row.points || [];
    const updatedPoints = [...currentPoints, { lat: latNum, lng: lngNum }];
    await updateMapRoutePoints(routeId, req.user.userId, JSON.stringify(updatedPoints));
    res.json({ points: updatedPoints });
  } catch (err) {
    next(err);
  }
}

export async function patch(req, res, next) {
  const routeId = req.params.id;
  const { durationSeconds, name } = req.body || {};
  const durationVal =
    durationSeconds != null && Number.isInteger(Number(durationSeconds))
      ? Number(durationSeconds)
      : null;
  const nameVal =
    name != null && typeof name === 'string' && name.trim() !== '' ? name.trim() : null;

  await ensureSchema();
  try {
    const result = await patchMapRouteDurationAndName(routeId, req.user.userId, {
      durationVal,
      nameVal,
    });
    if (result?.error === 'no_updates') {
      return res.status(400).json({ error: 'At least one of durationSeconds or name is required' });
    }
    if (!result) {
      return res.status(404).json({ error: 'Map route not found' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function put(req, res, next) {
  const { name } = req.body || {};
  if (name == null || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  await ensureSchema();
  try {
    const row = await updateMapRouteNameOnly(req.params.id, req.user.userId, name);
    if (!row) {
      return res.status(404).json({ error: 'Map route not found' });
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  await ensureSchema();
  try {
    const ok = await deleteMapRouteByIdForUser(req.params.id, req.user.userId);
    if (!ok) {
      return res.status(404).json({ error: 'Map route not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
