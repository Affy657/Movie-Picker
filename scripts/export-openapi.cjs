/** ASPNETCORE_ENVIRONMENT=Development requis pour éviter ProductionStartupValidation (ALLOWED_ORIGINS). */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
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

fs.mkdirSync(outDir, { recursive: true });

const env = { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development' };

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, env, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('dotnet', ['tool', 'restore'], apiDotnet);
if (process.env.SKIP_OPENAPI_BUILD !== '1') {
  run('dotnet', ['build', 'MoviePicker.Api/MoviePicker.Api.csproj', '-c', 'Release'], apiDotnet);
} else if (!fs.existsSync(dll)) {
  console.error('SKIP_OPENAPI_BUILD=1 mais DLL introuvable :', dll);
  process.exit(1);
}
run(
  'dotnet',
  ['tool', 'run', 'swagger', 'tofile', '--output', outFile, dll, 'v1'],
  apiDotnet
);
console.log('OpenAPI écrit :', outFile);
