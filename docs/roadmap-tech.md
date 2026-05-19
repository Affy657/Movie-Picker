# Movie Picker – Roadmap tech 

**Nom du projet : Movie Picker.**

Découpage par version côté **plateforme, qualité, infra, observabilité, dette**.
- Spec complète → [spec.md](spec.md).
- Roadmap **produit** → [roadmap-product.md](roadmap-product.md).

> **Règle de tri** : seul le travail **transverse et indépendant de toute feature produit** a sa place ici — CI/CD, infra cloud, sécurité de la chaîne, observabilité, outillage qualité. L'implémentation technique d'une feature (schéma, endpoints, cache…) appartient à la feature elle-même.

**Légende types** : 🏗️ Infra & déploiement · ⚙️ CI/CD & qualité · 🔒 Sécurité · 📊 Observabilité · ♿ Accessibilité

---

## ✅ MVP

- ✅ 🏗️ **Déploiement** : API Docker sur GCP Cloud Run ; front statique AWS S3 + CloudFront (SPA, fallback `index.html`) ; variables et secrets documentés.
- ✅ ⚙️ **CI/CD** : GitHub Actions — build, tests, image Docker API, déploiements automatisés.
- ✅ ⚙️ **Qualité code** : ESLint + Prettier (front) ; `dotnet format` + analyzers (API .NET) ; `pnpm audit` en CI.
- ✅ ⚙️ **Tests** : Vitest + Testing Library + couverture (front) ; unitaires + intégration + contrat OpenAPI + Coverlet (API) ; Playwright E2E en local.
- ✅ 🔒 **Sécurité prod** : HTTPS, CORS `ALLOWED_ORIGINS`, rate limiting, secrets via GCP Secret Manager, en-têtes sécurité (`X-Content-Type-Options`, `X-Frame-Options`…).
- ✅ 📊 **Observabilité** : logging structuré, correlation ID, erreurs JSON homogènes, métriques minimales Cloud Run / CloudFront.
- ✅ ⚙️ **Vérification locale** : `pnpm run verify:local`.

---

## ✅ Migration back .NET (entre MVP et V1)

- ✅ 🏗️ Remplacement API Node.js/Express par ASP.NET Core — mêmes routes, même contrat JSON, CI/CD adapté.

---

## ✅ V1

- ✅ 🔒 **Sécurité CI — Sonar** : analyse statique SonarCloud sur API .NET et front, quality gate bloquante (bugs, vulnérabilités, security hotspots).
- ✅ 🔒 **Sécurité CI — Dépendances NuGet** : `dotnet list package --vulnerable` après restore, échec sur high/critical. Complète `pnpm audit`.
- ✅ 🔒 **Sécurité CI — Image Docker** : scan CVE (Trivy / Grype) sur l'image taguée avant `docker push`.
- ✅ 🔒 **Sécurité CI — Secrets** : GitHub Secret scanning + push protection activés, procédure de rotation documentée.

---

## ✅ V1.1

Pas de travail tech transverse sur cette version — les briques techniques ont été livrées dans le cadre des features produit.

---

## 📋 V1.2

Pas de travail tech transverse identifié à ce stade.

---

## Backlog tech (non priorisé sur une release)

- ⬜ ⚙️ **Dependabot / Renovate** : automatisation des mises à jour de dépendances (npm, NuGet) — ouvre des PRs automatiques sur nouvelles versions et CVE ; complète le `pnpm audit` et l'audit NuGet déjà en CI.
- ⬜ ♿ **Accessibilité étendue** : audit global (axe + manuel), navigation clavier, focus visible cohérent sur toutes les pages.
- ⬜ 📊 **Sentry** : capture d'erreurs front (React) et API (.NET), regroupement incidents, contexte release/env ; définir sampling, politique PII et rétention.
- ⬜ 📊 **Analytics produit** (PostHog, Plausible ou équivalent) : mesure d'usage (créations, joins, votes, roue), funnels, rétention. Base légale RGPD + bandeau consentement si nécessaire.
- ⬜ 🔒 **Bandeau consentement (CMP)** : choix granulaire au premier accès, persistance, lien « Modifier mes préférences » dans le footer ; conditionne le chargement effectif de l'analytics et SDKs tiers.
- ⬜ 🏗️ **PWA** : manifest, icônes multi-tailles, splash, Service Worker complet.
- ⬜ 🏗️ **Terraform (IaC)** : environnement staging calqué sur la prod (S3 + CloudFront, Cloud Run + Artifact Registry, IAM) ; state distant, secrets hors repo.
- ⬜ 🔒 **OAuth — volet infra** : librairie OAuth côté API .NET, secrets dédiés par provider, écran de consentement, mentions légales à jour.
- ⬜ 🏗️ **Notifications hors session — volet infra** : file d'envoi, jobs planifiés, transport push web (VAPID) et email transactionnel ; consentement stocké par utilisateur.
