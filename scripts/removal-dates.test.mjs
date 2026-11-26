import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  dueDateOf,
  isIsoDate,
  parseAfter,
  readReleaseDates,
  releaseKey,
  repositorySlug,
} from './removal-dates.mjs';

describe('addDays', () => {
  it('counts calendar days in UTC', () => {
    assert.equal(addDays('2026-09-05', 410), '2027-10-20');
    assert.equal(addDays('2026-10-14', 410), '2027-11-28');
  });

  it('crosses a leap day', () => {
    assert.equal(addDays('2027-12-31', 60), '2028-02-29');
  });
});

describe('isIsoDate', () => {
  it('accepts a real calendar day only', () => {
    assert.equal(isIsoDate('2026-11-25'), true);
    assert.equal(isIsoDate('2026-02-30'), false);
    assert.equal(isIsoDate('2026-11-25T10:00:00Z'), false);
    assert.equal(isIsoDate(undefined), false);
  });
});

describe('parseAfter', () => {
  it('reads a fixed date', () => {
    assert.deepEqual(parseAfter({ date: '2027-01-15' }, 'entry'), { date: '2027-01-15' });
  });

  it('reads a delay after a release reaches production', () => {
    assert.deepEqual(parseAfter({ release: 'v1.32.1', days: 30 }, 'entry'), {
      release: 'v1.32.1',
      days: 30,
    });
  });

  it('reads a delay after the first release that follows a version', () => {
    assert.deepEqual(parseAfter({ firstReleaseAfter: 'v1.32.1', days: 30 }, 'entry'), {
      firstReleaseAfter: 'v1.32.1',
      days: 30,
    });
  });

  it('refuses anything else and names the entry', () => {
    for (const after of [
      undefined,
      { date: '2027-13-01' },
      { release: '1.32.1', days: 30 },
      { release: 'v1.32.1' },
      { release: 'v1.32.1', days: -1 },
      { release: 'v1.32.1', firstReleaseAfter: 'v1.32.1', days: 30 },
    ]) {
      assert.throws(
        () => parseAfter(after, 'removals[2]'),
        /^Error: removals\[2\]: "after" must be/
      );
    }
  });
});

describe('dueDateOf', () => {
  it('keeps a fixed date as it is', () => {
    assert.deepEqual(dueDateOf({ date: '2027-01-15' }, new Map()), {
      date: '2027-01-15',
      basis: 'fixed date',
    });
  });

  it('counts the delay from the day the release reached production', () => {
    const dates = new Map([['v1.32.1', { tag: 'v1.32.1', publishedOn: '2026-12-02' }]]);

    assert.deepEqual(dueDateOf({ release: 'v1.32.1', days: 30 }, dates), {
      date: '2027-01-01',
      basis: '30 days after v1.32.1 reached production on 2026-12-02',
    });
  });

  it('names the release that came first after a version', () => {
    const after = { firstReleaseAfter: 'v1.32.1', days: 30 };
    const dates = new Map([[releaseKey(after), { tag: 'v1.33.0', publishedOn: '2026-12-02' }]]);

    assert.deepEqual(dueDateOf(after, dates), {
      date: '2027-01-01',
      basis:
        '30 days after v1.33.0, the first release after v1.32.1, reached production on 2026-12-02',
    });
    assert.deepEqual(dueDateOf(after, new Map([[releaseKey(after), { unpublished: true }]])), {
      date: null,
      basis: '30 days after the first release after v1.32.1 reaches production, not there yet',
    });
  });

  it('has no date while the release has not reached production', () => {
    const dates = new Map([['v1.32.1', { unpublished: true }]]);

    assert.deepEqual(dueDateOf({ release: 'v1.32.1', days: 30 }, dates), {
      date: null,
      basis: '30 days after v1.32.1 reaches production, not there yet',
    });
  });

  it('has no date and says why when the production date could not be read', () => {
    const dates = new Map([['v1.32.1', { unknown: 'GitHub answered 403' }]]);

    assert.deepEqual(dueDateOf({ release: 'v1.32.1', days: 30 }, dates), {
      date: null,
      basis: '30 days after v1.32.1 reaches production',
      unknown: 'production date of v1.32.1 unreadable: GitHub answered 403',
    });
  });
});

