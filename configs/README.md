# Configurations partagées

| Fichier | Usage |
|---|---|
| `tsconfig.base.json` | Options TypeScript communes (strict, module). Étendu par `apps/web/tsconfig.json`. |
| `tsconfig.node.json` | Options pour les outils Node (`vite.config.ts`). Étendu par `apps/web/tsconfig.node.json`. |
| `prettier.config.cjs` | Style Prettier unique. Réexporté par le `prettier.config.cjs` de la racine, parce que Prettier ne remonte pas de `apps/` vers `configs/`. |
| `lighthouse-budgets.json` | Seuils de la porte Lighthouse de `deploy.yml` (`minimumScores`, sur 100), lus par `scripts/lighthouse-run.mjs`. |
| `sonar-exclusions.sh` | Chemins exclus de l'analyse SonarCloud, sourcé par le job `sonar` de `ci-cd.yml`. |
| `../eslint.config.mjs` | ESLint 10 en flat config, `typescript-eslint` et `eslint-config-prettier`, à la racine du dépôt. |

Les scripts racine `pnpm run format` et `format:check` couvrent aussi `configs/**`, `e2e/**` et `playwright.config.ts`, pour garder le même style partout.

Ajouter une application front : créer un `tsconfig.json` qui fait `"extends": "../../configs/tsconfig.base.json"` et compléter `compilerOptions` et `include` selon le bundler.
