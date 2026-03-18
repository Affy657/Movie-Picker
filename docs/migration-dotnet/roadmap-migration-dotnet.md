# Movie Picker – Roadmap migration back .NET

Suite de tâches pour migrer l'API Node.js/Express vers **ASP.NET Core (C#)** sans modifier le front ni les fonctionnalités. À exécuter **après** la livraison du MVP et **avant** le développement des features V1.

**Références :** [contexte-et-perimetre.md](contexte-et-perimetre.md), [architecture-api-dotnet.md](architecture-api-dotnet.md), [contrat-api-openapi.json](contrat-api-openapi.json), [contrat-api-reference.md](contrat-api-reference.md), [../features-list.md](../features-list.md) § Migration back .NET, [../mvp/roadmap-mvp.md](../mvp/roadmap-mvp.md) § 17.

Cocher au fur et à mesure. Une autre IA ou un humain peut reprendre en suivant l'ordre des sections.

---

## 1. Prérequis

- [x] Installer **.NET 10 SDK** (LTS actuelle ; voir [étape-1-prerequis.md](etape-1-prerequis.md)) en local
- [x] Vérifier `dotnet --version` (10.x) et accès à NuGet
- [x] Avoir le MVP Node opérationnel (API + front déployés, MongoDB, TMDB) pour comparer les réponses
- [x] Lire [contexte-et-perimetre.md](contexte-et-perimetre.md) pour le périmètre et les risques

---

## 2. Spécification du contrat API

Le front ne doit pas changer : les URLs et le format JSON doivent rester **identiques**. Utiliser l'API Node actuelle comme référence.

- [x] Exporter ou copier le contrat OpenAPI actuel dans [contrat-api-openapi.json](contrat-api-openapi.json) (enrichi vs `apps/api/src/swagger.json`)
- [x] Lister toutes les routes — voir [contrat-api-reference.md](contrat-api-reference.md) § Routes
  - `GET /health`
  - `GET /movies/search?q=...`
  - `POST /events` (body : title, date, time)
  - `GET /events/slug/:idOrSlug` et `GET /events/:idOrSlug` (query `?host=xxx` pour isHost)
  - `POST /events/:idOrSlug/join` (body : pseudo)
  - `GET /events/:idOrSlug/movies`, `POST`, `DELETE /events/:idOrSlug/movies/:movieId`, `POST .../vote`
  - `POST /events/:idOrSlug/wheel`, `POST /events/:idOrSlug/close`
- [x] Schémas JSON + codes d'erreur : [contrat-api-reference.md](contrat-api-reference.md)

> **Référence :** [contrat-api-openapi.json](contrat-api-openapi.json), [contrat-api-reference.md](contrat-api-reference.md), implémentation `apps/api-dotnet/MoviePicker.Api`.

---

## 3. Création du projet ASP.NET Core

- [x] Projet `apps/api-dotnet/MoviePicker.Api` (.NET 10, contrôleurs, Swashbuckle `/swagger`)
- [x] CORS : réflexion origine + credentials (équivalent Node)
- [x] Options `MONGODB_URI`, `TMDB_API_KEY` (binding env) ; port **4000** dans launchSettings
- [x] `GET /health` + JSON camelCase (aligné Node)

---

## 4. API – Base (events, participants)

- [x] MongoDB (MongoDB.Driver, `MONGODB_URI`), collections `events`, `participants`
- [x] Domain + Application (hexagonal) : Event, Participant, use cases CreateEvent, GetEventDetail, Join
- [x] `POST /events` → 201 avec _id, hostToken, shareUrl ; `GET /events/slug/{idOrSlug}` et `GET /events/{idOrSlug}` avec `?host=` pour isHost
- [x] `POST /events/{idOrSlug}/join` → 201 ou 200 (déjà inscrit) ; hôte via query ou cookie `moviepicker_host`

---

## 5. API – Movies et votes

- [x] Domain Movie / Vote ; ports `IMovieRepository`, `IVoteRepository`, `ITmdbMovieSearch`
- [x] `GET /movies/search?q=...` → TMDB (503 si clé absente)
- [x] `POST/GET /events/{idOrSlug}/movies`, `POST .../vote`, `DELETE .../{movieId}` (body participantId)

