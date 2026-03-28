/**
 * Same route metrics as server/routeMetrics.js (keep in sync for live UI vs saved values).
 */

const EARTH_RADIUS_M = 6371000;
/** International mile in meters (exact definition). */
export const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;
export const STEPS_PER_HOUR = 6000;

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

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

/** e.g. "1.25 mi" or "240 ft" for short distances */
export function formatDistance(meters) {
    if (meters == null || !Number.isFinite(meters) || meters < 0) return "—";
    const miles = meters / METERS_PER_MILE;
    if (miles >= 0.1) return `${miles.toFixed(2)} mi`;
    if (meters === 0) return "0.00 mi";
    return `${Math.round(meters * FEET_PER_METER)} ft`;
}

/** Pace as min:sec per mile, e.g. "12:04 /mi", or "—" */
export function formatPaceSecondsPerMi(paceSecondsPerMi) {
    if (paceSecondsPerMi == null || !Number.isFinite(paceSecondsPerMi) || paceSecondsPerMi <= 0) return "—";
    const totalSec = Math.round(paceSecondsPerMi);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")} /mi`;
}
