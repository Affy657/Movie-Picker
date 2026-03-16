# Movie Picker

Application pour organiser des soirées film : créer un event, partager le lien, proposer des films, voter, lancer la roue pour choisir le film.

## Documentation

- **[Roadmap MVP](docs/roadmap-mvp.md)** – Carte de suivi des tâches
- **[Spec technique](docs/spec-technique.md)** – Stack, cloud, CI/CD
- **[Features list](docs/features-list.md)** – Fonctionnalités par version (MVP, V1, V2, V3)
- **[Consigne Ynov](docs/consigne-dev-cloud-ynov.md)** – Projet cloud
- **[Déploiement API (GCP)](docs/deploy-gcp-api.md)** – Docker, Artifact Registry, Cloud Run
- **[Déploiement Front (AWS)](docs/deploy-aws-front.md)** – Build, S3, CloudFront

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
