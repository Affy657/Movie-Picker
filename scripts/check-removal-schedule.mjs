#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  addDays,
  dueDateOf,
  isIsoDate,
  parseAfter,
  releaseDatesFor,
  releaseKey,
  todayUtc,
} from './removal-dates.mjs';

const root = resolve(import.meta.dirname, '..');
const SCHEDULE = 'scripts/removal-schedule.json';
const API_ROOT = 'apps/api-dotnet';
const API = `${API_ROOT}/MoviePicker.Api`;
const MIGRATIONS = `${API}/Infrastructure/Migrations`;
const PORTS = `${API}/Application/Ports`;
const PERSISTENCE = `${API}/Infrastructure/Persistence`;
const BACKUP_TERRAFORM = 'infra/terraform/environments/production/main.tf';
const SECONDS_PER_DAY = 86_400;
const LIFECYCLE_PASSES_DAYS = 3;
const SKIPPED_DIRECTORIES = new Set(['bin', 'obj', 'node_modules', '.git']);
const BUILD_OUTPUT = /(^|\/)(bin|obj|node_modules)\//;
const BACKUP_BUCKET = /resource\s+"google_storage_bucket"\s+"backups"\s*\{([\s\S]*?)\n\}/;
const LIFECYCLE_CONDITION = /condition\s*\{([^}]*)\}/g;
const MIGRATION_CLASS = /\bclass\s+(\w+)\s*:[^{]*\bIDataMigration\b/;
const MIGRATION_ID = /\bstring\s+Id\s*=>\s*"([^"]*)"/;
const DATED_ID = /^(\d{4}-\d{2}-\d{2})-/;
const MEMBER_CALL = /\.\s*([A-Z]\w*Async)\b/g;

export function backupRetentionDays(terraform) {
  const bucket = BACKUP_BUCKET.exec(terraform)?.[1] ?? '';
  const monthly = [...bucket.matchAll(LIFECYCLE_CONDITION)]
    .map((match) => match[1])
    .find((condition) => condition.includes('"monthly/"'));
  const age = monthly && /\bage\s*=\s*(\d+)/.exec(monthly);
  if (!age)
    throw new Error(
      `${BACKUP_TERRAFORM}: no lifecycle age for the monthly/ copies of the backups bucket`
    );
  const softDelete = /soft_delete_policy\s*\{[^}]*\bretention_duration_seconds\s*=\s*(\d+)/.exec(
    bucket
  );
  if (!softDelete)
    throw new Error(`${BACKUP_TERRAFORM}: no soft delete retention on the backups bucket`);
  return (
    Number(age[1]) + Math.ceil(Number(softDelete[1]) / SECONDS_PER_DAY) + LIFECYCLE_PASSES_DAYS
  );
}

function sourcesIn(repo, dir) {
  if (!repo.isDirectory(dir)) return [];
  return repo.list(dir).filter((file) => file.endsWith('.cs') && !BUILD_OUTPUT.test(file));
}

export function migrationsOf(repo) {
  const migrations = [];
  const errors = [];
  for (const file of sourcesIn(repo, MIGRATIONS)) {
    const source = repo.read(file);
    const className = MIGRATION_CLASS.exec(source)?.[1];
    if (!className) continue;
    const id = MIGRATION_ID.exec(source)?.[1] ?? '';
    const identifierDate = DATED_ID.exec(id)?.[1];
    if (!isIsoDate(identifierDate)) {
      errors.push(
        `${file}: the identifier "${id}" does not start with its date (YYYY-MM-DD-NNN-name), so its removal date cannot be derived`
      );
      continue;
    }
    migrations.push({ id, className, file, identifierDate, source });
  }
  return { migrations, errors };
}

export function migrationOnlyPortMethods(repo, migration) {
  const ports = sourcesIn(repo, PORTS).map((file) => repo.read(file));
  const elsewhere = sourcesIn(repo, API)
    .filter(
      (file) =>
        file !== migration.file &&
        !file.startsWith(`${PORTS}/`) &&
        !file.startsWith(`${PERSISTENCE}/`)
    )
    .map((file) => repo.read(file));
  const called = new Set([...migration.source.matchAll(MEMBER_CALL)].map((match) => match[1]));
  return [...called]
    .filter((name) => {
      const declaration = new RegExp(`\\b${name}\\s*\\(`);
      const call = new RegExp(`\\.\\s*${name}\\b`);
      return (
        ports.some((source) => declaration.test(source)) &&
        !elsewhere.some((source) => call.test(source))
      );
    })
    .sort();
}

