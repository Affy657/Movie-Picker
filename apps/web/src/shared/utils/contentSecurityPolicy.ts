export function hostLooksLocal(host: string): boolean {
  const h = (host.split(':')[0] ?? host).toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
}

export function toApiOrigin(raw: string): string {
  const base = (raw ?? '').trim();
  if (!base) return '';
  let withScheme = base;
  if (!/^https?:\/\//i.test(base)) {
    const withoutSlash = base.replace(/^\//, '');
    const hostPart = ((withoutSlash.split('/')[0] ?? '').split('@').pop() ?? withoutSlash).trim();
    withScheme = `${hostLooksLocal(hostPart) ? 'http' : 'https'}://${withoutSlash}`;
  }
  try {
    return new URL(withScheme).origin;
  } catch {
    return '';
  }
}

export function toSentryIngestOrigin(dsn: string): string {
  const raw = (dsn ?? '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
}

const INLINE_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi;
const SCRIPT_TYPE = /\btype\s*=\s*["']?([^"'\s>]+)/i;
const EXECUTABLE_SCRIPT_TYPES = new Set(['module', 'text/javascript', 'application/javascript']);

function isExecutableInlineScript(attributes: string): boolean {
  if (/\bsrc\s*=/i.test(attributes)) return false;
  const type = SCRIPT_TYPE.exec(attributes)?.[1]?.toLowerCase();
  return type === undefined || EXECUTABLE_SCRIPT_TYPES.has(type);
}

export async function inlineScriptHashes(html: string): Promise<ReadonlyArray<string>> {
  const hashes: Array<string> = [];
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    if (!isExecutableInlineScript(match[1] ?? '')) continue;
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(match[2] ?? '')
    );
    const hash = `'sha256-${btoa(String.fromCodePoint(...new Uint8Array(digest)))}'`;
    if (!hashes.includes(hash)) hashes.push(hash);
  }
  return hashes;
}

export function buildContentSecurityPolicy(
  apiOrigin: string,
  sentryOrigin: string,
  inlineScripts: ReadonlyArray<string> = []
): string {
  const scriptSrc = ["'self'", ...inlineScripts, 'https://eu-assets.i.posthog.com'].join(' ');
  const connectSrc = [
    "'self'",
    apiOrigin,
    sentryOrigin,
    'https://eu.i.posthog.com',
    'https://eu-assets.i.posthog.com',
    'https://image.tmdb.org',
  ]
    .filter(Boolean)
    .join(' ');
  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'https://image.tmdb.org',
    'https://api.dicebear.com',
    apiOrigin,
  ]
    .filter(Boolean)
    .join(' ');
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    'frame-src https://www.youtube.com',
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
