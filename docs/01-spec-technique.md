# Spec technique

Stack, cloud, CI/CD, base de données.  
Pour les features par version, voir [03-features-list.md](03-features-list.md).  
Référence : [01-consigne-dev-cloud-ynov.md](dev%20cloud%20ynov/01-consigne-dev-cloud-ynov.md).  
Outils CLI (GCP, AWS, GitHub, stack locale) : [04-outils-environnement.md](04-outils-environnement.md).

---

## 1. Stack et choix techniques

| Domaine | Choix |
|--------|--------|
| **Front** | React (TypeScript strict) |
| **Back** | ASP.NET Core (C#, .NET 10) |
| **Architecture** | Monolithic, containerized (API .NET in one Docker image) |
| **CI/CD** | GitHub Actions |
| **Cloud** | At least one service on **AWS** and one on **GCP** (required). |

- **Language** : TypeScript strict for the whole codebase (front + API).
- **AWS** : S3 + CloudFront — store and serve the React build. Default CloudFront URL for MVP (no custom domain).
- **GCP** : Cloud Run — run the ASP.NET Core API container. Docker image in **Artifact Registry (GCP)**. Default Cloud Run URL for MVP.
- **Repo** : Turborepo monorepo (front + back in one repo). **Package manager** : **pnpm**. Configs TypeScript / ESLint / Prettier partagées dans **`configs/`** (voir [configs/README.md](../configs/README.md)). **Variables d’environnement** : `.env.example` à la racine, `apps/web/.env.example`, détail déploiement dans [mvp/04-deploy-cicd.md](mvp/04-deploy-cicd.md).

---

## 2. Critères Ynov (tous couverts dans le MVP)

| Exigence | Couverture |
|----------|------------|
| App full-stack, langage maîtrisé | React (TypeScript) + ASP.NET Core (C#) |
| Architecture claire (monolithique conteneurisée ou microservices) | Monolithic, containerized (API .NET in Docker) |
| Au moins un service managé | MongoDB Atlas (DB) ; S3+CloudFront + Cloud Run (hosting) |
| App accessible publiquement | Front and API on default CloudFront + Cloud Run URLs |
| Performances (CDN, load balancing…) | CloudFront as CDN for the front |
| Front et back sur des PaaS/IaaS **différents** | Front on AWS (S3+CloudFront), Back on GCP (Cloud Run) |
| Au moins un service AWS et un GCP | AWS: S3 + CloudFront ; GCP: Cloud Run |
| Variables d'environnement / secrets | TMDB key, DB URL, session secret via env / Secret Manager GCP |
| CI/CD : tests, build, déploiement | GitHub Actions : lint, tests web + API .NET, puis build image, deploy |
| Monitoring & observabilité | CloudWatch (AWS), Cloud Monitoring / Logging (GCP) |
| Documentation | README, [architecture MVP](dev%20cloud%20ynov/02-architecture.md), [mvp/04-deploy-cicd.md](mvp/04-deploy-cicd.md), [01-spec-technique.md](01-spec-technique.md) |

---

## 3. Technique MVP (détail)

**Front (React, TypeScript strict)**  
Pages: home, create event, event detail (movies, votes, wheel). Mobile-first, responsive. Deployed on S3 + CloudFront.

**Back (ASP.NET Core, C#)**  
REST API: events, participants, movies, votes, wheel draw. Host auth via token (query or cookie). Deployed on Cloud Run (Docker image from Artifact Registry).

**Database (MongoDB Atlas)**  
Collections: `events` (id, title, date, time, hostToken, config), `participants`, `movies`, `votes`. Collection `users` added in V1.

**External**  
- Movies data: **TMDB** (server-side, API key in env).  
- Email (password reset, etc.): to be added in V1.

**Deployment & ops**  
- Env vars and secrets (e.g. Secret Manager GCP). HTTPS.  
- CI/CD: GitHub Actions — **lint**, **test-web**, **test-api** ; sur `master`, Docker, Cloud Run, front. Voir [mvp/04-deploy-cicd.md](mvp/04-deploy-cicd.md).  
- Monitoring: default AWS/GCP tools (CloudWatch, Cloud Monitoring / Logging).

---

## 4. Conception prête pour la suite (sans refacto)

- **Database** : `events.config` (JSON) for theme, limits, etc. No schema change needed for V1 options.
- **API** : routes `/events`, `/events/:id`, `/events/:id/movies`, `/events/:id/votes`, `/events/:id/wheel` ; later `/events/:id/config` and `/auth/*`.
- **Front** : Reusable components (MovieCard, VoteButtons, Wheel). Layout ready for a Config tab and reactions in V1.
