import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const script = resolve(import.meta.dirname, '../.github/actions/verify-front/wait-for-release.sh');
const OLD = 'a'.repeat(40);
const NEW = 'b'.repeat(40);
const page = (release) => `<head><meta name="release" content="${release}"></head>`;

function run({ releasesServedNext, initial = OLD, attempts = 3 }) {
  const dir = mkdtempSync(join(tmpdir(), 'wait-for-release-'));
  try {
    writeFileSync(join(dir, 'page.html'), page(initial));
    writeFileSync(join(dir, 'served.txt'), releasesServedNext.join('\n'));
    writeFileSync(
      join(dir, 'fake-curl.sh'),
      [
        '#!/usr/bin/env bash',
        'echo call >> calls.txt',
        'release="$(sed -n "$(wc -l < calls.txt)p" served.txt)"',
        `printf '<meta name="release" content="%s">' "$release" > page.html`,
      ].join('\n')
    );
    chmodSync(join(dir, 'fake-curl.sh'), 0o755);
    const result = spawnSync('bash', [script, 'https://site.test', NEW, 'page.html'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        CURL_BIN: './fake-curl.sh',
        RELEASE_WAIT_ATTEMPTS: String(attempts),
        RELEASE_WAIT_DELAY_SECONDS: '0',
      },
    });
    const calls = existsSync(join(dir, 'calls.txt'))
      ? readFileSync(join(dir, 'calls.txt'), 'utf8').trim().split('\n').length
      : 0;
    return { status: result.status, output: result.stdout + result.stderr, calls };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('accepts a page already serving the release, without fetching it again', () => {
  const { status, calls } = run({ releasesServedNext: [], initial: NEW });
  assert.equal(status, 0);
  assert.equal(calls, 0);
});

test('waits for the CDN to switch to the release that was just published', () => {
  const { status, calls, output } = run({ releasesServedNext: [OLD, NEW], attempts: 5 });
  assert.equal(status, 0, output);
  assert.equal(calls, 2);
});

test('fails with the served release once the attempts run out', () => {
  const { status, output, calls } = run({ releasesServedNext: [OLD, OLD, OLD], attempts: 3 });
  assert.equal(status, 1);
  assert.equal(calls, 2);
  assert.match(output, new RegExp(`::error::https://site.test serves release '${OLD}'`));
});

test('names a page without any release instead of an empty value', () => {
  const { status, output } = run({ releasesServedNext: ['', ''], initial: '', attempts: 2 });
  assert.equal(status, 1);
  assert.match(output, /serves release 'none'/);
});
