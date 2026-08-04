const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset']);

export function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith('/')) return '/';
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  const path = raw.split(/[?#]/)[0] ?? '';
  if (AUTH_PATHS.has(path)) return '/';
  return raw;
}
