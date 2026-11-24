import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';

const config = JSON.parse(
  readFileSync(join(import.meta.dirname, '../infra/firebase-hosting.json'), 'utf8')
);

function servedHeader(path, name) {
  let value;
  for (const rule of config.headers) {
    if (matchesGlob(path, rule.glob) && name in rule.headers) value = rule.headers[name];
  }
  return value;
}

describe('firebase-hosting.json headers', () => {
  it('lets other sites embed the public images that e-mails and share previews load', () => {
    for (const path of [
      '/icons/clap-192x192.png',
      '/icons/clap-apple-touch-icon.png',
      '/logo.svg',
      '/favicon.svg',
      '/favicon.ico',
      '/og-image.png',
    ]) {
      assert.equal(servedHeader(path, 'Cross-Origin-Resource-Policy'), 'cross-origin', path);
    }
  });

  it('keeps every other file to the same site', () => {
    for (const path of [
      '/index.html',
      '/assets/index-AbC12345.js',
      '/sw.js',
      '/invitations/list.html',
    ]) {
      assert.equal(servedHeader(path, 'Cross-Origin-Resource-Policy'), 'same-site', path);
    }
  });
});
