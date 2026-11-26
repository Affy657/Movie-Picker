#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { dueDateOf, parseAfter, releaseDatesFor, releaseKey, todayUtc } from './removal-dates.mjs';

const root = resolve(import.meta.dirname, '..');
export const CONTRACT = 'apps/web/src/shared/api/generated/openapiSchema.ts';
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const SCHEMA_REF = /^components\["schemas"\]\["([^"]+)"\]$/;
const PROPERTY_REMOVED = 'property removed';

export const ALLOWED_REMOVALS = [
  {
    schema: 'LetterboxdSyncResponse',
    properties: [
      'added',
      'removed',
      'unmatchedTitles',
      'pendingChoices',
      'totalOnLetterboxd',
      'totalTruncated',
      'watchedAdded',
      'watchedRemoved',
      'watchedUnmatchedTitles',
      'watchedPendingChoices',
      'watchedTotalOnLetterboxd',
      'watchedTotalTruncated',
    ],
    after: { release: 'v1.32.1', days: 30 },
    why: 'flat copies of lists, read by the front of 1.31.1 that a service worker keeps serving for days',
  },
];

function propertyName(member) {
  const { name } = member;
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
    ? name.text
    : name.getText();
}

function members(node) {
  const map = new Map();
  if (!node || !ts.isTypeLiteralNode(node)) return map;
  for (const member of node.members) {
    if (ts.isPropertySignature(member)) map.set(propertyName(member), member);
  }
  return map;
}

function interfaceMembers(source, name) {
  const declaration = source.statements.find(
    (statement) => ts.isInterfaceDeclaration(statement) && statement.name.text === name
  );
  const map = new Map();
  for (const member of declaration?.members ?? []) {
    if (ts.isPropertySignature(member)) map.set(propertyName(member), member);
  }
  return map;
}

function isNever(type) {
  return !type || type.kind === ts.SyntaxKind.NeverKeyword;
}

function isNull(type) {
  return ts.isLiteralTypeNode(type) && type.literal.kind === ts.SyntaxKind.NullKeyword;
}

function successStatuses(responses) {
  return [...responses.keys()].filter((status) => /^[123]\d\d$/.test(status)).sort();
}

function bodyOf(response) {
  const content = members(response?.type).get('content');
  if (!content || isNever(content.type)) return null;
  const json =
    members(content.type).get('application/json') ?? [...members(content.type).values()][0];
  return json?.type ?? null;
}

export function parseContract(text) {
  const source = ts.createSourceFile(CONTRACT, text, ts.ScriptTarget.Latest, true);
  const components = interfaceMembers(source, 'components');
  const schemas = members(components.get('schemas')?.type);
  const operations = new Map();
  for (const [path, pathItem] of interfaceMembers(source, 'paths')) {
    const methods = members(pathItem.type);
    for (const method of METHODS) {
      const operation = methods.get(method);
      if (!operation || isNever(operation.type)) continue;
      const responses = members(members(operation.type).get('responses')?.type);
      operations.set(
        `${method.toUpperCase()} ${path}`,
        new Map(successStatuses(responses).map((status) => [status, bodyOf(responses.get(status))]))
      );
    }
  }
  return { schemas, operations };
}

const KEYWORD_KINDS = new Map([
  [ts.SyntaxKind.StringKeyword, 'string'],
  [ts.SyntaxKind.NumberKeyword, 'number'],
  [ts.SyntaxKind.BooleanKeyword, 'boolean'],
]);

const LITERAL_KINDS = new Map([
  [ts.SyntaxKind.StringLiteral, 'string'],
  [ts.SyntaxKind.NumericLiteral, 'number'],
  [ts.SyntaxKind.TrueKeyword, 'boolean'],
  [ts.SyntaxKind.FalseKeyword, 'boolean'],
]);

const UNTYPED_KINDS = new Set(['none', 'unknown']);

function scalarKind(type) {
  if (ts.isLiteralTypeNode(type)) return LITERAL_KINDS.get(type.literal.kind) ?? 'unknown';
  return KEYWORD_KINDS.get(type.kind) ?? 'unknown';
}