function filesNaming(repo, names) {
  const patterns = names.map((name) => new RegExp(`\\b${name}\\b`));
  return sourcesIn(repo, API_ROOT).filter((file) =>
    patterns.some((pattern) => pattern.test(repo.read(file)))
  );
}

function parseRemoval(entry, where) {
  for (const field of ['what', 'why']) {
    if (typeof entry?.[field] !== 'string' || entry[field].trim() === '')
      throw new Error(`${where}: "${field}" must be a non-empty string`);
  }
  const after = parseAfter(entry.after, where);
  const { path, pattern } = entry.exists ?? {};
  if (typeof path !== 'string' || path === '' || typeof pattern !== 'string' || pattern === '')
    throw new Error(`${where}: "exists" must give a "path" and a "pattern"`);
  let expression;
  try {
    expression = new RegExp(pattern, 'm');
  } catch (error) {
    throw new Error(
      `${where}: "exists.pattern" is not a valid regular expression (${error.message})`
    );
  }
  return { what: entry.what, why: entry.why, after, path, pattern: expression };
}

export function parseSchedule(json) {
  const errors = [];
  const removals = [];
  const entries = Array.isArray(json?.removals) ? json.removals : [];
  if (!Array.isArray(json?.removals)) errors.push(`${SCHEDULE}: "removals" must be an array`);
  for (const [index, entry] of entries.entries()) {
    try {
      removals.push(parseRemoval(entry, `removals[${index}]`));
    } catch (error) {
      errors.push(error.message);
    }
  }
  const appliedAt = new Map();
  for (const [id, date] of Object.entries(json?.migrationAppliedAt ?? {})) {
    if (isIsoDate(date)) appliedAt.set(id, date);
    else errors.push(`migrationAppliedAt["${id}"]: "${date}" is not a date YYYY-MM-DD`);
  }
  return { removals, appliedAt, errors };
}

function presenceOf(repo, removal) {
  if (repo.isFile(removal.path))
    return removal.pattern.test(repo.read(removal.path)) ? 'there' : 'gone';
  if (repo.isDirectory(removal.path))
    return repo
      .list(removal.path)
      .filter((file) => !BUILD_OUTPUT.test(file))
      .some((file) => removal.pattern.test(repo.read(file)))
      ? 'there'
      : 'gone';
  return 'missing';
}

export function releasesToResolve(schedule, repo) {
  const afters = schedule.removals
    .filter((removal) => !removal.after.date && presenceOf(repo, removal) === 'there')
    .map((removal) => removal.after);
  return [...new Map(afters.map((after) => [releaseKey(after), after])).values()];
}

function evaluateRemoval(removal, { repo, today, releaseDates }, result) {
  const shown = `/${removal.pattern.source}/`;
  const presence = presenceOf(repo, removal);
  if (presence !== 'there') {
    const reason =
      presence === 'missing'
        ? `${removal.path} does not exist any more`
        : `${shown} no longer matches ${removal.path}`;
    result.dead.push({
      label: removal.what,
      message: `${reason}: the removal is done, delete this entry from ${SCHEDULE}`,
    });
    return;
  }
  const due = dueDateOf(removal.after, releaseDates);
  if (due.unknown) result.warnings.push(`${removal.what}: ${due.unknown}`);
  const item = { label: removal.what, date: due.date, basis: due.basis };
  if (!due.date || due.date > today) {
    result.waiting.push(item);
    return;
  }
  result.due.push({
    ...item,
    steps: [
      `why it waited: ${removal.why}`,
      `${shown} still matches ${removal.path}`,
      `remove it, then delete this entry from ${SCHEDULE}`,
    ],
  });
}

function migrationSteps(repo, migration, appliedAt, retentionDays) {
  const methods = migrationOnlyPortMethods(repo, migration);
  const steps = [];
  if (!appliedAt)
    steps.push(
      `first read its production appliedAt (db.migrations.findOne({ _id: "${migration.id}" })): if appliedAt plus ${retentionDays} days is still ahead, record it under migrationAppliedAt in ${SCHEDULE} and wait`
    );
  const ports =
    methods.length > 0
      ? `the port methods only it calls: ${methods.join(', ')}, with their InMemory and Mongo implementations`
      : 'no port method (it calls none alone)';
  steps.push(
    `remove ${migration.className}, its line in DataMigrationServiceCollectionExtensions, ${ports}, and their tests`,
    'files that name them:',
    ...filesNaming(repo, [migration.className, ...methods]).map((file) => `  ${file}`)
  );
  return steps;
}

