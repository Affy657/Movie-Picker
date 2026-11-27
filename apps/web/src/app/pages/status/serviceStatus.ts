import type { ServiceReadinessResult } from '@/shared/api/serviceReadiness';

export type ServiceOverall = 'operational' | 'degraded' | 'down' | 'checking' | 'offline';

export type ServiceComponentState = 'operational' | 'unavailable' | 'unknown' | 'checking';

export type ServiceStatus = {
  overall: ServiceOverall;
  site: ServiceComponentState;
  api: ServiceComponentState;
  database: ServiceComponentState;
  release: string | null;
};

const SHORT_RELEASE_LENGTH = 7;

const UNNAMED_RELEASE = 'unknown';

function releaseOf(result: ServiceReadinessResult | undefined): string | null {
  if (!result?.reachable) return null;
  const { release } = result.readiness;
  return release && release !== UNNAMED_RELEASE ? release.slice(0, SHORT_RELEASE_LENGTH) : null;
}

export function serviceStatusOf({
  online,
  result,
}: {
  online: boolean;
  result: ServiceReadinessResult | undefined;
}): ServiceStatus {
  const release = releaseOf(result);
  if (!online) {
    return { overall: 'offline', site: 'unknown', api: 'unknown', database: 'unknown', release };
  }
  if (!result) {
    return {
      overall: 'checking',
      site: 'operational',
      api: 'checking',
      database: 'checking',
      release,
    };
  }
  if (!result.reachable) {
    return {
      overall: 'down',
      site: 'operational',
      api: 'unavailable',
      database: 'unknown',
      release,
    };
  }
  const databaseAnswers = result.readiness.status === 'ready';
  return {
    overall: databaseAnswers ? 'operational' : 'degraded',
    site: 'operational',
    api: 'operational',
    database: databaseAnswers ? 'operational' : 'unavailable',
    release,
  };
}
