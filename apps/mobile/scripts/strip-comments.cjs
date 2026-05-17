#!/usr/bin/env node
/* eslint-disable */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const TARGETS = ['src', 'app'].map((p) => path.join(ROOT, p));
const EXCLUDE_RE = /(\.test\.|types\.gen\.ts$|\/i18n\/locales\/)/;
const PRESERVE_PATTERNS = [
  /^\s*\/\/\s*eslint-/i,
  /^\s*\/\/\s*@ts-/i,
  /^\s*\/\/\s*prettier-/i,
  /^\s*\/\*\s*eslint-/i,
  /^\s*\/\*\s*@ts-/i,
  /^\s*\/\/\/\s*</,
];

function shouldPreserve(text) {
  return PRESERVE_PATTERNS.some((re) => re.test(text));
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.expo') continue;
      walk(full, out);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !EXCLUDE_RE.test(full.replace(/\\/g, '/'))) {
      out.push(full);
    }
  }
}

function stripFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  const isTsx = file.endsWith('.tsx');
  const source = ts.createSourceFile(
    file,
    original,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const ranges = [];
  function visit(node) {
    ts.forEachLeadingCommentRange(original, node.getFullStart(), (start, end) => {
      const text = original.slice(start, end);
      if (!shouldPreserve(text)) ranges.push([start, end]);
    });
    ts.forEachTrailingCommentRange(original, node.getEnd(), (start, end) => {
      const text = original.slice(start, end);
      if (!shouldPreserve(text)) ranges.push([start, end]);
    });
    ts.forEachChild(node, visit);
  }
  visit(source);
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) {
      last[1] = Math.max(last[1], r[1]);
    } else {
      merged.push([...r]);
    }
  }
  let out = '';
  let cursor = 0;
  for (const [s, e] of merged) {
    out += original.slice(cursor, s);
    cursor = e;
    while (cursor < original.length && (original[cursor] === ' ' || original[cursor] === '\t')) cursor++;
    if (cursor < original.length && original[cursor] === '\n') {
      cursor++;
    } else if (cursor < original.length && original[cursor] === '\r' && original[cursor + 1] === '\n') {
      cursor += 2;
    }
  }
  out += original.slice(cursor);
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}

function stripJsxComments(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (
      src[i] === '{' &&
      src[i + 1] === '/' &&
      src[i + 2] === '*'
    ) {
      let j = i + 3;
      while (j < src.length && !(src[j] === '*' && src[j + 1] === '/' && src[j + 2] === '}')) j++;
      if (j < src.length) {
        i = j + 3;
        if (src[i] === '\n') i++;
        else if (src[i] === '\r' && src[i + 1] === '\n') i += 2;
        continue;
      }
    }
    out += src[i];
    i++;
  }
  return out;
}

const files = [];
TARGETS.forEach((root) => fs.existsSync(root) && walk(root, files));
let modified = 0;
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  let after = stripFile(file);
  if (file.endsWith('.tsx')) after = stripJsxComments(after);
  after = after.replace(/\n{3,}/g, '\n\n');
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    modified++;
  }
}
console.log(`Stripped comments in ${modified}/${files.length} files.`);
