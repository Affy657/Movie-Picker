import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bumpFor,
  changedSinceMaster,
  commandOf,
  freeVersion,
  nextVersion,
  preflightLanes,
  releaseChangelog,
  releaseCommitPattern,
  releaseNotes,
  releaseTitle,
  roslynFindings,
  tagTarget,
  unreleasedSection,
  versionsAfter,
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

  it('skips a version whose tag is already published, after a reverted release', () => {
    const published = new Set(['1.11.0']);
    assert.equal(
      freeVersion('1.10.1', 'minor', (version) => published.has(version)),
      '1.12.0'
    );
    assert.equal(
      freeVersion('1.10.1', 'patch', () => false),
      '1.10.2'
    );
  });
});

describe('release command line', () => {
  it('ignores the separator pnpm forwards before the arguments', () => {
    assert.deepEqual(commandOf(['--', '--major']), ['--major', undefined]);
    assert.deepEqual(commandOf(['notes', '1.7.0']), ['notes', '1.7.0']);
    assert.deepEqual(commandOf([]), [undefined, undefined]);
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
    assert.equal(releaseNotes(text, '1.7.0'), '### Nouveautés\n\n- **Rating** : rate the movie.');
    assert.equal(releaseNotes(text, '1.6.0'), '### Corrections\n\n- **Wheel** : spins again.');
  });

  it('lists the versions released after the last published one, oldest first', () => {
    const text = [
      '## [Non publié]',
      '',
      '## [1.10.0] - 2026-11-12',
      '## [1.9.1] - 2026-11-11',
      '## [1.9.0] - 2026-11-11',
      '## [1.7.10] - 2026-11-11',
      '## [1.7.0] - 2026-11-06',
      '## [1.6.0] - 2026-09-12',
    ].join('\n');
    assert.deepEqual(versionsAfter(text, '1.7.0'), ['1.7.10', '1.9.0', '1.9.1', '1.10.0']);
    assert.deepEqual(versionsAfter(text, '1.10.0'), []);
  });

  it('writes every heading of the notes in French, like the entries', () => {
    const text = changelog(FIXES_ONLY).replace(
      '## [1.7.0] - 2026-11-06',
      [
        '## [1.7.1] - 2026-11-07',
        '',
        '### Changed',
        '',
        '- **A** : a.',
        '',
        '### Security',
        '',
        '- **B** : b.',
        '',
        '### Removed',
        '',
        '- **C** : c.',
        '',
        '### Deprecated',
        '',
        '- **D** : d.',
        '',
        '## [1.7.0] - 2026-11-06',
      ].join('\n')
    );
    const headings = releaseNotes(text, '1.7.1')
      .split('\n')
      .filter((line) => line.startsWith('### '));
    assert.deepEqual(headings, [
      '### Changements',
      '### Sécurité',
      '### Retraits',
      '### Bientôt retiré',
    ]);
  });

  it('titles a release after the lead of its first entry', () => {
    const text = changelog(FIXES_ONLY);
    assert.equal(releaseTitle(text, '1.7.0'), '1.7.0 : Rating');
    assert.equal(releaseTitle(text, '1.6.0'), '1.6.0 : Wheel');
  });

  it('titles a release by its number alone when its first entry has no lead', () => {
    const text = changelog(FIXES_ONLY).replace(
      '- **Rating** : rate the movie.',
      '- Rate the movie.'
    );
    assert.equal(releaseTitle(text, '1.7.0'), '1.7.0');
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

describe('release tag target', () => {
  it('finds the version commit by its exact subject, not a longer version that starts the same', () => {
    const pattern = new RegExp(releaseCommitPattern('1.2.1'));
    assert.ok(pattern.test('chore(release): 1.2.1'));
    assert.ok(!pattern.test('chore(release): 1.2.10'));
    assert.ok(!pattern.test('chore(release): 1x2x1'));
  });

  it('tags the version commit when its workflows are those of the deployed commit', () => {
    const trees = { version: 'tree-a', deployed: 'tree-a' };
    const target = tagTarget({
      releaseCommit: 'version',
      deployed: 'deployed',
      workflowsTreeOf: (sha) => trees[sha],
    });
    assert.equal(target, 'version');
  });

  it('falls back on the deployed commit when the workflows differ, which GitHub refuses with a 403', () => {
    const trees = { version: 'tree-a', deployed: 'tree-b' };
    const target = tagTarget({
      releaseCommit: 'version',
      deployed: 'deployed',
      workflowsTreeOf: (sha) => trees[sha],
    });
    assert.equal(target, 'deployed');
  });

  it('falls back on the deployed commit when no version commit is found', () => {
    const target = tagTarget({
      releaseCommit: '',
      deployed: 'deployed',
      workflowsTreeOf: () => 'tree-a',
    });
    assert.equal(target, 'deployed');
  });
});

describe('release preflight', () => {
  it('checks the API lane only when the API changed, and the web lane only when the web did', () => {
    assert.deepEqual(preflightLanes(['apps/api-dotnet/MoviePicker.Api/Program.cs']), ['dotnet']);
    assert.deepEqual(preflightLanes(['apps/web/src/main.tsx', 'e2e/home.spec.ts']), ['web']);
    assert.deepEqual(preflightLanes(['CHANGELOG.md', 'docs/roadmap.md']), []);
    assert.deepEqual(
      preflightLanes(['apps/web/src/main.tsx', 'apps/api-dotnet/Directory.Build.props']),
      ['dotnet', 'web']
    );
  });

  it('checks the web lane when the root manifest, the lockfile, turbo or the shared tsconfig changed', () => {
    for (const file of [
      'package.json',
      'pnpm-lock.yaml',
      'turbo.json',
      'configs/tsconfig.base.json',
      'configs/tsconfig.node.json',
    ]) {
      assert.deepEqual(preflightLanes([file]), ['web'], file);
    }
  });

  it('runs every lane when the changed files cannot be listed', () => {
    assert.deepEqual(preflightLanes(null), ['dotnet', 'web']);
  });

  it('lists the untracked files with the committed and uncommitted ones', () => {
    const answers = {
      'diff --name-only origin/master...HEAD': 'CHANGELOG.md',
      'diff --name-only HEAD': 'docs/roadmap.md',
      'ls-files --others --exclude-standard': 'apps/web/src/NewPage.tsx',
    };
    const changed = changedSinceMaster((args) => answers[args.join(' ')]);
    assert.deepEqual(changed, ['CHANGELOG.md', 'docs/roadmap.md', 'apps/web/src/NewPage.tsx']);
    assert.deepEqual(preflightLanes(changed), ['web']);
  });

  it('runs every lane when git cannot compare with origin/master', () => {
    const changed = changedSinceMaster(() => {
      throw new Error('unknown revision origin/master');
    });
    assert.equal(changed, null);
  });

  it('reports every Roslyn diagnostic SonarCloud would import, suggestions included', () => {
    const sarif = {
      runs: [
        {
          results: [
            {
              ruleId: 'IDE0028',
              level: 'note',
              message: { text: 'Collection initialization can be simplified' },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: 'file:///repo/Infrastructure/Repo.cs' },
                    region: { startLine: 12 },
                  },
                },
              ],
            },
            { ruleId: 'IDE0005', level: 'none', message: { text: 'hidden' } },
            {
              ruleId: 'CA1826',
              level: 'warning',
              message: { text: 'suppressed' },
              suppressions: [{ kind: 'inSource' }],
            },
          ],
        },
      ],
    };
    assert.deepEqual(roslynFindings(sarif), [
      'file:///repo/Infrastructure/Repo.cs:12 IDE0028 Collection initialization can be simplified',
    ]);
  });

  it('finds nothing in a clean build', () => {
    assert.deepEqual(roslynFindings({ runs: [{ results: [] }] }), []);
    assert.deepEqual(roslynFindings({ runs: [{}] }), []);
  });
});
