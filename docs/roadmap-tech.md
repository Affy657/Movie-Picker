# Movie Picker – Roadmap tech 

**Nom du projet : Movie Picker.**

Découpage par version côté **plateforme, qualité, infra, observabilité, dette**.
- Spec complète → [spec.md](spec.md).
- Roadmap **produit** → [roadmap-product.md](roadmap-product.md).

> **Règle de tri** : seul le travail **transverse et indépendant de toute feature produit** a sa place ici — CI/CD, infra cloud, sécurité de la chaîne, observabilité, outillage qualité. L'implémentation technique d'une feature (schéma, endpoints, cache…) appartient à la feature elle-même.

**Légende types** : 🏗️ Infra & déploiement · ⚙️ CI/CD & qualité · 🔒 Sécurité · 📊 Observabilité · ♿ Accessibilité

**Légende tailles** (même échelle que la roadmap produit) : `S` moins de 800 lignes, `M` 800 à 2000, `L` 2000 à 5000, `XL` au-delà.

---

## ✅ MVP

- ✅ 🏗️ `L` **Déploiement** : API Docker sur GCP Cloud Run ; front statique AWS S3 + CloudFront (SPA, fallback `index.html`) ; variables et secrets documentés.
- ✅ ⚙️ `L` **CI/CD** : GitHub Actions — build, tests, image Docker API, déploiements automatisés.
- ✅ ⚙️ `M` **Qualité code** : ESLint + Prettier (front) ; `dotnet format` + analyzers (API .NET) ; `pnpm audit` en CI.
- ✅ ⚙️ `L` **Tests** : Vitest + Testing Library + couverture (front) ; unitaires + intégration + contrat OpenAPI + Coverlet (API) ; Playwright E2E en local.
- ✅ 🔒 `M` **Sécurité prod** : HTTPS, CORS `ALLOWED_ORIGINS`, rate limiting, secrets via GCP Secret Manager, en-têtes sécurité (`X-Content-Type-Options`, `X-Frame-Options`…).
- ✅ 📊 `M` **Observabilité** : logging structuré, correlation ID, erreurs JSON homogènes, métriques minimales Cloud Run / CloudFront.
- ✅ ⚙️ `S` **Vérification locale** : `pnpm run verify:local`.

---

## ✅ Migration back .NET (entre MVP et V1)

- ✅ 🏗️ `XL` Remplacement API Node.js/Express par ASP.NET Core — mêmes routes, même contrat JSON, CI/CD adapté.

---

## ✅ V1

- ✅ 🔒 `M` **Sécurité CI — Sonar** : analyse statique SonarCloud sur API .NET et front, quality gate bloquante (bugs, vulnérabilités, security hotspots).
- ✅ 🔒 `S` **Sécurité CI — Dépendances NuGet** : `dotnet list package --vulnerable` après restore, échec sur high/critical. Complète `pnpm audit`.
- ✅ 🔒 `S` **Sécurité CI — Image Docker** : scan CVE (Trivy / Grype) sur l'image taguée avant `docker push`.
- ✅ 🔒 `S` **Sécurité CI — Secrets** : GitHub Secret scanning + push protection activés, procédure de rotation documentée.

---

## ✅ V1.1

- ✅ 🏗️ `M` **PWA** : manifest, icônes multi-tailles, splash screen, Service Worker — "Ajouter à l'écran d'accueil" et chargement hors-ligne partiel ; cohérent avec l'usage mobile-first de l'app.

---

## ✅ V1.2

**Objectif** : qualité UX mesurable et conformité RGPD avant la montée en charge des features sociales.

- ✅ ♿ `S` **Accessibilité étendue** : skip link, focus-visible global (liens + nav), navigation clavier complète, couverture axe étendue (7 pages).
- ✅ 🔒 `M` **Bandeau consentement (CMP)** : choix granulaire au premier accès, persistance, lien « Modifier mes préférences » dans le footer ; conditionne le chargement effectif de l'analytics et de tout SDK tiers — prérequis RGPD à poser avant l'analytics.
- ✅ 📊 `M` **Analytics produit** (PostHog) : mesure d'usage (créations, joins, votes, roue), funnels, rétention — chargé uniquement après consentement CMP ; PROD-only, capture_pageview sur history_change pour SPA.

---

## ✅ V1.3

**Objectif** : stabilité long terme et sécurité de la chaîne de dépendances.

- ✅ ⚙️ `S` **Dependabot** : mises à jour groupées mensuelles (npm, github-actions, nuget, docker) ; alertes de vulnérabilité + *automated security fixes* activés — PRs auto sur nouvelles versions et CVE ; complète le `pnpm audit` et l'audit NuGet déjà en CI.
- ✅ 📊 `M` **Sentry** : capture d'erreurs front (React) et API (.NET) via projets Sentry SaaS UE, regroupement incidents, contexte release/env ; toujours actif en prod sans PII (intérêt légitime, non consent-gated), tracing léger (0.1), source maps + release liés au commit en CI.

---

## ✅ V1.4

**Objectif** : ouverture OAuth.

- ✅ 🔒 `M` **OAuth — volet infra** (2026-08-12) : librairie OAuth côté API .NET (Google + GitHub), secrets dédiés par provider (`OAUTH_GOOGLE_CLIENT_ID`/`_SECRET`, `OAUTH_GITHUB_CLIENT_ID`/`_SECRET`, absents = provider masqué sans erreur), mentions légales à jour. Reste à faire côté externe (hors code) : créer les apps OAuth Google Cloud Console / GitHub Developer settings (dev et prod), configurer l'écran de consentement Google, et poser les secrets de prod dans GCP Secret Manager + la ligne `--set-secrets` de `ci-cd.yml`.

---

## Backlog tech (non priorisé sur une release)

- ⬜ 🏗️ `XL` **Terraform (IaC)** : environnement staging calqué sur la prod (S3 + CloudFront, Cloud Run + Artifact Registry, IAM) ; state distant, secrets hors repo.
