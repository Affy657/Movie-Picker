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
    "\nLes types générés depuis l'OpenAPI ne sont plus à jour.\n" +
      'Lance `pnpm run openapi:export && pnpm run openapi:types`, relis le diff et commite-le.\n'
  );
  process.exit(1);
}

console.log('Types OpenAPI à jour avec le contrat exporté.');
