# Instructions pour les agents (IA et outils)

Ce fichier résume le contexte du dépôt **Movie Picker** et renvoie vers les règles détaillées. Les règles Cursor applicables en session sont dans [`.cursor/rules/`](.cursor/rules/).

*(Équivalent courant dans l’écosystème Cursor : fichier nommé `AGENTS.md` — tu peux dupliquer ou renommer si un outil attend ce nom.)*

## Produit

Application pour organiser des soirées cinéma : création d’événement, lien de partage, propositions de films (TMDB), votes, roue de tirage, clôture. Voir [`README.md`](README.md).

## Stack

| Zone | Emplacement | Technologies |
|------|-------------|--------------|
| Front | `apps/web/` | React, Vite, TypeScript strict, TanStack Query |
| API | `apps/api-dotnet/` | ASP.NET Core (.NET 10), MongoDB, TMDB — solution `MoviePicker.slnx`, projet principal `MoviePicker.Api/` |
| Monorepo | racine | pnpm, Turborepo |

- Préfixe API publique : **`/api/v1`**. Le client web utilise `VITE_API_URL` (voir `apps/web/.env.example`).
- Branche par défaut : **`master`** (CI/CD).

## Règles Cursor (référence)

À lire selon la tâche :

- **`mp-stack.mdc`** — flux agent : fin de tâche (revue code), avant push (vérificateur ou CI locale), commandes `verify:local` / tests ciblés, liens doc architecture et spec.
- **`mp-guardrails.mdc`** — secrets, prod, pas de mutations destructrices sans accord, pas de contournement sécurité.
- **`mp-roadmap-delivery.mdc`** — livraison depuis roadmaps : tests, doc / OpenAPI / contrat, pas de case roadmap cochée sans implémentation complète.
- **`mp-tools.mdc`** — outils CLI, scripts, équivalents CI.

Rôles optionnels : `role-product-owner.mdc`, `role-senior-developer.mdc`.

## Compétences (skills) projet

Sous [`.cursor/skills/`](.cursor/skills/) — ex. roadmap version, features list, tickets sprint ; les utiliser quand la tâche correspond.

## Fin de tâche et avant push

1. **Fin d’implémentation** : invoquer le sous-agent **`/mp-code-reviewer`** sur le périmètre modifié et appliquer les retours pertinents.
2. **Avant `git push` ou PR** : invoquer **`/mp-task-verifier`** ou exécuter **`pnpm run verify:local`** à la racine (après `pnpm install`) — aligné sur [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).

Vérifications ciblées possibles : `pnpm lint`, `pnpm test`, `dotnet test` sur les projets `MoviePicker.Api.Tests` et `MoviePicker.Api.IntegrationTests`. Si l’API ou les schémas changent : export OpenAPI (`pnpm run openapi:export`) et tests de contrat (`OpenApiContractTests`).

## Documentation utile

- Spec / architecture : selon chemins indiqués dans `mp-stack.mdc` (ex. `docs/architecture.md`, `docs/mvp/`, `docs/features-list.md`, roadmaps `docs/v1-produit/`, sprints sous `docs/sprint/`).
- Déploiement / CI : `docs/mvp/04-deploy-cicd.md` si présent.

## Fichiers sensibles

Ne pas versionner `.env` ; s’appuyer sur `.env.example` et la doc déploiement pour les noms de variables.
