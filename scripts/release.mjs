import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHANGELOG = fileURLToPath(new URL('../CHANGELOG.md', import.meta.url));
const APP_VERSION_SOURCE = fileURLToPath(
  new URL('../apps/web/src/shared/appVersion.ts', import.meta.url)
);

const UNRELEASED_HEADING = '## [Non publié]\n';
const APP_VERSION_PATTERN = /APP_VERSION = '(\d+\.\d+\.\d+)'/;
const UNRELEASED_LINK_PATTERN = /^\[Non publié\]: (\S+)\/compare\/v(\d+\.\d+\.\d+)\.\.\.HEAD$/m;
const RELEASE_HEADING_PATTERN = /^## \[(\d+\.\d+\.\d+)\] - /;
const ENTRY_LEAD_PATTERN = /^- \*\*(.+?)\*\*/;
const FRENCH_HEADINGS = {
  Added: 'Nouveautés',
  Changed: 'Changements',
  Deprecated: 'Bientôt retiré',
  Removed: 'Retraits',
  Fixed: 'Corrections',
  Security: 'Sécurité',
};
const LANE_PATHS = {
  dotnet: ['apps/api-dotnet/'],
  web: [
    'apps/web/',
    'e2e/',
    'eslint.config.mjs',
    'scripts/eslint-sonar-a11y.mjs',
    'playwright.config.ts',
    'package.json',
    'pnpm-lock.yaml',
    'turbo.json',
    'configs/tsconfig',
  ],
};
const DOTNET_SOLUTION = 'apps/api-dotnet/MoviePicker.slnx';
const ROSLYN_LOG = 'obj/roslyn-preflight.sarif';

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

export function freeVersion(current, bump, isPublished) {
  let version = nextVersion(current, bump);
  while (isPublished(version)) version = nextVersion(version, bump);
  return version;
}

export function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

export function versionsAfter(changelog, published) {
  return changelog
    .split('\n')
    .map((line) => RELEASE_HEADING_PATTERN.exec(line)?.[1])
    .filter((version) => version !== undefined && compareVersions(version, published) > 0)
    .sort(compareVersions);
}

export function commandOf(args) {
  const [command, argument] = args.filter((arg) => arg !== '--');
  return [command, argument];
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

function sectionLines(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${version}] - `));
  if (start === -1) throw new Error(`CHANGELOG.md has no section for ${version}.`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## ') || /^\[[^\]]+\]: \S+$/.test(line));
  return rest.slice(0, end === -1 ? rest.length : end);
}

function inFrench(line) {
  const heading = /^### (\w+)$/.exec(line)?.[1];
  return heading && FRENCH_HEADINGS[heading] ? `### ${FRENCH_HEADINGS[heading]}` : line;
}

export function releaseNotes(changelog, version) {
  return sectionLines(changelog, version).map(inFrench).join('\n').trim();
}

export function releaseTitle(changelog, version) {
  const firstEntry = sectionLines(changelog, version).find((line) => line.startsWith('- '));
  const lead = firstEntry ? ENTRY_LEAD_PATTERN.exec(firstEntry)?.[1] : undefined;
  return lead ? `${version} : ${lead}` : version;
}

export function releaseCommitPattern(version) {
  return String.raw`^chore\(release\): ${version.replaceAll('.', String.raw`\.`)}$`;
}

export function tagTarget({ releaseCommit, deployed, workflowsTreeOf }) {
  if (!releaseCommit) return deployed;
  return workflowsTreeOf(releaseCommit) === workflowsTreeOf(deployed) ? releaseCommit : deployed;
}

export function preflightLanes(changedFiles) {
  const lanes = Object.keys(LANE_PATHS);
  if (changedFiles === null) return lanes;
  return lanes.filter((lane) =>
    changedFiles.some((file) => LANE_PATHS[lane].some((path) => file.startsWith(path)))
  );
}

function locationOf(result) {
  const physical = result.locations?.[0]?.physicalLocation;
  const uri = physical?.artifactLocation?.uri ?? '?';
  return `${uri}:${physical?.region?.startLine ?? '?'}`;
}

