# Améliorations et bonnes pratiques – Movie Picker

Synthèse des pistes d’amélioration pour aligner le projet avec les bonnes pratiques de développement (structure, erreurs, sécurité, tests, qualité).

---

## 1. Gestion des erreurs (API)

**État actuel :** `AppError` + middleware global `errorHandler` ; Zod pour la validation des body. Certains middlewares renvoient directement `res.status(xxx).json(...)` au lieu de passer par `next(new AppError(...))`.

**À faire :**
- Harmoniser **tous** les middlewares (`loadEvent`, `requireHost`, `requireEventNotFinished`) pour utiliser `next(new AppError(message, statusCode))` au lieu de `res.status().json()`. Ainsi le format des réponses d’erreur reste unifié et le error handler centralise la logique.
- Valider les **params** (ex. `idOrSlug`, `movieId`) avec une regex ou Zod (ObjectId, slug) pour éviter des requêtes malformées jusqu’à Mongoose.

---

## 2. Sécurité

**État actuel :** Env via `config/env.ts`, CORS `origin: true`, pas de rate limiting ni helmet.

**À faire :**
- **CORS** : en production, restreindre les origines (ex. `process.env.ALLOWED_ORIGINS?.split(',')` ou l’URL du front déployé) au lieu de `origin: true`.
- **En-têtes** : ajouter **helmet** (ou au minimum X-Content-Type-Options, X-Frame-Options) pour renforcer les en-têtes de sécurité.
- **Rate limiting** : middleware (ex. `express-rate-limit`) sur les routes sensibles (création event, join, recherche TMDB) pour limiter les abus.
- **Cookies** : en prod, définir les options du cookie `hostToken` (Secure, SameSite, éventuellement HttpOnly si pas lu en JS).
- **Secrets Cloud Run** : préférer **GCP Secret Manager** et référencer les secrets dans Cloud Run au lieu de `--set-env-vars` en clair dans la CI.

---

## 3. Tests

**État actuel (stack .NET + React) :** tests unitaires API (handlers, TMDB mock, mappers, filtres), intégration HTTP (WebApplicationFactory, repos en mémoire), contrat OpenAPI ; front Vitest + MSW (EventDetail, AddMovieForm) + mocks fetchApi (CreateEvent, JoinForm) ; E2E Playwright (parcours critique avec stub TMDB) ; couverture Vitest (seuils) + Coverlet en CI ; jobs CI parallèles (lint, web, API, E2E).

**Plan / détail :** [../plan-tests-stack.md](../plan-tests-stack.md) · **Commandes :** [../testing.md](../testing.md).

**À faire (évolution) :**
- **Hooks** : extraire `useEvent(slug)`, `useMovies(slug)` pour faciliter tests et réutilisation (toujours optionnel).
- **Couverture** : relever progressivement les seuils Vitest (objectif long terme ~70 % lignes sur le front).
- **API Node historique** : si du code Express reste dans le repo, aligner ou retirer les anciens tests associés.

---

## 4. Qualité de code (ESLint, Prettier)

**État actuel :** Lint = `tsc --noEmit` uniquement. Pas d’ESLint ni Prettier.

**À faire :**
- Ajouter **ESLint** (avec `@typescript-eslint`) et **Prettier** : config à la racine ou dans chaque app, règles TypeScript strictes, formatage cohérent.
- Exécuter **ESLint** et **Prettier** (check) dans la CI (étape dédiée ou avant build).
- Optionnel : **pnpm audit** en CI pour alerter sur les vulnérabilités des dépendances.

---

## 5. Structure et maintenabilité

**API**
- Déplacer la route **GET /movies/search** de `app.ts` vers un router dédié (ex. `routes/search.ts` ou dans `routes/movies.ts`) pour garder toute la logique “movies” au même endroit.
- Prévoir un préfixe **/v1** pour les routes API si évolution sans casser les clients.

**Web**
- Introduire des **hooks** (`useEvent`, `useMovies`, `useJoin`, etc.) pour isoler la logique fetch + state et rendre les composants plus testables.
- Envisager un **cache** (React Query, SWR) pour éviter de recharger event + movies à chaque entrée sur la page.

**Monorepo**
- Dossier **configs/** à la racine avec tsconfig de base et éventuellement ESLint partagé ; les apps font `extends` pour éviter la duplication.

---

## 6. API (détails)

- **DELETE /movies/:movieId** : le `participantId` est envoyé dans le body ; documenter clairement ou passer en query/header pour un usage plus REST-like.
- **Documentation** : s’assurer que le **Swagger** décrit toutes les routes (y compris GET /movies/search) et les réponses 4xx/5xx.
- **Démarrage** : en cas d’échec MongoDB après que le serveur écoute, documenter le comportement (process exit) ou gérer un état “degraded” si besoin.

---

## 7. Front (UX et accessibilité)

- **Erreurs** : en cas d’échec du chargement de la liste des films, afficher un message explicite (et éventuellement un bouton “Réessayer”) au lieu de laisser une liste vide sans explication.
- **Accessibilité** : annonces live (aria-live) pour les actions importantes (“Roue lancée”, “Film ajouté”), gestion du focus (focus trap dans modales, focus après ouverture/fermeture), “skip link” si la page est longue, hiérarchie des titres (h1 → h2) cohérente.
- **Typage** : définir un type commun pour les erreurs API (ex. `ApiError`) et l’utiliser côté client pour un affichage et un retry plus ciblés.

---

## 8. CI/CD

- **Branches** : normaliser sur une seule branche principale (main ou master) pour éviter la duplication des déploiements.
- **Workflow actuel** : jobs **lint**, **test-web** (Vitest + artefact couverture), **test-api** (unitaires + intégration .NET + Coverlet), **test-e2e** (Playwright) ; déploiements Docker / front après succès. Voir [deploy-cicd.md](deploy-cicd.md) et [testing.md](../testing.md).
- **Turbo** : la tâche `test` front ne dépend pas du build API .NET.
- **Validation env** : au démarrage de l’API, valider les variables requises (MONGODB_URI en prod, etc.) et quitter avec un message clair si une variable manque.

---

## Fait (déjà appliqué)

- **Erreurs API (stack Node historique)** : middlewares unifiés via `next(new AppError(...))` où applicable.
- **ESLint + Prettier** : config racine ; CI exécute ESLint et Prettier (check) + lint TypeScript front.
- **Tests stack .NET + React** : unitaires + intégration API, contrat OpenAPI, Vitest (MSW, a11y), E2E Playwright, couverture et pipeline décrits dans [plan-tests-stack.md](../plan-tests-stack.md) et [testing.md](../testing.md).

---

## Priorisation suggérée

| Priorité | Thème | Impact |
|----------|--------|--------|
| Haute | Erreurs API (next(AppError) partout) | Cohérence, maintenabilité |
| Haute | CORS + helmet + rate limiting | Sécurité |
| Moyenne | ESLint + Prettier + CI | Qualité, lisibilité |
| Moyenne | Tests (extensions, hooks, seuils couverture) | Robustesse |
| Moyenne | Hooks + cache front | Évolutivité, perfs |
| Basse | configs/ partagés, /v1, Swagger | Organisation, évolution API |
| Basse | Accessibilité (live, focus, skip) | UX, conformité |

Ce document peut servir de **checklist** pour les prochaines itérations (V1, refacto).  
**→ Améliorations stack avant V1 :** [ameliorations-stack-avant-v1.md](ameliorations-stack-avant-v1.md) (sécurité, /v1, hooks, cache, CI). Les points “Haute” et “Moyenne” sont les plus rentables pour un projet déjà en production.
