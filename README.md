# 🎬 Movie Picker

**Organisez vos soirées film à plusieurs.** Créez une soirée, partagez le lien, proposez des films, votez — et laissez la roue trancher.

🌐 **Production : [web.movie-picker.fr](https://web.movie-picker.fr/)**

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Démarrage](#démarrage)
- [Scripts utiles](#scripts-utiles)
- [Tests et qualité](#tests-et-qualité)
- [Comptes de test et seed](#comptes-de-test-et-seed)
- [Déploiement et CI/CD](#déploiement-et-cicd)
- [Structure du projet](#structure-du-projet)
- [Documentation](#documentation)

---

## Fonctionnalités

### Le parcours d'une soirée

1. 🎬 **Créer une soirée** (titre, date, heure) et obtenir un lien de partage.
2. 👥 **Rejoindre** la soirée depuis le lien partagé (compte requis).
3. 🍿 **Proposer des films** via la recherche TMDB (affiches, métadonnées).
4. 👍 **Voter** (up/down) et marquer un film « déjà vu ».
5. 🎡 **Lancer la roue** pour tirer un film au sort (tirage pondérable).
6. 🏆 **Clôturer** la soirée avec le film gagnant.

### Et aussi

- 📱 **PWA** installable (« Ajouter à l'écran d'accueil ») avec usage hors-ligne partiel
- 🌓 Thème **clair / sombre**
- 🔔 **Notifications** push et in-app
- 👤 **Profils publics** (`/u/:handle`)
- 📅 **Export calendrier** (`.ics`) des soirées à venir
- 🔒 **Suppression de compte** et export des données (RGPD)
- ♿ **Accessibilité** : navigation clavier, focus visible, skip link

---

## Architecture

```mermaid
flowchart LR
  subgraph clients [Clients]
    Browser[Navigateur / PWA]
  end
  subgraph aws [AWS]
    CF[CloudFront]
    S3[S3 statique]
    CF --> S3
  end
  subgraph gcp [GCP]
    CR[Cloud Run · API .NET]
    AR[Artifact Registry]
    AR -.-> CR
  end
  Browser --> CF
  Browser --> CR
  CR --> Mongo[(MongoDB Atlas)]
  CR --> TMDB[API TMDB]
  CR --> Resend[Resend · Email]
```

- **Front** — React (Vite, TypeScript), **TanStack Query**, thème clair/sombre, PWA (Service Worker via `vite-plugin-pwa` / Workbox). Build statique hébergé sur **AWS**.
- **Back** — API ASP.NET Core (C#, .NET 10) en **architecture hexagonale**, conteneurisée sur **GCP** Cloud Run.
- **Données et services externes** — MongoDB Atlas ; TMDB (films, affiches proxifiées via `/api/v1/posters/{clé}`) ; Resend (mails de réinitialisation de mot de passe).
- **API** — préfixe public `/api/v1`, Swagger en développement, schéma exporté vers `artifacts/openapi-v1.json`.
- **Auth** — sessions par **cookie** ; actions hôte via jeton `?host=<token>`. En production, front et API sont sur des origines distinctes → CORS (`ALLOWED_ORIGINS`) et cookies `SameSite=None; Secure`.

| Fournisseur | Service | Rôle |
|-------------|---------|------|
| **AWS** | S3 | Hébergement du build statique (front) |
| **AWS** | CloudFront | CDN, HTTPS, URL publique du front |
| **GCP** | Cloud Run | Exécution de l'API (conteneur) |
| **GCP** | Artifact Registry | Stockage de l'image Docker de l'API |
| **GCP** | Secret Manager | Secrets injectés au déploiement Cloud Run |
| **MongoDB** | Atlas | Base de données |
| **TMDB** | API | Recherche de films, affiches |
| **Resend** | API email | Mails transactionnels (prod ; dev → logs si non configuré) |

### Découpage de l'API (hexagonal)

- **Domaine** — entités et règles métier, sans dépendance framework.
- **Application** — cas d'usage (handlers), ports (interfaces) et DTOs.
- **Infrastructure** — implémentations concrètes des ports : MongoDB, TMDB, email, cookies / jeton hôte.
- **Entrée** — contrôleurs ASP.NET qui traduisent HTTP ↔ cas d'usage.

---

## Prérequis

- **Node.js** 20.19+, 22.13+ ou 24+ et **pnpm** (front)
- **.NET 10 SDK** (API)
- **MongoDB** (local ou Atlas) — **Docker** optionnel

Vérification rapide : `node scripts/check-prereqs.js` et `dotnet --version`.

---

## Démarrage

**1. Configurer l'environnement.** Copier `.env.example` → `.env` à la racine et renseigner au minimum `MONGODB_URI` et `TMDB_API_KEY` (l'API .NET charge `.env` en remontant depuis le répertoire courant). Optionnel : `apps/web/.env` pour `VITE_API_URL` (voir `apps/web/.env.example`).

> En **Development**, `localhost` / `127.0.0.1` sont autorisés sans configuration CORS. En **Production** / Docker, l'API exige aussi `ALLOWED_ORIGINS` (origines du front, séparées par des virgules).

**2. Installer et lancer.**

```bash
pnpm install

pnpm dev:api-dotnet   # API .NET   → http://localhost:4000  (/health, /swagger)
pnpm dev:web          # Front Vite → http://localhost:5173
```

---

## Scripts utiles

Commandes à lancer à la racine du dépôt.

| Script | Description |
|--------|-------------|
| `pnpm dev:web` | Lance le front (Vite, port 5173) |
| `pnpm dev:api-dotnet` | Lance l'API .NET (port 4000) |
| `pnpm build` | Build du front (Turbo) |
| `pnpm lint` | Lint du front (ESLint) |
| `pnpm format` / `pnpm format:check` | Formatage Prettier (écriture / vérification) |
| `pnpm format:dotnet:check` | Style C# (`dotnet format`, après `dotnet restore`) |
| `pnpm test` | Tests front (Vitest, via Turbo) |
| `pnpm run openapi:export` | Export OpenAPI → `artifacts/openapi-v1.json` |
| `pnpm run test:e2e` | Tests E2E Playwright (local) |
| `pnpm run test:e2e:ci` | E2E recommandé : build web + Playwright (stub TMDB sur `:5010`) |
| `pnpm run lighthouse` | Lighthouse sur le build web (Node ≥ 22 + Chrome) |
| `pnpm run verify:local` | Pipeline locale complète (≈ CI) — voir [Tests et qualité](#tests-et-qualité) |

> **Build du front** : le paquet `web` enchaîne `tsc`, `vite build`, puis un contrôle (`apps/web/scripts/check-prod-bundle-secrets.mjs`) qui interdit d'embarquer les identifiants du compte dev dans `dist/assets/*.js`. Un `vite build` lancé à la main dans `apps/web` n'effectue **pas** ce contrôle.

> **Override pnpm (`basic-ftp`)** : la racine force une version patchée de `basic-ftp` (dépendance transitive de `lighthouse`) pour garder `pnpm audit --audit-level=high` vert. À réévaluer lors d'une montée majeure de Lighthouse.

---

## Tests et qualité

`pnpm run verify:local` reproduit localement l'essentiel de la CI : **lint** + **format** + **build API** + **export OpenAPI** + **`pnpm audit`** + **tests web et API**.

```bash
# API .NET
dotnet test apps/api-dotnet/MoviePicker.Api.Tests/MoviePicker.Api.Tests.csproj             # unitaires
dotnet test apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj  # intégration

# E2E Playwright (une fois : installer le navigateur)
pnpm exec playwright install chromium
pnpm run test:e2e:ci
```

Les tests d'intégration incluent `OpenApiContractTests`, qui vérifie le JSON OpenAPI exporté pour éviter les dérives de contrat.

---

## Comptes de test et seed

En **Development**, l'API peut créer automatiquement des comptes et des données de démo si le seed est activé (`apps/api-dotnet/MoviePicker.Api/appsettings.Development.json` → section `DevelopmentSeed`, ou variables `DevelopmentSeed__*`).

| Compte | E-mail | Mot de passe | Particularité |
|--------|--------|--------------|---------------|
| Principal | `dev@test.local` | `DevTest123!` | Hôte de plusieurs soirées |
| Alice | `alice@test.local` | `AliceTest123!` | Profil public |
| Bob | `bob@test.local` | `BobTest12345!` | Profil public |
| Carla | `carla@test.local` | `CarlaTest123!` | Profil **privé** (teste le 404) |
| David | `david@test.local` | `DavidTest123!` | Profil public |

Chaque compte n'est créé que si son e-mail est absent en base.

- **`SeedSampleEvents`** — quelques soirées de test pour le compte principal.
- **`SeedScenarioDemos`** — un jeu de soirées de démo couvrant les états clés (multi-participants, roue & clôture, capacité atteinte, retrait / quitter, roue tirée « gelée », soirée passée, échéance, soirée vide, soirée annulée), plus un graphe de follows et des notifications.

Désactivation : `DevelopmentSeed__Enabled=false`, ou plus finement `DevelopmentSeed__SeedSampleEvents=false` / `DevelopmentSeed__SeedScenarioDemos=false`. Les comptes secondaires sont configurables via `ExtraUsers` dans `appsettings.Development.json`.

---

## Déploiement et CI/CD

Pipeline GitHub Actions : `.github/workflows/ci-cd.yml`, déclenché sur `master` (push) et sur les PR.

| Phase | Contenu |
|-------|---------|
| **Sécurité repo** | Gitleaks (scan de secrets dans l'arbre Git) |
| **Lint / qualité** | ESLint + Prettier, `dotnet format`, build API Release, export OpenAPI, `pnpm audit`, audit NuGet (échec si High/Critical) |
| **Tests** | Vitest + couverture (web) ; xUnit + intégration + `OpenApiContractTests` (API) |
| **Qualité (Sonar)** | SonarScanner for .NET → SonarCloud (front + API, couverture lcov + opencover), **Quality Gate bloquant** |
| **Lighthouse** | Rapport front (non bloquant) |
| **Image API** *(push `master`)* | Build Docker → scan **Trivy** (HIGH/CRITICAL, bloquant) → push Artifact Registry |
| **Déploiement** *(push `master`)* | **Cloud Run** (secrets Secret Manager + `ALLOWED_ORIGINS`) ; front → **S3** + invalidation **CloudFront** |

- **Quality Gate SonarCloud** : le job `sonar` attend le verdict (`sonar.qualitygate.wait`) et bloque le déploiement s'il n'est pas vert (check requis en branch protection).
- **Déploiement front** : push S3 en 3 étapes (`index.html` et Service Worker en dernier, assets hachés en cache long) puis invalidation CloudFront, pour éviter toute désynchronisation Service Worker / bundles.

Branche par défaut : **`master`**.

---

## Structure du projet

```
movie-picker/
├─ apps/
│  ├─ web/            # Front React (Vite, TypeScript), PWA
│  └─ api-dotnet/     # API ASP.NET Core (.NET 10) — solution MoviePicker.slnx
├─ artifacts/         # Export OpenAPI, rapports Lighthouse
├─ configs/           # tsconfig / Prettier partagés
├─ docs/              # Documentation (roadmaps, correctifs, RNCP)
├─ e2e/               # Tests E2E Playwright
└─ scripts/           # Scripts utilitaires (verify:local, prérequis, OpenAPI…)
```

---

## Documentation

| Document | Contenu |
|----------|---------|
| [`docs/roadmap-product.md`](docs/roadmap-product.md) | Roadmap produit |
| [`docs/roadmap-tech.md`](docs/roadmap-tech.md) | Roadmap technique |
| [`docs/FIXES.md`](docs/FIXES.md) | Suivi des correctifs |
