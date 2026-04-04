# Outils et environnement d’exécution

Ce document décrit les **outils en ligne de commande** et l’**environnement** typiquement disponibles pour travailler sur ce dépôt (développeur local ou **assistant IA** dans Cursor exécutant des commandes dans le terminal du projet).

## Principe important

Les commandes s’exécutent sur **ta machine** (ou l’environnement où Cursor est ouvert) avec **ta** configuration :

- **GCP** : compte actif `gcloud auth list`, projet `gcloud config get-value project`
- **AWS** : profil / variables d’environnement (`AWS_PROFILE`, clés, etc.)
- **GitHub** : `gh auth status` pour le CLI

Sans authentification ou sans droits sur le bon projet, les mêmes outils peuvent être installés mais les appels **échoueront** (IAM, secrets manquants, etc.).

## CLI cloud et dépôt

| Outil | Rôle usuel sur ce projet | Vérification |
|--------|---------------------------|--------------|
| **`gcloud`** | Projet GCP, Secret Manager, Cloud Run, Artifact Registry, activation d’API | `gcloud --version` |
| **`aws`** | S3, CloudFront (déploiement front, invalidation) | `aws --version` |
| **`gh`** | Issues, PR, secrets/variables du dépôt (noms uniquement), déclencher ou suivre les workflows | `gh auth status` |
| **`git`** | Branches, commits, push déclenchant la CI | `git --version` |

Références détaillées : [04-deploy-cicd.md](mvp/04-deploy-cicd.md), [02-deploy-gcp-api.md](mvp/02-deploy-gcp-api.md), [03-deploy-aws-front.md](mvp/03-deploy-aws-front.md).

## CLI build & tests (stack du repo)

| Outil | Rôle |
|--------|------|
| **`pnpm`** / **`node`** | Monorepo front, scripts racine, lint, tests Vitest |
| **`dotnet`** | Build, tests et format de l’API .NET |
| **`docker`** | Build image API (comme en CI) avant push Artifact Registry |
| **`npx` / Playwright** | E2E (`pnpm run test:e2e:ci`) |

Prérequis : voir [README](../README.md) § Prérequis et `node scripts/check-prereqs.js`.

## Scripts utilitaires du dépôt

| Script | Usage |
|--------|--------|
| [`scripts/sync-gcp-secrets-from-env.mjs`](../scripts/sync-gcp-secrets-from-env.mjs) | Créer ou mettre à jour `MONGODB_URI` et `TMDB_API_KEY` dans **Secret Manager** à partir du `.env` local (ne pas commiter `.env`). Ex. : `node scripts/sync-gcp-secrets-from-env.mjs TON_PROJECT_ID` |
| [`scripts/verify-local.cjs`](../scripts/verify-local.cjs) | Vérification locale proche de la CI : `pnpm run verify:local` à la racine |

## IDE / assistant (Cursor)

Dans un contexte **Cursor + agent**, en plus des CLI ci-dessus, peuvent être disponibles selon la configuration :

- **Terminal intégré** : mêmes outils que ton shell (PowerShell, bash, etc.)
- **MCP** (ex. navigateur) : utile pour tester un front déployé ou local ; les capacités exactes dépendent des serveurs MCP activés dans le projet

Cette liste n’est **pas garantie** sur toutes les machines : l’agent peut proposer des commandes à lancer ; adapte-les si un outil n’est pas installé.

## Résumé des commandes de contrôle

```bash
gcloud --version && aws --version && gh auth status && git --version
pnpm --version && node --version && dotnet --version
```

Pour la CI GitHub : `gh run list --workflow=ci-cd.yml` (après `gh auth login` si besoin).
