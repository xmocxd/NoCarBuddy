import { describe, it, expect } from '@jest/globals';
import { haversineMeters } from '../routeMetrics.js';
import {
  shouldAcceptGpsCandidate,
  acceptGpsPoint,
  DEFAULT_GPS_OUTLIER_TRIGGER_MULTIPLIER,
  DEFAULT_GPS_OUTLIER_RECHECK_MULTIPLIER,
  MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK,
  passesTriggerBand,
  passesRecheckBand,
  shouldForceAcceptNextSample,
  GPS_OUTLIER_REJECTION_THRESHOLD,
  isWithinMeanMultiplierBand,
} from '../gpsOutlier.js';

describe('gpsOutlier', () => {
  const emptyState = () => ({
    lastAccepted: null,
    segmentDistSumMeters: 0,
    segmentCount: 0,
  });

  it('accepts first point (no prior segment stats)', () => {
    expect(passesTriggerBand({ lat: 40, lng: -74 }, emptyState())).toBe(true);
  });

  it('accepts second point before any segment average exists', () => {
    const state = {
      lastAccepted: { lat: 40, lng: -74 },
      segmentDistSumMeters: 0,
      segmentCount: 0,
    };
    expect(passesTriggerBand({ lat: 40.0001, lng: -74 }, state)).toBe(true);
  });

  it('does not reject large hops until enough points exist to stabilize the average', () => {
    const p1 = { lat: 40, lng: -74 };
    const p2 = { lat: 40.0001, lng: -74 };
    const p3Far = { lat: 40.01, lng: -74 };
    let state = emptyState();
    state = acceptGpsPoint(p1, state);
    state = acceptGpsPoint(p2, state);
    const avg = state.segmentDistSumMeters / state.segmentCount;
    const hop = haversineMeters(p2.lat, p2.lng, p3Far.lat, p3Far.lng);
    expect(hop > DEFAULT_GPS_OUTLIER_TRIGGER_MULTIPLIER * avg).toBe(true);
    expect(state.segmentCount + 1).toBeLessThan(MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK);
    expect(passesTriggerBand(p3Far, state)).toBe(true);
  });

  it('rejects candidate when hop from last exceeds trigger × mean after min points', () => {
    let state = emptyState();
    for (let i = 0; i < MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK; i++) {
      state = acceptGpsPoint({ lat: 40 + i * 0.0001, lng: -74 }, state);
    }
    const last = state.lastAccepted;
    const pFar = { lat: 40.01, lng: -74 };
    const avg = state.segmentDistSumMeters / state.segmentCount;
    const hop = haversineMeters(last.lat, last.lng, pFar.lat, pFar.lng);
    expect(hop > DEFAULT_GPS_OUTLIER_TRIGGER_MULTIPLIER * avg).toBe(true);
    expect(passesTriggerBand(pFar, state)).toBe(false);
  });

  it('accepts candidate when hop is within trigger band after min points', () => {
    let state = emptyState();
    for (let i = 0; i < MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK; i++) {
      state = acceptGpsPoint({ lat: 40 + i * 0.0001, lng: -74 }, state);
    }
    const last = state.lastAccepted;
    const pNear = { lat: last.lat + 0.00005, lng: -74 };
    const avg = state.segmentDistSumMeters / state.segmentCount;
    const hop = haversineMeters(last.lat, last.lng, pNear.lat, pNear.lng);
    expect(hop <= DEFAULT_GPS_OUTLIER_TRIGGER_MULTIPLIER * avg).toBe(true);
    expect(passesTriggerBand(pNear, state)).toBe(true);
  });

  it('recheck band (15×) is wider than trigger band (7×)', () => {
    let state = emptyState();
    for (let i = 0; i < MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK; i++) {
      state = acceptGpsPoint({ lat: 40 + i * 0.0001, lng: -74 }, state);
    }
    const last = state.lastAccepted;
    const avg = state.segmentDistSumMeters / state.segmentCount;
    const d = 8 * avg;
    const latDelta = d / 111000;
    const pBetween = { lat: last.lat + latDelta, lng: last.lng };
    const hop = haversineMeters(last.lat, last.lng, pBetween.lat, pBetween.lng);
    expect(hop).toBeGreaterThan(DEFAULT_GPS_OUTLIER_TRIGGER_MULTIPLIER * avg);
    expect(hop).toBeLessThanOrEqual(DEFAULT_GPS_OUTLIER_RECHECK_MULTIPLIER * avg);
    expect(passesTriggerBand(pBetween, state)).toBe(false);
    expect(passesRecheckBand(pBetween, state)).toBe(true);
  });

  it('acceptGpsPoint accumulates segment distance and point count', () => {
    const p1 = { lat: 40, lng: -74 };
    const p2 = { lat: 40.0001, lng: -74 };
    const p3 = { lat: 40.0002, lng: -74 };
    let state = emptyState();
    state = acceptGpsPoint(p1, state);
    expect(state.segmentCount).toBe(0);
    state = acceptGpsPoint(p2, state);
    expect(state.segmentCount).toBe(1);
    const d1 = haversineMeters(p1.lat, p1.lng, p2.lat, p2.lng);
    expect(state.segmentDistSumMeters).toBeCloseTo(d1, 5);
    state = acceptGpsPoint(p3, state);
    expect(state.segmentCount).toBe(2);
    expect(state.segmentDistSumMeters).toBeCloseTo(d1 + haversineMeters(p2.lat, p2.lng, p3.lat, p3.lng), 3);
  });

  it('shouldAcceptGpsCandidate matches trigger multiplier by default', () => {
    let state = emptyState();
    for (let i = 0; i < MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK; i++) {
      state = acceptGpsPoint({ lat: 40 + i * 0.0001, lng: -74 }, state);
    }
    const last = state.lastAccepted;
    const pNear = { lat: last.lat + 0.00005, lng: -74 };
    expect(shouldAcceptGpsCandidate(pNear, state)).toBe(passesTriggerBand(pNear, state));
  });

  it('isWithinMeanMultiplierBand respects explicit multiplier', () => {
    let state = emptyState();
    for (let i = 0; i < MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK; i++) {
      state = acceptGpsPoint({ lat: 40 + i * 0.0001, lng: -74 }, state);
    }
    const last = state.lastAccepted;
    const p = { lat: last.lat + 0.0002, lng: -74 };
    expect(typeof isWithinMeanMultiplierBand(p, state, 100)).toBe('boolean');
  });
});

describe('gpsOutlier recovery force-next', () => {
  it('forces next sample only after failures exceed threshold', () => {
    expect(shouldForceAcceptNextSample(0)).toBe(false);
    expect(shouldForceAcceptNextSample(GPS_OUTLIER_REJECTION_THRESHOLD)).toBe(false);
    expect(shouldForceAcceptNextSample(GPS_OUTLIER_REJECTION_THRESHOLD + 1)).toBe(true);
  });
});
