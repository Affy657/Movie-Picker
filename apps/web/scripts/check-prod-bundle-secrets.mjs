/**
 * Garde-fou de régression (CI) : détecte les chaînes connues du compte dev rapide dans le bundle.
 * Ce n’est pas un scanner de secrets générique — si les identifiants dev changent, mettre à jour
 * la liste `forbidden` (et/ou le module stub). Un `vite build` seul n’exécute pas ce script :
 * utiliser `pnpm --filter web build` (ou le build racine / CI).
 * @see vite.config.ts (alias vers devQuickLoginCredentials.stub.ts)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '../dist/assets');
const forbidden = ['dev@test.local', 'DevTest123!'];

let files;
try {
  files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
} catch {
  console.error('check-prod-bundle-secrets: dist/assets introuvable — lancez le build web d’abord.');
  process.exit(1);
}

for (const name of files) {
  const content = readFileSync(join(assetsDir, name), 'utf8');
  for (const needle of forbidden) {
    if (content.includes(needle)) {
      console.error(`check-prod-bundle-secrets: chaîne interdite "${needle}" dans assets/${name}`);
      process.exit(1);
    }
  }
}

console.log('check-prod-bundle-secrets: OK');
