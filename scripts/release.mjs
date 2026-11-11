import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CHANGELOG = fileURLToPath(new URL('../CHANGELOG.md', import.meta.url));
const APP_VERSION_SOURCE = fileURLToPath(
  new URL('../apps/web/src/shared/appVersion.ts', import.meta.url)
);

const UNRELEASED_HEADING = '## [Non publié]\n';
const APP_VERSION_PATTERN = /APP_VERSION = '(\d+\.\d+\.\d+)'/;
const UNRELEASED_LINK_PATTERN = /^\[Non publié\]: (\S+)\/compare\/v(\d+\.\d+\.\d+)\.\.\.HEAD$/m;

function entriesUnder(body, heading) {
  const lines = body.split('\n');
  let inside = heading === undefined;
  let count = 0;
  for (const line of lines) {
    if (line.startsWith('### ')) inside = heading === undefined || line === `### ${heading}`;
    else if (inside && line.startsWith('- ')) count += 1;
  }
  return count;
}

export function bumpFor(unreleased) {
  if (entriesUnder(unreleased, 'Added') > 0) return 'minor';
  if (entriesUnder(unreleased) > 0) return 'patch';
  return null;
}

export function nextVersion(current, bump) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) throw new Error(`${current} is not a x.y.z version.`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function unreleasedSection(changelog) {
  const start = changelog.indexOf(UNRELEASED_HEADING);
  if (start === -1) throw new Error('CHANGELOG.md has no [Non publié] section.');
  const bodyStart = start + UNRELEASED_HEADING.length;
  const next = changelog.indexOf('\n## [', bodyStart - 1);
  return changelog.slice(bodyStart, next === -1 ? changelog.length : next);
}

export function releaseChangelog(changelog, { previous, version, date }) {
  const link = UNRELEASED_LINK_PATTERN.exec(changelog);
  if (!link) throw new Error('CHANGELOG.md has no [Non publié] comparison link.');
  const [line, repository, linked] = link;
  if (linked !== previous) {
    throw new Error(`The [Non publié] link starts from v${linked}, the web app says ${previous}.`);
  }
  return changelog
    .replace(UNRELEASED_HEADING, `${UNRELEASED_HEADING}\n## [${version}] - ${date}\n`)
    .replace(
      line,
      [
        `[Non publié]: ${repository}/compare/v${version}...HEAD`,
        `[${version}]: ${repository}/compare/v${previous}...v${version}`,
      ].join('\n')
    );
}

export function releaseNotes(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${version}] - `));
  if (start === -1) throw new Error(`CHANGELOG.md has no section for ${version}.`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## ') || /^\[[^\]]+\]: \S+$/.test(line));
  return rest
    .slice(0, end === -1 ? rest.length : end)
    .join('\n')
    .trim();
}

export function withAppVersion(source, version) {
  if (!APP_VERSION_PATTERN.test(source))
    throw new Error('No APP_VERSION constant in the web app source.');
  return source.replace(APP_VERSION_PATTERN, `APP_VERSION = '${version}'`);
}

function currentVersion() {
  const match = APP_VERSION_PATTERN.exec(readFileSync(APP_VERSION_SOURCE, 'utf8'));
  if (!match) throw new Error('No APP_VERSION constant in the web app source.');
  return match[1];
}

function parisDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
}

function prepare(forceMajor) {
  const changelog = readFileSync(CHANGELOG, 'utf8');
  const bump = bumpFor(unreleasedSection(changelog));
  if (!bump) {
    console.log('Nothing to release: [Non publié] lists no change. Deploy without a new version.');
    return;
  }
  const previous = currentVersion();
  const kind = forceMajor ? 'major' : bump;
  const version = nextVersion(previous, kind);
  writeFileSync(CHANGELOG, releaseChangelog(changelog, { previous, version, date: parisDate() }));
  writeFileSync(
    APP_VERSION_SOURCE,
    withAppVersion(readFileSync(APP_VERSION_SOURCE, 'utf8'), version)
  );
  console.log(
    `Released ${version} (${kind}, from ${previous}). Commit it as "chore(release): ${version}".`
  );
}

function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === 'current') {
    console.log(currentVersion());
  } else if (command === 'notes') {
    console.log(releaseNotes(readFileSync(CHANGELOG, 'utf8'), argument ?? currentVersion()));
  } else if (command === undefined || command === '--major') {
    prepare(command === '--major');
  } else {
    console.error('Usage: node scripts/release.mjs [--major] | current | notes [version]');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
