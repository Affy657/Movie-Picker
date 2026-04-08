/**
 * Vérification des prérequis locaux pour Movie Picker (roadmap MVP – section 1).
 * À lancer avec : node scripts/check-prereqs.js
 *
 * Vérifie : Node 20, pnpm, .NET 10 (API), Docker, Git
 */

const { execSync } = require('child_process');

const MIN_DOTNET_MAJOR = 10;

/** Aligné sur engines de eslint@10 (Vite 8 proche) : ^20.19.0 || ^22.13.0 || >=24 */
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
  if (!raw || !raw.startsWith('v')) return { ok: false, msg: 'Node non détecté' };
  const parts = raw.slice(1).split('.');
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1] || '0', 10);
  const patch = parseInt(parts[2] || '0', 10);
  const ok = nodeVersionOk(major, minor, patch);
  const required = '20.19+, 22.13+, ou 24+ (ESLint 10 / chaîne front)';
  return { ok, msg: ok ? `Node ${raw} (OK)` : `Node ${raw} – requis: ${required}` };
}

function checkPnpm() {
  const out = run('pnpm -v');
  if (out == null) return { ok: false, msg: 'pnpm non trouvé (npm install -g pnpm)' };
  return { ok: true, msg: `pnpm ${out}` };
}

function checkDotnet() {
  const out = run('dotnet --version');
  if (out == null) return { ok: false, msg: 'SDK .NET non trouvé (API back)' };
  const major = parseInt(out.split('.')[0], 10);
  const ok = major >= MIN_DOTNET_MAJOR;
  return { ok, msg: ok ? `.NET ${out} (OK)` : `.NET ${out} – requis: ${MIN_DOTNET_MAJOR}.x pour l'API` };
}

function checkDocker() {
  const out = run('docker -v');
  if (out == null) return { ok: false, msg: 'Docker non trouvé ou non démarré' };
  return { ok: true, msg: out };
}

function checkGit() {
  const out = run('git --version');
  if (out == null) return { ok: false, msg: 'Git non trouvé' };
  return { ok: true, msg: out };
}

const checks = [
  { name: 'Node (20.19+ / 22.13+ / 24+)', fn: checkNode },
  { name: 'pnpm', fn: checkPnpm },
  { name: '.NET 10 (API)', fn: checkDotnet },
  { name: 'Docker', fn: checkDocker },
  { name: 'Git', fn: checkGit },
];

console.log('Movie Picker – Vérification des prérequis locaux\n');

let allOk = true;
for (const { name, fn } of checks) {
  const { ok, msg } = fn();
  if (!ok) allOk = false;
  const icon = ok ? '✓' : '✗';
  console.log(`  ${icon} ${name}: ${msg}`);
}

console.log('');
if (allOk) {
  console.log('Tous les prérequis locaux sont OK. Voir docs/PREREQUIS.md pour le reste (comptes, clés).');
} else {
  console.log('Corriger les éléments marqués ✗ puis relancer ce script. Voir docs/PREREQUIS.md.');
  process.exit(1);
}
