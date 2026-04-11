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

- **CI/CD (GitHub Actions)** : à chaque push sur `master`, build + déploiement automatique (voir `.github/workflows/ci-cd.yml`).

## Prérequis

- **Node.js** 20.19+, 22.13+, ou 24+ (**pnpm** pour le front), **.NET 10 SDK** (API), MongoDB (et Docker optionnel). Vérification : `node scripts/check-prereqs.js` et `dotnet --version`.

## Démarrage

1. Copier **`.env.example`** → **`.env`** à la racine et renseigner `MONGODB_URI` / `TMDB_API_KEY` (l’API .NET charge `.env` en remontant depuis le répertoire courant). Optionnel : `apps/web/.env` pour `VITE_API_URL` (voir `apps/web/.env.example`). En **Production** / Docker, l’API exige aussi **`ALLOWED_ORIGINS`** (origines CORS du front, virgules si plusieurs) ; en **Development**, `localhost` / `127.0.0.1` sont autorisés sans cette variable.
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
pnpm run lighthouse   # Lighthouse sur le build web (§ 35) — Node ≥ 22 + Chrome ; rapports dans artifacts/lighthouse/
```

- **API** : port 4000 — http://localhost:4000/ , /health , /swagger
- **Web** : port 5173 (Vite), **TanStack React Query** (event / films), thème clair-sombre (`ThemeContext`). Préfixe API `/api/v1` (voir client front). Hôte : `?host=<token>` ou cookie.

### Comptes de test (local)

En **Development**, l’API peut créer automatiquement des utilisateurs et des données de démo si le seed est activé (`apps/api-dotnet/MoviePicker.Api/appsettings.Development.json` → section `DevelopmentSeed`).

| Compte | E-mail | Mot de passe | Pseudo |
|--------|--------|--------------|--------|
| Principal | `dev@test.local` | `DevTest123!` | `Utilisateur dev` |
| Alice | `alice@test.local` | `AliceTest123!` | `Alice test` |
| Bob | `bob@test.local` | `BobTest12345!` | `Bob test` |

Les comptes sont créés une fois (e-mail absent en base). **Trois soirées** pour le compte principal (titres `Soirée de test — …`) si `SeedSampleEvents` est vrai et qu’aucune n’existe encore.

**Scénarios démo** (`SeedScenarioDemos`, défaut `true`) : Alice héberge une soirée « multi-participants » (config riche : thème, limite de propositions, mode de roue pondéré, réactions autorisées, partage riche) ; le compte **dev** et **Bob** la rejoignent ; films TMDB, votes up/down, réaction puis retrait, suppression d’un film par son proposeur. **Bob** héberge une soirée **roue + clôture** (deux films, votes, tirage pondéré, soirée clôturée avec gagnant).

Désactivation : variables `DevelopmentSeed__*` (voir `.env.example`) — notamment `DevelopmentSeed__SeedSampleEvents=false`, `DevelopmentSeed__SeedScenarioDemos=false`. Les deux utilisateurs extra sont configurables via le tableau `ExtraUsers` dans `appsettings.Development.json` (sinon Alice/Bob par défaut).

## Structure

- `apps/api-dotnet/` – API ASP.NET Core (C#), MongoDB, TMDB
- `apps/web/` – Front React (Vite, TypeScript)

Branche par défaut : **`master`** (CI/CD — voir [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)).
