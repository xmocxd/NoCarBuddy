import { query } from '../db.js';
import { computeRouteMetrics } from '../routeMetrics.js';

export const MAP_ROUTE_SELECT =
  'id, user_id, name, recorded_at, location, points, duration_seconds, distance_meters, estimated_steps, pace_seconds_per_mi, pace_seconds_per_km';

export function mapRouteRow(row) {
  let paceSecondsPerMi =
    row.pace_seconds_per_mi != null ? Number(row.pace_seconds_per_mi) : null;
  if (
    paceSecondsPerMi == null &&
    row.pace_seconds_per_km != null &&
    Number.isFinite(Number(row.pace_seconds_per_km))
  ) {
    paceSecondsPerMi = Number(row.pace_seconds_per_km) * (1609.344 / 1000);
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    recordedAt: row.recorded_at,
    points: row.points || [],
    durationSeconds: row.duration_seconds ?? null,
    distanceMeters: row.distance_meters != null ? Number(row.distance_meters) : null,
    estimatedSteps: row.estimated_steps != null ? Number(row.estimated_steps) : null,
    paceSecondsPerMi,
  };
}

export async function listMapRoutesForUser(userId) {
  const result = await query(
    `SELECT ${MAP_ROUTE_SELECT} FROM map_routes WHERE user_id = $1 ORDER BY recorded_at DESC`,
    [userId]
  );
  return result.rows.map(mapRouteRow);
}

export async function getMapRouteByIdForUser(routeId, userId) {
  const result = await query(
    `SELECT ${MAP_ROUTE_SELECT} FROM map_routes WHERE id = $1 AND user_id = $2`,
    [routeId, userId]
  );
  return result.rows[0] ? mapRouteRow(result.rows[0]) : null;
}

export async function createMapRoute(userId, { name, recordedAtVal, locationVal, pointsVal, durationVal }) {
  const result = await query(
    `INSERT INTO map_routes (user_id, name, recorded_at, location, points, duration_seconds)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${MAP_ROUTE_SELECT}`,
    [userId, name.trim(), recordedAtVal, locationVal, JSON.stringify(pointsVal), durationVal]
  );
  return mapRouteRow(result.rows[0]);
}

export async function getPointsForRoute(routeId, userId) {
  const result = await query('SELECT id, points FROM map_routes WHERE id = $1 AND user_id = $2', [
    routeId,
    userId,
  ]);
  return result.rows[0] || null;
}

export async function updateMapRoutePoints(routeId, userId, pointsJson) {
  await query('UPDATE map_routes SET points = $1 WHERE id = $2 AND user_id = $3', [
    pointsJson,
    routeId,
    userId,
  ]);
}

export async function patchMapRouteDurationAndName(routeId, userId, { durationVal, nameVal }) {
  const updates = [];
  const values = [];
  let i = 1;
  if (durationVal !== null) {
    const sel = await query('SELECT points FROM map_routes WHERE id = $1 AND user_id = $2', [
      routeId,
      userId,
    ]);
    if (sel.rows.length === 0) return null;
    const pts = sel.rows[0].points || [];
    const metrics = computeRouteMetrics(pts, durationVal);
    updates.push(`duration_seconds = $${i++}`);
    values.push(durationVal);
    updates.push(`distance_meters = $${i++}`);
    values.push(metrics.distanceMeters);
    updates.push(`estimated_steps = $${i++}`);
    values.push(metrics.estimatedSteps);
    updates.push(`pace_seconds_per_mi = $${i++}`);
    values.push(metrics.paceSecondsPerMi);
  }
  if (nameVal !== null) {
    updates.push(`name = $${i++}`);
    values.push(nameVal);
  }
  if (updates.length === 0) {
    return { error: 'no_updates' };
  }
  values.push(routeId, userId);
  const result = await query(
    `UPDATE map_routes SET ${updates.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING ${MAP_ROUTE_SELECT}`,
    values
  );
  return result.rows[0] ? mapRouteRow(result.rows[0]) : null;
}

export async function updateMapRouteNameOnly(routeId, userId, name) {
  const result = await query(
    `UPDATE map_routes SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING ${MAP_ROUTE_SELECT}`,
    [name.trim(), routeId, userId]
  );
  return result.rows[0] ? mapRouteRow(result.rows[0]) : null;
}

export async function deleteMapRouteByIdForUser(routeId, userId) {
  const result = await query('DELETE FROM map_routes WHERE id = $1 AND user_id = $2 RETURNING id', [
    routeId,
    userId,
  ]);
  return result.rows.length > 0;
}