---

## 6. API – Roue et clôture

- [x] `POST /events/{idOrSlug}/wheel` (hôte requis) : tirage aléatoire, persistance `winnerMovieId`, retour `{ winner, message }`
- [x] 0 film → 400 ; 1 film → gagnant direct, message dédié
- [x] `POST /events/{idOrSlug}/close` (hôte requis) : `closedAt` + 200 avec event + message (idempotent si déjà clôturé)

---

## 7. API – Expiration et lecture seule

- [x] GET event → `terminé` (Event.IsFinished : closedAt, config.endDate, ou date+heure dépassée)
- [x] Blocage écriture si terminé : join, add movie, delete movie, vote, wheel → 400 « Soirée terminée. Lecture seule. » (close reste autorisé pour l’hôte, comme en Node)

---

## 8. Docker et image .NET

- [x] Dockerfile multi-stage : SDK 10 pour build, `aspnet:10.0` en runtime ; `dotnet publish` → `/app/publish`
- [x] En-tête Dockerfile : MONGODB_URI, TMDB_API_KEY, PORT/ASPNETCORE_URLS documentés ; port 8080 pour Cloud Run
- [x] Build + run testés : `docker build -t movie-picker-api-dotnet -f apps/api-dotnet/MoviePicker.Api/Dockerfile apps/api-dotnet/MoviePicker.Api` puis `docker run --env-file .env -p 4000:8080 movie-picker-api-dotnet` → `/health` OK

> **Référence :** même principe que [../mvp/deploy-gcp-api.md](../mvp/deploy-gcp-api.md), en remplaçant le build Node par `dotnet publish`.

---

## 9. CI/CD – Adapter pour .NET

- [x] Remplacer le job de build de l’API Node par un job build .NET (`dotnet publish` dans `build-and-lint`, build web via `pnpm run build --filter=web`)
- [x] Adapter le job Docker : build de l’image à partir du Dockerfile .NET (`apps/api-dotnet/MoviePicker.Api`), push vers Artifact Registry (GCP)
- [x] Déploiement Cloud Run inchangé : même service, même image `api:${{ github.sha }}` / `api:latest` (la nouvelle image .NET remplace l’ancienne)
- [x] Conserver les secrets (MONGODB_URI, TMDB_API_KEY, etc.) ; le front continue de pointer vers la même URL d’API

> **Doc :** [../mvp/deploy-cicd.md](../mvp/deploy-cicd.md) – adapter les steps pour dotnet.

---

## 10. Validation et bascule

Guide détaillé : **[validation-et-bascule.md](validation-et-bascule.md)** (parcours complet avec exemples d'appels, comparaison Node/.NET, déploiement Cloud Run, retrait de l'API Node).

- [x] Exécuter un parcours complet contre l’API .NET (locale ou déployée) : créer event → rejoindre → proposer films → voter → lancer roue → clôturer — fait
- [x] Comparer les réponses (JSON) avec l’API Node pour les mêmes scénarios (health, events, movies, wheel) — fait
- [x] Déployer l’API .NET sur Cloud Run (nouvelle révision) et faire pointer le front vers cette révision (ou remplacer l’ancienne révision)
- [x] Valider le parcours en production avec le front existant (comportement identique)
- [x] Désactiver / retirer l’ancienne API Node (supprimé `apps/api`, monorepo et CI adaptés)

Améliorations post-migration (front) : lien invités sans token hôte + lien hôte séparé « ne pas partager » ; actualisation auto toutes les 5 s sur la page event.

---

## 11. Migration terminée

- [x] Mettre à jour le README et la doc (architecture, instructions de run local pour l’API .NET)
- [x] Mettre à jour la roadmap MVP : cocher la section 17 (Migration back .NET) et pointer vers [roadmap-migration-dotnet.md](roadmap-migration-dotnet.md)
- [x] Considérer le back .NET comme la base pour la V1 (comptes, config, réactions)

> **Doc :** [contexte-et-perimetre.md](contexte-et-perimetre.md) – périmètre. [../mvp/roadmap-mvp.md](../mvp/roadmap-mvp.md) § 17, [../features-list.md](../features-list.md) § Migration back .NET.
