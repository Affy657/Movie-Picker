import { describe, it, expect } from 'vitest';
import {
  buildContentSecurityPolicy,
  inlineScriptHashes,
  toApiOrigin,
  toSentryIngestOrigin,
} from '@/shared/utils/contentSecurityPolicy';

const PROD_API = 'https://api.movie-picker.fr';
const PROD_DSN = 'https://abc123@o4507.ingest.de.sentry.io/4508';

function directive(policy: string, name: string): string {
  const found = policy.split('; ').find((part) => part === name || part.startsWith(`${name} `));
  expect(found, `directive ${name} absente de la politique`).toBeDefined();
  return found!;
}

describe('toApiOrigin', () => {
  it('keeps the origin of a full URL and drops the path', () => {
    expect(toApiOrigin(PROD_API)).toBe(PROD_API);
    expect(toApiOrigin('https://api.movie-picker.fr/api/v1')).toBe(PROD_API);
  });

  it('completes a remote host without scheme with https', () => {
    expect(toApiOrigin('api.movie-picker.fr')).toBe(PROD_API);
  });

  it('completes a local host without scheme with http', () => {
    expect(toApiOrigin('localhost:5010')).toBe('http://localhost:5010');
    expect(toApiOrigin('127.0.0.1:5010')).toBe('http://127.0.0.1:5010');
  });

  it('returns an empty string for a missing or unreadable value', () => {
    expect(toApiOrigin('')).toBe('');
    expect(toApiOrigin('   ')).toBe('');
    expect(toApiOrigin('http://')).toBe('');
  });
});

describe('toSentryIngestOrigin', () => {
  it("extrait l'origine d'ingestion du DSN", () => {
    expect(toSentryIngestOrigin(PROD_DSN)).toBe('https://o4507.ingest.de.sentry.io');
  });

  it('returns an empty string without a DSN', () => {
    expect(toSentryIngestOrigin('')).toBe('');
    expect(toSentryIngestOrigin('pas-une-url')).toBe('');
  });
});

describe('buildContentSecurityPolicy', () => {
  const policy = buildContentSecurityPolicy(toApiOrigin(PROD_API), toSentryIngestOrigin(PROD_DSN));

  it("autorise les images de l'API, de TMDB et des avatars", () => {
    const imgSrc = directive(policy, 'img-src');
    expect(imgSrc).toContain(PROD_API);
    expect(imgSrc).toContain('https://image.tmdb.org');
    expect(imgSrc).toContain('https://api.dicebear.com');
    expect(imgSrc).toContain('data:');
    expect(imgSrc).toContain('blob:');
  });

  it("autorise les appels vers l'API, Sentry, PostHog et TMDB", () => {
    const connectSrc = directive(policy, 'connect-src');
    expect(connectSrc).toContain(PROD_API);
    expect(connectSrc).toContain('https://o4507.ingest.de.sentry.io');
    expect(connectSrc).toContain('https://eu.i.posthog.com');
    expect(connectSrc).toContain('https://image.tmdb.org');
  });

  it('autorise les modules distants de PostHog comme scripts', () => {
    expect(directive(policy, 'script-src')).toContain('https://eu-assets.i.posthog.com');
  });

  it("n'autorise aucun script en ligne sans empreinte", () => {
    expect(directive(policy, 'script-src')).toBe(
      "script-src 'self' https://eu-assets.i.posthog.com"
    );
  });

  it('autorise les scripts en ligne par leur empreinte, entre self et PostHog', () => {
    const hashed = buildContentSecurityPolicy('', '', ["'sha256-abc='", "'sha256-def='"]);
    expect(directive(hashed, 'script-src')).toBe(
      "script-src 'self' 'sha256-abc=' 'sha256-def=' https://eu-assets.i.posthog.com"
    );
  });

  it('garde les directives de verrouillage', () => {
    expect(directive(policy, 'default-src')).toBe("default-src 'self'");
    expect(directive(policy, 'object-src')).toBe("object-src 'none'");
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(policy, 'form-action')).toBe("form-action 'self'");
    expect(directive(policy, 'frame-src')).toBe('frame-src https://www.youtube.com');
  });

  it("n'introduit ni source vide ni double espace quand une origine manque", () => {
    const withoutOrigins = buildContentSecurityPolicy('', '');
    expect(withoutOrigins).not.toContain('  ');
    expect(withoutOrigins.endsWith(' ')).toBe(false);
    expect(directive(withoutOrigins, 'img-src')).toBe(
      "img-src 'self' data: blob: https://image.tmdb.org https://api.dicebear.com"
    );
  });

  it('serves the local origin as is in development', () => {
    const local = buildContentSecurityPolicy(toApiOrigin('http://127.0.0.1:5010'), '');
    expect(directive(local, 'img-src')).toContain('http://127.0.0.1:5010');
    expect(directive(local, 'connect-src')).toContain('http://127.0.0.1:5010');
  });
});

describe('inlineScriptHashes', () => {
  it("calcule l'empreinte SHA-256 en base64 du texte exact de chaque script en ligne", async () => {
    const html = '<html><head><script>alert(1)</script></head></html>';

    expect(await inlineScriptHashes(html)).toEqual([
      "'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='",
    ]);
  });

  it('ignore les scripts externes et ceux qui ne sont pas du JavaScript', async () => {
    const html = [
      '<script src="/assets/index-abc.js" type="module"></script>',
      '<script type="application/ld+json">{"@type":"WebSite"}</script>',
      '<script type="module">console.log(1)</script>',
      '<script>console.log(1)</script>',
    ].join('');

    const hashes = await inlineScriptHashes(html);

    expect(hashes).toHaveLength(1);
    expect(hashes[0]).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/);
  });

  it("garde les espaces et les retours a la ligne, qui comptent dans l'empreinte", async () => {
    const compact = await inlineScriptHashes('<script>a()</script>');
    const spaced = await inlineScriptHashes('<script>\n  a()\n</script>');

    expect(compact).not.toEqual(spaced);
  });

  it('ne renvoie rien sans script en ligne', async () => {
    expect(await inlineScriptHashes('<html><body><p>x</p></body></html>')).toEqual([]);
  });
});
