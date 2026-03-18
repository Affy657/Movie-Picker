# Plan d’action – Tests (stack Movie Picker)

Plan pour les tests **API .NET**, **front React**, couverture et CI ; **E2E Playwright** optionnel en local.

**Guide opérationnel :** [testing.md](testing.md)  
**Référence bonnes pratiques :** [ameliorations-bonnes-pratiques.md](mvp/ameliorations-bonnes-pratiques.md) § 3.

---

## Vue d’ensemble

| Phase | Périmètre | Livrable principal |
|-------|-----------|---------------------|
| 1 | Tests unitaires API (handlers, TMDB, mappers, filtres) | `dotnet test` projet `MoviePicker.Api.Tests` |
| 2 | Intégration HTTP + contrat OpenAPI | `MoviePicker.Api.IntegrationTests` |
| 3 | Composants front, MSW, a11y, client/storage | Vitest + seuils couverture |
| 4 | Couverture + CI parallèle | Workflow GitHub Actions (E2E hors CI) |

---

## Phase 1 – Tests unitaires API .NET ✅

- [x] Projet `apps/api-dotnet/MoviePicker.Api.Tests/` (xUnit, Moq, coverlet.collector).
- [x] Handlers : CreateEvent, Join, GetDetail, AddMovie, Vote, DeleteMovie, ListMovies, LaunchWheel, Close.
- [x] **TmdbMovieSearch** (HttpClient mocké).
- [x] Mappers Mongo, **MoviePickerExceptionFilter**.
- [x] **Builders** : `EventEntityBuilder`, `CreateEventRequestBuilder` (`Tests/Builders/`) pour données de test réutilisables.

---

## Phase 2 – Intégration API .NET ✅

- [x] `MoviePicker.Api.IntegrationTests` + `WebApplicationFactory<Program>`.
- [x] Repos **en mémoire** si `MONGODB_URI` vide.
- [x] Scénarios : health, POST /events, détail slug, join, films, vote, roue, close.
- [x] **OpenApiContractTests** : document `/swagger/v1/swagger.json` expose `/health`, `POST /events`, `GET /events/slug/{idOrSlug}`.

---

## Phase 3 – Tests front ✅

- [x] **MSW** (`src/mocks/handlers.ts`) : EventDetail, AddMovieForm — base API test `http://127.0.0.1:3999`.
- [x] **vi.mock fetchApi** : CreateEvent, JoinForm.
- [x] Pages / composants : Home, CreateEvent, **EventDetail**, JoinForm, AddMovieForm, MovieList, WheelSection, **ShareLink**, **App** (`AppRoutes`).
- [x] **api/client.ts**, **types/event.ts** (storage).
- [x] **a11y** : vitest-axe (Home, CreateEvent).
- [ ] *(Optionnel)* Hooks `useEvent` / `useMovies` extraits et testés.

**Note correctif :** `EventDetail` — polling (intervalle 5 s) déplacé **avant** les retours conditionnels (loading / erreur) pour respecter les règles des hooks React.

---

## Phase 4 – Couverture et CI ✅

- [x] **Vitest** : provider v8, seuils **lines 48 %**, **functions 68 %**, **branches 55 %** (`apps/web/vitest.config.ts`).
- [x] **Coverlet** sur tests unitaires API ; artefact CI `coverage-api-unit`.
- [x] Artefact couverture front : `coverage-web`.
- [x] Jobs parallèles : **lint** → **test-web**, **test-api** ; déploiements après succès.
- [ ] **E2E CI** : volontairement **non** (durée, navigateurs) ; parcours critique couvert par intégration API. E2E Playwright disponible en local (`e2e/`, stub TMDB).

---

## Récapitulatif des livrables

| Livrable | Emplacement / commande |
|----------|-------------------------|
| Tests unitaires API | `MoviePicker.Api.Tests`, `dotnet test …MoviePicker.Api.Tests.csproj` |
| Builders | `MoviePicker.Api.Tests/Builders/` |
| Intégration + OpenAPI | `MoviePicker.Api.IntegrationTests`, `OpenApiContractTests.cs` |
| Stub TMDB E2E | `E2E_STUB_TMDB=1`, `Infrastructure/Tmdb/StubTmdbMovieSearch.cs` |
| Tests front | `apps/web/src/**/*.test.{ts,tsx}` |
| MSW | `apps/web/src/mocks/handlers.ts` |
| E2E (local) | `e2e/`, `pnpm run test:e2e` / `test:e2e:ci` — pas en CI |
| CI | `.github/workflows/ci-cd.yml` |
| Doc runbook | [testing.md](testing.md) |

---

## Références rapides

- **API** : [architecture-api-dotnet.md](migration-dotnet/architecture-api-dotnet.md).
- **Front** : `apps/web/src/` — `api/client.ts`, `pages/`, `components/`.
- **CI / secrets** : [deploy-cicd.md](mvp/deploy-cicd.md).