function evaluateMigrations(schedule, { repo, today, retentionDays }, result) {
  const { migrations, errors } = migrationsOf(repo);
  result.errors.push(...errors);
  const ids = new Set(migrations.map((migration) => migration.id));
  for (const id of schedule.appliedAt.keys()) {
    if (!ids.has(id))
      result.dead.push({
        label: `migrationAppliedAt["${id}"]`,
        message: `no migration carries this identifier any more, delete the key from ${SCHEDULE}`,
      });
  }
  for (const migration of migrations) {
    const appliedAt = schedule.appliedAt.get(migration.id);
    if (appliedAt && appliedAt < migration.identifierDate) {
      result.errors.push(
        `migrationAppliedAt["${migration.id}"]: ${appliedAt} is before the identifier date ${migration.identifierDate}`
      );
      continue;
    }
    const start = appliedAt ?? migration.identifierDate;
    const item = {
      label: `migration ${migration.id}`,
      date: addDays(start, retentionDays),
      basis: `${appliedAt ? 'production appliedAt' : 'identifier date'} ${start} plus ${retentionDays} days of backup retention`,
    };
    if (item.date > today) result.waiting.push(item);
    else
      result.due.push({
        ...item,
        steps: migrationSteps(repo, migration, appliedAt, retentionDays),
      });
  }
}

export function evaluateSchedule({ schedule, repo, today, releaseDates, retentionDays }) {
  const result = { due: [], dead: [], waiting: [], warnings: [], errors: [...schedule.errors] };
  for (const removal of schedule.removals)
    evaluateRemoval(removal, { repo, today, releaseDates }, result);
  evaluateMigrations(schedule, { repo, today, retentionDays }, result);
  return result;
}

function waitingLines(waiting) {
  return [...waiting]
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
    .map((item) => `  ${(item.date ?? 'no date').padEnd(10)}  ${item.label} (${item.basis})`);
}

export function formatReport({ due, dead, waiting, warnings, errors }) {
  const ok = due.length === 0 && dead.length === 0 && errors.length === 0;
  const lines = [
    ok
      ? `Removal schedule (${SCHEDULE}): nothing due, ${waiting.length} waiting.`
      : `Removal schedule (${SCHEDULE}, AGENTS.md "Migrations de données") fails.`,
  ];
  if (errors.length > 0) lines.push('Cannot be checked:', ...errors.map((error) => `  - ${error}`));
  if (due.length > 0) {
    lines.push('Due, remove now:');
    for (const item of due)
      lines.push(
        `  - ${item.label}, due since ${item.date} (${item.basis})`,
        ...item.steps.map((step) => `    ${step}`)
      );
  }
  if (dead.length > 0) {
    lines.push('Dead lines, the thing is already gone:');
    for (const item of dead) lines.push(`  - ${item.label}: ${item.message}`);
  }
  for (const warning of warnings) lines.push(`Warning: ${warning}`);
  if (waiting.length > 0) lines.push('Waiting:', ...waitingLines(waiting));
  return { ok, text: lines.join('\n') };
}

function walk(base, dir) {
  const files = [];
  for (const entry of readdirSync(join(base, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) files.push(...walk(base, path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

function fileRepo(base) {
  const contents = new Map();
  const listings = new Map();
  const stat = (path) => {
    try {
      return statSync(join(base, path));
    } catch {
      return null;
    }
  };
  return {
    read: (path) => {
      if (!contents.has(path)) contents.set(path, readFileSync(join(base, path), 'utf8'));
      return contents.get(path);
    },
    isFile: (path) => stat(path)?.isFile() ?? false,
    isDirectory: (path) => stat(path)?.isDirectory() ?? false,
    list: (dir) => {
      if (!listings.has(dir)) listings.set(dir, walk(base, dir).sort());
      return listings.get(dir);
    },
  };
}

async function main() {
  const repo = fileRepo(root);
  const schedule = parseSchedule(JSON.parse(repo.read(SCHEDULE)));
  const retentionDays = backupRetentionDays(repo.read(BACKUP_TERRAFORM));
  const releaseDates = await releaseDatesFor(releasesToResolve(schedule, repo), root);
  const report = formatReport(
    evaluateSchedule({ schedule, repo, today: todayUtc(), releaseDates, retentionDays })
  );
  if (report.ok) {
    console.log(report.text);
    return;
  }
  console.error(report.text);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
