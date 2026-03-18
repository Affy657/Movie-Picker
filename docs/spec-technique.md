# Spec technique

Stack, cloud, CI/CD, base de données.  
Pour les features par version, voir [features-list.md](features-list.md).  
Référence : [consigne-dev-cloud-ynov.md](consigne-dev-cloud-ynov.md).

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
- **Repo** : Turborepo monorepo (front + back in one repo). **Package manager** : **pnpm**.

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
| Documentation | README, architecture diagram, deployment steps |

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
- CI/CD: GitHub Actions — **lint**, **test-web**, **test-api** ; sur `main`, Docker, Cloud Run, front. Voir [testing.md](testing.md).  
- Monitoring: default AWS/GCP tools (CloudWatch, Cloud Monitoring / Logging).

---

## 4. Conception prête pour la suite (sans refacto)

- **Database** : `events.config` (JSON) for theme, limits, etc. No schema change needed for V1 options.
- **API** : routes `/events`, `/events/:id`, `/events/:id/movies`, `/events/:id/votes`, `/events/:id/wheel` ; later `/events/:id/config` and `/auth/*`.
- **Front** : Reusable components (MovieCard, VoteButtons, Wheel). Layout ready for a Config tab and reactions in V1.
