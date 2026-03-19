# Movie Picker – Roadmap MVP (carte de suivi)

Suite de tâches à suivre de maintenant jusqu'à la fin du MVP.  
Références : [spec-technique.md](../spec-technique.md), [features-list.md](../features-list.md) (Features list).

Cocher au fur et à mesure. Une autre IA ou un humain peut reprendre en suivant l'ordre des sections.  
**Après le MVP (§ 16)** : migration .NET (§ 17), puis **§ 18–22** (qualité, tests, CI, E2E local — livrés). **§ 23–28** : pistes stack **avant la V1**. **§ 29–32** : compléments robustesse (correlation ID, erreurs JSON, front, `dotnet format`, contrat OpenAPI). **§ 28** : nom de domaine.

---

## 1. Prérequis

> **Prérequis :** [README racine](../../README.md) (section *Prérequis*), `node scripts/check-prereqs.js`, `dotnet --version`.

- [x] Créer / avoir un dépôt GitHub pour le projet
- [x] Avoir un compte AWS (accès S3, CloudFront)
- [x] Avoir un compte GCP (accès Cloud Run, Artifact Registry)
- [x] Créer un cluster MongoDB Atlas et récupérer l'URI de connexion
- [x] Obtenir une clé API TMDB
- [x] Vérifier l'environnement local : Node 20, pnpm, Docker, Git → `node scripts/check-prereqs.js`

---

## 2. Init du projet

- [x] Initialiser un monorepo Turborepo avec pnpm (racine du repo)
- [x] Créer l'app `apps/api` (Express + TypeScript strict)
- [x] Créer l'app `apps/web` (React + TypeScript strict, ex. Vite)
- [x] Configurer TypeScript strict pour les deux apps
- [x] Vérifier que `pnpm install` et `pnpm build` (ou `turbo run build`) passent

---

## 3. API – Base (events, participants)

