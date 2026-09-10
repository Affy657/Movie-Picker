# Movie Picker – Roadmap tech 

**Nom du projet : Movie Picker.**

Découpage par version côté **plateforme, qualité, infra, observabilité, dette**.
- Spec complète → [spec.md](spec.md).
- Roadmap **produit** → [roadmap-product.md](roadmap-product.md).

> **Règle de tri** : seul le travail **transverse et indépendant de toute feature produit** a sa place ici — CI/CD, infra cloud, sécurité de la chaîne, observabilité, outillage qualité. L'implémentation technique d'une feature (schéma, endpoints, cache…) appartient à la feature elle-même. Un item se tient en un titre et une à deux lignes ; les décisions et pièges qui lui survivent vont dans les sections « Contraintes » et « Impasses » de [technical-debt.md](technical-debt.md), pas ici.

**Légende types** : 🏗️ Infra & déploiement · ⚙️ CI/CD & qualité · 🔒 Sécurité · 📊 Observabilité · ♿ Accessibilité

**Légende tailles** (même échelle que la roadmap produit) : `S` moins de 800 lignes, `M` 800 à 2000, `L` 2000 à 5000, `XL` au-delà.

---

## ✅ MVP

- ✅ 🏗️ `L` **Déploiement** : API Docker sur GCP Cloud Run, front statique AWS S3 + CloudFront avec repli SPA vers `index.html`. Variables et secrets documentés.
- ✅ ⚙️ `L` **CI/CD** : GitHub Actions — build, tests, image Docker API, déploiements. La mise en production est un geste manuel depuis le 2026-09-10, quota de minutes d'un dépôt privé oblige.
- ✅ ⚙️ `M` **Qualité code** : ESLint + Prettier côté front, `dotnet format` + analyzers côté API, `pnpm audit` en CI.
- ✅ ⚙️ `L` **Tests** : Vitest + Testing Library + couverture au front ; unitaires, intégration, contrat OpenAPI et Coverlet à l'API ; Playwright en E2E.
- ✅ 🔒 `M` **Sécurité prod** : HTTPS, CORS `ALLOWED_ORIGINS`, rate limiting, secrets via GCP Secret Manager, en-têtes de sécurité.
- ✅ 📊 `M` **Observabilité** : logging structuré, correlation ID, erreurs JSON homogènes, métriques Cloud Run et CloudFront.
- ✅ ⚙️ `S` **Vérification locale** : `pnpm run verify:local`.

---

## ✅ Migration back .NET (entre MVP et V1)

- ✅ 🏗️ `XL` **API réécrite en ASP.NET Core** : remplacement de Node.js/Express, à routes et contrat JSON identiques. CI/CD adaptée.

---

## ✅ V1

- ✅ 🔒 `M` **Sécurité CI — Sonar** : analyse statique SonarCloud sur les deux applications, Quality Gate bloquante.
- ✅ 🔒 `S` **Sécurité CI — Dépendances NuGet** : `dotnet list package --vulnerable` après restore, échec sur high et critical.
- ✅ 🔒 `S` **Sécurité CI — Image Docker** : scan CVE de l'image taguée avant `docker push`.
- ✅ 🔒 `S` **Sécurité CI — Secrets** : porte `gitleaks` bloquante sur l'arbre de travail, plus secret scanning et push protection GitHub depuis le passage en public le 2026-09-10, rotation documentée.

---

## ✅ V1.1

- ✅ 🏗️ `M` **PWA** : manifest, icônes multi-tailles, splash screen et Service Worker. Ajout à l'écran d'accueil et chargement hors-ligne partiel, cohérents avec l'usage mobile-first.

---

## ✅ V1.2

**Objectif** : qualité UX mesurable et conformité RGPD avant la montée en charge des features sociales.

- ✅ ♿ `S` **Accessibilité étendue** : skip link, focus-visible global, navigation clavier complète, couverture axe sur 7 pages.
- ✅ 🔒 `M` **Bandeau consentement (CMP)** : choix granulaire au premier accès, persistance, lien de révision dans le footer. Conditionne le chargement de tout SDK tiers, donc prérequis de l'analytics.
- ✅ 📊 `M` **Analytics produit** (PostHog) : usage, funnels et rétention, en prod seulement et après consentement.

