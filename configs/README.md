# Configurations partagées (monorepo)

| Fichier | Usage |
|---------|--------|
| `tsconfig.base.json` | Options TypeScript communes (strict, module, etc.). Étendu par `apps/web/tsconfig.json`. |
| `tsconfig.node.json` | Config pour les outils Node (ex. `vite.config.ts`). Étendu par `apps/web/tsconfig.node.json`. |
| `eslint.base.cjs` | Règles ESLint + Prettier. La racine du repo charge ce fichier via `.eslintrc.cjs` (`extends`). |
| `prettier.config.cjs` | Style Prettier unique. Réexporté par `prettier.config.cjs` à la **racine** du dépôt (Prettier ne remonte pas automatiquement depuis `apps/` vers `configs/`). |

Les scripts racine `pnpm run format` / `format:check` incluent aussi `configs/**`, `e2e/**` et `playwright.config.ts` pour garder le même style partout.

Ajouter une nouvelle app front : créer un `tsconfig.json` qui fait `"extends": "../../configs/tsconfig.base.json"` et compléter `compilerOptions` / `include` selon le bundler.
