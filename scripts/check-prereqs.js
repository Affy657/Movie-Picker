/**
 * Local prerequisites check for Movie Picker (MVP roadmap, section 1).
 * Run with: node scripts/check-prereqs.js
 *
 * Checks: Node 20, pnpm, .NET 10 (API), Docker, Git
 */

const { execSync } = require('child_process');

const MIN_DOTNET_MAJOR = 10;

/** Aligned with the engines of eslint@10 (Vite 8 is close): ^20.19.0 || ^22.13.0 || >=24 */
function nodeVersionOk(major, minor, patch) {
  if (major >= 24) return true;
  if (major === 22) return minor > 13 || (minor === 13 && patch >= 0);
  if (major === 20) return minor > 19 || (minor === 19 && patch >= 0);
  return false;
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', ...opts }).trim();
  } catch {
    return null;
  }
}

function checkNode() {
  const raw = process.version;
  if (!raw || !raw.startsWith('v')) return { ok: false, msg: 'Node not detected' };
  const parts = raw.slice(1).split('.');
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1] || '0', 10);
  const patch = parseInt(parts[2] || '0', 10);
  const ok = nodeVersionOk(major, minor, patch);
  const required = '20.19+, 22.13+ or 24+ (ESLint 10 / web toolchain)';
  return { ok, msg: ok ? `Node ${raw} (OK)` : `Node ${raw}, required: ${required}` };
}

function checkPnpm() {
  const out = run('pnpm -v');
  if (out == null) return { ok: false, msg: 'pnpm not found (npm install -g pnpm)' };
  return { ok: true, msg: `pnpm ${out}` };
}

function checkDotnet() {
  const out = run('dotnet --version');
  if (out == null) return { ok: false, msg: '.NET SDK not found (API)' };
  const major = parseInt(out.split('.')[0], 10);
  const ok = major >= MIN_DOTNET_MAJOR;
  return { ok, msg: ok ? `.NET ${out} (OK)` : `.NET ${out}, required: ${MIN_DOTNET_MAJOR}.x for the API` };
}

function checkDocker() {
  const out = run('docker -v');
  if (out == null) return { ok: false, msg: 'Docker not found or not running' };
  return { ok: true, msg: out };
}

function checkGit() {
  const out = run('git --version');
  if (out == null) return { ok: false, msg: 'Git not found' };
  return { ok: true, msg: out };
}

const checks = [
  { name: 'Node (20.19+ / 22.13+ / 24+)', fn: checkNode },
  { name: 'pnpm', fn: checkPnpm },
  { name: '.NET 10 (API)', fn: checkDotnet },
  { name: 'Docker', fn: checkDocker },
  { name: 'Git', fn: checkGit },
];

console.log('Movie Picker: local prerequisites check\n');

let allOk = true;
for (const { name, fn } of checks) {
  const { ok, msg } = fn();
  if (!ok) allOk = false;
  const icon = ok ? '✓' : '✗';
  console.log(`  ${icon} ${name}: ${msg}`);
}

console.log('');
if (allOk) {
  console.log('All local prerequisites are OK. See docs/PREREQUIS.md for the rest (accounts, keys).');
} else {
  console.log('Fix the items marked ✗ and run this script again. See docs/PREREQUIS.md.');
  process.exit(1);
}
