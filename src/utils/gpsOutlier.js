import { haversineMeters } from "./routeMetrics.js";

/** Reject a candidate if distance from last accepted exceeds this × mean prior segment length. */
export const DEFAULT_GPS_OUTLIER_MULTIPLIER = 5;

/**
 * @param {{ lat: number, lng: number }} candidate
 * @param {{ lastAccepted: { lat: number, lng: number } | null, segmentDistSumMeters: number, segmentCount: number }} state
 * @param {number} [multiplier]
 */
export function shouldAcceptGpsCandidate(candidate, state, multiplier = DEFAULT_GPS_OUTLIER_MULTIPLIER) {
    const { lastAccepted, segmentDistSumMeters, segmentCount } = state;
    if (lastAccepted == null) return true;
    if (segmentCount === 0) return true;
    const candidateMeters = haversineMeters(lastAccepted.lat, lastAccepted.lng, candidate.lat, candidate.lng);
    const avg = segmentDistSumMeters / segmentCount;
    if (!Number.isFinite(avg) || avg <= 0) return true;
    return candidateMeters <= multiplier * avg;
}

/**
 * Updates running segment sum/count after accepting a point (same rules as RecordRoutePage).
 * @param {{ lat: number, lng: number }} candidate
 * @param {{ lastAccepted: { lat: number, lng: number } | null, segmentDistSumMeters: number, segmentCount: number }} state
 */
export function acceptGpsPoint(candidate, state) {
    const { lastAccepted, segmentDistSumMeters, segmentCount } = state;
    if (lastAccepted == null) {
        return {
            lastAccepted: { lat: candidate.lat, lng: candidate.lng },
            segmentDistSumMeters: 0,
            segmentCount: 0,
        };
    }
    const seg = haversineMeters(lastAccepted.lat, lastAccepted.lng, candidate.lat, candidate.lng);
    return {
        lastAccepted: { lat: candidate.lat, lng: candidate.lng },
        segmentDistSumMeters: segmentDistSumMeters + seg,
        segmentCount: segmentCount + 1,
    };
}
