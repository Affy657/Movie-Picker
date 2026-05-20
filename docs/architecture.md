# Architecture système

Vue d’ensemble **sans ouvrir le code** : flux runtime, dépôt, contrat HTTP et organisation de l’API. Pour les choix d’implémentation (auth, codes d’erreur, tableau de routes, règles OpenAPI), se reporter au code et aux tests d’intégration listés ci-dessous.

## Schéma d’exécution

```mermaid
flowchart LR
  subgraph clients [Clients]
    Browser[Navigateur / PWA]
    Mobile[App mobile Expo]
  end
  subgraph aws [AWS]
    CF[CloudFront]
    S3[S3 statique]
    CF --> S3
  end
  subgraph gcp [GCP]
    CR[Cloud Run API .NET]
    AR[Artifact Registry]
    AR -.-> CR
  end
  Browser --> CF
  Browser --> CR
  Mobile --> CR
  CR --> Mongo[(MongoDB Atlas)]
  CR --> TMDB[API TMDB]
  CR --> Resend[Resend (Email)]
```

- **Web** : assets servis par CloudFront/S3 ; la SPA appelle l’API (CORS, cookies auth).
- **Mobile** : Expo (React Native), mêmes endpoints `/api/v1` ; pas de déploiement store décrit ici (build/dev local ou binaire Expo).
- **Resend** : envoi des mails de reset mot de passe (prod) via `ResendEmailSender` ; en dev sans clé API, repli sur `LogEmailSender` (logs uniquement).

## Services

| Fournisseur | Service | Rôle |
|-------------|---------|------|
| **AWS** | S3 | Build statique front (SPA) |
| **AWS** | CloudFront | CDN, HTTPS, URL publique front |
| **GCP** | Cloud Run | Conteneur API ASP.NET Core |
| **GCP** | Artifact Registry | Image Docker API |
| **GCP** | Secret Manager | Secrets injectés au déploiement Cloud Run (`MONGODB_URI`, `TMDB_API_KEY`, clés auth, etc.) |
| **MongoDB** | Atlas | Persistance (soirées, utilisateurs, films, votes…) |
| **TMDB** | API | Recherche films, métadonnées, affiches |
| **Resend** | API email | Mails transactionnels reset password (prod ; dev → logs si non configuré) |

## Monorepo

| Élément | Rôle |
|---------|------|
| **pnpm** + `pnpm-workspace.yaml` | Workspaces `apps/*` (web, mobile) |
| **Turbo** (`turbo.json`) | Orchestration `build`, `dev`, `lint`, `test` entre paquets |
| Racine `package.json` | Scripts transverses : `dev:web`, `dev:api-dotnet`, `verify:local`, `openapi:export`, E2E Playwright |
| **`dotnet`** (hors workspace pnpm) | API dans `apps/api-dotnet/` (solution `MoviePicker.slnx`) |

**`pnpm run verify:local`** : reprend surtout les jobs **lint** + **test-web** + **test-api** (lint, format, build API, export OpenAPI, `pnpm audit`, tests web + API). **En plus en local** : tests Jest **mobile**. **Uniquement en CI** (job lint) : audit NuGet vulnérable (échec High/Critical). Déploiement, Trivy image et Lighthouse : CI seulement.

## Dépôt (repères dev)

| Chemin | Rôle |
|--------|------|
| `apps/web/` | SPA React (Vite), **TanStack Query**, PWA (Service Worker via `vite-plugin-pwa` / Workbox), appels HTTP vers l’API |
| `apps/mobile/` | App **Expo** + React Native (Expo Router), client API typé (OpenAPI), parité fonctionnelle V1 avec le web ; **pas de job CI** dédié (tests via `verify:local` ou manuel) |
| `apps/api-dotnet/MoviePicker.Api/` | API ASP.NET Core (.NET 10) |
| `artifacts/openapi-v1.json` | Export OpenAPI (`pnpm run openapi:export`) |
| `e2e/` + `playwright.config.ts` | Tests E2E Playwright (local / `test:e2e:ci`, pas de job CI par défaut) |
| Racine `eslint.config.mjs` | ESLint 9 (flat config) pour le front |
| `configs/` | TypeScript / Prettier partagés (`tsconfig*.json`, `prettier.config.cjs`) |
| `.github/workflows/ci-cd.yml` | Pipeline CI/CD (voir ci-dessous) |

