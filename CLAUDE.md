# CLAUDE.md

Les règles complètes du dépôt sont dans @AGENTS.md — les lire avant toute modification.

Les trois réflexes qui reviennent le plus souvent :

1. **Pas de commentaires dans le code.** Le nommage porte l'intention. Seules les directives fonctionnelles (`@ts-expect-error`, `eslint-disable-*`, shebang, licence) sont tolérées.

2. **Interface : réutiliser avant d'écrire.** Chercher dans `apps/web/src/shared/components/` — `Button`, `Modal`, `Sheet`, `Chip`, `Card`, `Field`, `Menu`, `Dropdown`, `Tabs`, `Tooltip`, `InfoBubble`, `EmptyState`, `Skeleton` — puis étendre la primitive existante. Écrire un composant local est le dernier recours, pas le premier geste. Dans les CSS modules, aucune valeur littérale : `var(--space-*)`, `var(--font-size-*)`, `var(--z-*)`, `var(--container-*)`, `var(--color-*)`. `<dialog>` et `::backdrop` n'existent que dans `Modal`.

3. **`pnpm run verify:local` avant tout push**, et corriger ce qui échoue. C'est ce qui fait respecter les deux points ci-dessus.