function unionShape(contract, type) {
  const values = type.types.filter((member) => !isNull(member));
  const nullable = values.length < type.types.length;
  if (values.length === 1) {
    const shape = resolveShape(contract, values[0]);
    return { ...shape, nullable: nullable || shape.nullable };
  }
  const kinds = new Set(values.map((member) => resolveShape(contract, member).kind));
  return { kind: kinds.size === 1 ? [...kinds][0] : 'union', nullable };
}

function resolveShape(contract, type) {
  if (!type) return { kind: 'none', nullable: false };
  if (ts.isParenthesizedTypeNode(type)) return resolveShape(contract, type.type);
  if (ts.isUnionTypeNode(type)) return unionShape(contract, type);
  if (ts.isArrayTypeNode(type)) return { kind: 'array', items: type.elementType, nullable: false };
  if (ts.isTypeLiteralNode(type))
    return { kind: 'object', properties: members(type), nullable: false };
  const reference = SCHEMA_REF.exec(type.getText());
  if (reference) {
    const schema = contract.schemas.get(reference[1]);
    return { ...resolveShape(contract, schema?.type), schema: reference[1] };
  }
  if (ts.isTypeReferenceNode(type) && type.typeName.getText() === 'Record')
    return { kind: 'object', properties: new Map(), nullable: false };
  return { kind: scalarKind(type), nullable: false };
}

function kindChanged(old, current) {
  return (
    old.kind !== current.kind && !UNTYPED_KINDS.has(old.kind) && !UNTYPED_KINDS.has(current.kind)
  );
}

function compareShapes(before, after, beforeType, afterType, location, seen, breaks) {
  const old = resolveShape(before, beforeType);
  const current = resolveShape(after, afterType);
  if (!old.nullable && current.nullable) breaks.push({ location, reason: 'may now be null' });
  const pair = old.schema && `${old.schema}>${current.schema ?? ''}`;
  if (pair) {
    if (seen.has(pair)) return;
    seen.add(pair);
  }
  if (kindChanged(old, current)) {
    breaks.push({ location, reason: `type changed from ${old.kind} to ${current.kind}` });
    return;
  }
  if (old.kind === 'array') {
    compareShapes(before, after, old.items, current.items, `${location}[]`, seen, breaks);
    return;
  }
  if (old.kind !== 'object' || !old.properties || !current.properties) return;
  for (const [name, property] of old.properties) {
    const next = current.properties.get(name);
    const at = `${location}.${name}`;
    if (!next) {
      breaks.push({ location: at, reason: PROPERTY_REMOVED, schema: old.schema, property: name });
      continue;
    }
    if (!property.questionToken && next.questionToken)
      breaks.push({ location: at, reason: 'property became optional' });
    compareShapes(before, after, property.type, next.type, at, seen, breaks);
  }
}

const PATH_PARAMETER = /\{[^}]+\}/g;

function calledUrl(operation) {
  return operation.replace(PATH_PARAMETER, '{}');
}

export function findBreakingChangeRecords(before, after) {
  const breaks = [];
  const seen = new Set();
  const served = new Map(
    [...after.operations].map(([operation, responses]) => [calledUrl(operation), responses])
  );
  for (const [operation, responses] of before.operations) {
    const current = served.get(calledUrl(operation));
    if (!current) {
      breaks.push({ location: operation, reason: 'operation removed' });
      continue;
    }
    for (const [status, body] of responses) {
      if (!body) continue;
      const fallback = [...current.values()].find(Boolean);
      const next = current.get(status) ?? fallback;
      if (!next) {
        breaks.push({ location: `${operation} ${status}`, reason: 'response body removed' });
        continue;
      }
      compareShapes(before, after, body, next, `${operation} ${status}`, seen, breaks);
    }
  }
  return breaks;
}

export function findBreakingChanges(before, after) {
  return findBreakingChangeRecords(before, after).map(
    ({ location, reason }) => `${location}: ${reason}`
  );
}

function allowanceFor(record, allowed) {
  if (record.reason !== PROPERTY_REMOVED) return undefined;
  return allowed.find(
    (entry) => entry.schema === record.schema && entry.properties.includes(record.property)
  );
}

