import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { apiPreconnectTags, contentSecurityPolicyMeta, insertAfterCharset } from './documentHead';

const indexHtml = readFileSync(resolve(__dirname, '../index.html'), 'utf8');

const SHELL =
  '<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8">\n    <title>x</title>\n';

describe('insertAfterCharset', () => {
  it('puts the tag right after the charset, which stays in the first bytes of the document', () => {
    const policy = `default-src 'self'; script-src ${"'sha256-abc' ".repeat(40)}`;
    const html = insertAfterCharset(SHELL, contentSecurityPolicyMeta(policy));

    expect(html.indexOf('<meta charset="UTF-8">')).toBeLessThan(1024);
    expect(html.indexOf('<meta charset="UTF-8">')).toBeLessThan(
      html.indexOf('http-equiv="Content-Security-Policy"')
    );
  });

  it('refuses a document without a charset, rather than losing the policy', () => {
    expect(() => insertAfterCharset('<head></head>', '<meta>')).toThrow(/charset/);
  });
});

describe('preconnections', () => {
  it('opens both TMDB connections: no-cors for the page, anonymous for the service worker', () => {
    const tmdb =
      indexHtml.match(/<link[^>]*rel="preconnect"[^>]*href="https:\/\/image\.tmdb\.org"[^>]*>/g) ??
      [];
    expect(tmdb).toHaveLength(2);
    expect(tmdb.filter((tag) => /\scrossorigin[\s/>]/.test(tag))).toHaveLength(1);
  });

  it('opens the API connection early, the credentialed one its requests travel on', () => {
    expect(apiPreconnectTags('https://api.example.test')).toEqual([
      {
        tag: 'link',
        attrs: { rel: 'preconnect', href: 'https://api.example.test' },
        injectTo: 'head-prepend',
      },
    ]);
  });

  it('opens nothing when the API is served from the page origin', () => {
    expect(apiPreconnectTags('')).toEqual([]);
  });
});

describe('contentSecurityPolicyMeta', () => {
  it('escapes what would close the attribute', () => {
    expect(contentSecurityPolicyMeta(`img-src 'self' "x" &`)).toBe(
      `<meta http-equiv="Content-Security-Policy" content="img-src 'self' &quot;x&quot; &amp;">`
    );
  });
});
