import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

import { CONTRACT, parseContract } from './check-contract-compat.mjs';

const SCHEMA_REF = /^components\["schemas"\]\["([^"]+)"\]$/;

const KEYWORDS = new Map([
  [ts.SyntaxKind.StringKeyword, 'string'],
  [ts.SyntaxKind.NumberKeyword, 'number'],
  [ts.SyntaxKind.BooleanKeyword, 'boolean'],
]);

const OPEN_KINDS = new Set([ts.SyntaxKind.UnknownKeyword, ts.SyntaxKind.AnyKeyword]);

export function loadContract(path = join(resolve(import.meta.dirname, '..'), CONTRACT)) {
  return parseContract(readFileSync(path, 'utf8'));
}

export function responseType(contract, method, path, status = '200') {
  const operation = contract.operations.get(`${method.toUpperCase()} ${path}`);
  if (!operation) throw new Error(`${method.toUpperCase()} ${path} is not in the contract`);
  const body = operation.get(status);
  if (!body) throw new Error(`${method.toUpperCase()} ${path} has no ${status} JSON body`);
  return body;
}

function kindOf(value) {
  if (Array.isArray(value)) return 'array';
  return value === null ? 'null' : typeof value;
}

function isNullType(type) {
  return ts.isLiteralTypeNode(type) && type.literal.kind === ts.SyntaxKind.NullKeyword;
}

function literalValue(type) {
  const { literal } = type;
  if (literal.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (literal.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isNumericLiteral(literal)) return Number(literal.text);
  return literal.text;
}

function propertyName(member) {
  const { name } = member;
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : name.getText();
}

function unwrap(contract, type) {
  let current = type;
  for (;;) {
    if (ts.isParenthesizedTypeNode(current)) {
      current = current.type;
      continue;
    }
    const reference = SCHEMA_REF.exec(current.getText());
    if (!reference) return current;
    const schema = contract.schemas.get(reference[1]);
    if (!schema) throw new Error(`schema ${reference[1]} is not in the contract`);
    current = schema.type;
  }
}

function checkUnion(contract, type, value, at, problems) {
  const members = type.types.filter((member) => !isNullType(member));
  if (value === null) {
    if (members.length < type.types.length) return;
    problems.push(`${at}: null where the contract does not allow it`);
    return;
  }
  const attempts = members.map((member) => {
    const found = [];
    check(contract, member, value, at, found);
    return found;
  });
  if (attempts.some((found) => found.length === 0)) return;
  const literals = members.map((member) => unwrap(contract, member));
  if (literals.every((member) => ts.isLiteralTypeNode(member))) {
    const allowed = literals.map((member) => JSON.stringify(literalValue(member))).join(', ');
    problems.push(`${at}: ${JSON.stringify(value)} is not one of ${allowed}`);
    return;
  }
  problems.push(...attempts.reduce((best, found) => (found.length < best.length ? found : best)));
}

function checkObject(contract, type, value, at, problems) {
  if (kindOf(value) !== 'object') {
    problems.push(`${at}: expected object, got ${kindOf(value)}`);
    return;
  }
  const properties = new Map();
  let indexType = null;
  for (const member of type.members) {
    if (ts.isPropertySignature(member)) properties.set(propertyName(member), member);
    else if (ts.isIndexSignatureDeclaration(member)) indexType = member.type;
  }
  for (const [name, property] of properties) {
    if (!(name in value)) {
      if (!property.questionToken) problems.push(`${at}.${name}: missing`);
      continue;
    }
    check(contract, property.type, value[name], `${at}.${name}`, problems);
  }
  for (const [name, item] of Object.entries(value)) {
    if (properties.has(name)) continue;
    if (indexType) check(contract, indexType, item, `${at}.${name}`, problems);
    else problems.push(`${at}.${name}: not in the contract`);
  }
}

function check(contract, declared, value, at, problems) {
  const type = unwrap(contract, declared);
  if (ts.isUnionTypeNode(type)) {
    checkUnion(contract, type, value, at, problems);
    return;
  }
  if (OPEN_KINDS.has(type.kind)) return;
  if (value === null) {
    problems.push(`${at}: null where the contract does not allow it`);
    return;
  }
  if (ts.isLiteralTypeNode(type)) {
    const expected = literalValue(type);
    if (value !== expected) problems.push(`${at}: expected ${JSON.stringify(expected)}`);
    return;
  }
  if (ts.isArrayTypeNode(type)) {
    if (!Array.isArray(value)) {
      problems.push(`${at}: expected array, got ${kindOf(value)}`);
      return;
    }
    value.forEach((item, index) =>
      check(contract, type.elementType, item, `${at}[${index}]`, problems)
    );
    return;
  }
  if (ts.isTypeLiteralNode(type)) {
    checkObject(contract, type, value, at, problems);
    return;
  }
  if (ts.isTypeReferenceNode(type) && type.typeName.getText() === 'Record') {
    if (kindOf(value) !== 'object') problems.push(`${at}: expected object, got ${kindOf(value)}`);
    return;
  }
  const expected = KEYWORDS.get(type.kind);
  if (!expected) throw new Error(`${at}: unsupported contract type ${type.getText()}`);
  if (kindOf(value) !== expected)
    problems.push(`${at}: expected ${expected}, got ${kindOf(value)}`);
}

export function findPayloadMismatches(contract, type, value, at = '$') {
  const problems = [];
  check(contract, type, value, at, problems);
  return problems;
}