En développement local typique : API **port 4000** (`http://localhost:4000/`, `/health`, `/swagger`), front Vite **port 5173**, mobile via Expo (API joignable selon IP / tunnel, voir `apps/mobile/.env`). Préfixe API public **`/api/v1`**.

**Auth** : sessions utilisateur par **cookie** (inscription, connexion, `/auth/me`) ; actions **hôte** sur une soirée via jeton `?host=<token>` en query ou stockage local équivalent (partage invité sans ce jeton). En prod, front (CloudFront) et API (Cloud Run) sur origines distinctes : **CORS** avec `ALLOWED_ORIGINS`, cookies **`SameSite=None` + `Secure`** pour les mutations authentifiées cross-site.

## PWA (web)

- Manifest, icônes multi-tailles, **Service Worker** (precache + stratégie réseau selon Workbox).
- Permet installation « Ajouter à l’écran d’accueil » et usage **hors-ligne partiel** (shell et assets statiques en cache — pas les données soirée / API).
- Déploiement front : push S3 en **3 étapes** (`index.html` et SW en dernier, assets hachés en cache long) puis invalidation CloudFront ; risque de désynchronisation SW / bundles si l’ordre ou l’invalidation est incorrect.

## Contrat HTTP (surface)

- **Préfixe** : `/api/v1`.
- **Swagger** en environnement de développement ; export du schéma vers `artifacts/openapi-v1.json` ; tests d’intégration **`OpenApiContractTests`** sur le JSON exporté pour éviter les dérives de contrat.
- Proxy affiches TMDB : `/api/v1/posters/{posterKey}`.

## Structure applicative (API)

Architecture **hexagonale** :

- **Domaine** : concepts et règles sans dépendance framework (soirée, slug, erreurs métier).
- **Application** : cas d’usage (handlers), **ports** (interfaces), DTOs ; orchestre sans connaître MongoDB ni HTTP.
- **Infrastructure** : implémentations concrètes des ports (MongoDB, documents, repositories, TMDB, email, cookies / jeton hôte).
- **Entrée** : contrôleurs ASP.NET qui traduisent HTTP → cas d’usage → JSON.

Flux type : requête HTTP → contrôleur → handler → règles domaine → port → implémentation → réponse DTO. Les erreurs métier prévues sont mappées en réponses HTTP cohérentes (filtres / middleware).

## CI/CD

Fichier **`.github/workflows/ci-cd.yml`** — déclenché sur `master` (push) et PR :

| Phase | Contenu |
|-------|---------|
| **Sécurité repo** | Gitleaks (scan secrets dans l’arbre Git ; complète l’absence de Secret Scanning natif sur repo privé sans Advanced Security) |
| **Lint / qualité** | ESLint + Prettier (front), `dotnet format`, build API Release, export OpenAPI, `pnpm audit`, audit NuGet (échec si High/Critical) |
| **Tests** | Vitest + couverture (web) ; xUnit + intégration + `OpenApiContractTests` (API) — **mobile non couvert** |
| **Lighthouse** | Rapport front (non bloquant) |
| **Image API** (push `master`) | Build Docker → **scan Trivy** (HIGH/CRITICAL, bloquant) → push Artifact Registry |
| **Déploiement** (push `master`) | **Cloud Run** (secrets Secret Manager + `ALLOWED_ORIGINS`) ; front Vite → **S3** (3 étapes) + invalidation **CloudFront** |

**Hors `ci-cd.yml`** : **SonarCloud** via l’app GitHub officielle (quality gate sur PR / `master`, check requis en branch protection). Pas de **Grype** dans ce dépôt (Trivy uniquement pour les images).
