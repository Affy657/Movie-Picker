import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bumpFor,
  nextVersion,
  releaseChangelog,
  releaseNotes,
  unreleasedSection,
  withAppVersion,
} from './release.mjs';

const REPO = 'https://github.com/owner/repo';

function changelog(unreleased) {
  return [
    '# Changelog',
    '',
    'Intro.',
    '',
    '## [Non publié]',
    unreleased,
    '## [1.7.0] - 2026-11-06',
    '',
    '### Added',
    '',
    '- **Rating** : rate the movie.',
    '',
    '## [1.6.0] - 2026-09-12',
    '',
    '### Fixed',
    '',
    '- **Wheel** : spins again.',
    '',
    `[Non publié]: ${REPO}/compare/v1.7.0...HEAD`,
    `[1.7.0]: ${REPO}/compare/v1.6.0...v1.7.0`,
    `[1.6.0]: ${REPO}/compare/v1.5.0...v1.6.0`,
    '',
  ].join('\n');
}

const FIXES_ONLY =
  '\n### Fixed\n\n- **Recap** : refreshes after a rating.\n\n### Security\n\n- **Sessions** : closed everywhere.\n\n';
const WITH_ADDED =
  '\n### Added\n\n- **Lists** : several lists.\n\n### Fixed\n\n- **Recap** : refreshes.\n\n';

describe('release bump', () => {
  it('asks for a minor version when something was added', () => {
    assert.equal(bumpFor(WITH_ADDED), 'minor');
  });

  it('asks for a patch when only fixes, changes or security entries are listed', () => {
    assert.equal(bumpFor(FIXES_ONLY), 'patch');
    assert.equal(bumpFor('\n### Changed\n\n- **Bell** : lighter.\n\n'), 'patch');
  });

  it('asks for nothing when no entry is listed, empty headings included', () => {
    assert.equal(bumpFor('\n'), null);
    assert.equal(bumpFor('\n### Added\n\n### Fixed\n\n'), null);
  });

  it('computes the next version of each kind', () => {
    assert.equal(nextVersion('1.7.0', 'patch'), '1.7.1');
    assert.equal(nextVersion('1.7.3', 'minor'), '1.8.0');
    assert.equal(nextVersion('1.9.2', 'major'), '2.0.0');
    assert.equal(nextVersion('1.9.0', 'minor'), '1.10.0');
  });

  it('refuses a version that is not x.y.z', () => {
    assert.throws(() => nextVersion('1.7', 'patch'), /1\.7/);
  });
});

describe('release changelog', () => {
  it('reads the unreleased section up to the next version', () => {
    assert.equal(unreleasedSection(changelog(FIXES_ONLY)), FIXES_ONLY);
  });

  it('turns the unreleased section into the version, under a fresh empty one', () => {
    const released = releaseChangelog(changelog(FIXES_ONLY), {
      previous: '1.7.0',
      version: '1.7.1',
      date: '2026-11-11',
    });
    assert.match(
      released,
      /## \[Non publié\]\n\n## \[1\.7\.1\] - 2026-11-11\n\n### Fixed\n\n- \*\*Recap\*\*/
    );
    assert.equal(unreleasedSection(released), '');
    assert.equal(bumpFor(unreleasedSection(released)), null);
  });

  it('moves the unreleased link and adds the comparison of the new version above the previous one', () => {
    const released = releaseChangelog(changelog(FIXES_ONLY), {
      previous: '1.7.0',
      version: '1.7.1',
      date: '2026-11-11',
    });
    assert.ok(
      released.includes(
        [
          `[Non publié]: ${REPO}/compare/v1.7.1...HEAD`,
          `[1.7.1]: ${REPO}/compare/v1.7.0...v1.7.1`,
          `[1.7.0]: ${REPO}/compare/v1.6.0...v1.7.0`,
        ].join('\n')
      )
    );
  });

  it('refuses a changelog whose unreleased link does not start from the current version', () => {
    assert.throws(
      () =>
        releaseChangelog(changelog(FIXES_ONLY), {
          previous: '1.6.0',
          version: '1.6.1',
          date: '2026-11-11',
        }),
      /1\.6\.0/
    );
  });

  it('extracts the notes of a version, the last one before the links included', () => {
    const text = changelog(FIXES_ONLY);
    assert.equal(releaseNotes(text, '1.7.0'), '### Added\n\n- **Rating** : rate the movie.');
    assert.equal(releaseNotes(text, '1.6.0'), '### Fixed\n\n- **Wheel** : spins again.');
  });

  it('refuses to extract the notes of a version the changelog does not list', () => {
    assert.throws(() => releaseNotes(changelog(FIXES_ONLY), '9.9.9'), /9\.9\.9/);
  });
});

describe('release app version', () => {
  it('rewrites the version constant of the web app', () => {
    assert.equal(
      withAppVersion("export const APP_VERSION = '1.7.0';\n", '1.7.1'),
      "export const APP_VERSION = '1.7.1';\n"
    );
  });

  it('refuses a source without the version constant', () => {
    assert.throws(() => withAppVersion('export const OTHER = 1;\n', '1.7.1'), /APP_VERSION/);
  });
});
