import { execFileSync } from 'node:child_process';

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RELEASE_TAG = /^v\d+\.\d+\.\d+$/;
const LISTED_TAG = /refs\/tags\/(v\d+\.\d+\.\d+)$/;
const GITHUB_REMOTE = /github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/;
const GITHUB_TIMEOUT_MS = 10_000;

export function isIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

export function addDays(isoDate, days) {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function hasOnly(object, keys) {
  return Object.keys(object).every((key) => keys.includes(key));
}

export function parseAfter(after, where) {
  if (after && hasOnly(after, ['date']) && isIsoDate(after.date)) return { date: after.date };
  const delay = after && Number.isInteger(after.days) && after.days >= 0;
  if (delay && hasOnly(after, ['release', 'days']) && RELEASE_TAG.test(after.release ?? ''))
    return { release: after.release, days: after.days };
  if (
    delay &&
    hasOnly(after, ['firstReleaseAfter', 'days']) &&
    RELEASE_TAG.test(after.firstReleaseAfter ?? '')
  )
    return { firstReleaseAfter: after.firstReleaseAfter, days: after.days };
  throw new Error(
    `${where}: "after" must be {"date": "YYYY-MM-DD"}, {"release": "vX.Y.Z", "days": N} or {"firstReleaseAfter": "vX.Y.Z", "days": N}`
  );
}

export function releaseKey(after) {
  return after.release ?? `first release after ${after.firstReleaseAfter}`;
}

function publishedRelease(after, tag) {
  return after.release ? tag : `${tag}, the first release after ${after.firstReleaseAfter},`;
}

export function dueDateOf(after, releaseDates) {
  if (after.date) return { date: after.date, basis: 'fixed date' };
  const subject = after.release ?? `the first release after ${after.firstReleaseAfter}`;
  const release = releaseDates.get(releaseKey(after));
  if (release?.publishedOn)
    return {
      date: addDays(release.publishedOn, after.days),
      basis: `${after.days} days after ${publishedRelease(after, release.tag)} reached production on ${release.publishedOn}`,
    };
  if (release?.unknown)
    return {
      date: null,
      basis: `${after.days} days after ${subject} reaches production`,
      unknown: `production date of ${subject} unreadable: ${release.unknown}`,
    };
  return {
    date: null,
    basis: `${after.days} days after ${subject} reaches production, not there yet`,
  };
}

function versionOf(tag) {
  return tag.slice(1).split('.').map(Number);
}

function compareVersions(a, b) {
  const [left, right] = [versionOf(a), versionOf(b)];
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

function tagFor(after, listed) {
  if (after.release) return listed.includes(after.release) ? after.release : null;
  return listed.find((tag) => compareVersions(tag, after.firstReleaseAfter) > 0) ?? null;
}

function firstLine(message) {
  return String(message).split('\n')[0].trim();
}

async function publishedOnOf(tag, fetchRelease) {
  try {
    const { status, body } = await fetchRelease(tag);
    const publishedOn = String(body?.published_at ?? '').slice(0, 10);
    return status === 200 && isIsoDate(publishedOn)
      ? { tag, publishedOn }
      : { unknown: `GitHub answered ${status} for ${tag}` };
  } catch (error) {
    return { unknown: firstLine(error.message) };
  }
}

export async function readReleaseDates(afters, { listTags, fetchRelease }) {
  const dates = new Map();
  const wanted = [...new Map(afters.map((after) => [releaseKey(after), after])).values()];
  if (wanted.length === 0) return dates;
  let listed;
  try {
    listed = listTags()
      .split('\n')
      .map((line) => LISTED_TAG.exec(line.trim())?.[1])
      .filter(Boolean)
      .sort(compareVersions);
  } catch (error) {
    for (const after of wanted)
      dates.set(releaseKey(after), {
        unknown: `git ls-remote failed: ${firstLine(error.message)}`,
      });
    return dates;
  }
  for (const after of wanted) {
    const tag = tagFor(after, listed);
    dates.set(
      releaseKey(after),
      tag ? await publishedOnOf(tag, fetchRelease) : { unpublished: true }
    );
  }
  return dates;
}

export function repositorySlug(remoteUrl) {
  return GITHUB_REMOTE.exec(remoteUrl.trim())?.[1] ?? null;
}

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function githubRelease(root, env) {
  return async (tag) => {
    const slug =
      env.GITHUB_REPOSITORY ?? repositorySlug(git(root, ['remote', 'get-url', 'origin']));
    if (!slug) throw new Error('origin is not a GitHub repository');
    const token = env.GH_TOKEN ?? env.GITHUB_TOKEN;
    const response = await fetch(`https://api.github.com/repos/${slug}/releases/tags/${tag}`, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'removal-schedule-check',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    });
    return { status: response.status, body: response.ok ? await response.json() : null };
  };
}

export function releaseDatesFor(afters, root, env = process.env) {
  return readReleaseDates(afters, {
    listTags: () => git(root, ['ls-remote', '--tags', '--refs', 'origin', 'refs/tags/v*']),
    fetchRelease: githubRelease(root, env),
  });
}
