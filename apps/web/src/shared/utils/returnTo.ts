const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset']);

function normalizedAuthCandidate(path: string): string {
  let stripped = path;
  while (stripped.endsWith('/')) stripped = stripped.slice(0, -1);
  const lower = stripped.toLowerCase();
  return lower === '' ? '/' : lower;
}

function staysOnThisOrigin(path: string): boolean {
  const { origin } = globalThis.location;
  try {
    return new URL(path, origin).origin === origin;
  } catch {
    return false;
  }
}

export function safeReturnTo(raw: string | null): string {
  if (!raw?.startsWith('/') || !staysOnThisOrigin(raw)) return '/';
  const path = raw.split(/[?#]/)[0] ?? '';
  if (AUTH_PATHS.has(normalizedAuthCandidate(path))) return '/';
  return raw;
}
