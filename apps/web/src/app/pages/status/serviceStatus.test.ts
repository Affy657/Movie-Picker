import { describe, expect, it } from 'vitest';
import type { ServiceReadiness } from '@/shared/api/serviceReadiness';
import { serviceStatusOf } from './serviceStatus';

const READY: ServiceReadiness = {
  status: 'ready',
  service: 'movie-picker-api',
  release: 'a58726d3f1c2',
  dependencies: [{ name: 'mongodb', status: 'ok', durationMs: 12 }],
};

describe('serviceStatusOf', () => {
  it('says everything works when the API and the database answer', () => {
    expect(
      serviceStatusOf({ online: true, result: { reachable: true, readiness: READY } })
    ).toEqual({
      overall: 'operational',
      site: 'operational',
      api: 'operational',
      database: 'operational',
      release: 'a58726d',
    });
  });

  it('says the service is degraded when the API answers but the database does not', () => {
    const readiness: ServiceReadiness = {
      ...READY,
      status: 'unavailable',
      dependencies: [{ name: 'mongodb', status: 'unavailable', durationMs: 2000 }],
    };

    expect(serviceStatusOf({ online: true, result: { reachable: true, readiness } })).toMatchObject(
      { overall: 'degraded', api: 'operational', database: 'unavailable' }
    );
  });

  it('says the service is down and the database unknown when the API does not answer', () => {
    expect(serviceStatusOf({ online: true, result: { reachable: false } })).toEqual({
      overall: 'down',
      site: 'operational',
      api: 'unavailable',
      database: 'unknown',
      release: null,
    });
  });

  it('keeps the site operational while the first check runs', () => {
    expect(serviceStatusOf({ online: true, result: undefined })).toEqual({
      overall: 'checking',
      site: 'operational',
      api: 'checking',
      database: 'checking',
      release: null,
    });
  });

  it('marks nothing as down while the visitor is offline', () => {
    expect(
      serviceStatusOf({ online: false, result: { reachable: true, readiness: READY } })
    ).toEqual({
      overall: 'offline',
      site: 'unknown',
      api: 'unknown',
      database: 'unknown',
      release: 'a58726d',
    });
  });

  it('hides a release the API could not name', () => {
    const readiness: ServiceReadiness = { ...READY, release: 'unknown' };

    expect(
      serviceStatusOf({ online: true, result: { reachable: true, readiness } }).release
    ).toBeNull();
  });
});
