#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const CONTRACT = 'apps/web/src/shared/api/generated/openapiSchema.ts';
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const SCHEMA_REF = /^components\["schemas"\]\["([^"]+)"\]$/;

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

function resolveShape(contract, type) {
  if (!type) return { kind: 'none' };
  if (ts.isParenthesizedTypeNode(type)) return resolveShape(contract, type.type);
  if (ts.isUnionTypeNode(type)) {
    const values = type.types.filter((member) => !isNull(member));
    if (values.length === 1) return resolveShape(contract, values[0]);
    return { kind: 'scalar' };
  }
  if (ts.isArrayTypeNode(type)) return { kind: 'array', items: type.elementType };
  if (ts.isTypeLiteralNode(type)) return { kind: 'object', properties: members(type) };
  const reference = SCHEMA_REF.exec(type.getText());
  if (reference) {
    const schema = contract.schemas.get(reference[1]);
    return { ...resolveShape(contract, schema?.type), schema: reference[1] };
  }
  return { kind: 'scalar' };
}

function compareShapes(before, after, beforeType, afterType, location, seen, breaks) {
  const old = resolveShape(before, beforeType);
  const current = resolveShape(after, afterType);
  const pair = old.schema && `${old.schema}>${current.schema ?? ''}`;
  if (pair) {
    if (seen.has(pair)) return;
    seen.add(pair);
  }
  if (old.kind === 'array') {
    if (current.kind !== 'array') breaks.push(`${location}: no longer an array`);
    else compareShapes(before, after, old.items, current.items, `${location}[]`, seen, breaks);
    return;
  }
  if (old.kind !== 'object') return;
  if (current.kind !== 'object') {
    breaks.push(`${location}: no longer an object`);
    return;
  }
  for (const [name, property] of old.properties) {
    const next = current.properties.get(name);
    const at = `${location}.${name}`;
    if (!next) {
      breaks.push(`${at}: property removed`);
      continue;
    }
    if (!property.questionToken && next.questionToken)
      breaks.push(`${at}: property became optional`);
    compareShapes(before, after, property.type, next.type, at, seen, breaks);
  }
}

export function findBreakingChanges(before, after) {
  const breaks = [];
  const seen = new Set();
  for (const [operation, responses] of before.operations) {
    const current = after.operations.get(operation);
    if (!current) {
      breaks.push(`${operation}: operation removed`);
      continue;
    }
    for (const [status, body] of responses) {
      if (!body) continue;
      const fallback = [...current.values()].find(Boolean);
      const next = current.get(status) ?? fallback;
      if (!next) {
        breaks.push(`${operation} ${status}: response body removed`);
        continue;
      }
      compareShapes(before, after, body, next, `${operation} ${status}`, seen, breaks);
    }
  }
  return breaks;
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

function main() {
  const ref =
    process.argv[2] ?? latestReleaseTag(git(['ls-remote', '--tags', '--refs', 'origin', 'v*']));
  if (!ref) {
    console.error('No published v* tag on origin to compare the contract with.');
    process.exit(1);
  }
  const before = parseContract(publishedContract(ref));
  const after = parseContract(readFileSync(join(root, CONTRACT), 'utf8'));
  const breaks = findBreakingChanges(before, after);
  if (breaks.length > 0) {
    console.error(
      `\nThe contract breaks what the front of ${ref} reads (the API N serves the front N-1):\n` +
        breaks.map((line) => `  - ${line}`).join('\n') +
        '\nKeep the route or the field one more version, or make the old front stop reading it first.\n'
    );
    process.exit(1);
  }
  console.log(`The contract still serves what the front of ${ref} reads.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
