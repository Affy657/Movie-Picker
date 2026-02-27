/**
 * Vérification des prérequis locaux pour Movie Picker (roadmap MVP – section 1).
 * À lancer avec : node scripts/check-prereqs.js
 *
 * Vérifie : Node 20, pnpm, Docker, Git
 */

const { execSync } = require('child_process');

const MIN_NODE_MAJOR = 20;

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
  const major = parseInt(raw.slice(1).split('.')[0], 10);
  const ok = major >= MIN_NODE_MAJOR;
  return { ok, msg: ok ? `Node ${raw} (OK)` : `Node ${raw} – requis: ${MIN_NODE_MAJOR}.x` };
}

function checkPnpm() {
  const out = run('pnpm -v');
  if (out == null) return { ok: false, msg: 'pnpm non trouvé (npm install -g pnpm)' };
  return { ok: true, msg: `pnpm ${out}` };
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
  { name: 'Node 20', fn: checkNode },
  { name: 'pnpm', fn: checkPnpm },
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
