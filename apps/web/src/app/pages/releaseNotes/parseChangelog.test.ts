import { describe, expect, it } from 'vitest';
import { parseChangelog, parseInline } from './parseChangelog';

const CHANGELOG = [
  '# Changelog',
  '',
  'Intro with a [link](https://keepachangelog.com/fr/1.1.0/).',
  '',
  '## [Non publié]',
  '',
  '### Added',
  '',
  '- **Not shipped yet** : hidden.',
  '',
  '## [1.8.0] - 2026-11-12',
  '',
  '### Added',
  '',
  '- **Release notes** : every version in one page.',
  '- A plain line with `code`.',
  '',
  '### Unknown',
  '',
  '- ignored',
  '',
  '### Removed',
  '',
  '- **What is new** no longer pops up.',
  '',
  '## [1.0.0] - 2026-04-01',
  '',
  'First complete production version.',
  '',
  '### Fixed',
  '',
  '- **Wheel** : spins again.',
  '',
  '[Non publié]: https://github.com/owner/repo/compare/v1.8.0...HEAD',
  '[1.8.0]: https://github.com/owner/repo/compare/v1.0.0...v1.8.0',
  '',
].join('\n');

describe('parseChangelog', () => {
  it('lists the published versions, newest first, without the unreleased section', () => {
    const releases = parseChangelog(CHANGELOG);
    expect(releases.map((release) => [release.version, release.date])).toEqual([
      ['1.8.0', '2026-11-12'],
      ['1.0.0', '2026-04-01'],
    ]);
  });

  it('keeps the known sections in their order, with their entries', () => {
    const [latest] = parseChangelog(CHANGELOG);
    expect(latest?.sections.map((section) => [section.kind, section.items.length])).toEqual([
      ['added', 2],
      ['removed', 1],
    ]);
  });

  it('keeps the paragraph written under a version heading', () => {
    const oldest = parseChangelog(CHANGELOG).at(-1);
    expect(oldest?.summary).toEqual(['First complete production version.']);
    expect(oldest?.sections[0]?.kind).toBe('fixed');
  });

  it('stops before the comparison links', () => {
    const oldest = parseChangelog(CHANGELOG).at(-1);
    expect(oldest?.sections[0]?.items).toHaveLength(1);
  });
});

describe('parseInline', () => {
  it('splits bold and code from plain text', () => {
    expect(parseInline('**Release notes** : with `code` inside.')).toEqual([
      { text: 'Release notes', strong: true, code: false },
      { text: ' : with ', strong: false, code: false },
      { text: 'code', strong: false, code: true },
      { text: ' inside.', strong: false, code: false },
    ]);
  });

  it('keeps code inside a bold run', () => {
    expect(parseInline('**The `/e/` link** works.')).toEqual([
      { text: 'The ', strong: true, code: false },
      { text: '/e/', strong: true, code: true },
      { text: ' link', strong: true, code: false },
      { text: ' works.', strong: false, code: false },
    ]);
  });
});
