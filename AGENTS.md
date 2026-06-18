# AGENTS.md

Règles pour les agents IA travaillant sur ce repo.

## Style de code

**Ne jamais écrire de commentaires dans le code.**

- Pas de `//`, pas de `/* */`, pas de JSDoc, pas de XML doc C# (`///`).
- Les noms d'identifiants doivent porter l'intention.
- Exception : directives fonctionnelles uniquement (`@ts-expect-error`, `eslint-disable-*`, `prettier-ignore`, `/// <reference ... />`, shebangs `#!`, headers de licence).

Si on ne peut pas exprimer l'intention via le nommage ou la structure, refactoriser le code — pas ajouter un commentaire.

## Workflow

**Avant tout push sur master, toujours exécuter `pnpm run verify:local` et corriger toute erreur avant de push.** Cette vérification couvre lint, format, tests front et tests API — elle est obligatoire quelle que soit la conversation ou la feature.

- Ne jamais skip les hooks pre-push.
- Préférer éditer les fichiers existants à en créer de nouveaux.

## Mémoire inter-sessions

Quand un problème systématique est rencontré et résolu — erreur de config récurrente, comportement inattendu d'un outil, contrainte non documentée du projet — le sauvegarder en mémoire (`C:\Users\adrie\.claude\projects\C--ynov-movie-picker\memory\`) sous forme d'entrée `feedback` ou `project` selon le cas, pour que la prochaine session ne repart pas de zéro.

## Stack

Monorepo pnpm + Turbo :
- `apps/web` — Vite + React + TypeScript
- `apps/mobile` — Expo + React Native
- `apps/api-dotnet` — .NET + MongoDB

## Documentation clé

- **Roadmap produit** (features par version, statuts) → [`docs/roadmap-product.md`](docs/roadmap-product.md)
- **Roadmap tech** (infra, CI/CD, qualité, sécurité) → [`docs/roadmap-tech.md`](docs/roadmap-tech.md)
- **Bugs & dette** (fixes en cours et backlog) → [`docs/FIXES.md`](docs/FIXES.md)

## Accès outils externes (autonomie agent)

Outils configurés pour qu'un agent IA travaille sur le projet sans intervention manuelle. Les tokens et secrets sont en scope **local** (`~/.claude.json`), jamais versionnés.

| Outil | Accès | Usage |
|-------|-------|-------|
| GitHub | CLI `gh` | PR, issues, runs CI, releases |
| GCP | CLI `gcloud` | Cloud Run, Artifact Registry, Secret Manager, logs |
| AWS | CLI `aws` | S3, CloudFront (déploiement front) |
| SonarQube | MCP `sonarqube` (Docker) + CLI `sonar-scanner` (devDep) | qualité, issues, hotspots ; `pnpm check:sonar` (requiert `SONAR_TOKEN` dans l'env) |
| PostHog | MCP `posthog` (HTTP) | analytics, events produit |
| MongoDB | MCP `mongodb` | base dev `moviepicker_dev` |
| Resend | non configuré | envoi mail = à la demande |
