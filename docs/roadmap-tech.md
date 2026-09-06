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

> **Note — découpage du chantier Terraform.** L'item `XL` initial (« environnement staging calqué sur la prod ; state distant, secrets hors repo ») est découpé en sept lots livrables un par un, listés ci-dessous dans leur ordre de dépendance. Le socle porte le state, les deux lots d'import mettent la prod **existante** sous Terraform sans la recréer, et l'environnement staging n'est plus qu'une seconde instanciation des modules une fois les six premiers passés. Chaque lot laisse le dépôt dans un état cohérent : aucun n'oblige à enchaîner sur le suivant.

- ⬜ 🏗️ `S` **Terraform 1 — Socle & state distant** : arborescence `infra/terraform/`, versions de Terraform et des providers (`google`, `aws`) épinglées, backend distant avec versioning et verrou d'état, `terraform fmt -check` et `terraform validate` ajoutés à `verify:local` et à la CI. Aucune ressource décrite à ce stade : le lot n'existe que pour que les suivants atterrissent sur une base stable.
- ⬜ 🏗️ `M` **Terraform 2 — Prod GCP décrite et importée** : dépôt Artifact Registry `movie-picker` et sa politique de rétention (aujourd'hui `infra/artifact-registry-cleanup-policy.json` appliqué par `registry-cleanup.yml`), service Cloud Run `movie-picker-api` (scale-to-zero, variables d'environnement, `--set-secrets`), entrées Secret Manager déclarées comme contenants — les valeurs restent hors du dépôt. Ressources **importées**, jamais recréées : le lot est fini quand `terraform plan` revient vide sur la prod en service.
- ⬜ 🏗️ `M` **Terraform 3 — Prod AWS décrite et importée** : bucket S3 privé du front, distribution CloudFront (fallback SPA `index.html`, alias `www.movie-picker.fr`), politique d'en-têtes de réponse (aujourd'hui `infra/cloudfront-response-headers-policy.json`), certificat ACM wildcard `*.movie-picker.fr` en `us-east-1`. Même règle que le lot 2 : import de l'existant, `plan` vide, zéro coupure du front.
- ⬜ 🔒 `M` **Terraform 4 — IAM décrit, clés longue durée retirées** : comptes de service et rôles au moindre privilège pour l'exécution (Cloud Run → lecture des secrets, lecture d'Artifact Registry) et pour le pipeline ; remplacement de la clé JSON `GCP_SA_KEY` par Workload Identity Federation et des identifiants statiques `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` par un rôle assumé en OIDC. Supprime les deux seuls secrets de longue durée encore stockés côté GitHub.
- ⬜ ⚙️ `S` **Terraform 5 — CI : `plan` en PR, `apply` sur master** : job dédié, `plan` publié en commentaire de PR, `apply` derrière l'environnement `production` ; s'appuie sur l'identité sans clé du lot 4. À partir d'ici, une dérive de configuration se voit en revue au lieu d'être découverte en incident.
- ⬜ 📊 `M` **Terraform 6 — Supervision décrite en IaC** : les 3 sondes de disponibilité, les 5 politiques d'alerte, le canal de notification et le tableau de bord Cloud Monitoring, aujourd'hui créés par appels d'API et non versionnés. Répond à la recommandation R6 de [`RNCP/bloc-4-mco/axes-amelioration.md`](RNCP/bloc-4-mco/axes-amelioration.md) ; documenté dans [`RNCP/bloc-4-mco/supervision.md`](RNCP/bloc-4-mco/supervision.md).
- ⬜ 🏗️ `L` **Terraform 7 — Environnement staging** : objectif d'origine du chantier — une seconde instanciation des modules des lots 2 à 4 (S3 + CloudFront, Cloud Run + Artifact Registry, secrets et base Atlas propres), son entrée DNS dédiée, et un déploiement CI qui passe par staging avant la prod. Le coût réel de ce lot dépend entièrement des précédents : sans eux il vaut `XL`, après eux il n'est qu'un paramétrage.
