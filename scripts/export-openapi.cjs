/** ASPNETCORE_ENVIRONMENT=Development is required to bypass ProductionStartupValidation (ALLOWED_ORIGINS). */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const apiDotnet = path.join(root, 'apps', 'api-dotnet');
const outDir = path.join(root, 'artifacts');
const outFile = path.join(outDir, 'openapi-v1.json');
const dll = path.join(
  apiDotnet,
  'MoviePicker.Api',
  'bin',
  'Release',
  'net10.0',
  'MoviePicker.Api.dll'
);

const env = { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development' };
const sharingViolations = new Set(['EBUSY', 'EPERM']);

function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function publishContract(
  staged,
  published,
  { write = fs.writeFileSync, wait = pause, attempts = 50, delayMs = 100 } = {}
) {
  const contract = fs.readFileSync(staged);
  for (let attempt = 1; ; attempt++) {
    try {
      write(published, contract);
      return;
    } catch (error) {
      if (!sharingViolations.has(error.code) || attempt >= attempts) throw error;
      wait(delayMs);
    }
  }
}

function status(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, env, stdio: 'inherit' }).status ?? 1;
}

function run(cmd, args, cwd) {
  const code = status(cmd, args, cwd);
  if (code !== 0) process.exit(code);
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });

  run('dotnet', ['tool', 'restore'], apiDotnet);
  if (process.env.SKIP_OPENAPI_BUILD !== '1') {
    run('dotnet', ['build', 'MoviePicker.Api/MoviePicker.Api.csproj', '-c', 'Release'], apiDotnet);
  } else if (!fs.existsSync(dll)) {
    console.error('SKIP_OPENAPI_BUILD=1 but the DLL is missing:', dll);
    process.exit(1);
  }

  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-export-'));
  const staged = path.join(stagingDir, 'openapi-v1.json');
  try {
    const code = status(
      'dotnet',
      ['tool', 'run', 'swagger', 'tofile', '--output', staged, dll, 'v1'],
      apiDotnet
    );
    if (code !== 0) {
      process.exitCode = code;
      return;
    }
    publishContract(staged, outFile);
    console.log('OpenAPI written to', outFile);
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

if (require.main === module) main();

module.exports = { publishContract };
