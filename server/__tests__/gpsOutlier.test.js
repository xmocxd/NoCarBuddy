import { describe, it, expect } from '@jest/globals';
import { haversineMeters } from '../routeMetrics.js';
import {
  shouldAcceptGpsCandidate,
  acceptGpsPoint,
  DEFAULT_GPS_OUTLIER_MULTIPLIER,
  MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK,
  nextOutlierRejectionCounters,
  nextCooldownAfterAcceptedPoint,
  GPS_OUTLIER_REJECTION_THRESHOLD,
  GPS_OUTLIER_COOLDOWN_ACCEPT_COUNT,
} from '../gpsOutlier.js';

describe('gpsOutlier', () => {
  const emptyState = () => ({
    lastAccepted: null,
    segmentDistSumMeters: 0,
    segmentCount: 0,
  });

  it('accepts first point (no prior segment stats)', () => {
    expect(shouldAcceptGpsCandidate({ lat: 40, lng: -74 }, emptyState(), DEFAULT_GPS_OUTLIER_MULTIPLIER)).toBe(
      true
    );
  });

  it('accepts second point before any segment average exists', () => {
    const state = {
      lastAccepted: { lat: 40, lng: -74 },
      segmentDistSumMeters: 0,
      segmentCount: 0,
    };
    expect(shouldAcceptGpsCandidate({ lat: 40.0001, lng: -74 }, state, DEFAULT_GPS_OUTLIER_MULTIPLIER)).toBe(
      true
    );
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
    expect(hop > DEFAULT_GPS_OUTLIER_MULTIPLIER * avg).toBe(true);
    expect(state.segmentCount + 1).toBeLessThan(MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK);
    expect(shouldAcceptGpsCandidate(p3Far, state, DEFAULT_GPS_OUTLIER_MULTIPLIER)).toBe(true);
  });

  it('rejects candidate when hop from last accepted exceeds multiplier × mean after min points', () => {
    let state = emptyState();
    for (let i = 0; i < MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK; i++) {
      state = acceptGpsPoint({ lat: 40 + i * 0.0001, lng: -74 }, state);
    }
    expect(state.segmentCount + 1).toBe(MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK);
    const last = state.lastAccepted;
    const pFar = { lat: 40.01, lng: -74 };
    const avg = state.segmentDistSumMeters / state.segmentCount;
    const hop = haversineMeters(last.lat, last.lng, pFar.lat, pFar.lng);
    expect(hop > DEFAULT_GPS_OUTLIER_MULTIPLIER * avg).toBe(true);
    expect(shouldAcceptGpsCandidate(pFar, state, DEFAULT_GPS_OUTLIER_MULTIPLIER)).toBe(false);
  });

  it('accepts candidate when hop is within threshold after min points', () => {
    let state = emptyState();
    for (let i = 0; i < MIN_ACCEPTED_POINTS_BEFORE_OUTLIER_CHECK; i++) {
      state = acceptGpsPoint({ lat: 40 + i * 0.0001, lng: -74 }, state);
    }
    const last = state.lastAccepted;
    const pNear = { lat: last.lat + 0.00005, lng: -74 };
    const avg = state.segmentDistSumMeters / state.segmentCount;
    const hop = haversineMeters(last.lat, last.lng, pNear.lat, pNear.lng);
    expect(hop <= DEFAULT_GPS_OUTLIER_MULTIPLIER * avg).toBe(true);
    expect(shouldAcceptGpsCandidate(pNear, state, DEFAULT_GPS_OUTLIER_MULTIPLIER)).toBe(true);
  });

  it('acceptGpsPoint accumulates running mean inputs like the record page', () => {
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
});

describe('gpsOutlier cooldown counters', () => {
  it('enters cooldown after rejections exceed threshold', () => {
    let rejectedCount = 0;
    let cooldown = 0;
    for (let i = 0; i < GPS_OUTLIER_REJECTION_THRESHOLD; i++) {
      const n = nextOutlierRejectionCounters(rejectedCount, cooldown);
      rejectedCount = n.rejectedCount;
      cooldown = n.cooldownAcceptsRemaining;
    }
    expect(rejectedCount).toBe(GPS_OUTLIER_REJECTION_THRESHOLD);
    const triggered = nextOutlierRejectionCounters(rejectedCount, cooldown);
    expect(triggered.rejectedCount).toBe(0);
    expect(triggered.cooldownAcceptsRemaining).toBe(GPS_OUTLIER_COOLDOWN_ACCEPT_COUNT);
  });

  it('decrements cooldown on each simulated accept', () => {
    let cooldown = GPS_OUTLIER_COOLDOWN_ACCEPT_COUNT;
    for (let i = 0; i < GPS_OUTLIER_COOLDOWN_ACCEPT_COUNT; i++) {
      cooldown = nextCooldownAfterAcceptedPoint(cooldown);
    }
    expect(cooldown).toBe(0);
    expect(nextCooldownAfterAcceptedPoint(0)).toBe(0);
  });
});
