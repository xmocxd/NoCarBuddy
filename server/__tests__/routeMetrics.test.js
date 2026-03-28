import { describe, it, expect } from '@jest/globals';
import { computeRouteMetrics, haversineMeters } from '../routeMetrics.js';

describe('routeMetrics', () => {
  it('haversineMeters is ~0 for identical points', () => {
    expect(haversineMeters(40, -74, 40, -74)).toBeLessThan(1);
  });

  it('sums segment distances and derives pace and estimated steps', () => {
    const points = [
      { lat: 40.0, lng: -74.0 },
      { lat: 40.001, lng: -74.0 },
    ];
    const m = computeRouteMetrics(points, 3600);
    expect(m.distanceMeters).toBeGreaterThan(0);
    expect(m.estimatedSteps).toBe(Math.round((m.distanceMeters / 1609.344) * 2000));
    expect(m.paceSecondsPerMi).not.toBeNull();
    expect(m.paceSecondsPerMi).toBeGreaterThan(0);
  });

  it('returns zero distance for fewer than two points', () => {
    const m = computeRouteMetrics([{ lat: 1, lng: 2 }], 1800);
    expect(m.distanceMeters).toBe(0);
    expect(m.estimatedSteps).toBe(0);
    expect(m.paceSecondsPerMi).toBeNull();
  });
});
