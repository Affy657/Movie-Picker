# Plan d’action – Tests (stack Movie Picker)

Plan pour mettre en place les tests côté **API .NET** et **front React**, avec couverture et CI.

**Référence :** [ameliorations-bonnes-pratiques.md](mvp/ameliorations-bonnes-pratiques.md) § 3.

---

## Vue d’ensemble

| Phase | Périmètre | Livrable principal |
|-------|-----------|---------------------|
| 1 | Projet de tests API .NET + tests unitaires handlers / services | `dotnet test` vert |
| 2 | Tests d’intégration API (controllers HTTP) | Parcours critique validé par tests |
| 3 | Tests composants + unitaires front | Tous les écrans/clés couverts |
| 4 | Couverture + CI | Seuils et rapports dans la pipeline |

---

## Phase 1 – Tests unitaires API .NET

**Objectif :** Projet de tests xUnit, tests des handlers et du service TMDB (sans MongoDB ni HTTP réels).

### 1.1 Créer le projet de tests

- [ ] Créer `apps/api-dotnet/MoviePicker.Api.Tests/` (ou `MoviePicker.Tests.Unit`).
- [ ] Référencer `MoviePicker.Api`, ajouter packages : `xunit`, `xunit.runner.visualstudio`, `Moq` (ou NSubstitute), `coverlet.collector`.
- [ ] Configurer le `.csproj` pour Coverlet (couverture).
- [ ] Vérifier que `dotnet test` depuis la racine du repo lance les tests du projet.

### 1.2 Tests des handlers (use cases)

Pour chaque handler, mocker les ports (`IEventRepository`, `IMovieRepository`, `IParticipantRepository`, `IVoteRepository`, `ITmdbMovieSearch`) et tester :

- [ ] **CreateEventHandler** : succès (retour slug + hostToken), validation titre/date.
- [ ] **JoinEventHandler** : succès (participant créé), 404 event introuvable, 400 pseudo vide.
- [ ] **GetEventDetailHandler** : succès avec/sans hostToken (isHost), 404.
- [ ] **AddMovieHandler** : succès, 403 sans hostToken, 409 doublon (même TMDB id), 400 event terminé, 404 event introuvable.
- [ ] **VoteMovieHandler** : succès up/down, 404 film ou event, 400 event terminé.
- [ ] **DeleteMovieHandler** : succès, 403 sans hostToken, 404.
- [ ] **ListMoviesForEventHandler** : succès, 404 event.
- [ ] **LaunchWheelHandler** : succès (winner), 403 sans hostToken, 400 event terminé ou pas de films, 404 event.
- [ ] **CloseEventHandler** : succès, 403 sans hostToken, 404.

### 1.3 Tests du service TMDB

- [ ] **TmdbMovieSearch** (ou équivalent) : mock de `HttpClient` / `IHttpClientFactory` ; scénarios : réponse OK avec liste de films, réponse vide, erreur HTTP / timeout ; vérifier le mapping des champs (id, titre, poster, etc.).

### 1.4 Tests des mappers (optionnel mais utile)

- [ ] Mappers Mongo → domaine (ex. `EventDocumentMapper`, `MovieMapper`) : entrée document → entité attendue.

### 1.5 Tests des filtres d’exception (optionnel)

- [ ] **MoviePickerExceptionFilter** / **ValidationErrorFilter** : provoquer une exception et vérifier le format JSON de la réponse (champ `error`, code HTTP).

**Livrable Phase 1 :** `dotnet test --project apps/api-dotnet/MoviePicker.Api.Tests` vert, avec tests unitaires pour les handlers critiques et TMDB.

---

## Phase 2 – Tests d’intégration API .NET

**Objectif :** Tester les controllers via HTTP avec une app réelle (WebApplicationFactory), base de test ou mocks en mémoire.

### 2.1 Projet d’intégration

- [ ] Créer `apps/api-dotnet/MoviePicker.Api.IntegrationTests/` (ou inclure dans le même projet avec un namespace dédié).
- [ ] Référencer `MoviePicker.Api`, ajouter `Microsoft.AspNetCore.Mvc.Testing`.
- [ ] Configurer `WebApplicationFactory<Program>` (exposer `Program` pour les tests si nécessaire).
- [ ] Décider de la base : MongoDB de test (Mongo2Go, container, ou Atlas dédié) ou implémentations en mémoire des repositories pour les tests d’intégration.

### 2.2 Scénarios HTTP

- [ ] **Health** : `GET /health` → 200, corps JSON attendu.
- [ ] **Création event** : `POST /events` → 201, corps avec `slug`, `hostToken`.
- [ ] **Détail event** : `GET /events/slug/{slug}` avec/sans `?host=` → 200, 404 si slug inconnu.
- [ ] **Rejoindre** : `POST /events/{id}/join` → 200, 404.
- [ ] **Ajouter un film** : `POST /events/{id}/movies` avec hostToken → 201, 403 sans token, 409 doublon (mock TMDB ou repo en mémoire).
- [ ] **Vote** : `POST /events/{id}/movies/{movieId}/vote` → 200, 403/404/400 selon cas.
- [ ] **Roue / clôture** : `POST .../wheel`, `POST .../close` avec hostToken → 200, 403 sans token.

**Livrable Phase 2 :** Parcours critique (créer → rejoindre → ajouter film → voter → roue → clôture) couvert par des tests d’intégration.

---

## Phase 3 – Tests front (React)

**Objectif :** Tests de composants (Testing Library) et tests unitaires du client API / storage, avec mocks (fetchApi ou MSW).

### 3.1 Préparer les mocks API

