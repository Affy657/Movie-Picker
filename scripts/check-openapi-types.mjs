#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const generated = join(root, 'apps/web/src/shared/api/generated/openapiSchema.ts');
const before = readFileSync(generated, 'utf8');

execFileSync('npx', ['openapi-typescript', 'artifacts/openapi-v1.json', '-o', generated], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (readFileSync(generated, 'utf8') !== before) {
  console.error(
    "\nThe types generated from the OpenAPI contract are out of date.\n" +
      'Run `pnpm run openapi:export && pnpm run openapi:types`, review the diff and commit it.\n'
  );
  process.exit(1);
}

console.log('OpenAPI types match the exported contract.');