---

## ✅ V1.3

**Objectif** : stabilité long terme et sécurité de la chaîne de dépendances.

- ✅ ⚙️ `S` **Dependabot** : mises à jour groupées mensuelles sur les quatre écosystèmes, alertes et correctifs de sécurité automatiques.
- ✅ 📊 `M` **Sentry** : erreurs front et API sur projets SaaS UE, contexte release et environnement, tracing léger. Actif en prod sans PII, donc non consent-gated.

---

## ✅ V1.4

**Objectif** : ouverture OAuth.

- ✅ 🔒 `M` **OAuth — volet infra** (2026-08-12) : Google et GitHub côté API .NET, un couple de secrets par provider, provider masqué sans erreur quand ses secrets sont absents. Apps créées et secrets de prod en place.

---

## V1.6

**Objectif** : lever la contrainte de quota GitHub Actions à la racine.

- ✅ 🔒 `M` **Passage du dépôt en public** (2026-09-10) : minutes de runner gratuites et illimitées, secret scanning et push protection, CodeQL, signalement privé de vulnérabilité, et `master` protégé du force push. Aucune contribution externe n'est acceptée pour autant, voir Contrainte C7.

---

## Backlog tech (non priorisé sur une release)

- ⬜ 🏗️ `S` **Terraform 1 — Socle & state distant** : arborescence `infra/terraform/`, versions épinglées, backend distant avec versioning et verrou, `fmt -check` et `validate` en CI. Aucune ressource décrite, le lot n'existe que pour stabiliser la base des suivants.
- ⬜ 🏗️ `M` **Terraform 2 — Prod GCP décrite et importée** : Artifact Registry et sa rétention, service Cloud Run, entrées Secret Manager comme contenants, valeurs hors dépôt. Ressources **importées**, jamais recréées : fini quand `terraform plan` revient vide sur la prod en service.
- ⬜ 🏗️ `M` **Terraform 3 — Front hébergé sur GCP, en parallèle d'AWS** : cible décrite en Terraform (choix et budget en Contrainte C6), à parité stricte avec CloudFront. `deploy-front` publie sur les deux et la prod sort toujours par CloudFront : lot réversible, sans impact utilisateur.
- ⬜ 🏗️ `S` **Terraform 4 — Bascule DNS et décommissionnement d'AWS** : dérouler [`runbook-migration-domaine-www.md`](runbook-migration-domaine-www.md), puis supprimer distribution, bucket, certificat et utilisateur IAM, et purger le dépôt des secrets, variables et scripts AWS. Pièges en Contrainte C6.
- ⬜ 🔒 `M` **Terraform 5 — IAM décrit, clés longue durée retirées** : comptes de service et rôles au moindre privilège par usage, et `GCP_SA_KEY` remplacée par Workload Identity Federation. Le volet AWS du lot disparaît avec le lot 4.
- ⬜ ⚙️ `S` **Terraform 6 — CI : `plan` en PR, `apply` sur master** : job dédié, `plan` en commentaire de PR, `apply` derrière l'environnement `production`. S'appuie sur l'identité sans clé du lot 5, et fait voir une dérive en revue au lieu qu'elle sorte en incident.
- ⬜ 📊 `M` **Terraform 7 — Supervision décrite en IaC** : sondes, politiques d'alerte, canal de notification et tableau de bord Cloud Monitoring, aujourd'hui créés par appels d'API et non versionnés. Répond à la recommandation R6 du [Bloc 4](RNCP/bloc-4-mco/axes-amelioration.md).
- ⬜ 🏗️ `L` **Terraform 8 — Environnement staging** : objectif d'origine du chantier, soit une seconde instanciation des modules des lots 2, 3 et 5, son DNS et un déploiement qui passe par staging. Vaut `XL` sans les lots précédents, un paramétrage après eux.