export function roslynFindings(sarif) {
  return (sarif.runs ?? [])
    .flatMap((run) => run.results ?? [])
    .filter((result) => result.level !== 'none' && !(result.suppressions?.length > 0))
    .map((result) => `${locationOf(result)} ${result.ruleId} ${result.message?.text ?? ''}`.trim());
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

function tagPublished(version) {
  try {
    return (
      execFileSync('git', ['ls-remote', '--tags', 'origin', `refs/tags/v${version}`], {
        encoding: 'utf8',
      }).trim() !== ''
    );
  } catch {
    console.warn(`Could not read the tags of origin: v${version} is not checked against them.`);
    return false;
  }
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function run(command, args) {
  console.log(`Preflight: ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
}

export function changedSinceMaster(runGit = git) {
  try {
    return [
      runGit(['diff', '--name-only', 'origin/master...HEAD']),
      runGit(['diff', '--name-only', 'HEAD']),
      runGit(['ls-files', '--others', '--exclude-standard']),
    ]
      .flatMap((listing) => listing.split('\n'))
      .filter(Boolean);
  } catch {
    console.warn('Could not compare with origin/master: every preflight lane runs.');
    return null;
  }
}

function solutionProjectDirs() {
  const solution = readFileSync(join(ROOT, DOTNET_SOLUTION), 'utf8');
  return [...solution.matchAll(/Path="([^"]+)\.csproj"/g)].map(([, project]) =>
    join(ROOT, dirname(DOTNET_SOLUTION), dirname(project))
  );
}

function checkDotnetLane() {
  const logs = solutionProjectDirs().map((dir) => join(dir, ROSLYN_LOG));
  for (const log of logs) rmSync(log, { force: true });
  run('dotnet', [
    'build',
    DOTNET_SOLUTION,
    '-c',
    'Release',
    '--no-incremental',
    '-warnaserror',
    `-p:ErrorLog=${ROSLYN_LOG}%2Cversion=2.1`,
  ]);
  const findings = logs.flatMap((log) => {
    if (!existsSync(log)) throw new Error(`The build wrote no ${log}: the analysers did not run.`);
    return roslynFindings(JSON.parse(readFileSync(log, 'utf8')));
  });
  if (findings.length > 0) {
    throw new Error(
      [
        'The Release build passes, but SonarCloud imports these analyser findings as issues (external_roslyn):',
        ...findings.map((finding) => `  ${finding}`),
      ].join('\n')
    );
  }
  run('pnpm', ['run', 'format:dotnet:check']);
}

const LANE_CHECKS = {
  dotnet: checkDotnetLane,
  web: () => run('pnpm', ['run', 'lint']),
};

function preflight() {
  const lanes = preflightLanes(changedSinceMaster());
  if (lanes.length === 0) {
    console.log('Preflight: nothing the CI builds changed since origin/master.');
    return;
  }
  for (const lane of lanes) LANE_CHECKS[lane]();
  console.log(`Preflight passed: ${lanes.join(', ')}.`);
}

function prepare(forceMajor) {
  const changelog = readFileSync(CHANGELOG, 'utf8');
  const bump = bumpFor(unreleasedSection(changelog));
  if (!bump) {
    console.log('Nothing to release: [Non publié] lists no change. Deploy without a new version.');
    return;
  }
  preflight();
  const previous = currentVersion();
  const kind = forceMajor ? 'major' : bump;
  const version = freeVersion(previous, kind, tagPublished);
  writeFileSync(CHANGELOG, releaseChangelog(changelog, { previous, version, date: parisDate() }));
  writeFileSync(
    APP_VERSION_SOURCE,
    withAppVersion(readFileSync(APP_VERSION_SOURCE, 'utf8'), version)
  );
  console.log(
    `Released ${version} (${kind}, from ${previous}). Commit it as "chore(release): ${version}".`
  );
}

function printTagTarget(version) {
  const deployed = git(['rev-parse', 'HEAD']);
  const releaseCommit = git([
    'log',
    '-1',
    '--format=%H',
    '--extended-regexp',
    `--grep=${releaseCommitPattern(version)}`,
    deployed,
  ]);
  console.log(
    tagTarget({
      releaseCommit,
      deployed,
      workflowsTreeOf: (sha) => git(['rev-parse', `${sha}:.github/workflows`]),
    })
  );
}

function main() {
  const [command, argument] = commandOf(process.argv.slice(2));
  if (command === 'current') {
    console.log(currentVersion());
  } else if (command === 'since' && argument) {
    for (const version of versionsAfter(readFileSync(CHANGELOG, 'utf8'), argument)) {
      console.log(version);
    }
  } else if (command === 'notes') {
    console.log(releaseNotes(readFileSync(CHANGELOG, 'utf8'), argument ?? currentVersion()));
  } else if (command === 'title') {
    console.log(releaseTitle(readFileSync(CHANGELOG, 'utf8'), argument ?? currentVersion()));
  } else if (command === 'target' && argument) {
    printTagTarget(argument);
  } else if (command === 'preflight') {
    preflight();
  } else if (command === undefined || command === '--major') {
    prepare(command === '--major');
  } else {
    console.error(
      'Usage: node scripts/release.mjs [--major] | current | since <version> | notes [version] | title [version] | target <version> | preflight'
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
