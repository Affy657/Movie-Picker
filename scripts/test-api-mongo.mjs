#!/usr/bin/env node
/**
 * The API integration suite against a real MongoDB replica set, with its coverage and the gate of
 * `scripts/check-mongo-coverage.mjs` on the Mongo adapters. The container is the one of
 * `scripts/mongo-replica-set.mjs` (`movie-picker-mongo-test`, port `MONGO_TEST_PORT`, 27018 by
 * default), started or reused, and every test class gets its own disposable database.
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startWorkstationMongo } from './mongo-replica-set.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dotnetBin = process.platform === 'win32' ? 'dotnet.exe' : 'dotnet';
const coverageDirectory = 'coverage-mongo';

let mongoUri;
try {
  mongoUri = await startWorkstationMongo();
} catch (error) {
  console.error(`::error::${error.message}`);
  process.exit(1);
}

rmSync(resolve(root, coverageDirectory), { recursive: true, force: true });

const result = spawnSync(
  dotnetBin,
  [
    'test',
    'apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj',
    '-c',
    'Debug',
    '--collect:XPlat Code Coverage',
    '--settings',
    'apps/api-dotnet/coverlet.integration.runsettings',
    '--results-directory',
    coverageDirectory,
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, MONGODB_URI: '', MONGODB_TEST_URI: mongoUri },
  }
);

if (result.status !== 0) process.exit(result.status ?? 1);

const gate = spawnSync(process.execPath, ['scripts/check-mongo-coverage.mjs', coverageDirectory], {
  cwd: root,
  stdio: 'inherit',
});

process.exit(gate.status ?? 1);
