import { ApiError } from '@/shared/api/apiError';
import { apiUrl } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';

export type ServiceReadiness = ApiSchemas['HealthReadyResponse'];

export type ServiceReadinessResult =
  { reachable: true; readiness: ServiceReadiness } | { reachable: false };

const SERVICE_READINESS_TIMEOUT_MS = 10_000;

const UNREACHABLE: ServiceReadinessResult = { reachable: false };

function isReadinessReport(body: unknown): body is ServiceReadiness {
  if (body === null || typeof body !== 'object') return false;
  const report = body as Partial<ServiceReadiness>;
  return typeof report.status === 'string' && Array.isArray(report.dependencies);
}

async function readReport(response: Response): Promise<ServiceReadinessResult> {
  if (!/application\/json/i.test(response.headers.get('content-type') ?? '')) return UNREACHABLE;
  try {
    const body: unknown = await response.json();
    return isReadinessReport(body) ? { reachable: true, readiness: body } : UNREACHABLE;
  } catch {
    return UNREACHABLE;
  }
}

export async function fetchServiceReadiness({
  signal,
  timeoutMs = SERVICE_READINESS_TIMEOUT_MS,
}: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<ServiceReadinessResult> {
  signal?.throwIfAborted();
  const controller = new AbortController();
  let timedOut = false;
  const followCaller = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', followCaller, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(apiUrl('/health/ready'), {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (response.status === 429) throw new ApiError(response.statusText, { code: 429 });
    return await readReport(response);
  } catch (error) {
    if (ApiError.is(error)) throw error;
    if (signal?.aborted && !timedOut) throw error;
    return UNREACHABLE;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', followCaller);
  }
}
