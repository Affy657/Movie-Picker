import { FOUNDATION, PRIMITIVE_HUES } from './cssSyntax.mjs';
import { isTestFile, rel } from './sources.mjs';

const DECLARED_TOKEN = /(?:^|[;{\n])\s*(--[a-z][\w-]*)\s*:/g;
const USED_TOKEN = /var\((--[a-z][\w-]*)\)/g;
const TOKEN_IN_SOURCE = /['"`](--[a-z][\w-]*)['"`]/g;
const TOKEN_WITH_FALLBACK = /var\((--[a-z][\w-]*)\s*,/g;
const TOKENS_CONSUMED_INDIRECTLY = new RegExp(
  `^--(?:(?:${PRIMITIVE_HUES})-\\d+|white|black|icon-[\\w]+)$`
);

function tokensDeclaredIn(text) {
  return [...text.matchAll(DECLARED_TOKEN)].map(([, name]) => name);
}

function tokensOfSources(sourceTexts, declared) {
  const readInSource = [];
  for (const [file, source] of sourceTexts) {
    for (const match of source.matchAll(TOKEN_IN_SOURCE)) {
      const after = source.slice(match.index + match[0].length);
      const before = source.slice(Math.max(0, match.index - 16), match.index);
      if (
        /^\s*(?:as\s+[\w.]+\s*)?\]?\s*:/.test(after) ||
        /(?:set|remove)Property\(\s*$/.test(before)
      )
        declared.add(match[1]);
      else if (!isTestFile(file)) readInSource.push([rel(file), match[1]]);
    }
  }
  return readInSource;
}

export function undeclaredTokenViolations(cssTexts, sourceTexts, indexHtml) {
  const found = [];
  const foundation = [...cssTexts].find(([file]) => rel(file) === FOUNDATION)?.[1] ?? '';
  const foundationTokens = new Set(tokensDeclaredIn(foundation));
  const declared = new Set([...cssTexts.values()].flatMap(tokensDeclaredIn));
  const readInSource = tokensOfSources(sourceTexts, declared);
  const used = new Set();
  for (const text of [...cssTexts.values(), ...sourceTexts.values(), indexHtml]) {
    for (const [, name] of text.matchAll(USED_TOKEN)) used.add(name);
    for (const [, name] of text.matchAll(TOKEN_IN_SOURCE)) used.add(name);
  }
  for (const [file, text] of cssTexts) {
    const path = rel(file);
    const missing = new Set();
    for (const [, name] of text.matchAll(USED_TOKEN)) if (!declared.has(name)) missing.add(name);
    for (const name of missing)
      found.push(`${path}: var(${name}) is declared nowhere, renamed or removed token?`);
    if (path === FOUNDATION) continue;
    for (const [, name] of text.matchAll(TOKEN_WITH_FALLBACK))
      if (foundationTokens.has(name))
        found.push(
          `${path}: var(${name}, ...) carries a fallback on a foundation token, the fallback is dead or contradicts the token`
        );
  }
  for (const [path, name] of readInSource)
    if (!declared.has(name))
      found.push(
        `${path}: '${name}' is read from TypeScript and declared nowhere, renamed or removed token?`
      );
  for (const name of foundationTokens)
    if (!used.has(name) && !TOKENS_CONSUMED_INDIRECTLY.test(name))
      found.push(`${FOUNDATION}: ${name} is declared and consumed nowhere, delete the token`);
  return found;
}
