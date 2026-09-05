#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const container = 'movie-picker-mongo-test';
const port = process.env.MONGO_TEST_PORT ?? '27018';
const shell = process.platform === 'win32';

const docker = (args, options = {}) =>
  execFileSync('docker', args, { stdio: options.quiet ? 'pipe' : 'inherit', shell, ...options });

const alreadyRunning = () =>
  docker(['ps', '--filter', `name=${container}`, '--format', '{{.Names}}'], { quiet: true })
    .toString()
    .includes(container);

if (!alreadyRunning()) {
  docker(['rm', '-f', container], { quiet: true, stdio: 'pipe' });
  docker([
    'run',
    '-d',
    '--name',
    container,
    '-p',
    `${port}:27017`,
    'mongo:8',
    '--replSet',
    'rs0',
    '--bind_ip_all',
  ]);
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      docker(['exec', container, 'mongosh', '--quiet', '--eval', 'db.runCommand({ ping: 1 }).ok'], {
        quiet: true,
      });
      break;
    } catch {
      execFileSync(process.execPath, ['-e', 'setTimeout(() => {}, 1000)']);
    }
  }
  docker([
    'exec',
    container,
    'mongosh',
    '--quiet',
    '--eval',
    'try { rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] }) } catch (e) { print(e.codeName) }',
  ]);
}

const result = spawnSync(
  'dotnet',
  [
    'test',
    'apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj',
    '-c',
    'Debug',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    shell,
    env: {
      ...process.env,
      MONGODB_URI: '',
      MONGODB_TEST_URI: `mongodb://127.0.0.1:${port}/?directConnection=true`,
    },
  }
);

process.exit(result.status ?? 1);
