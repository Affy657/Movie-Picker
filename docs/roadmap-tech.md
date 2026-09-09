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

> **Note — découpage du chantier Terraform.** L'item `XL` initial (« environnement staging calqué sur la prod ; state distant, secrets hors repo ») est découpé en huit lots livrables un par un, listés ci-dessous dans leur ordre de dépendance. Deux d'entre eux sortent le front d'AWS pour ramener toute l'infrastructure sur GCP, et ils passent **avant** les lots d'identités et de CI : décrire en Terraform, puis outiller, un hébergement qu'on s'apprête à supprimer serait du travail jeté. Le gain visé est la consolidation, pas l'économie — le palier gratuit de CloudFront (1 To/mois) est plus large que celui de la cible GCP. Ce que la migration supprime, c'est un second fournisseur, un second modèle d'identité, un second endroit où regarder pendant un incident, et les deux identifiants statiques du volet AWS — `GCP_SA_KEY` reste, et c'est le lot 5 qui le retire. Chaque lot laisse le dépôt dans un état cohérent : aucun n'oblige à enchaîner sur le suivant.

- ⬜ 🏗️ `S` **Terraform 1 — Socle & state distant** : arborescence `infra/terraform/`, versions de Terraform et des providers (`google`, `google-beta`) épinglées, backend distant avec versioning et verrou d'état, `terraform fmt -check` et `terraform validate` ajoutés à `verify:local` et à la CI. Aucune ressource décrite à ce stade : le lot n'existe que pour que les suivants atterrissent sur une base stable.
- ⬜ 🏗️ `M` **Terraform 2 — Prod GCP décrite et importée** : dépôt Artifact Registry `movie-picker` et sa politique de rétention (aujourd'hui `infra/artifact-registry-cleanup-policy.json` appliqué par `registry-cleanup.yml`), service Cloud Run `movie-picker-api` (scale-to-zero, variables d'environnement, `--set-secrets`), entrées Secret Manager déclarées comme contenants — les valeurs restent hors du dépôt. Ressources **importées**, jamais recréées : le lot est fini quand `terraform plan` revient vide sur la prod en service.
- ⬜ 🏗️ `M` **Terraform 3 — Front hébergé sur GCP, en parallèle d'AWS** : cible d'hébergement décrite en Terraform (voir la note ci-dessous), avec parité stricte sur ce que sert CloudFront aujourd'hui — repli SPA vers `index.html`, en-têtes de sécurité de `infra/cloudfront-response-headers-policy.json`, et les trois paliers de cache actuels (assets hachés en `immutable`, `sw.js` / `manifest.webmanifest` / `index.html` en `no-cache`, `sitemap.xml` à une heure). Le job `deploy-front` publie sur les deux hébergements et le nouveau est vérifié sur un sous-domaine temporaire ; la prod continue de sortir par CloudFront. Lot réversible de bout en bout, sans aucun impact utilisateur — il s'appuie sur l'authentification GCP déjà en place en CI, que le lot 5 remplacera.
- ⬜ 🏗️ `S` **Terraform 4 — Bascule DNS et décommissionnement d'AWS** : même déroulé que [`runbook-migration-domaine-www.md`](runbook-migration-domaine-www.md) — élargir `ALLOWED_ORIGINS` aux deux origines, repointer le `CNAME` `www` chez OVH (geste manuel, pas de CLI OVH), observer les sondes, puis supprimer la distribution CloudFront, le bucket S3, le certificat ACM et l'utilisateur IAM de déploiement. Côté dépôt, disparaissent avec eux `scripts/apply-cloudfront-headers.sh`, `infra/cloudfront-response-headers-policy.json`, les secrets `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET`, les variables `AWS_REGION` / `AWS_CLOUDFRONT_DISTRIBUTION_ID`, et les mentions d'AWS dans le `README.md` (schéma d'architecture, tableau d'hébergement) et les messages d'erreur `ALLOWED_ORIGINS`. Le certificat ACM est un wildcard `*.movie-picker.fr` : vérifier qu'aucun autre sous-domaine ne s'en sert avant de le retirer.
- ⬜ 🔒 `M` **Terraform 5 — IAM décrit, clés longue durée retirées** : comptes de service et rôles au moindre privilège pour l'exécution (Cloud Run → lecture des secrets, lecture d'Artifact Registry, publication du front) et pour le pipeline ; remplacement de la clé JSON `GCP_SA_KEY` par Workload Identity Federation. Le volet AWS de ce lot disparaît avec le lot 4 : plus rien à fédérer côté second fournisseur, et plus aucun identifiant statique de longue durée dans les secrets GitHub.
- ⬜ ⚙️ `S` **Terraform 6 — CI : `plan` en PR, `apply` sur master** : job dédié, `plan` publié en commentaire de PR, `apply` derrière l'environnement `production` ; s'appuie sur l'identité sans clé du lot 5. À partir d'ici, une dérive de configuration se voit en revue au lieu d'être découverte en incident.
- ⬜ 📊 `M` **Terraform 7 — Supervision décrite en IaC** : les 3 sondes de disponibilité, les 5 politiques d'alerte, le canal de notification et le tableau de bord Cloud Monitoring, aujourd'hui créés par appels d'API et non versionnés. Répond à la recommandation R6 de [`RNCP/bloc-4-mco/axes-amelioration.md`](RNCP/bloc-4-mco/axes-amelioration.md) ; documenté dans [`RNCP/bloc-4-mco/supervision.md`](RNCP/bloc-4-mco/supervision.md). La sonde front change de cible avec le lot 4, son seuil et sa validation par le titre de page ne bougent pas.
- ⬜ 🏗️ `L` **Terraform 8 — Environnement staging** : objectif d'origine du chantier — une seconde instanciation des modules des lots 2, 3 et 5 (front, Cloud Run + Artifact Registry, secrets et base Atlas propres), son entrée DNS dédiée, et un déploiement CI qui passe par staging avant la prod. Le coût réel de ce lot dépend entièrement des précédents : sans eux il vaut `XL`, après eux il n'est qu'un paramétrage — et sur un seul fournisseur au lieu de deux.