- [ ] Choisir une stratégie : **viest.mock** sur `../api/client` (mock de `fetchApi`) ou **MSW** (Mock Service Worker) pour intercepter `fetch`.
- [ ] Créer des helpers ou fixtures : réponses type event, liste de films, erreur 403/404, etc.

### 3.2 Tests de composants (pages)

- [ ] **CreateEvent** : rendu formulaire, soumission avec titre/date/heure, vérifier appel API et redirection vers `/s/{slug}?host=...` (mock de `fetchApi` ou MSW).
- [ ] **EventDetail** : chargement event (mock event + movies), affichage titre/liste films ; lien partage invité (sans `?host=`) vs lien hôte (avec `?host=`).

### 3.3 Tests de composants (formulaires / blocs)

- [ ] **JoinForm** : champ pseudo, bouton « Rejoindre », appel à l’API join (mock).
- [ ] **AddMovieForm** : recherche (mock search), sélection d’un film, appel add movie (mock).
- [ ] **MovieList** : affichage liste, boutons vote up/down, suppression (si hôte) ; mocker les callbacks ou le contexte.
- [ ] **WheelSection** : visible uniquement pour l’hôte ; bouton « Lancer la roue », affichage du gagnant après clic (mock).

### 3.4 Tests unitaires (client API et storage)

- [ ] **api/client.ts** :
  - `getApiBase()` : avec `VITE_API_URL` défini (avec/sans `https://`), sans variable (fallback localhost).
  - `apiUrl(path)` : préfixe, trailing slash.
  - `fetchApi` : réponse 4xx/5xx (message d’erreur), body HTML (erreur explicite), erreur réseau (mock fetch qui rejette).
- [ ] **types/event.ts** : `getStoredHostToken`, `setStoredHostToken`, `getStoredParticipant` avec sessionStorage mocké.

### 3.5 (Optionnel) Hooks et intégration

- [ ] Extraire `useEvent(slug)`, `useMovies(slug)` si pas déjà fait ; les tester avec des mocks pour faciliter les tests des pages.

**Livrable Phase 3 :** `pnpm run test --filter=web` exécute les tests Home + CreateEvent + EventDetail + JoinForm + AddMovieForm + MovieList + WheelSection + client/storage.

---

## Phase 4 – Couverture et CI

**Objectif :** Mesurer la couverture et faire échouer la CI si les seuils ne sont pas atteints.

### 4.1 Couverture front (Vitest)

- [ ] Activer la couverture dans `apps/web/vitest.config.ts` (provider : `v8` ou `istanbul`).
- [ ] Commande : `pnpm run test:coverage` (ou `vitest run --coverage`) dans `apps/web`.
- [ ] Définir des seuils (ex. `lines: 70`, `functions: 65`, `branches: 60`) dans la config ; optionnel : exclure fichiers de setup / types.

### 4.2 Couverture API .NET

- [ ] Lancer les tests avec Coverlet : `dotnet test --collect:"XPlat Code Coverage"` (ou équivalent).
- [ ] Optionnel : rapport lisible (ReportGenerator) ou seuil dans le `.csproj` (Coverlet).

### 4.3 CI (GitHub Actions)

- [ ] **Job build-and-lint** (ou équivalent) : déjà `pnpm run test` ; s’assurer que les tests API .NET sont lancés (`dotnet test` sur `apps/api-dotnet`).
- [ ] Ajouter une étape **couverture** : ex. `pnpm run test:coverage` pour web et `dotnet test ... --collect:"XPlat Code Coverage"` pour l’API ; optionnel : upload des rapports (ex. Codecov, Sonar) ou simple seuil en sortie de commande.
- [ ] Faire échouer le job si les tests échouent ou si la couverture est sous le seuil (selon config).

**Livrable Phase 4 :** Pipeline CI exécute tous les tests (web + API .NET) et, au choix, rapporte ou impose un seuil de couverture.

---

## Ordre recommandé et dépendances

```
Phase 1 (API unit)     → prérequis pour Phase 2
Phase 2 (API intégration) → peut être faite en parallèle de Phase 3
Phase 3 (front)        → indépendante
Phase 4 (couverture/CI) → après que Phase 1 et au moins une partie de Phase 3 soient en place
```

**Ordre suggéré :** 1 → 3 (en parallèle ou 1 puis 3) → 2 → 4.

---

## Récapitulatif des livrables

| Livrable | Commande / critère |
|----------|---------------------|
| Projet tests API .NET | `apps/api-dotnet/MoviePicker.Api.Tests` existe, `dotnet test` vert |
| Handlers + TMDB testés | Au moins CreateEvent, Join, AddMovie, Vote, LaunchWheel, Close + SearchMovies |
| Intégration API | WebApplicationFactory, parcours créer → rejoindre → film → vote → roue → close |
| Composants front | CreateEvent, EventDetail, JoinForm, AddMovieForm, MovieList, WheelSection |
| Unit front | client.ts (getApiBase, apiUrl, fetchApi), event.ts (storage) |
| Couverture + CI | Vitest coverage + dotnet cover, seuils optionnels, CI exécute tous les tests |

---

## Références rapides

- **API .NET** : [architecture-api-dotnet.md](migration-dotnet/architecture-api-dotnet.md), handlers dans `Application/UseCases/`, TMDB dans `Infrastructure/Tmdb/`.
- **Front** : `apps/web/src/` — `fetchApi` dans `api/client.ts`, pages dans `pages/`, composants dans `components/`.
- **Bonnes pratiques** : [ameliorations-bonnes-pratiques.md](mvp/ameliorations-bonnes-pratiques.md) § 3 (Tests).
