# Movie Picker

Application pour organiser des soirées film : créer un event, partager le lien, proposer des films, voter, lancer la roue pour choisir le film.

## But du projet

- Permettre à un hôte de **créer une soirée film** (titre, date, heure) et d’obtenir un lien de partage.
- Les invités **rejoignent** avec un pseudo, **proposent des films** (recherche TMDB), **votent** (up/down).
- L’hôte **lance la roue** pour tirer un film au hasard, puis peut **clôturer** la soirée.
- Front et back déployés sur le cloud (AWS + GCP), avec CI/CD et monitoring.

## Architecture

- **Front** : React (Vite, TypeScript), hébergé sur **AWS** (S3 + CloudFront).
- **Back** : API Express (Node.js, TypeScript), déployée sur **GCP** (Cloud Run, image Docker dans Artifact Registry).
- **Données** : MongoDB Atlas. **Externe** : API TMDB (films).
- **CI/CD** : GitHub Actions (build, déploiement API + front à chaque push sur `main`).

→ **[Schéma d’architecture](docs/mvp/architecture.md)** (diagramme Mermaid).

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

- **Premier déploiement / manuel** : voir [Déploiement API (GCP)](docs/mvp/deploy-gcp-api.md) et [Déploiement Front (AWS)](docs/mvp/deploy-aws-front.md).
- **CI/CD (GitHub Actions)** : à chaque push sur `main`, build + déploiement automatique. Configuration : [deploy-cicd.md](docs/mvp/deploy-cicd.md).

## Documentation

- **[Spec technique](docs/spec-technique.md)** – Stack, cloud, CI/CD
- **[Features list](docs/features-list.md)** – Fonctionnalités par version (MVP, V1, V2, V3)
- **[Consigne Ynov](docs/consigne-dev-cloud-ynov.md)** – Projet cloud

**Documentation MVP** (dossier [docs/mvp/](docs/mvp/)) :

- **[Roadmap MVP](docs/mvp/roadmap-mvp.md)** – Carte de suivi des tâches
- **[Architecture](docs/mvp/architecture.md)** – Schéma (diagramme)
- **[Déploiement API (GCP)](docs/mvp/deploy-gcp-api.md)** – Docker, Artifact Registry, Cloud Run
- **[Déploiement Front (AWS)](docs/mvp/deploy-aws-front.md)** – Build, S3, CloudFront
- **[CI/CD](docs/mvp/deploy-cicd.md)** – GitHub Actions, secrets, variables
- **[Monitoring](docs/mvp/monitoring.md)** – Logs (Cloud Logging), métriques (Cloud Run, CloudFront)
- **[Test parcours MVP](docs/mvp/test-parcours-mvp.md)** – Checklist de test du parcours complet
- **[Vérification consigne Ynov](docs/mvp/verification-consigne-ynov.md)** – Couverture des critères du projet
- **[Soutenance](docs/mvp/soutenance.md)** – Guide pour la présentation 15–20 min
- **[Améliorations / bonnes pratiques](docs/mvp/ameliorations-bonnes-pratiques.md)** – Pistes de refacto, sécurité, tests, qualité
- **[Migration back .NET](docs/migration-dotnet/)** – [Contexte et périmètre](docs/migration-dotnet/contexte-et-perimetre.md), [Roadmap migration](docs/migration-dotnet/roadmap-migration-dotnet.md) (étape entre MVP et V1)

## Prérequis

- Node.js ≥ 20, pnpm, MongoDB (et Docker optionnel). Vérification : `node scripts/check-prereqs.js`

## Démarrage

1. Copier `apps/api/.env.example` en `apps/api/.env` et renseigner `MONGODB_URI` (et `TMDB_API_KEY` pour la recherche de films).
2. À la racine du repo :

```bash
pnpm install
pnpm build            # build api + web
pnpm dev              # lance api + web en mode dev
pnpm dev:api          # API seule (port 4000)
pnpm dev:web          # Front seule (port 5173)
pnpm lint             # vérification TypeScript (api + web)
pnpm test             # tests API (Vitest + supertest) + tests front (Vitest + React Testing Library)
```

**Lancer l’API en production** (après `pnpm build`) :

```bash
pnpm --filter api start   # depuis la racine
# ou depuis apps/api : pnpm start
```

- **API** : par défaut sur le port 4000 (ou la variable `PORT`). Doc Swagger : **http://localhost:4000/api-docs** (ou **http://localhost:4000/api-docs/**). Si l’API utilise un autre port, regarde le message au démarrage (« API listening on http://localhost:… ») et adapte l’URL.
- **Web** : par défaut sur le port 5173 (Vite).

**API (section 3)** : `POST /events`, `GET /events/slug/:slug`, `GET /events/:id`, `POST /events/:idOrSlug/join`. Hôte identifié par `?host=<token>` ou cookie.

## Structure

- `apps/api` – API Express (TypeScript), MongoDB, TMDB
- `apps/web` – Front React (Vite, TypeScript)
- `docs/` – Documentation du projet