function afterOf(entry) {
  return parseAfter(entry.after, `ALLOWED_REMOVALS ${entry.schema}`);
}

export function allowedRemovalReleases(records, allowed) {
  const afters = records
    .map((record) => allowanceFor(record, allowed))
    .filter(Boolean)
    .map(afterOf)
    .filter((after) => !after.date);
  return [...new Map(afters.map((after) => [releaseKey(after), after])).values()];
}

export function applyAllowedRemovals(records, allowed, { published, today, releaseDates }) {
  const breaks = [];
  const removedOnPurpose = [];
  for (const record of records) {
    const text = `${record.location}: ${record.reason}`;
    const entry = allowanceFor(record, allowed);
    if (!entry) {
      breaks.push(text);
      continue;
    }
    const due = dueDateOf(afterOf(entry), releaseDates);
    if (due.date && due.date <= today) {
      removedOnPurpose.push(record.location);
      continue;
    }
    const when = due.date ? `on ${due.date}, ${due.basis}` : due.basis;
    breaks.push(`${text} (ALLOWED_REMOVALS lets it go ${when})`);
  }
  const stale = allowed.flatMap((entry) => {
    const served = members(published.schemas.get(entry.schema)?.type);
    return entry.properties
      .filter((property) => !served.has(property))
      .map((property) => `${entry.schema}.${property}`);
  });
  return { breaks, allowed: removedOnPurpose, stale };
}

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function latestReleaseTag(lsRemoteOutput) {
  const versions = lsRemoteOutput
    .split('\n')
    .map((line) => /refs\/tags\/v(\d+)\.(\d+)\.(\d+)$/.exec(line.trim()))
    .filter(Boolean)
    .map((match) => match.slice(1).map(Number));
  versions.sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2]);
  return versions.length > 0 ? `v${versions[0].join('.')}` : null;
}

export function tagFetchArgs(ref, shallow) {
  return [
    'fetch',
    '--no-tags',
    '--quiet',
    ...(shallow ? ['--depth=1'] : []),
    'origin',
    `refs/tags/${ref}:refs/tags/${ref}`,
  ];
}

function publishedContract(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  } catch {
    const shallow = git(['rev-parse', '--is-shallow-repository']).trim() === 'true';
    git(tagFetchArgs(ref, shallow));
  }
  return git(['show', `${ref}:${CONTRACT}`]);
}

async function main() {
  const ref =
    process.argv[2] ?? latestReleaseTag(git(['ls-remote', '--tags', '--refs', 'origin', 'v*']));
  if (!ref) {
    console.error('No published v* tag on origin to compare the contract with.');
    process.exit(1);
  }
  const before = parseContract(publishedContract(ref));
  const after = parseContract(readFileSync(join(root, CONTRACT), 'utf8'));
  const records = findBreakingChangeRecords(before, after);
  const releaseDates = await releaseDatesFor(
    allowedRemovalReleases(records, ALLOWED_REMOVALS),
    root
  );
  const { breaks, allowed, stale } = applyAllowedRemovals(records, ALLOWED_REMOVALS, {
    published: before,
    today: todayUtc(),
    releaseDates,
  });
  if (stale.length > 0) {
    console.error(
      `\nALLOWED_REMOVALS in scripts/check-contract-compat.mjs names properties the contract of ${ref} no longer serves: their removal has shipped, delete them from the list.\n` +
        stale.map((line) => `  - ${line}`).join('\n')
    );
    process.exitCode = 1;
  }
  if (breaks.length > 0) {
    console.error(
      `\nThe contract breaks what the front of ${ref} reads (the API N serves the front N-1):\n` +
        breaks.map((line) => `  - ${line}`).join('\n') +
        '\nKeep the route or the field one more version, or make the old front stop reading it first.\n'
    );
    process.exitCode = 1;
  }
  if (process.exitCode) return;
  if (allowed.length > 0)
    console.log(
      `Removed on purpose, as ALLOWED_REMOVALS allows:\n${allowed.map((line) => `  - ${line}`).join('\n')}`
    );
  console.log(`The contract still serves what the front of ${ref} reads.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
