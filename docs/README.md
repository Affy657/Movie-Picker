# Documentation

Les fichiers **numérotés** (`01-…`, `02-…`) indiquent un **ordre de lecture suggéré** dans leur dossier. Ce n’est pas une contrainte technique.

**Roadmaps par version** (futures releases) : convention et index dans [00-roadmaps-par-version.md](00-roadmaps-par-version.md) ; modèle à copier [v0-template-version/](v0-template-version/README.md).

## À la racine de `docs/`

| Fichier | Rôle |
|--------|------|
| [00-roadmaps-par-version.md](00-roadmaps-par-version.md) | Convention `docs/v{n}-slug/` + `01-roadmap-v{n}.md` |
| [01-spec-technique.md](01-spec-technique.md) | Spec produit & stack |
| [02-architecture-api-dotnet.md](02-architecture-api-dotnet.md) | API .NET, couches, OpenAPI |
| [03-features-list.md](03-features-list.md) | Features MVP (produit + plateforme), V1, V2, backlog |
| [04-outils-environnement.md](04-outils-environnement.md) | CLI, machine locale, scripts |
| [05-workflow-processus-et-roles.md](05-workflow-processus-et-roles.md) | Flux idées → features → roadmap version → vibe code → *task-verifier* (Cursor rules / skills / subagents) |

## `docs/mvp/`

| Fichier | Rôle |
|--------|------|
| [01-roadmap-mvp.md](mvp/01-roadmap-mvp.md) | Suivi des tâches MVP / post-MVP |
| [02-deploy-gcp-api.md](mvp/02-deploy-gcp-api.md) | Déploiement API (GCP) |
| [03-deploy-aws-front.md](mvp/03-deploy-aws-front.md) | Déploiement front (AWS) |
| [04-deploy-cicd.md](mvp/04-deploy-cicd.md) | GitHub Actions, secrets |
| [05-monitoring.md](mvp/05-monitoring.md) | Logs et métriques |
| [06-domaine-personnalise.md](mvp/06-domaine-personnalise.md) | Domaine custom (CloudFront + Cloud Run), CORS, § 28 MVP |
| [07-redirection-racine-et-referencement.md](mvp/07-redirection-racine-et-referencement.md) | Redirection `movie-picker.fr` → `web.…`, SEO / Search Console, § 36 MVP |

## `docs/dev cloud ynov/`

| Fichier | Rôle |
|--------|------|
| [01-consigne-dev-cloud-ynov.md](dev%20cloud%20ynov/01-consigne-dev-cloud-ynov.md) | Consigne Ynov |
| [02-architecture.md](dev%20cloud%20ynov/02-architecture.md) | Schéma d’architecture (Mermaid) |

Autres dossiers (`RNCP/`, etc.) : convention de nommage propre à chaque répertoire.
