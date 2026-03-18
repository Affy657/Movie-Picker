# Tests — Movie Picker

Guide centralisé de la stratégie de tests (front, API .NET, E2E, CI).  
**Plan détaillé (phases, cases à cocher) :** [plan-tests-stack.md](plan-tests-stack.md).

---

## Commandes rapides

| Cible | Commande |
|-------|----------|
| Front (Vitest) | `pnpm run test --filter=web` ou `cd apps/web && pnpm test` |
| Couverture front | `pnpm run test:coverage --filter=web` (rapport HTML dans `apps/web/coverage/`) |
| API unitaires | `dotnet test apps/api-dotnet/MoviePicker.Api.Tests/MoviePicker.Api.Tests.csproj` |
| API intégration + contrat OpenAPI | `dotnet test apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj` — sans Mongo : `MONGODB_URI` vide (repos en mémoire) |
| E2E Playwright | **Hors CI** (trop long / fragile) : en local, `pnpm run test:e2e` ou **`pnpm run test:e2e:ci`** après `pnpm exec playwright install chromium` |
| Tous les tests unitaires front (Turbo) | `pnpm run test` |

**Local .NET :** arrêter l’API si elle tourne pour éviter un verrou sur l’exe lors du build.

---

## Arborescence des tests

| Emplacement | Contenu |
|-------------|---------|
| `apps/web/src/**/*.test.ts(x)` | Vitest : pages, composants, client API, storage, a11y |
| `apps/web/src/mocks/handlers.ts` | Handlers **MSW** (EventDetail, AddMovieForm) |
| `e2e/*.spec.ts` | Scénarios **Playwright** (parcours critique navigateur) |
| `playwright.config.ts` | Config E2E : démarrage API (`E2E_STUB_TMDB=1`) + `vite preview` |
| `apps/api-dotnet/MoviePicker.Api.Tests/` | xUnit, Moq, Coverlet — handlers, TMDB mock, mappers, filtres |
| `apps/api-dotnet/MoviePicker.Api.Tests/Builders/` | **EventEntityBuilder**, **CreateEventRequestBuilder** |
| `apps/api-dotnet/MoviePicker.Api.IntegrationTests/` | WebApplicationFactory, parcours HTTP, **OpenApiContractTests** |

---

## Front (Vitest + Testing Library)

- **MSW** : `EventDetail`, `AddMovieForm` — requêtes vers `http://127.0.0.1:3999` (`vitest.config.ts` → `env.VITE_API_URL`).
- **vi.mock(`fetchApi`)** : CreateEvent, JoinForm.
- **Accessibilité** : `vitest-axe` — Home, CreateEvent (`a11y.test.tsx`) ; assertion `expect(results.violations).toHaveLength(0)` (évite les soucis de typage du matcher `toHaveNoViolations`).
- **Seuils couverture (v8)** : `lines ≥ 48 %`, `functions ≥ 68 %`, `branches ≥ 55 %` (voir `apps/web/vitest.config.ts`).

Fichiers notables : `App.test.tsx` (routes via **`AppRoutes`**), `EventDetail.test.tsx`, `ShareLink.test.tsx`.

---

## API .NET

- **Unitaires** : tous les use cases, `TmdbMovieSearch` (HttpClient mocké), mappers Mongo, `MoviePickerExceptionFilter`.
- **Intégration** : health, création event, détail, join, films, vote, roue, clôture (`CriticalPathTests` + tests dédiés).
- **Contrat OpenAPI** : `OpenApiContractTests` — vérifie la présence de `/health`, `POST /events`, `GET /events/slug/{idOrSlug}` dans `/swagger/v1/swagger.json`.
- **E2E / stub TMDB** : si `E2E_STUB_TMDB=1`, enregistrement de **`StubTmdbMovieSearch`** (résultats « Film E2E Stub ») à la place du client TMDB réel (`ServiceCollectionExtensions`).

---

## E2E Playwright

1. Build du front pointant vers l’API locale :

   ```bash
   cross-env VITE_API_URL=http://127.0.0.1:5010 pnpm --filter web build
   ```

2. Lancer les tests (le config démarre l’API sur **:5010** avec `--no-launch-profile`, sinon `launchSettings.json` impose le port 4000 et le front ne joint pas l’API) :

   ```bash
   pnpm run test:e2e
   ```

   **Tout-en-un :** `pnpm run test:e2e:ci`

3. Première installation : `pnpm exec playwright install chromium` (souvent `--with-deps` sur Linux).

Scénario principal (`e2e/critical-flow.spec.ts`) : création soirée → hôte + invité rejoignent → recherche stub → ajout film → hôte lance la roue → affichage du gagnant.

---

## CI / GitHub Actions

Fichier : **`.github/workflows/ci-cd.yml`**.

| Job | Rôle |
|-----|------|
| **lint** | `pnpm install`, lint TS, ESLint, Prettier check |
| **test-web** | Vitest + couverture ; artefact **`coverage-web`** |
| **test-api** | Tests unitaires .NET + Coverlet (artefact **`coverage-api-unit`**) + tests intégration |
| **docker-api** | (push `main`/`master`) image Docker → Artifact Registry |
| **deploy-api** / **deploy-front** | Après **test-web** + **test-api** |

Les **E2E Playwright** ne sont **pas** lancés en CI (durée, navigateurs, sensibilité env). Le parcours critique reste couvert par les **tests d’intégration API** ; l’E2E est optionnel en local.

Détail secrets et variables : [mvp/deploy-cicd.md](mvp/deploy-cicd.md).

---

## Mutation testing (optionnel)

- **.NET** : [Stryker.NET](https://stryker-mutator.io/docs/stryker-net/introduction/) — cibler `MoviePicker.Api.Application`.
- **Front** : outils type Stryker JS, à n’utiliser que sur des modules critiques (durée / coût).
