# Movie Picker – Roadmap tech 

**Nom du projet : Movie Picker.**

Découpage par version côté **plateforme, qualité, infra, observabilité, dette**.
- Spec complète → [spec.md](spec.md).
- Roadmap **produit** → [roadmap-product.md](roadmap-product.md).

> **Règle de tri roadmap-product ↔ roadmap-tech**
> *Roadmap produit* = ce qui est explicable à un PO sans expliquer la stack (le **quoi** utilisateur).
> *Roadmap tech* = exigence ingé / qualité / infra (le **comment**, dépendances, dette).
> Pour les sujets transverses (cache posters, OG dynamiques, rate limiting, push, OAuth, deep links, CMP) : valeur user **côté roadmap produit**, implémentation **ici**.

---

## Principes

- **MVP** : livrables plateforme / qualité alignés sur la consigne Ynov.
- **V1, V1.1** : briques techniques qui débloquent les features produit du même rang (cf. [roadmap-product.md](roadmap-product.md)) sans dette dormante.
- **Backlog** : sujets techniques non datés (qualité, observabilité, IaC, expérience dev).

---

## MVP – Plateforme, qualité et livrables Ynov

**Objectif** : mettre en production, sécuriser, tester, documenter et industrialiser le MVP — **hors** périmètre métier de [roadmap-product.md](roadmap-product.md) § MVP.

- **Infra & déploiement** : API **Docker** sur **GCP Cloud Run** ; front statique **AWS S3** + **CloudFront** (SPA, fallback `index.html`) ; **GitHub Actions** (build, tests, image API, déploiements) ; variables et secrets documentés.
- **Sécurité prod** : **HTTPS** ; **CORS** avec `ALLOWED_ORIGINS` ; **rate limiting** (création soirée, join, recherche films) ; secrets via **GCP Secret Manager** ; en-têtes `X-Content-Type-Options`, `X-Frame-Options`, etc.
- **Qualité code** : ESLint + Prettier (front) ; `dotnet format` + analyzers (API .NET) ; `pnpm audit` en CI.
- **Tests** : API — unitaires, intégration, **contrat OpenAPI** (`OpenApiContractTests`), Coverlet en CI ; front — Vitest + Testing Library, couverture, **axe** sur pages clés ; **Playwright** E2E en local (hors CI ou non bloquant).
- **API .NET** : préfixe **`/api/v1`** ; Swagger et **export OpenAPI** en CI (artefact) ; validation config au démarrage en prod ; **logging structuré**, **correlation ID**, **erreurs JSON** homogènes.
- **Front — solidité** : **TanStack Query** (ou équivalent) pour données serveur ; **error boundary** ; couche **« live »** (polling) isolée pour évolution V1 (SSE/WebSocket).
- **Observabilité** : logs (ex. Cloud Logging), métriques minimales Cloud Run / CloudFront.
- **Vérification locale** : **`pnpm run verify:local`**.
- **Identité navigateur** : **favicon** (dossier `public/` ou assets Vite) ; **`document.title`** sur les routes principales pour l’onglet et le partage basique.
- **Avant la V1 produit** : **Lighthouse** sur build (budgets, CI non bloquant si retenu) ; **nom de domaine** ; **redirection apex + SEO** ; documenter la **limitation SPA** sur les aperçus de liens (OG statiques vs dynamiques) ; périmètre et plan V1 : [roadmap-product.md](roadmap-product.md) § V1.

---

## Migration back .NET (étape entre MVP et V1)