describe('readReleaseDates', () => {
  const LISTED = 'a1\trefs/tags/v1.31.1\nb2\trefs/tags/v1.32.1\n';
  const PUBLISHED = { status: 200, body: { published_at: '2026-12-02T09:14:00Z' } };
  const V1_32_1 = { release: 'v1.32.1', days: 30 };

  it('asks GitHub only for the releases origin carries', async () => {
    const asked = [];
    const dates = await readReleaseDates([V1_32_1, { release: 'v1.40.0', days: 30 }, V1_32_1], {
      listTags: () => LISTED,
      fetchRelease: async (tag) => {
        asked.push(tag);
        return PUBLISHED;
      },
    });

    assert.deepEqual(asked, ['v1.32.1']);
    assert.deepEqual(dates.get('v1.32.1'), { tag: 'v1.32.1', publishedOn: '2026-12-02' });
    assert.deepEqual(dates.get('v1.40.0'), { unpublished: true });
  });

  it('picks the lowest version above the one named, by number and not by text', async () => {
    const after = { firstReleaseAfter: 'v1.32.1', days: 30 };
    const asked = [];
    const dates = await readReleaseDates([after], {
      listTags: () =>
        ['refs/tags/v1.4.0', 'refs/tags/v1.33.0', 'refs/tags/v1.32.10', 'refs/tags/v1.32.1']
          .map((ref) => `x\t${ref}`)
          .join('\n'),
      fetchRelease: async (tag) => {
        asked.push(tag);
        return PUBLISHED;
      },
    });

    assert.deepEqual(asked, ['v1.32.10']);
    assert.deepEqual(dates.get(releaseKey(after)), {
      tag: 'v1.32.10',
      publishedOn: '2026-12-02',
    });
  });

  it('has nothing published while no release follows the one named', async () => {
    const after = { firstReleaseAfter: 'v1.32.1', days: 30 };
    const dates = await readReleaseDates([after], {
      listTags: () => LISTED,
      fetchRelease: async () => assert.fail('nothing to read'),
    });

    assert.deepEqual(dates.get(releaseKey(after)), { unpublished: true });
  });

  it('makes no call at all without a release to resolve', async () => {
    const dates = await readReleaseDates([], {
      listTags: () => assert.fail('no tag to list'),
      fetchRelease: async () => assert.fail('no release to read'),
    });

    assert.equal(dates.size, 0);
  });

  it('marks a release unknown when GitHub refuses or fails', async () => {
    const refused = await readReleaseDates([V1_32_1], {
      listTags: () => LISTED,
      fetchRelease: async () => ({ status: 403, body: null }),
    });
    const failed = await readReleaseDates([V1_32_1], {
      listTags: () => LISTED,
      fetchRelease: async () => {
        throw new Error('getaddrinfo ENOTFOUND api.github.com\nstack');
      },
    });

    assert.deepEqual(refused.get('v1.32.1'), { unknown: 'GitHub answered 403 for v1.32.1' });
    assert.deepEqual(failed.get('v1.32.1'), { unknown: 'getaddrinfo ENOTFOUND api.github.com' });
  });

  it('marks every release unknown when origin cannot be listed', async () => {
    const dates = await readReleaseDates([V1_32_1], {
      listTags: () => {
        throw new Error('fatal: unable to access origin');
      },
      fetchRelease: async () => assert.fail('nothing to read'),
    });

    assert.deepEqual(dates.get('v1.32.1'), {
      unknown: 'git ls-remote failed: fatal: unable to access origin',
    });
  });
});

describe('repositorySlug', () => {
  it('reads owner and name from an https or ssh remote', () => {
    assert.equal(repositorySlug('https://github.com/owner/repo.git\n'), 'owner/repo');
    assert.equal(repositorySlug('https://github.com/owner/repo'), 'owner/repo');
    assert.equal(repositorySlug('git@github.com:owner/repo.git'), 'owner/repo');
  });

  it('returns null for a remote outside GitHub', () => {
    assert.equal(repositorySlug('https://gitlab.com/owner/repo.git'), null);
  });
});
