import { haversineMeters } from "./routeMetrics.js";

/** Reject a candidate if distance from last accepted exceeds this × mean prior segment length. */
export const DEFAULT_GPS_OUTLIER_MULTIPLIER = 5;

/** Outlier / jump rejection applies only after this many accepted GPS points (earlier points always kept). */
export const MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK = 10;

/** Cumulative outlier rejections above this value trigger a cooldown (e.g. 11th rejection when threshold is 10). */
export const GPS_OUTLIER_REJECTION_THRESHOLD = 10;

/** After a cooldown triggers, accept this many points with outlier checks fully disabled. */
export const GPS_OUTLIER_COOLDOWN_ACCEPT_COUNT = 10;

/**
 * @param {number} rejectedCount
 * @param {number} cooldownAcceptsRemaining
 */
export function nextOutlierRejectionCounters(rejectedCount, cooldownAcceptsRemaining) {
    const nextRejected = rejectedCount + 1;
    if (nextRejected > GPS_OUTLIER_REJECTION_THRESHOLD) {
        return { rejectedCount: 0, cooldownAcceptsRemaining: GPS_OUTLIER_COOLDOWN_ACCEPT_COUNT };
    }
    return { rejectedCount: nextRejected, cooldownAcceptsRemaining };
}

/** @param {number} cooldownAcceptsRemaining */
export function nextCooldownAfterAcceptedPoint(cooldownAcceptsRemaining) {
    if (cooldownAcceptsRemaining <= 0) return 0;
    return cooldownAcceptsRemaining - 1;
}

/**
 * @param {{ lat: number, lng: number }} candidate
 * @param {{ lastAccepted: { lat: number, lng: number } | null, segmentDistSumMeters: number, segmentCount: number }} state
 * @param {number} [multiplier]
 */
export function shouldAcceptGpsCandidate(candidate, state, multiplier = DEFAULT_GPS_OUTLIER_MULTIPLIER) {
    const { lastAccepted, segmentDistSumMeters, segmentCount } = state;
    if (lastAccepted == null) return true;
    const acceptedPointCount = segmentCount + 1;
    if (acceptedPointCount < MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK) return true;
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
