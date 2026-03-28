/**
 * Route metrics from GPS points and elapsed time: path length (Haversine),
 * estimated steps at 6000 steps/hour, and pace (seconds per mile).
 */

const EARTH_RADIUS_M = 6371000;
const METERS_PER_MILE = 1609.344;
const STEPS_PER_HOUR = 6000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in meters between two WGS84 lat/lng points. */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * @param {Array<{ lat: number, lng: number }>} points
 * @param {number} durationSeconds
 * @returns {{ distanceMeters: number, estimatedSteps: number, paceSecondsPerMi: number | null }}
 */
export function computeRouteMetrics(points, durationSeconds) {
  const dur = Number(durationSeconds);
  const safeDur = Number.isFinite(dur) && dur >= 0 ? dur : 0;

  let distanceMeters = 0;
  if (Array.isArray(points) && points.length >= 2) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const la = Number(a?.lat);
      const ln = Number(a?.lng);
      const lb = Number(b?.lat);
      const l2 = Number(b?.lng);
      if (![la, ln, lb, l2].every((x) => Number.isFinite(x))) continue;
      distanceMeters += haversineMeters(la, ln, lb, l2);
    }
  }

  const estimatedSteps = Math.round((safeDur / 3600) * STEPS_PER_HOUR);

  const distanceMiles = distanceMeters / METERS_PER_MILE;
  let paceSecondsPerMi = null;
  if (safeDur > 0 && distanceMiles > 0) {
    paceSecondsPerMi = safeDur / distanceMiles;
  }

  return {
    distanceMeters,
    estimatedSteps,
    paceSecondsPerMi,
  };
}

export { STEPS_PER_HOUR };
