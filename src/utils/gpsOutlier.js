import { haversineMeters } from "./routeMetrics.js";

/** Strict band: drop and enter recovery if distance from last accepted exceeds this × mean segment length. */
export const DEFAULT_GPS_OUTLIER_TRIGGER_MULTIPLIER = 7;

/** Lenient band: while in recovery, accept if distance ≤ this × mean segment length. */
export const DEFAULT_GPS_OUTLIER_RECHECK_MULTIPLIER = 15;

/** Outlier / jump rejection applies only after this many accepted GPS points (earlier points always kept). */
export const MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK = 14;

/**
 * Max recheck failures (drops outside recheck band while in recovery) before the next point is
 * accepted with no distance check. Force-accept triggers when failures exceed this value.
 */
export const GPS_OUTLIER_REJECTION_THRESHOLD = 10;

/**
 * @param {{ lastAccepted: { lat: number, lng: number } | null, segmentDistSumMeters: number, segmentCount: number }} state
 */
export function segmentMeanMeters(state) {
    const { lastAccepted, segmentDistSumMeters, segmentCount } = state;
    if (lastAccepted == null || segmentCount === 0) return null;
    const avg = segmentDistSumMeters / segmentCount;
    return Number.isFinite(avg) && avg > 0 ? avg : null;
}

/**
 * @param {{ lat: number, lng: number }} candidate
 * @param {{ lastAccepted: { lat: number, lng: number } | null, segmentDistSumMeters: number, segmentCount: number }} state
 */
export function distanceFromLastAcceptedMeters(candidate, state) {
    const { lastAccepted } = state;
    if (lastAccepted == null) return 0;
    return haversineMeters(lastAccepted.lat, lastAccepted.lng, candidate.lat, candidate.lng);
}

/**
 * @param {{ lastAccepted: { lat: number, lng: number } | null, segmentDistSumMeters: number, segmentCount: number }} state
 */
export function isBeforeMinAcceptedPointsForOutlierCheck(state) {
    if (state.lastAccepted == null) return true;
    const acceptedPointCount = state.segmentCount + 1;
    return acceptedPointCount < MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK;
}

/**
 * @param {{ lat: number, lng: number }} candidate
 * @param {{ lastAccepted: { lat: number, lng: number } | null, segmentDistSumMeters: number, segmentCount: number }} state
 * @param {number} multiplier
 */
export function isWithinMeanMultiplierBand(candidate, state, multiplier) {
    if (isBeforeMinAcceptedPointsForOutlierCheck(state)) return true;
    const avg = segmentMeanMeters(state);
    if (avg == null) return true;
    return distanceFromLastAcceptedMeters(candidate, state) <= multiplier * avg;
}

/**
 * Normal mode: accept if within trigger band (strict).
 */
export function passesTriggerBand(candidate, state) {
    return isWithinMeanMultiplierBand(candidate, state, DEFAULT_GPS_OUTLIER_TRIGGER_MULTIPLIER);
}

/**
 * Recovery mode: accept if within recheck band (lenient).
 */
export function passesRecheckBand(candidate, state) {
    return isWithinMeanMultiplierBand(candidate, state, DEFAULT_GPS_OUTLIER_RECHECK_MULTIPLIER);
}

/**
 * Whether the candidate is within `multiplier ×` mean segment length (same geometry as trigger/recheck).
 * Default multiplier is the trigger constant; tests may pass other values.
 * @param {{ lat: number, lng: number }} candidate
 * @param {{ lastAccepted: { lat: number, lng: number } | null, segmentDistSumMeters: number, segmentCount: number }} state
 * @param {number} [multiplier]
 */
export function shouldAcceptGpsCandidate(candidate, state, multiplier = DEFAULT_GPS_OUTLIER_TRIGGER_MULTIPLIER) {
    return isWithinMeanMultiplierBand(candidate, state, multiplier);
}

/**
 * After this many recovery failures (> threshold), force-accept the next sample.
 * @param {number} recoveryFailureCount
 */
export function shouldForceAcceptNextSample(recoveryFailureCount) {
    return recoveryFailureCount > GPS_OUTLIER_REJECTION_THRESHOLD;
}

/**
 * Updates running segment sum/count after accepting a point.
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