> **Note — cible d'hébergement du front (lot 3).** Deux cibles GCP sont possibles et le choix engage le budget. **Cloud Storage + Cloud CDN derrière un load balancer applicatif externe** est l'équivalent direct de S3 + CloudFront, mais sa règle de transfert est facturée à l'heure sans palier gratuit, soit ≈ 18 $/mois avant le moindre octet servi : le projet sortirait du « 0 €/mois, tous les services dans leur palier gratuit » suivi comme indicateur au Bloc 3. **Firebase Hosting** reste dans le gratuit (10 Go stockés, 360 Mo/jour transférés), porte nativement le repli SPA, les en-têtes personnalisés et le domaine sur mesure avec son certificat, et se décrit en Terraform (`google_firebase_hosting_site`, `google_firebase_hosting_custom_domain`, provider `google-beta`). **Recommandation : Firebase Hosting**, avec les 360 Mo/jour comme seul point à surveiller — le trafic mesuré (≈ 500 requêtes/jour) en est loin, et un dépassement fait basculer sur la facturation à l'octet, pas sur une coupure.

- ⬜ ⚙️ `S` **Lighthouse hors du chemin de chaque push master** : le job pèse 9 minutes sur les 30 minutes-machine d'un run master, soit 30 % du coût du pipeline, et il rejoue la médiane de 3 passes pour tenir malgré son instabilité. Le sortir du push master vers un cron hebdomadaire (ou vers les seules PR ciblant master) économise environ 9 minutes par livraison. Point de vigilance : le job est bloquant et conditionne `deploy-front` ; un cron qui échoue ne doit pas laisser la prod se déployer sans mesure, donc prévoir où le résultat est consommé avant de déplacer le job.
- ⬜ ⚙️ `S` **Fréquence des workflows planifiés** : la sauvegarde MongoDB tourne tous les jours (`31 2 * * *`, environ 2 minutes, soit 60 minutes par mois), le scan de sécurité toutes les semaines, le nettoyage du registre tous les mois. Réviser ces cadences au regard du quota GitHub Actions. La sauvegarde est le premier poste, mais c'est aussi le seul filet en cas de perte de données : ne pas l'espacer sans avoir vérifié le point de restauration acceptable.
- ⬜ 🔒 `M` **Passage du dépôt en public (visé V1.6)** : les minutes GitHub Actions sont gratuites et illimitées sur un dépôt public, ce qui supprime la contrainte de quota, et plusieurs intégrations aujourd'hui bloquées par le mode privé redeviennent accessibles. Prérequis non négociable : un audit complet de l'historique avant bascule, pas seulement des commits récents. Vérifier qu'aucun identifiant Atlas, GCP, AWS, Resend, TMDB ou VAPID n'a jamais transité par un commit (gitleaks sur la totalité de l'historique, pas sur le diff), qu'aucun `.env` n'a été versionné à un moment quelconque, et que les dumps de base et captures des dossiers RNCP ne contiennent pas de données personnelles réelles. Un secret trouvé dans l'historique impose sa rotation puis une réécriture d'historique, à faire avant la bascule et non après : une fois le dépôt public, tout ce qui a été exposé doit être considéré comme compromis.
