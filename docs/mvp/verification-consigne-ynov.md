# Vérification de la consigne Ynov

Ce document permet de vérifier que le projet Movie Picker couvre tous les points de la [consigne dev cloud Ynov](../consigne-dev-cloud-ynov.md). À utiliser pour la section 16 du roadmap et avant la soutenance.

---

## 1. Architecture Cloud & Développement

| Exigence | Couverture | Où le vérifier |
|----------|------------|-----------------|
| Application dans un langage maîtrisé | **ASP.NET Core (C#)** + **React** (TypeScript strict) | `apps/api-dotnet`, `apps/web`, [spec-technique.md](../spec-technique.md) |
| Architecture claire (monolithique conteneurisée ou microservices) | **Monolithique conteneurisée** : API .NET dans une image Docker, un seul service back | [architecture.md](architecture.md), [architecture-api-dotnet.md](../migration-dotnet/architecture-api-dotnet.md) |
| Au moins un service managé | **MongoDB Atlas** (DB) ; **S3** (stockage build) ; **CloudFront** (CDN) ; **Cloud Run** (compute) | [README.md](../../README.md) § Services utilisés |
| Application accessible publiquement | Front : URL **CloudFront** ; API : URL **Cloud Run** (HTTPS) | Déploiement effectif, [deploy-gcp-api.md](deploy-gcp-api.md), [deploy-aws-front.md](deploy-aws-front.md) |
| Performances (CDN, load balancing…) | **CloudFront** en CDN pour le front ; Cloud Run gère la charge côté API | [deploy-aws-front.md](deploy-aws-front.md), [architecture.md](architecture.md) |

---

## 2. Déploiement Cloud

| Exigence | Couverture | Où le vérifier |
|----------|------------|-----------------|
| Front et back sur des PaaS/IaaS **différents** | **Front** : AWS (S3 + CloudFront) ; **Back** : GCP (Cloud Run) | [README.md](../../README.md), [architecture.md](architecture.md) |
| Au moins un service cloud pertinent | **Cloud Run** (PaaS), **S3**, **CloudFront**, **Artifact Registry** | [deploy-gcp-api.md](deploy-gcp-api.md), [deploy-aws-front.md](deploy-aws-front.md) |
| Gestion variables d'environnement / secrets | **MONGODB_URI**, **TMDB_API_KEY** (Cloud Run) ; secrets GitHub pour la CI/CD | [deploy-cicd.md](deploy-cicd.md), [deploy-gcp-api.md](deploy-gcp-api.md) |
| Documentation des étapes de déploiement | Docs dédiées : GCP (API), AWS (front), CI/CD | [deploy-gcp-api.md](deploy-gcp-api.md), [deploy-aws-front.md](deploy-aws-front.md), [deploy-cicd.md](deploy-cicd.md) |

---

## 3. Automatisation CI/CD

| Exigence | Couverture | Où le vérifier |
|----------|------------|-----------------|
| Pipeline CI/CD : tests, build, déploiement | **GitHub Actions** : lint ; tests **web** (Vitest + couverture), **API .NET** (unitaires + intégration + Coverlet), **E2E Playwright** ; sur `main` : image Docker, Cloud Run, build front, S3, CloudFront | [.github/workflows/ci-cd.yml](../../.github/workflows/ci-cd.yml), [deploy-cicd.md](deploy-cicd.md), [../testing.md](../testing.md) |
| Outil type GitHub Actions / GitLab CI | **GitHub Actions** | `.github/workflows/ci-cd.yml` |

---

## 4. Monitoring & Observabilité

| Exigence | Couverture | Où le vérifier |
|----------|------------|-----------------|
| Suivi des performances et logs | **Cloud Logging** (GCP) pour les logs API ; **Cloud Monitoring** (GCP) pour Cloud Run ; **CloudWatch** (AWS) pour CloudFront | [monitoring.md](monitoring.md) |
| Indicateurs ou tableaux de bord de base | Métriques Cloud Run (requêtes, latence, instances) ; métriques CloudFront (requêtes, erreurs) | [monitoring.md](monitoring.md) § 2 et § 3 |

---

## 5. Documentation & Présentation

| Exigence | Couverture | Où le vérifier |
|----------|------------|-----------------|
| README : but, architecture, services, instructions de déploiement | README avec but du projet, architecture, tableau des services, liens vers les docs de déploiement | [README.md](../../README.md) |
| Schéma d'architecture | Diagramme Mermaid (front, back, S3, CloudFront, Cloud Run, MongoDB, TMDB, CI/CD) | [architecture.md](architecture.md) |
| Présentation orale 15–20 min | Guide de soutenance avec structure et points à montrer | [soutenance.md](soutenance.md) |

---

## Livrable global

| Livrable | Statut |
|----------|--------|
| Application web full-stack fonctionnelle sur le cloud | ✅ Front (AWS) + API (GCP) déployés |
| Dépôt Git clair et structuré | ✅ Monorepo Turborepo, `apps/api-dotnet`, `apps/web`, `docs/` |
| Documentation technique (README, schémas, déploiement) | ✅ README, architecture.md, deploy-*.md, monitoring.md |
| Soutenance 15–20 min | ✅ Guide dans [soutenance.md](soutenance.md) ; à préparer en slides / démo |

---

Quand tous les points ci-dessus sont vérifiés (et les docs/URLs accessibles), la **consigne Ynov est couverte**. Tu peux cocher la case correspondante dans la section 16 du [roadmap](roadmap-mvp.md).
