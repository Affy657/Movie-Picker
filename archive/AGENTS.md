# AGENTS.md — Movie Picker

Point d'entrée pour tout agent travaillant sur ce dépôt. Ce fichier **route** vers les bonnes règles, agents et skills — il ne duplique pas leur contenu.

## Rules (`.cursor/rules/`)

| Règle | Quand la charger |
|---|---|
| **`mp-stack`** | Toujours active — stack, outils CLI, commandes CI, structure monorepo. |
| **`mp-guardrails`** | Toujours active — limites de sécurité, secrets, prod, opérations irréversibles. |
| **`mp-dev-task`** | Toute tâche d'implémentation — posture senior, conventions front/API, contrat OpenAPI, anti-patterns. |

## Agents (`.cursor/agents/`)

| Agent | Rôle | Quand l'invoquer |
|---|---|---|
| **`mp-code-reviewer`** | Revue de code senior (design, sécurité, performance, legacy). Lecture seule. | **Systématiquement en fin de tâche**, avant PR, ou sur zone sensible. |
| **`mp-pre-push`** | Gate CI locale — lint, build, tests, audit, format. Corrige ce qui peut l'être, bloque sinon. | **Obligatoire avant tout push.** |
| **`mp-po`** | Product Owner — cadrage, brainstorm, priorisation, roadmap, critères d'acceptation. Lecture seule. | Discussion produit, idéation, planification de version. |

## Skills (`.cursor/skills/`)

| Skill | Usage |
|---|---|
| **`mp-brainstorm-to-features`** | Transformer un brainstorm en features list structurée (versions, MoSCoW). |
| **`mp-version-roadmap-draft`** | Générer ou mettre à jour une roadmap par version. |
| **`mp-sprint-ticket`** | Créer des tickets de sprint Markdown avec en-tête YAML. |

## Workflow type (tâche de dev)

```
1. Charger mp-dev-task (+ mp-stack, mp-guardrails déjà actives)
2. Implémenter — changements reviewables
3. Invoquer mp-code-reviewer → appliquer les retours pertinents
4. Invoquer mp-pre-push (ou pnpm run verify:local) → tout vert
5. Push / PR
```

## Vérification par défaut

**`pnpm run verify:local`** à la racine après `pnpm install` — équivalent CI locale.
