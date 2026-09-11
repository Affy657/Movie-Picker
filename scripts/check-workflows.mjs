/**
 * Rejoue en local le job `lint-workflows` de la CI, aux mêmes versions.
 *
 * Les deux outils passent par Docker, épinglés par digest, pour une raison précise : actionlint
 * délègue les blocs `run:` à shellcheck et **saute silencieusement** cette moitié de son travail
 * quand shellcheck n'est pas dans le PATH. Une machine de dev sans shellcheck aurait donc une
 * porte verte qui ne vérifie que la moitié de ce que vérifie la CI. L'image `rhysd/actionlint`
 * embarque shellcheck 0.10.0, exactement la version que la CI utilise.
 *
 * La liste des fichiers est découverte, jamais écrite en dur : un workflow ajouté plus tard et
 * oublié dans une liste échapperait à la porte sans que rien ne le dise.
 *
 * Pas de troisième porte de parsing YAML : actionlint rend `could not parse as YAML` sur un
 * fichier mal indenté, vérifié sur un fichier de test. Elle serait redondante.
 */
import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowsDir = join(root, '.github', 'workflows');

const ACTIONLINT_IMAGE =
  'rhysd/actionlint@sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9';
const ZIZMOR_IMAGE =
  'ghcr.io/zizmorcore/zizmor@sha256:1ba0035c343f50e85fde29beb0d78e4db448eaa0c762a11a09805d241424ee03';

function fail(message) {
  console.error(`\x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}

if (!existsSync(workflowsDir)) {
  fail('.github/workflows introuvable.');
}

const workflows = readdirSync(workflowsDir)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort()
  .map((name) => `.github/workflows/${name}`);

if (workflows.length === 0) {
  fail('Aucun workflow trouvé dans .github/workflows.');
}

function docker(args) {
  return spawnSync('docker', args, { stdio: 'inherit', shell: true, cwd: root });
}

const dockerAvailable = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
  stdio: 'ignore',
  shell: true,
});
if (dockerAvailable.status !== 0) {
  fail(
    'Docker est requis pour cette porte (actionlint embarque shellcheck, sans quoi la moitié des blocs run: ne serait pas vérifiée). Démarrer Docker Desktop puis relancer.'
  );
}

const mount = ['-v', './.github:/repo/.github:ro', '-w', '/repo'];

console.log(`actionlint + shellcheck sur ${workflows.length} workflows`);
const actionlint = docker(['run', '--rm', ...mount, ACTIONLINT_IMAGE, '-color', ...workflows]);
if (actionlint.status !== 0) {
  fail('actionlint a relevé des constats.');
}

console.log('zizmor (audit sécurité, seuil medium)');
const zizmor = docker([
  'run',
  '--rm',
  ...mount,
  ZIZMOR_IMAGE,
  '--offline',
  '--no-progress',
  '--min-severity',
  'medium',
  '--format',
  'plain',
  '.github/workflows/',
]);
if (zizmor.status !== 0) {
  fail('zizmor a relevé des constats de sévérité medium ou plus.');
}

console.log(`\x1b[32m✓\x1b[0m Workflows : actionlint et zizmor sans constat.`);
