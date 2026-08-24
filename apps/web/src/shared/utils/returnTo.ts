const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset']);

function normalizedAuthCandidate(path: string): string {
  let stripped = path;
  while (stripped.endsWith('/')) stripped = stripped.slice(0, -1);
  const lower = stripped.toLowerCase();
  return lower === '' ? '/' : lower;
}

export function safeReturnTo(raw: string | null): string {
  if (!raw?.startsWith('/')) return '/';
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  const path = raw.split(/[?#]/)[0] ?? '';
  if (AUTH_PATHS.has(normalizedAuthCandidate(path))) return '/';
  return raw;
}
