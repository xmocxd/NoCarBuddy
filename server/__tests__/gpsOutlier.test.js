import { describe, it, expect } from '@jest/globals';
import { haversineMeters } from '../routeMetrics.js';
import {
  shouldAcceptGpsCandidate,
  acceptGpsPoint,
  DEFAULT_GPS_OUTLIER_MULTIPLIER,
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

  it('rejects candidate when hop from last accepted exceeds multiplier × mean prior segment length', () => {
    const p1 = { lat: 40, lng: -74 };
    const p2 = { lat: 40.0001, lng: -74 };
    const p3Far = { lat: 40.01, lng: -74 };
    let state = emptyState();
    state = acceptGpsPoint(p1, state);
    state = acceptGpsPoint(p2, state);
    const avg = state.segmentDistSumMeters / state.segmentCount;
    const hop = haversineMeters(p2.lat, p2.lng, p3Far.lat, p3Far.lng);
    expect(hop > DEFAULT_GPS_OUTLIER_MULTIPLIER * avg).toBe(true);
    expect(shouldAcceptGpsCandidate(p3Far, state, DEFAULT_GPS_OUTLIER_MULTIPLIER)).toBe(false);
  });

  it('accepts candidate when hop is within threshold', () => {
    const p1 = { lat: 40, lng: -74 };
    const p2 = { lat: 40.0001, lng: -74 };
    let state = emptyState();
    state = acceptGpsPoint(p1, state);
    state = acceptGpsPoint(p2, state);
    const avg = state.segmentDistSumMeters / state.segmentCount;
    const p3Near = { lat: 40.00011, lng: -74 };
    const hop = haversineMeters(p2.lat, p2.lng, p3Near.lat, p3Near.lng);
    expect(hop <= DEFAULT_GPS_OUTLIER_MULTIPLIER * avg).toBe(true);
    expect(shouldAcceptGpsCandidate(p3Near, state, DEFAULT_GPS_OUTLIER_MULTIPLIER)).toBe(true);
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