- [x] Connecter l'API à MongoDB Atlas (variable d'environnement)
- [x] Définir les modèles / schémas : `events`, `participants` (ids, champs selon spec)
- [x] Exposer POST `/events` (création : title, date, time, génération hostToken + slug court pour l'URL)
- [x] Exposer GET `/events/:id` ou GET `/events/slug/:slug` (détail d'un event)
- [x] Exposer POST pour rejoindre un event (création participant avec pseudo, lien event)
- [x] Vérifier que l'hôte est identifié (query `?host=xxx` ou cookie) pour les actions réservées

---

## 4. API – Movies et votes

- [x] Définir les collections / modèles : `movies`, `votes` (liés à event et participant)
- [x] Exposer un endpoint de recherche films (proxy vers TMDB, côté serveur, clé en env)
- [x] Exposer POST pour ajouter un film à un event (vérifier doublon par id TMDB ou titre)
- [x] Exposer GET des films d'un event (avec infos proposant, score up/down)
- [x] Exposer POST upvote / downvote (un vote par participant par film)
- [x] Exposer suppression d'un film (par le proposant, si la roue n'a pas été lancée)

---

## 5. API – Roue et clôture

- [x] Exposer POST (ou GET) pour lancer la roue (réservé à l'hôte) : tirage parmi les films, retour du gagnant
- [x] Persister le résultat (film gagnant) sur l'event et/ou marquer l'event comme clôturé
- [x] Exposer POST pour clôturer l'event (réservé à l'hôte)
- [x] Gérer les cas : 0 film (erreur ou message), 1 film (gagnant direct)

---

## 6. API – Expiration et lecture seule

- [x] Lors du GET event, renvoyer un indicateur « terminé » si date/heure de l'event est dépassée (ou date de fin configurée)
- [x] Bloquer ou ignorer les actions d'écriture (ajout film, vote, roue) si l'event est terminé

---

## 7. Front – Base et navigation

- [x] Configurer l'app React (Vite ou équivalent), mobile-first
- [x] Mettre en place le routage : page d'accueil (home), création d'event, détail event (ex. `/s/:slug`)
- [x] Configurer l'appel à l'API (URL de base en variable d'environnement build)
- [x] Afficher une structure de page pour « détail event » (titre, date, zone films, zone roue)

---

## 8. Front – Création et accès à un event

- [x] Page « créer un event » : formulaire (titre, date, heure), soumission vers POST `/events`
- [x] Après création : redirection vers la page de l'event avec token hôte (URL ou cookie) et affichage du lien de partage
- [x] Bouton « Copier le lien » (URL de l'event) vers le presse-papier
- [x] Page « rejoindre » (ouverture du lien) : saisie du pseudo, enregistrement du participant
- [x] Afficher le détail de l'event (titre, date, liste des films, bouton « Lancer la roue » visible uniquement pour l'hôte)

---

## 9. Front – Movies (liste, proposition, votes)

- [x] Afficher la liste des films de l'event (poster, titre, année, qui a proposé)
- [x] Formulaire / recherche pour proposer un film (appel API recherche TMDB puis ajout à l'event)
- [x] Gérer l'erreur ou le message « Déjà proposé » en cas de doublon
- [x] Boutons upvote / downvote par film (un vote par participant)
- [x] Bouton « Retirer ma proposition » pour le proposant (si roue non lancée)

---

## 10. Front – Roue

- [x] Bouton « Lancer la roue » (affiché seulement si hôte) : appel API, récupération du film gagnant
- [x] Animation de roue (tourne puis s'arrête sur le film tiré)
- [x] Affichage du film gagnant ; bouton « Clôturer la soirée » (hôte)
- [x] Cas 0 film : message « Aucun film », bouton roue désactivé
- [x] Cas 1 film : affichage direct du gagnant (sans animation ou animation courte)

---

## 11. Front – Event terminé

- [x] Si l'event est expiré ou clôturé : afficher un message type « Soirée terminée » et passer la page en lecture seule (pas d'ajout de film, pas de vote, pas de roue)

---

## 12. Docker et déploiement API (GCP)

- [x] Écrire un Dockerfile pour l'app API (Node, build TypeScript ou run compilé)
- [x] Créer un dépôt dans Artifact Registry (GCP) pour l'image Docker
- [x] Configurer Cloud Run : déployer l'image, définir les variables d'environnement (MONGODB_URI, TMDB_API_KEY, etc.)
- [x] Vérifier que l'API répond en HTTPS sur l'URL Cloud Run

> **Doc :** [deploy-gcp-api.md](deploy-gcp-api.md) – build Docker et étapes Artifact Registry / Cloud Run.

---

## 13. Déploiement Front (AWS)

- [x] Build de l'app React (variable `VITE_API_URL` pointant vers l'URL Cloud Run)
- [x] Créer un bucket S3 pour héberger le build statique
- [x] Configurer CloudFront : origine S3, HTTPS, URL par défaut, `index.html` en root object, erreurs 403/404 → `/index.html` (SPA)
- [x] Déployer le build sur S3 et vérifier l'accès via l'URL CloudFront

> **Doc :** [deploy-aws-front.md](deploy-aws-front.md) – build avec `VITE_API_URL`, S3, CloudFront, commandes de déploiement.

---

## 14. CI/CD (GitHub Actions)

- [x] Créer un workflow : sur push (ex. `master`), lancer les tests (si présents), build des deux apps
- [x] Ajouter le job de build de l'image Docker de l'API et push vers Artifact Registry (GCP)
- [x] Ajouter le job de déploiement vers Cloud Run (API)
- [x] Ajouter le job de déploiement du front (upload S3, invalidation CloudFront si besoin)
- [x] Stocker les secrets nécessaires (AWS, GCP, TMDB, MONGODB_URI) dans les secrets du repo

> **Doc :** [deploy-cicd.md](deploy-cicd.md) – workflow, secrets à configurer, dépannage.

---

## 15. Monitoring et documentation

- [x] Vérifier que les logs de l'API sont visibles (Cloud Logging GCP)
- [x] Vérifier / configurer un minimum de métriques (Cloud Run, CloudFront)
- [x] Rédiger le README : but du projet, architecture, services utilisés, instructions de déploiement
- [x] Ajouter un schéma d'architecture (diagramme)

> **Doc :** [monitoring.md](monitoring.md) – où voir les logs (Cloud Logging) et les métriques (Cloud Run, CloudFront). [Schéma d'architecture](../dev%20cloud%20ynov/architecture.md) (Mermaid).

---

## 16. MVP terminé

- [x] Parcours complet testé : créer un event → copier le lien → rejoindre avec un pseudo → proposer des films → voter → lancer la roue → clôturer
- [x] Vérifier que la consigne Ynov est couverte (front et back sur AWS et GCP, CI/CD, monitoring, doc)
- [x] Préparer la soutenance (présentation 15–20 min)

> **Docs :** [README racine](../../README.md) (démarrage, commandes de test). [Consigne Ynov](../dev%20cloud%20ynov/consigne-dev-cloud-ynov.md). [deploy-cicd.md](deploy-cicd.md) (CI, couverture).

---

## 17. Migration back .NET (entre MVP et V1)

**Terminée.** L'API est désormais **ASP.NET Core (C#)** ; le front et le déploiement sont inchangés.
- [x] Documenter le contrat API actuel (OpenAPI/Swagger) comme référence
- [x] Créer le projet ASP.NET Core Web API (mêmes routes, même JSON)
- [x] Implémenter events, participants, movies, votes, wheel, close + MongoDB + TMDB
- [x] Adapter Dockerfile et CI/CD (build .NET, push image, déploiement Cloud Run)
- [x] Valider le parcours complet avec le front inchangé ; retirer l’ancienne API Node

> **Doc :** [architecture-api-dotnet.md](../architecture-api-dotnet.md) (contrat : Swagger + `OpenApiContractTests.cs`). Contexte migration : [features-list.md](../features-list.md) § *Migration back .NET*.

---

## Post-MVP (après § 16–17) — livrés

Travaux réalisés après la clôture fonctionnelle du MVP et la migration .NET, regroupés par thème.

---

### 18. Qualité du code (lint & format)

- [x] **ESLint** (`@typescript-eslint`) à la racine, script `lint:eslint`
- [x] **Prettier** (`.prettierrc`), scripts `format` / `format:check`
- [x] CI : exécution ESLint + Prettier check dans le job **lint** (en plus du `tsc --noEmit` front)

> Suite qualité avant V1 : § **29–32** (correlation ID, erreurs JSON, front, C#, OpenAPI).

---

### 19. Tests automatisés — API .NET

- [x] Projet **`MoviePicker.Api.Tests`** (xUnit, Moq, Coverlet) : tous les handlers (CreateEvent, Join, GetDetail, AddMovie, Vote, DeleteMovie, ListMovies, LaunchWheel, Close)
- [x] Tests **TmdbMovieSearch** (HttpClient mocké)
- [x] Tests mappers Mongo + **MoviePickerExceptionFilter**
- [x] **Builders** de test (`EventEntityBuilder`, `CreateEventRequestBuilder`)
- [x] Projet **`MoviePicker.Api.IntegrationTests`** (WebApplicationFactory, repos **en mémoire** si `MONGODB_URI` vide) : parcours HTTP critique (health, create, join, films, vote, roue, close)
- [x] **Contrat OpenAPI** : test sur `/swagger/v1/swagger.json` (chemins `/health`, `POST /events`, etc.)
- [x] **Stub TMDB** (`E2E_STUB_TMDB=1`) pour scénarios E2E locaux

> Voir [deploy-cicd.md](deploy-cicd.md) § 4 (tests en CI), [README racine](../../README.md) (commandes locales).

---

### 20. Tests automatisés — Front (React)

- [x] **Vitest** + Testing Library : Home, CreateEvent, JoinForm, MovieList, WheelSection, **EventDetail**, **AddMovieForm**, **ShareLink**, routes via **`AppRoutes`**
- [x] **MSW** pour EventDetail / AddMovieForm ; **vi.mock** `fetchApi` pour CreateEvent / JoinForm
- [x] Tests **client API** (`fetchApi`, erreurs) et **storage** (`sessionStorage` event)
- [x] **Accessibilité** : `vitest-axe` sur Home et CreateEvent
- [x] **Seuils de couverture** Vitest (v8) dans `vitest.config.ts`
- [x] Correctif **EventDetail** : effet de polling (rafraîchissement 5 s) placé **avant** les retours conditionnels (règles des hooks React)

---

### 21. CI/CD — Pipeline parallèle & couverture

- [x] Jobs séparés après **lint** : **test-web** (Vitest + `test:coverage` via Turbo), **test-api** (unitaires + intégration .NET + collecte Coverlet)
- [x] Artefacts **couverture** (`coverage-web`, `coverage-api-unit`)
- [x] Script racine **`test:coverage`** + tâche Turbo **`test:coverage`**
- [x] Déploiements (**docker-api**, **deploy-front**) conditionnés à **test-web** + **test-api** uniquement (E2E Playwright **hors CI** : durée / fragilité)

> Voir [deploy-cicd.md](deploy-cicd.md), [.github/workflows/ci-cd.yml](../../.github/workflows/ci-cd.yml).

---

### 22. E2E navigateur (optionnel, local)

- [x] **Playwright** : scénario `e2e/critical-flow.spec.ts` (création → join → film → roue)
- [x] Config **`playwright.config.ts`** : API sur `:5010` avec **`--no-launch-profile`** (sinon port 4000 depuis launchSettings)
- [ ] Exécution **manuelle** en local : `pnpm run test:e2e` / `test:e2e:ci` après `pnpm exec playwright install chromium` — **non bloquant** en CI

---

## Avant V1 — pistes stack (à faire)

Issues techniques à traiter avant ou en parallèle du début du dev V1. Les features produit V1 restent dans [features-list.md](../features-list.md). Compléments techniques : § **29–32**.

---

### 23. Sécurité (priorité haute)

- [x] **CORS en production** : ne plus autoriser toutes les origines ; variable `ALLOWED_ORIGINS` (liste séparée par virgules), fallback permissif en dev uniquement (CloudFront + localhost)
- [x] **Rate limiting** : limiter par IP (ou clé) sur `POST /events`, `POST …/join`, `GET …/movies/search` (abus, coût TMDB) — middleware ASP.NET ou package type AspNetCoreRateLimit
- [x] **Secrets en prod** : migrer `MONGODB_URI`, `TMDB_API_KEY` vers **GCP Secret Manager** ; Cloud Run référence les secrets (pas de valeurs en clair dans la CI)
- [x] **En-têtes de sécurité** : au minimum `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (ou `SAMEORIGIN` si iframe nécessaire)

---

### 24. API .NET (structure et robustesse)

- [x] **Préfixe `/v1`** : monter les controllers sous `/api/v1` (ou routes équivalentes) ; ajuster une fois `VITE_API_URL` / base côté front
- [x] **Validation des variables au démarrage** : en production, échouer au démarrage si `MONGODB_URI` vide (message clair) au lieu du mode in-memory implicite
- [x] **Swagger** : `ProducesResponseType` sur les endpoints principaux pour documenter 4xx/5xx
- [x] **Logging structuré** : logs exploitables dans Cloud Logging (JSON, niveaux cohérents, durées / erreurs handlers)

---

### 25. Front React (préparer la V1)

- [x] **Hooks** `useEvent(slug)` / `useMovies(slug)` : extraire fetch + state depuis `EventDetail` (tests, Config V1, cache)
- [x] **Cache / données serveur** : **React Query** ou **SWR** pour event + movies (refetch, loading/error centralisés, base pour mise à jour temps réel V1)
- [x] **Type erreur API** : `ApiError` (ex. `{ message: string; code?: number }`) côté client pour affichage et « Réessayer »
- [x] **Liste films vide (erreur)** : si le chargement échoue, message explicite + bouton « Réessayer » (pas seulement liste vide)
- [x] **Mode sombre** : thème (CSS variables ou context) pour anticiper la V1 sans gros refactor

---

### 26. CI/CD et qualité

- [x] **Branche principale unique** : **`master`** en CI (branche par défaut du dépôt) ; voir [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml)
- [x] **pnpm audit** : étape CI `pnpm audit --audit-level=high` (optionnel : bloquer sur critique)
- [x] **Dépendances** : traiter alertes Dependabot / Renovate et tenir à jour deps (front, outils de build)

---

### 27. Organisation du monorepo

- [x] **`configs/` partagés** : tsconfig de base et/ou ESLint/Prettier partagés ; les apps `extends` pour éviter la duplication
- [x] **Documentation des env** : `.env.example` (racine + `apps/web/`), secrets et variables déploiement dans [deploy-cicd.md](deploy-cicd.md)

---

### 28. Nom de domaine

- [ ] **Domaine dédié** : remplacer URLs par défaut CloudFront / Cloud Run par ex. `app.*` et `api.*` — certificat ACM (front), mapping + cert GCP (Cloud Run) ; mettre à jour `VITE_API_URL` et **CORS** (`ALLOWED_ORIGINS`)

---

### 29. API .NET — Correlation ID et erreurs JSON cohérentes

- [x] **Correlation ID** : accepter ou générer un identifiant de requête (ex. en-tête `X-Request-Id` / `X-Correlation-Id`), le renvoyer dans la réponse si pertinent et l’inclure dans les **logs structurés** (filtrage Cloud Logging).
- [x] **Erreurs JSON homogènes** : même enveloppe pour validation, 404 route, rate limiting, exceptions métier (ex. `{ "error": "...", "code"?: ... }` ou convention unique documentée dans le code / Swagger) pour simplifier le client.

---

### 30. Front React — solidité avant V1 (complément au § 25)

> Le § 25 est livré (hooks, React Query, `ApiError`, retry films, thème). Ci-dessous : renforcement avant features V1 (auth, config, temps réel).

- [x] **Error boundary** : limite globale ou par route pour éviter écran blanc sur erreur React non gérée.
- [x] **Abstraction « live »** : couche dédiée (ex. hook `useEventLive` / provider) pour isoler le polling actuel et permettre un passage ultérieur à SSE / WebSocket sans réécrire toute la page event.
- [x] **Découpage `EventDetail`** : extraire des sections ou composants dédiés (films, roue, partage, erreurs d’action) pour limiter la complexité avant la config hôte V1.

---

### 31. Qualité C# — `dotnet format` et analyzers

- [x] **`dotnet format`** (vérification, voire fix en CI) aligné sur `.editorconfig` / conventions du repo.
- [x] **Analyzers / avertissements** : politique explicite (corriger, supprimer bruit, ou `TreatWarningsAsErrors` sur un sous-ensemble) pour éviter la dérive avant V1.

---

### 32. Contrat OpenAPI — CI et artefact

- [x] **Export OpenAPI en CI** : générer ou récupérer `swagger.json` (ex. depuis l’app au build ou étape dédiée) et publier un **artefact** GitHub Actions (traçabilité des versions d’API).
- [x] **Gouvernance** : maintenir les tests de contrat existants (`OpenApiContractTests`) ; documenter toute option de **codegen** types TS côté front dans [architecture-api-dotnet.md](../architecture-api-dotnet.md) ou README si besoin.

---

> **Ordre suggéré** : 1) sécurité (§ 23) ; 2) API `/v1` + validation env (§ 24) ; 3) nom de domaine + CORS (§ 28) ; 4) front MVP livré (§ 25) puis compléments § 30 ; 5) correlation ID + erreurs JSON (§ 29) ; 6) `dotnet format` / analyzers (§ 31) ; 7) artefact OpenAPI CI (§ 32). **Staging** pré-prod : [features-list.md](../features-list.md) § V3.

---

## Ancien bonus (stack Node, obsolète)

> Remplacé par les **§ 18–22** (post-MVP livré). L’ancienne API Node et ses tests Vitest/supertest ont été retirés au profit de l’API .NET. **Pistes avant V1 : § 23–32.**
