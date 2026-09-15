#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const resultsDirectory = join(root, process.argv[2] ?? 'coverage-mongo');
const NAMESPACE = 'MoviePicker.Api.Infrastructure.Persistence.Mongo.';
const MINIMUM_SEQUENCE = Number(process.env.MONGO_COVERAGE_MIN_SEQUENCE ?? 86);
const MINIMUM_BRANCH = Number(process.env.MONGO_COVERAGE_MIN_BRANCH ?? 58);

function findReport(directory) {
  for (const entry of readdirSync(directory)) {
    const candidate = join(directory, entry);
    if (statSync(candidate).isDirectory()) {
      const found = findReport(candidate);
      if (found) return found;
    } else if (entry === 'coverage.opencover.xml') {
      return candidate;
    }
  }
  return null;
}

const report = findReport(resultsDirectory);
if (!report) {
  console.error(`OpenCover report not found under ${resultsDirectory}.`);
  process.exit(1);
}

const xml = readFileSync(report, 'utf8');
const totals = { sequenceVisited: 0, sequenceTotal: 0, branchVisited: 0, branchTotal: 0 };
const uncovered = [];

for (const [block] of xml.matchAll(/<Class>[\s\S]*?<\/Class>/g)) {
  const fullName = block.match(/<FullName>([^<]+)<\/FullName>/)?.[1] ?? '';
  if (!fullName.startsWith(NAMESPACE) || fullName.includes('<') || fullName.includes('/')) continue;

  const summary = block.match(/<Summary\s([^>]*)\/>/)?.[1] ?? '';
  const read = (attribute) => Number(summary.match(new RegExp(`${attribute}="(\\d+)"`))?.[1] ?? 0);

  const sequenceTotal = read('numSequencePoints');
  totals.sequenceTotal += sequenceTotal;
  totals.sequenceVisited += read('visitedSequencePoints');
  totals.branchTotal += read('numBranchPoints');
  totals.branchVisited += read('visitedBranchPoints');

  if (sequenceTotal >= 5 && read('visitedSequencePoints') === 0) {
    uncovered.push(fullName.slice(NAMESPACE.length));
  }
}

if (totals.sequenceTotal === 0) {
  console.error(
    `No ${NAMESPACE}* class in the report: did the suite run against a real MongoDB?`
  );
  process.exit(1);
}

const percent = (visited, total) => (total === 0 ? 100 : (visited / total) * 100);
const sequence = percent(totals.sequenceVisited, totals.sequenceTotal);
const branch = percent(totals.branchVisited, totals.branchTotal);

console.log(`Mongo adapters coverage, lines:    ${sequence.toFixed(2)}% (threshold ${MINIMUM_SEQUENCE}%)`);
console.log(`Mongo adapters coverage, branches: ${branch.toFixed(2)}% (threshold ${MINIMUM_BRANCH}%)`);

if (uncovered.length > 0) {
  console.log(`Mongo classes never executed: ${uncovered.join(', ')}`);
}

let failed = false;
if (sequence < MINIMUM_SEQUENCE) {
  console.error(`::error::Mongo adapters line coverage ${sequence.toFixed(2)}% < ${MINIMUM_SEQUENCE}% required`);
  failed = true;
}
if (branch < MINIMUM_BRANCH) {
  console.error(`::error::Mongo adapters branch coverage ${branch.toFixed(2)}% < ${MINIMUM_BRANCH}% required`);
  failed = true;
}

process.exit(failed ? 1 : 0);
