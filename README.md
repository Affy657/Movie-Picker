# Movie Picker

Application pour organiser des soirées film : créer un event, partager le lien, proposer des films, voter, lancer la roue pour choisir le film.

## But du projet

- Permettre à un hôte de **créer une soirée film** (titre, date, heure) et d’obtenir un lien de partage.
- Les invités **rejoignent** avec un pseudo, **proposent des films** (recherche TMDB), **votent** (up/down).
- L’hôte **lance la roue** pour tirer un film au hasard, puis peut **clôturer** la soirée.
- Front et back déployés sur le cloud (AWS + GCP), avec CI/CD et monitoring.

## Architecture

- **Front** : React (Vite, TypeScript), hébergé sur **AWS** (S3 + CloudFront).
- **Back** : API ASP.NET Core (C#, .NET 10), déployée sur **GCP** (Cloud Run, image Docker dans Artifact Registry).
- **Données** : MongoDB Atlas. **Externe** : API TMDB (films).
- **CI/CD** : GitHub Actions (lint, tests web + API, puis déploiement sur `master`). E2E Playwright optionnel en local.

→ **[Schéma d’architecture](docs/dev%20cloud%20ynov/02-architecture.md)** (diagramme Mermaid).

## Services utilisés

| Fournisseur | Service | Rôle |
|-------------|---------|------|
| **AWS** | S3 | Hébergement du build statique (front). |
| **AWS** | CloudFront | CDN, HTTPS, URL publique du front. |
| **GCP** | Cloud Run | Exécution de l’API (conteneur). |
| **GCP** | Artifact Registry | Stockage de l’image Docker de l’API. |
| **MongoDB** | Atlas | Base de données (events, participants, movies, votes). |
| **TMDB** | API | Recherche de films, affiches. |

## Déploiement

- **Premier déploiement / manuel** : voir [Déploiement API (GCP)](docs/mvp/02-deploy-gcp-api.md) et [Déploiement Front (AWS)](docs/mvp/03-deploy-aws-front.md).
- **CI/CD (GitHub Actions)** : à chaque push sur `master`, build + déploiement automatique. Configuration : [04-deploy-cicd.md](docs/mvp/04-deploy-cicd.md).

## Documentation

[Index des fichiers numérotés](docs/README.md) — ordre de lecture suggéré par dossier.

À garder sous la main :

| | |
|--|--|
| [Spec technique](docs/01-spec-technique.md) | Stack, cloud |
| [CI/CD](docs/mvp/04-deploy-cicd.md) | Workflow, secrets, tests en CI |
| [Roadmap MVP](docs/mvp/01-roadmap-mvp.md) | Suivi des tâches |
| [Features](docs/03-features-list.md) | MVP, V1… |
| [API .NET](docs/02-architecture-api-dotnet.md) | Couches ; contrat : Swagger en dev, `OpenApiContractTests.cs` |
| [Déploiement GCP / AWS](docs/mvp/02-deploy-gcp-api.md), [03-deploy-aws-front](docs/mvp/03-deploy-aws-front.md) | Première mise en prod |
| [Monitoring](docs/mvp/05-monitoring.md) | Logs, métriques |
| [Consigne Ynov](docs/dev%20cloud%20ynov/01-consigne-dev-cloud-ynov.md) | Exigences projet |
| [Outils & environnement](docs/04-outils-environnement.md) | CLI GCP / AWS / GitHub, stack locale, scripts |
| [AGENTS.md](AGENTS.md) | Point d’entrée assistants IA (+ `.cursor/rules/`) |
| [RNCP 39583 — grilles](docs/RNCP/README.md) | Expert en développement logiciel (évaluation) |

## Prérequis

- **Node.js** ≥ 20, **pnpm** (front), **.NET 10 SDK** (API), MongoDB (et Docker optionnel). Vérification : `node scripts/check-prereqs.js` et `dotnet --version`.

## Démarrage

1. Copier **`.env.example`** → **`.env`** à la racine et renseigner `MONGODB_URI` / `TMDB_API_KEY` (l’API .NET charge `.env` en remontant depuis le répertoire courant). Optionnel : `apps/web/.env` pour `VITE_API_URL` (voir `apps/web/.env.example`). En **Production** / Docker, l’API exige aussi **`ALLOWED_ORIGINS`** (origines CORS du front, virgules si plusieurs) ; en **Development**, `localhost` / `127.0.0.1` sont autorisés sans cette variable. **Secrets / variables déploiement** : [docs/mvp/04-deploy-cicd.md](docs/mvp/04-deploy-cicd.md).
2. À la racine du repo :

```bash
pnpm install
pnpm build            # build front
pnpm dev:api-dotnet   # API .NET (port 4000)
pnpm dev:web          # Front (port 5173)
pnpm lint             # lint front
pnpm run verify:local # lint + format + build API + OpenAPI + audit + tests web & API (comme CI, local)
pnpm run format:dotnet:check  # style C# (après restore : dotnet restore apps/api-dotnet/MoviePicker.slnx)
pnpm run openapi:export       # OpenAPI JSON → artifacts/openapi-v1.json (Swashbuckle CLI, § 32)
pnpm test             # tests front (Turbo)
dotnet test apps/api-dotnet/MoviePicker.Api.Tests/MoviePicker.Api.Tests.csproj      # API unitaires
dotnet test apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj  # API intégration
pnpm exec playwright install chromium  # une fois : binaire navigateur pour Playwright
pnpm run test:e2e   # E2E : build d’abord avec VITE_API_URL=http://127.0.0.1:5010 (voir playwright.config.ts)
pnpm run test:e2e:ci  # E2E recommandé : build web + Playwright (API .NET stub TMDB démarrée par Playwright sur :5010)
pnpm run lighthouse   # Lighthouse sur le build web (§ 34) — Node ≥ 22 + Chrome ; rapports dans artifacts/lighthouse/
```

- **API** : port 4000 — http://localhost:4000/ , /health , /swagger
- **Web** : port 5173 (Vite), **TanStack React Query** (event / films), thème clair-sombre (`ThemeContext`). Préfixe API `/api/v1` (voir client front). Hôte : `?host=<token>` ou cookie.

## Structure

- `apps/api-dotnet/` – API ASP.NET Core (C#), MongoDB, TMDB
- `apps/web/` – Front React (Vite, TypeScript)
- `docs/` – Documentation (spec, roadmap, déploiement, architecture)

Branche par défaut : **`master`** (CI/CD — voir [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)).
