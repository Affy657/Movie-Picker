import { describe, it, expect } from 'vitest';
import {
  buildContentSecurityPolicy,
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
  it("garde l'origine d'une URL complète et jette le chemin", () => {
    expect(toApiOrigin(PROD_API)).toBe(PROD_API);
    expect(toApiOrigin('https://api.movie-picker.fr/api/v1')).toBe(PROD_API);
  });

  it('complète en https un hôte distant sans schéma', () => {
    expect(toApiOrigin('api.movie-picker.fr')).toBe(PROD_API);
  });

  it('complète en http un hôte local sans schéma', () => {
    expect(toApiOrigin('localhost:5010')).toBe('http://localhost:5010');
    expect(toApiOrigin('127.0.0.1:5010')).toBe('http://127.0.0.1:5010');
  });

  it('rend une chaîne vide pour une valeur absente ou illisible', () => {
    expect(toApiOrigin('')).toBe('');
    expect(toApiOrigin('   ')).toBe('');
    expect(toApiOrigin('http://')).toBe('');
  });
});

describe('toSentryIngestOrigin', () => {
  it("extrait l'origine d'ingestion du DSN", () => {
    expect(toSentryIngestOrigin(PROD_DSN)).toBe('https://o4507.ingest.de.sentry.io');
  });

  it('rend une chaîne vide sans DSN', () => {
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

  it("sert l'origine locale telle quelle en développement", () => {
    const local = buildContentSecurityPolicy(toApiOrigin('http://127.0.0.1:5010'), '');
    expect(directive(local, 'img-src')).toContain('http://127.0.0.1:5010');
    expect(directive(local, 'connect-src')).toContain('http://127.0.0.1:5010');
  });
});