**Objectif** : remplacer l’API Node.js/Express par une API **ASP.NET Core (C#)** sans changer les fonctionnalités ni le front. Le contrat API (routes, JSON) reste identique pour que le front React et le déploiement (Cloud Run, S3/CloudFront) continuent de fonctionner.

### Périmètre technique
- Nouveau projet **ASP.NET Core Web API** (ex. `apps/api-dotnet` ou remplacement de `apps/api`).
- **Mêmes routes et contrats** : POST/GET events, join, movies (liste, ajout, vote, suppression), wheel, close ; format JSON inchangé.
- **MongoDB** : mêmes collections (events, participants, movies, votes) avec **MongoDB.Driver**.
- **TMDB** : appel côté serveur (HttpClient), clé en variable d’environnement.
- **Docker** : image .NET (mcr.microsoft.com/dotnet/aspnet), build `dotnet publish`.
- **CI/CD** : adapter le workflow (build .NET, push image, déploiement Cloud Run) ; le front et l’URL de l’API restent identiques.

### Livrables
- [x] Contrat API documenté (OpenAPI/Swagger) aligné sur l’API actuelle.
- [x] API .NET déployée sur Cloud Run, même comportement que le MVP (parcours complet testé).
- [x] Ancienne API Node retirée ou désactivée après validation.

**Le back .NET est la base pour la V1** (comptes, config, marqueur « déjà vu »).

---

## V1 – Tech

**Objectif** : débloquer les features V1 produit (comptes, config hôte, déjà vu, watch providers, OG dynamiques, rappels in-app) côté plateforme **et** durcir la chaîne CI sécurité.

- **Persistence & schéma** : tables / collections `users` (email, mot de passe hashé, pseudo par défaut, préférences) et `seenMarks` (par participant × film) ; index alignés sur les agrégats (compteur « déjà vu » par soirée, retrieval rapide).
- **Auth** : routes inscription / connexion / déconnexion, hash mots de passe (bcrypt/Argon2), session (cookie sécurisé, `HttpOnly`, `SameSite`), rate limit dédié sur login. **Reset mot de passe** : transport email transactionnel (provider à choisir), templates, lien sécurisé à durée limitée (TTL court), invalidation après usage.
- **Config soirée** : endpoints PATCH config (thème, expiration, limites, type de roue) + validation côté API ; modèle extensible pour V1.1 (limite participants, plage votes).
- **Cache des posters** : bucket (ou BDD) avec TTL ; politique de remplissage (au premier hit), invalidation manuelle minimale.
- **Watch providers TMDB** : endpoint API qui agrège la disponibilité par région (FR par défaut), cache court (par film, par région) ; texte indicatif côté UI géré côté produit.
- **Indicateur « déjà vu » côté autres participants** : agrégat `seenMarks` exposé sur la liste des films de la soirée (compteur + pseudos), neutre pour la roue.
- **Open Graph dynamiques** : si l’infra le permet, mécanisme **serveur ou edge** servant des meta **par URL** d’événement aux crawlers (HTML minimal ou injection de meta) ; sinon rester sur OG **statiques** et consigner la limite. Endpoint **résumé événement** lisible par les crawlers (titre, description, image, indicateurs filtrés selon option hôte).
- **Live light → live** : couche polling isolée prête à basculer en SSE/WebSocket sans toucher aux composants consommateurs.
- **i18n** : convention sur les textes UI (pas de chaînes en dur sur les **nouveaux** écrans V1) ; **2e langue UI (anglais)** livrée — registre `locales/{fr,en}.ts`, `LocaleContext` + hook `useTranslation`, sélecteur de langue, persistance localStorage (préparée pour sync compte), `tmdbLanguage` propagé aux appels TMDB.
- **Rate limiting (prod, par IP / minute, fenêtre 1 min)** : création soirée 20 ; join 60 ; recherche films 40 ; inscription 10 ; login 30 ; PATCH config 40 ; mutations marqueur « déjà vu » 120 ; GET affiches cache 300.
- **Sécurité CI — Sonar** : analyse statique (SonarCloud / SonarQube) en CI sur API .NET et front, **quality gate** bloquante (bugs, vulnérabilités, security hotspots), couverture branchée si la gate l’inclut. Secrets `SONAR_TOKEN` (+ `SONAR_HOST_URL` pour SonarQube) en GitHub Secrets.
- **Sécurité CI — Dépendances NuGet** : `dotnet list package --vulnerable` après restore, échec sur high/critical (seuil documenté). Complète `pnpm audit` côté Node, distinct de Sonar.
- **Sécurité CI — Image Docker API** : scan CVE (Trivy / Grype) sur l’image taguée avant `docker push`, échec au-delà du seuil retenu.
- **Sécurité CI — Secrets et anti-fuite** : GitHub **Secret scanning** + **push protection** activés, procédure de rotation documentée ; option CI Gitleaks / TruffleHog sur PR.

---

## V1.1 – Tech

**Objectif** : supporter le contenu film riche, l’historique et le hors-ligne léger côté plateforme.

- **Films enrichis** : extension du modèle film (note moyenne, bande-annonce URL, durée, type film/série) ; cache TMDB étendu.
- **Calendrier .ics** : génération côté API ou edge ; gestion fuseau (UTC stocké, affichage local).
- **Historique soirées** : index « soirées passées » par utilisateur, lecture seule garantie côté API après clôture/expiration.
- **Mode hors-ligne léger** : cache de la dernière vue de la soirée (Service Worker minimal ou IndexedDB), bandeau « Données en cache », pas de mutation hors-ligne.
- **Vue grille / liste** : découpage de composants pour basculer le rendu sans refetch.

---

## Backlog tech (non priorisé sur une release)

> Pistes pour plus tard : pas d’engagement de version. Pour les features **produit** non datées, voir [roadmap-product.md](roadmap-product.md) § Backlog produit.

- **Accessibilité étendue** : audit global (axe + manuel), navigation au clavier, labels systématiques, contraste validé mode sombre & clair, focus visible cohérent, tests automatisés en CI sur pages clés.
- **Sentry (ou équivalent) — monitoring applicatif** : capture d’erreurs et exceptions **front** (React) et **API** (.NET), regroupement des incidents, contexte (release, environnement), éventuellement **performance** (transactions, traces) ; complément aux logs structurés et métriques infra MVP. Définir **sampling**, **PII** (pas d’email en clair dans les breadcrumbs sans nécessité) et politique de rétention.
- **Analytics produit & KPIs (PostHog, Plausible, Amplitude, Mixpanel ou stack open source)** : mesure d’usage et de valeur (créations de soirées, joins, votes, lancements de roue, clôtures), funnels, rétention, tableaux de bord internes. **RGPD** : base légale, bandeau / consentement si cookies ou identifiants non strictement nécessaires, documentation dans la politique de confidentialité.
- **Bandeau de consentement (CMP) — implémentation** : version **opérationnelle** des mentions cookies / confidentialité — bandeau au premier accès avec **choix granulaire** (strictement nécessaires / mesure d’audience / éventuels tiers), persistance du choix, lien **« Modifier mes préférences »** dans le footer ; conditionne le **chargement effectif** de l’analytics et de tout SDK non strictement nécessaire (Sentry, etc. à arbitrer selon base légale). Aligné RGPD.
- **PWA** : manifest, icônes multi-tailles, splash, Service Worker (au-delà du hors-ligne léger V1.1). Hors favicon MVP (déjà couvert).
- **Terraform (IaC)** : ajouter un **environnement staging** (AWS **S3 + CloudFront**, GCP **Cloud Run + Artifact Registry**, IAM associé) calqué sur la prod, sans recréer la stack à la main ; **state** distant, **secrets** hors repo ; la CI ne fait que pousser build / image sur ces ressources une fois provisionnées.
- **Bonus cloud** : autoscaling fin, autres IaC (CloudFormation, Pulumi), multi-région, etc.
- **OAuth — volet infra** : librairie OAuth côté API .NET, secrets dédiés (client ID/secret par provider), écran de consentement, mise à jour des mentions légales. Volet UX / produit : voir [roadmap-product.md](roadmap-product.md) § Backlog.
- **Notifications hors session — volet infra** : file d’envoi (queue), jobs planifiés, transport push web (VAPID) et e-mail transactionnel ; **consentement** stocké par utilisateur. Volet UX / produit : voir [roadmap-product.md](roadmap-product.md) § Backlog.
- **Deep links streaming — volet tech** : table de mapping schemes natifs par provider et plateforme, fallback web automatique en cas d’échec du scheme. Volet UX : voir [roadmap-product.md](roadmap-product.md) § Backlog.
- **Stats utilisateur — endpoints d’agrégation** : agrégats côté API (Mongo aggregation pipeline) sur events/participants/votes ; cache court ; pas de tracking supplémentaire.
