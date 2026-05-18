# AGENTS.md — Movie Picker

Point d'entrée pour tout agent (Claude Code, Codex, Cursor, autre). Ce fichier est un **carrefour** : contexte minimum + pointeurs. Le détail vit dans `README.md` et `.cursor/rules/`.

## Projet

Soirées film : créer un event, partager le lien, proposer des films (TMDB), voter, lancer la roue. Détail produit, stack, services et démarrage : [`README.md`](README.md).

## Contexte

- **Solo dev** en fin d'études — pas de pair humain, l'agent **`mp-code-reviewer`** joue ce rôle en fin de tâche.
- Sert de **projet de fin d'année RNCP** ([`docs/_ynov/RNCP/`](docs/_ynov/RNCP/)) **et continue après** : pas de code jetable.
- **Prod en service** (mainteneur + entourage) : volume faible, **données réelles** — qualité, sécurité, tests, CI vert non négociables.

## Stack (résumé)

Monorepo pnpm + Turborepo. Front `apps/web/` (React + Vite + TS strict + TanStack Query). API `apps/api-dotnet/` (.NET 10 + MongoDB + TMDB), routes publiques sous **`/api/v1`**. Hébergement AWS (front) + GCP (API) + MongoDB Atlas. Détail : `README.md` et `.cursor/rules/mp-stack.mdc`.

## Commandes

- **Gate avant push** : `pnpm run verify:local` (lint + format + build + audit + tests + export OpenAPI, aligné CI).
- Toutes les autres commandes (dev, tests ciblés, E2E, Lighthouse, comptes seed) : [`README.md`](README.md) § Démarrage.

## Conventions

Détaillées dans [`.cursor/rules/mp-dev-task.mdc`](.cursor/rules/mp-dev-task.mdc) — à charger pour toute tâche d'implémentation. Résumé : code idiomatique TS/C#, types stricts, petits incréments reviewables, pas de legacy. Toute évolution de contrat HTTP → Swagger + `OpenApiContractTests` + `pnpm run openapi:export` + client front aligné.

## Garde-fous (interdit sans accord explicite)

- Lire / afficher / commiter des secrets (`.env`, `MONGODB_URI`, clés API, secrets GitHub / GCP / AWS).
- Toucher IAM, S3, CloudFront, Cloud Run, DNS ou config prod / staging.
- `git push --force` sur `master` ; mutations destructrices sur base réelle.
- Désactiver CORS, rate limiting, validation pour faire passer un test.
- Cloud : **proposer** les commandes, l'humain valide. Détail : [`.cursor/rules/mp-guardrails.mdc`](.cursor/rules/mp-guardrails.mdc).

## Workflow

Lire l'existant → implémenter petit et reviewable → si contrat HTTP change : OpenAPI à jour → `pnpm run verify:local` vert → push / PR. Revue par `mp-code-reviewer` avant PR.

## Gotchas

- **`pnpm audit`** : override `basic-ftp` dans `package.json` racine pour rester vert (en attendant chaîne Lighthouse à jour).
- **Build front** : `pnpm build` lance le check anti-secrets sur `dist/assets/*.js`. Un `vite build` lancé directement dans `apps/web` **ne fait pas** ce contrôle — voir `apps/web/scripts/check-prod-bundle-secrets.mjs`.
- **CORS prod** : variable `ALLOWED_ORIGINS` requise (Production / Docker), libre en Development. Voir `.env.example`.
- **Seed dev** : comptes et soirées démo créés automatiquement en Development (`appsettings.Development.json` → `DevelopmentSeed`). Détail dans `README.md`.

## Routing Cursor (`.cursor/`)

Pour les agents qui chargent les rules / agents / skills Cursor :

- **Rules** (`.cursor/rules/`) : `mp-stack` (always-on), `mp-guardrails` (always-on), `mp-dev-task` (à charger pour implémenter).
- **Agents** (`.cursor/agents/`) : `mp-code-reviewer` (revue, fin de tâche), `mp-pre-push` (gate CI, avant push), `mp-po` (cadrage produit).
- **Skills** (`.cursor/skills/`) : `mp-brainstorm-to-features`, `mp-version-roadmap-draft`, `mp-sprint-ticket`.

Hors Cursor : tout l'essentiel est ci-dessus, ces pointeurs sont optionnels.
