# Movie Picker — Livraison RNCP 39583 (carte de suivi)

Carte dédiée aux **livrables documentaires et process** exigés par le titre **Expert en développement logiciel — RNCP 39583** (référentiel : [`../_ynov/RNCP/`](../_ynov/RNCP/)).

> **Périmètre** : tout ce qui n'est **pas du dev produit V1** mais qui est **attendu par le jury** côté **dépôt** (docs versionnées, schémas, ADR, process). Le **dev produit V1** (compte utilisateur, parcours hôte, watch providers, OG, i18n, mot de passe oublié, sécurité CI…) reste dans [`livraison-v1.md`](livraison-v1.md). Le rapport écrit candidat et la soutenance orale **ne sont pas couverts ici**.

**Règle** : ne cocher une case que quand la tâche est **terminée** (fichier mergé sur `master`, lien vérifiable). Un brouillon ou un TODO ne suffit pas.

> **Note de numérotation** : les § 1 à 8 reprennent **à l'identique** les anciennes § 27 à 34 de [`livraison-v1.md`](livraison-v1.md) (compatibilité historique, renvois préservés). Les § 9 à 20 sont nouveaux et complètent la couverture RNCP (cadrage Bloc 1, pilotage Bloc 3, MCO retours).

**Ordre logique conseillé** (différent de l'ordre du sommaire) : cadrage (§ 9-14, 9 *bis*) → pilotage (§ 15-17) → compléments dev (§ 18) → sécurité & qualité ancrées au code (§ 1-3) → process & exploitation (§ 4-8) → MCO retours (§ 19-20).

---

## Couverture par bloc / compétence

> **Légende** : **ÉLIM** = compétence éliminatoire selon la fiche [`../_ynov/RNCP/00-fiche-recapitulative-rncp-39583.md`](../_ynov/RNCP/00-fiche-recapitulative-rncp-39583.md). Une case ici n'est cochée que quand **tout** le détail correspondant l'est.

### Bloc 1 — Cadrer le projet

- [ ] **C1.1.1** ÉLIM — Cartographie des parties prenantes — voir § 9
- [ ] **C1.1.2** — Analyse de la demande — voir § 9
- [ ] **C1.2.1** — Cartographie SWOT (opportunités / menaces) — voir § 13
- [ ] **C1.2.2** ÉLIM — Faisabilité technique + diagnostic infrastructures — voir § 10
- [ ] **C1.2.3** — Cartographie des risques + référentiel + indicateurs — voir § 13
- [ ] **C1.3.1** — Veille technique, technologique et réglementaire — voir § 13
- [ ] **C1.3.2** ÉLIM — Étude comparative des solutions techniques — voir § 11
- [ ] **C1.4.1** ÉLIM — Cahier des charges fonctionnel + estimation J/H — voir § 12
- [ ] **C1.4.2** — Estimation des coûts + budget prévisionnel — voir § 14
- [ ] **C1.5** — Modélisation de l'architecture logicielle — voir § 14
- [ ] **C1.6** ÉLIM — Argumentaire et axes de solutions présentés au commanditaire — **livrable mixte** : note de synthèse écrite (renvois cadrage § 9-14) + restitution orale jury — voir § 9 *bis*

> **C1.6** (ÉLIM) demande explicitement « **proposer** les décisions et axes de solutions auprès du client en structurant le discours et en développant un argumentaire » : la **soutenance** porte la majeure partie du critère (vocabulaire, objections, supports), **mais** un **support écrit versionné dans le dépôt** consolide les choix de cadrage (§ 9-14) en argumentaire client traçable. À matérialiser dans `docs/v1-produit/cadrage/11-argumentaire-client.md` (voir § 9 *bis*).

### Bloc 2 — Concevoir et développer (compléments documentaires)

> Le code et les tests sont déjà couverts par [`livraison-v1.md`](livraison-v1.md). Restent ici les **livrables documentaires / process**.

- [ ] **C2.1.1** — Protocole de déploiement continu formalisé — voir § 18
- [ ] **C2.1.2** — Protocole d'intégration continue formalisé — voir § 18
- [x] **C2.2.1** ÉLIM — Prototype (déjà **ACQUIS** dans la fiche)
- [x] **C2.2.2** ÉLIM — Harnais de tests unitaires (déjà **ACQUIS**)
- [ ] **C2.2.3** ÉLIM — OWASP Top 10 + accessibilité — voir § 2 + § 3
- [ ] **C2.3.1** ÉLIM — Cahier de recettes + E2E — voir § 1
- [ ] **C2.3.2** — Plan de correction des bogues — voir § 4
- [ ] **C2.4.1** — Manuels d'exploitation (déploiement, utilisation, mise à jour) — voir § 5

> **C2.2.4** (déploiement **progressif**) : décision assumée V1 — déploiement direct Cloud Run + invalidation CloudFront, **sans canary / bleu-vert**. À documenter explicitement dans le manuel de déploiement (§ 5) et le `README.md` racine pour ne pas laisser le critère apparemment vide.

### Bloc 3 — Coordonner et piloter

- [ ] **C3.1** ÉLIM — Méthodologie + planning + RACI — voir § 15
- [ ] **C3.2.1** ÉLIM — Outil de suivi + indicateurs + tableaux de bord — voir § 16
- [ ] **C3.2.2** — Cas d'arbitrage (ADR) — voir § 17
- [ ] **C3.3.1** — Pilotage de l'équipe (analyse réflexive si projet solo) — voir § 17
- [ ] **C3.3.2** — Évaluation des besoins en compétences — voir § 17
- [ ] **C3.4.1** — Comptes rendus d'activités — voir § 17

> **C3.4.2** ÉLIM (démonstration des fonctionnalités) : livrable **oral** devant jury — hors scope de cette carte.

### Bloc 4 — Maintenir l'application en condition opérationnelle

- [ ] **C4.1.1** — Processus de mise à jour des dépendances (fréquence, périmètre, type) — voir § 5 (manuel de mise à jour)
- [ ] **C4.1.2** ÉLIM — Système de supervision et d'alerte — voir § 7
- [ ] **C4.2.1** ÉLIM — Processus de consignation des anomalies — voir § 8
- [ ] **C4.2.2** — Création et déploiement d'un correctif via CI/CD — voir § 4 + § 6
- [ ] **C4.3.1** — Axes d'amélioration argumentés — voir § 19
- [ ] **C4.3.2** ÉLIM — Journal des versions (CHANGELOG + Releases) — voir § 6
- [ ] **C4.3.3** — Collaboration avec les équipes de support — voir § 20

---

## 1. Cahier de recettes + E2E Playwright

> **Objectif RNCP — C2.3.1 (ÉLIM)** : « le cahier de recettes reprend l'ensemble des fonctionnalités attendues ; les tests fonctionnels, structurels et de sécurité exécutés sont conformes au plan défini ». Matérialiser le cahier en **scénarios Playwright** versionnés dans le dépôt + un fichier Markdown lisible par le jury.

- [ ] Créer **`docs/v1-produit/cahier-recettes.md`** : tableau **Scénario → Préconditions → Étapes → Résultat attendu → Référence test E2E** ; couvrir au minimum :
  - Création de soirée (compte requis, redirection `/e/:slug` sans `?host=`)
  - Rejoindre via lien (invité avec pseudo, doublon de pseudo, soirée pleine ou expirée)
  - Inscription / connexion / déconnexion / mot de passe oublié (cf. `livraison-v1.md` § 3)
  - Proposer un film (recherche TMDB, doublon refusé, retrait par l'auteur)
  - Voter up/down + marquer « déjà vu » (un seul vote / participant ; agrégat exposé)
  - Configuration hôte (PATCH config, refus si soirée terminée)
  - Lancer la roue (réservé hôte, 0 film bloqué, 1 film direct, pondération si activée), clôture, lecture seule
  - Cas sécurité explicites : 401 sans session, rate limit login, CORS refusé, 404 JSON
- [ ] Installer **Playwright** dans `apps/web` (`pnpm add -D @playwright/test` + `npx playwright install`) ; `playwright.config.ts` (baseURL = front local, projet `chromium` + `mobile-safari` mobile-first)
- [ ] Créer **`apps/web/e2e/`** avec un fichier `.spec.ts` par scénario du cahier ; nommage stable pour réfèrencement croisé depuis `cahier-recettes.md`
- [ ] Ajouter le script **`e2e`** dans `apps/web/package.json` (absent à date) ; commande `pnpm --filter web e2e` + documenter dans `README.md` (lancement local : `pnpm --filter web dev` puis `pnpm --filter web e2e`)
- [ ] CI E2E : **aucun job Playwright n'existe à date** dans `.github/workflows/ci-cd.yml` (seul un commentaire d'en-tête mentionne « E2E Playwright : local uniquement »). Au choix : (a) garder strictement local + procédure manuelle documentée pour la soutenance ; (b) ajouter un workflow `workflow_dispatch` non bloquant rejouable à la demande
- [ ] Captures d'écran / vidéos archivées (`test-results/`) pour preuves de recette à présenter au jury

---

## 2. OWASP Top 10 — couverture explicite (CSP, CSRF, audit)

> **Objectif RNCP — C2.2.3 (ÉLIM, sécurité)** : « les mesures prises permettent de couvrir les 10 failles de sécurité principales décrites par l'OWASP ». Le jury attend un **mapping vérifiable** dans le code et la doc, pas une simple affirmation.

- [ ] Créer **`docs/v1-produit/owasp-top-10.md`** : tableau **Faille OWASP 2021 → Mesure dans le repo → Référence fichier:ligne (ou commit)** pour **les 10 catégories** (A01 Broken Access Control … A10 SSRF) — aucune ligne vide pour ne pas laisser de trou apparent au jury
- [ ] **A01 Broken Access Control — CSRF** : la stratégie cookie auth est **`SameSite=None` + `Secure=Always` en Production** (front et API sur origines distinctes — cf. `apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/MoviePickerCookieAuthenticationConfigurer.cs` lignes ~38-41), donc cookie « cross-site » au sens navigateur. Mitigations à consigner / vérifier : **CORS strict avec `AllowCredentials` et allowlist `ALLOWED_ORIGINS`** (déjà en place), **header custom requis sur les mutations** (ex. `X-Requested-With`) ou **token anti-CSRF** via `AddAntiforgery` sur les routes de mutation cookie-based
- [ ] **A02 Cryptographic Failures** : confirmer hash mot de passe (Argon2 / PBKDF2 .NET Identity ou équivalent) et durée Data Protection ; documenter
- [ ] **A03 Injection** : tracer l'usage **MongoDB.Driver** (paramétré, pas de string concat) + validation côté API (`ValidationErrorFilter`) ; un test d'intégration ciblé d'injection NoSQL refusée
- [ ] **A04 Insecure Design** : renvoyer dans `owasp-top-10.md` aux décisions de conception sécurité documentées :
  - **Rate limiting prod** par endpoint et par IP (`livraison-v1.md` § 21)
  - **Compte obligatoire pour création** + lien partagé sans `?host=` + actions hôte via session compte (`livraison-v1.md` § 16 *bis*) — design qui supprime la classe d'attaque « usurpation hôte par devinette de token »
  - **Garde-fous métier sur la config soirée** (refus PATCH si soirée terminée / roue lancée — `livraison-v1.md` § 5)
  - **Secrets via GCP Secret Manager**, jamais en repo (`livraison-v1.md` § 1 + § 21)
  - **Validation centralisée API** (`ValidationErrorFilter`) refusant les payloads malformés — pas de ligne vide
- [ ] **A05 Security Misconfiguration — CSP** : la CSP **existe déjà** côté API dans `apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/SecurityHeadersMiddleware.cs` lignes ~17-19 (`default-src 'none'; frame-ancestors 'none'; base-uri 'none'`). À faire : (a) **durcir / documenter** cette CSP API dans `owasp-top-10.md` ; (b) **ajouter** une CSP **dédiée au front SPA** servie via en-tête CloudFront (Function ou Lambda@Edge) **ou** balise `<meta http-equiv="Content-Security-Policy">` dans `apps/web/index.html`, avec `script-src` / `style-src` / `connect-src` (URL API) explicites
- [ ] **A06 Vulnerable & Outdated Components** : déjà couvert côté process — Dependabot mensuel (npm + GitHub Actions + NuGet) cf. `.github/dependabot.yml`, `pnpm audit --audit-level=high` en CI cf. job `lint`, `dotnet list package --vulnerable` (`livraison-v1.md` § 24), scan image Docker (`livraison-v1.md` § 25). Renvoi à consigner dans `owasp-top-10.md`
- [ ] **A07 Identification & Authentication** : rate limit login + lockout / cooldown documenté + reset password (cf. `livraison-v1.md` § 3)
- [ ] **A08 Software & Data Integrity Failures** : intégrité du pipeline — workflows GitHub Actions épinglés (versions explicites), images Docker taguées par SHA (cf. `ci-cd.yml`), Dependabot pour les actions, secret scanning (`livraison-v1.md` § 26). À consigner dans `owasp-top-10.md`
- [ ] **A09 Security Logging & Monitoring Failures** : logs structurés + correlation ID déjà OK (`StructuredHttpRequestLoggingMiddleware`, `CorrelationIdMiddleware`) ; lier vers § 7 (Sentry + alertes)
- [ ] **A10 SSRF** : valider que les appels TMDB/Posters n'acceptent pas d'URL utilisateur arbitraire (allowlist des hosts)

---

## 3. Accessibilité — référentiel + tests automatisés

> **Objectif RNCP — C2.2.3 (ÉLIM, a11y)** : « le référentiel d'accessibilité choisi est présenté et justifié (RGAA, OPQUAST, etc.) ; le prototype permet de répondre aux exigences ». Les libs `vitest-axe` et `@axe-core/react` sont déjà installées : il faut **choisir le référentiel** et **systématiser les tests**.

- [ ] Choisir explicitement **OPQUAST niveau 1** (pragmatique pour un MVP / V1) ou **RGAA 4.1 — niveau A minimum** ; consigner dans **`docs/v1-produit/accessibilite.md`** (référentiel retenu + critères couverts + critères reportés)
- [ ] Test `vitest-axe` **par page clé** dans `apps/web/src/` — convention de nommage **`*.a11y.test.tsx`** (un fichier dédié à côté des tests fonctionnels existants pour pouvoir les filtrer en CI ; les composants pages réels du repo s'appellent `Home.tsx`, `CreateEvent.tsx`, `EventDetail.tsx`, etc., **pas** `HomePage.tsx`) :
  - `app/pages/Home.a11y.test.tsx`
  - `features/events/pages/CreateEvent.a11y.test.tsx`
  - `features/events/pages/EventDetail.a11y.test.tsx`
  - `features/events/pages/MyEventsPage.a11y.test.tsx`
  - `features/auth/pages/LoginPage.a11y.test.tsx` / `RegisterPage.a11y.test.tsx`
  - `features/auth/pages/AccountPage.a11y.test.tsx`
- [ ] Activer **`@axe-core/react`** uniquement en dev (`if (import.meta.env.DEV)`) pour signaler les violations en console au runtime
- [ ] Ajouter un script `pnpm --filter web a11y` (filtre Vitest sur le pattern `**/*.a11y.test.tsx`) ; brancher dans `verify:local`
- [ ] Audit manuel rapide : navigation **clavier seule** sur les parcours critiques + contraste validé en mode sombre & clair (consigner dans `accessibilite.md`)

---

## 4. Plan de correction des bogues — process & traçabilité

> **Objectif RNCP — C2.3.2** : « élaborer un plan de correction des bogues à partir de l'analyse des anomalies et régressions détectées au cours de la recette ». Le critère est satisfait par un **process traçable dans le repo**, pas par un document rédigé en parallèle.

- [ ] Convention **labels GitHub** : `bug`, `regression`, `severity:critical|high|medium|low`, `area:web|api|infra` ; appliqués sur toute issue de recette
- [ ] Workflow recette → correctif documenté dans **`docs/v1-produit/plan-correction-bogues.md`** : étapes (consigner § 8 → trier → assigner → corriger en branche `fix/…` → PR liée à l'issue par `Fixes #n` → merge → vérification recette)
- [ ] Pour la soutenance : **3 anomalies réelles** identifiées en recette + leur PR de correction (preuve traçable dans l'historique GitHub)
- [ ] Mention dans `CHANGELOG.md` (cf. § 6) section `Fixed` à chaque release

---

## 5. Manuels d'exploitation (déploiement, utilisation, mise à jour)

> **Objectif RNCP — C2.4.1** : « rédiger la documentation technique d'exploitation détaillant le fonctionnement (manuel de déploiement, d'utilisation, de mise à jour) ». À ancrer dans le repo, pas dans un PDF externe.

- [ ] **Manuel de déploiement** — pointeur ou contenu dans [`deploiement-secrets-ci.md`](deploiement-secrets-ci.md) (déjà existant) : prérequis cloud (GCP, AWS, MongoDB Atlas, TMDB), variables/secrets, étapes premier déploiement, rollback ; **mention explicite** du choix « déploiement direct sans canary / bleu-vert » (cf. note C2.2.4 en couverture)
- [ ] **Manuel d'utilisation** — créer **`docs/v1-produit/manuel-utilisation.md`** : parcours hôte (créer / config / lancer roue / clôturer), parcours invité (rejoindre / proposer / voter / déjà vu), captures d'écran clés
- [ ] **Manuel de mise à jour** — créer **`docs/v1-produit/manuel-mise-a-jour.md`** : décrire **explicitement le processus de mise à jour des dépendances** (couvre **C4.1.1** — exigence de la grille : « **fréquence**, **périmètre logiciel**, **type — automatique / manuel** »), à savoir : Dependabot **mensuel** sur npm + GitHub Actions + NuGet (cf. `.github/dependabot.yml`), `pnpm audit --audit-level=high` à chaque CI (cf. job `lint` dans `.github/workflows/ci-cd.yml`), validation PR humaine avant merge, vérification CI verte, déploiement automatique sur `master`. Compléter avec : process release (tag + Release GitHub via § 6), process correctif urgent (hotfix → release patch)
- [ ] Lien explicite vers ces 3 manuels depuis le **`README.md`** racine (section « Documentation »)

---

## 6. Journal des versions — `CHANGELOG.md` + GitHub Releases

> **Objectif RNCP — C4.3.2 (ÉLIM)** : « le journal de version contient les différentes améliorations amenées par cette version ; les correctifs déployés sont documentés ». Aucun `CHANGELOG*` ni tag de release n'existe à date dans le repo.

- [ ] Créer **`CHANGELOG.md`** racine au format **Keep a Changelog** + versionnage **SemVer** (`Added` / `Changed` / `Fixed` / `Security` / `Removed`) ; entrée initiale `[0.1.0] - MVP` rétrospective puis `[0.2.0] - V1`
- [ ] **Tags Git** sur `master` à chaque release (`v0.2.0`, etc.) + **GitHub Release** associée (titre = version, body = section CHANGELOG correspondante)
- [ ] **Automatisation** (recommandé) : ajouter [Release Please](https://github.com/googleapis/release-please) en mode **mono-repo racine** (`.release-please-manifest.json` + `release-please-config.json` à la racine, **pas** un release par app) — adapté car aucun package npm n'est publié, on versionne le projet entier ; sinon procédure manuelle documentée dans `manuel-mise-a-jour.md` (§ 5). **Changesets écarté** : pertinent surtout pour plusieurs packages publiables, pas le cas ici.
- [ ] Convention **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) à inscrire dans `CONTRIBUTING.md` ou en tête de `README.md`
- [ ] Job CI ou hook local (**commitlint** optionnel) pour vérifier le format des messages en PR

---

## 7. Supervision applicative — Sentry + uptime + alertes

> **Objectif RNCP — C4.1.2 (ÉLIM)** : « système de supervision adapté ; sondes mises en place explicitées ; modalité des signalements configurée ; surveille la disponibilité ». Logs structurés + métriques Cloud Run par défaut ne suffisent pas : il faut **sondes actives** + **alertes**.

- [ ] **Sentry** (ou **GlitchTip** self-hosted, OSS) — projet front + projet API .NET
  - Front : `pnpm add @sentry/react` + init dans `apps/web/src/main.tsx` ; DSN par env (`VITE_SENTRY_DSN`) ; `tracesSampleRate` raisonnable (0.1 prod) ; release liée au tag (§ 6)
  - API .NET : `dotnet add package Sentry.AspNetCore` (vérifier la dernière version stable compatible **.NET 10** au moment du `dotnet add`) + `builder.WebHost.UseSentry()` + DSN via GCP Secret Manager (`SENTRY_DSN`) ; intégration **logging** + **performance**
  - **PII** : `SendDefaultPii = false` ; pas d'email en clair dans les breadcrumbs
- [ ] **Uptime check** GCP Cloud Monitoring : ping `GET /health` toutes les 60 s depuis **1 région** (suffisant pour un projet étudiant ; le critère grille demande « sondes explicitées + modalité de signalement », pas un dispositif multi-région) ; **alert policy** sur 2 échecs consécutifs → email / canal Discord
- [ ] **Alert policy** complémentaires :
  - Taux d'erreur 5xx Cloud Run > 1 % sur 5 min
  - Latence p95 Cloud Run > 2 s sur 5 min
  - CloudFront 5xx rate > 1 %
- [ ] **Dashboard** Cloud Monitoring + capture d'écran archivée dans `docs/v1-produit/supervision.md` (sondes, indicateurs, modalités d'alerte) — la doc satisfait littéralement le critère « le système de supervision est explicité »
- [ ] Test de bout en bout : provoquer une exception en prod-like (staging local), vérifier remontée Sentry + alerte uptime déclenchée (capture pour soutenance)

---

## 8. Processus de consignation des anomalies — templates GitHub

> **Objectif RNCP — C4.2.1 (ÉLIM)** : « processus de collecte structuré et adapté ; fiche de consignation contient les informations permettant de reproduire le bogue ». Outil officiel de collecte pour ce projet = **GitHub Issues**.

- [ ] Créer **`.github/ISSUE_TEMPLATE/bug_report.yml`** (form structuré) avec champs obligatoires :
  - Contexte (URL, navigateur, OS, version app — récupérable depuis Sentry)
  - Étapes pour reproduire
  - Comportement attendu vs observé
  - Captures d'écran ou logs (lien Sentry si applicable)
  - Sévérité (`critical|high|medium|low`)
- [ ] Créer **`.github/ISSUE_TEMPLATE/feature_request.yml`** (form structuré : besoin user, valeur, alternatives envisagées)
- [ ] Créer **`.github/ISSUE_TEMPLATE/config.yml`** : `blank_issues_enabled: false` pour forcer l'usage des templates
- [ ] Créer **`.github/PULL_REQUEST_TEMPLATE.md`** : checklist (tests verts, doc à jour, CHANGELOG, lien issue `Fixes #n`)
- [ ] Documenter le process complet collecte → consignation → tri → correction → vérification dans **`docs/v1-produit/processus-anomalies.md`** (lié à § 4 plan de correction)
- [ ] Pour la soutenance : exemple **réel** d'anomalie consignée via le template + sa résolution (lien issue + PR + entrée CHANGELOG)

---

## 9. Cartographie des parties prenantes + analyse de la demande

> **Objectifs RNCP — C1.1.1 (ÉLIM)** : « cartographie permettant d'identifier les acteurs (développeurs, architectes, administrateurs, clients, acteurs externes), leurs rôles et niveaux d'implication ; caractéristiques des futurs utilisateurs détaillées ». **C1.1.2** (non ÉLIM) : « analyse structurée de la demande, objectifs, enjeux, problématique, pistes de solutions ».

- [ ] Créer **`docs/v1-produit/cadrage/01-parties-prenantes.md`** :
  - Tableau **acteur → rôle → niveau d'implication** : commanditaire (Ynov / formateur), développeur (candidat), architecte (candidat), administrateur (candidat — Cloud Run / S3), utilisateurs finaux (créateurs de soirée, invités), acteurs externes (TMDB, GCP, AWS, MongoDB Atlas, Sentry, Dependabot)
  - **Personas utilisateurs** : « hôte qui organise une soirée ciné », « invité ponctuel rejoignant via lien », « groupe d'amis récurrent ». Caractéristiques : âge, équipement (mobile-first, cf. [`../spec.md`](../spec.md) § 9), contexte d'usage, attentes
  - Pour chaque persona : **scénario d'usage** clé en 3-4 lignes
- [ ] Créer **`docs/v1-produit/cadrage/02-analyse-demande.md`** (couvre C1.1.2) :
  - **Problématique** : « comment choisir un film à plusieurs sans 30 min de débat improductif ? »
  - **Objectifs** : choix collectif rapide, équitable, ludique ; bas friction (lien partagé sans inscription pour les invités)
  - **Enjeux** : adoption (mobile-first, partage par messagerie), engagement (animation roue), conformité (RGPD basique, accessibilité)
  - **État de l'existant** : alternatives (MUBI, Letterboxd watchlist, sondages WhatsApp, Watcha) + leurs limites
  - **Pistes de solutions** retenues (vote pondéré + roue, marqueur « déjà vu » neutre, watch providers TMDB) et écartées (deep links streaming → backlog)

---

## 9 *bis*. Argumentaire client — synthèse des décisions et axes de solutions

> **Objectif RNCP — C1.6 (ÉLIM)** : « proposer les décisions et axes de solutions préconisées auprès du client en structurant son discours, en développant un argumentaire adapté afin d'obtenir son adhésion et sa validation ». Le critère est **majoritairement oral** (vocabulaire, objections, supports adaptés à l'auditoire), mais un **support écrit versionné** rend les choix de cadrage **traçables** pour le jury et sert de base à la restitution orale.

- [ ] Créer **`docs/v1-produit/cadrage/11-argumentaire-client.md`** : synthèse 2-3 pages **structurée** :
  - **Problématique client** rappelée (renvoi § 9 analyse demande)
  - **Décisions structurantes** (3-5 max) avec pour chacune :
    - Contexte / contrainte
    - Options envisagées (renvois § 11 étude comparative)
    - Décision retenue
    - Argumentaire condensé (1-2 phrases adaptées à un commanditaire **non-tech**)
    - Risques résiduels et plan de mitigation (renvois § 13)
  - **Axes de solutions techniques** retenus (architecture C4 § 14, stack § 11, hébergement § 11, sécurité § 2)
  - **Budget prévisionnel** consolidé (renvoi § 14)
  - **Roadmap par version** : MVP → V1 → V1.1 (renvois `../roadmap-product.md` + `../roadmap-tech.md`)
- [ ] Préparer un **support de présentation** (slides, démo, ou page Markdown formatée pour projection) destiné à la **restitution orale** — **hors scope strict du dépôt** mais utile à mentionner ici pour boucler le critère
- [ ] **Vocabulaire** : adapté à l'auditoire (vulgarisation des termes techniques) ; **objections** anticipées (sécurité, coûts, délais) avec réponses préparées dans le document écrit

> **Note** : la **démonstration produit** distincte est portée par C3.4.2 (oral, hors scope dépôt).

---

## 10. Faisabilité technique + diagnostic des infrastructures

> **Objectif RNCP — C1.2.2 (ÉLIM)** : « démarche d'audit documentée et argumentée ; étude technique (langages, BDD, archi, technos, applications existantes) ; identification des contraintes techniques et financières ; avis critique sur la faisabilité ».

- [ ] Créer **`docs/v1-produit/cadrage/03-faisabilite-technique.md`** :
  - **Démarche d'audit** : grille d'analyse (besoins fonctionnels → exigences non fonctionnelles → contraintes → ressources → faisabilité)
  - **Étude technique de l'existant** :
    - Langages disponibles dans le cursus / parc Ynov (TS, C#, Node, Python)
    - Bases de données candidates (PostgreSQL, MongoDB, SQLite)
    - Hébergeurs candidats (Vercel, Netlify, AWS, GCP, OVH, Scaleway)
    - Outils de monitoring (Sentry, Datadog, Cloud Monitoring, GlitchTip)
    - APIs films (TMDB, OMDB, JustWatch)
  - **Contraintes** :
    - Techniques : SPA + API REST + DB ; mobile-first ; HTTPS obligatoire ; CORS strict
    - Financières : budget étudiant ≤ 50 €/mois (free tiers prioritaires)
    - Délais : aligné cursus Ynov (semestre/année)
    - Humaines : projet **solo** — implique automatisation maximale (CI/CD, Dependabot)
  - **Avis critique de faisabilité** : feasible avec stack retenue ; risques principaux (TMDB rate limiting, coût Cloud Run en cas de pic, complexité OG dynamiques) → atténués par cache + free tier + OG statiques fallback

---

## 11. Étude comparative des solutions techniques

> **Objectif RNCP — C1.3.2 (ÉLIM)** : « analyse comparative des solutions techniques ; choix justifiés et adaptés ; avantages / inconvénients en termes de sécurité, environnements systèmes, réseaux, accessibilité, impact environnemental ».

- [ ] Créer **`docs/v1-produit/cadrage/04-etude-comparative.md`** : pour **chaque brique majeure**, tableau **option A / option B / option C** avec colonnes **Sécurité | Environnement système | Réseau | Accessibilité | Impact environnemental | Coût | Décision**. Briques à comparer au minimum :
  - **Front framework** : React + Vite **vs** Next.js (SSR) **vs** SvelteKit
  - **Back framework** : ASP.NET Core (.NET 10) **vs** Node + Express **vs** Go + Gin
  - **Base de données** : MongoDB **vs** PostgreSQL **vs** SQLite
  - **Hébergement API** : GCP Cloud Run **vs** AWS ECS Fargate **vs** Scaleway Serverless
  - **Hébergement front** : AWS S3 + CloudFront **vs** Vercel **vs** Netlify
  - **Auth** : cookie sessions stateful **vs** JWT stateless **vs** OAuth provider (Auth0, Clerk)
  - **API films** : TMDB **vs** OMDB **vs** JustWatch
- [ ] Conclusion : **stack retenue** + **justification** ancrée sur les critères de la grille ; mention de l'**impact environnemental** (Cloud Run idle scale-to-zero vs serveur 24/7, cache posters réduit appels TMDB)

---

## 12. Cahier des charges fonctionnel + estimation de charge (J/H)

> **Objectif RNCP — C1.4.1 (ÉLIM)** : « fonctions recensées, caractérisées, ordonnées et hiérarchisées (principales, secondaires, complémentaires) ; charge de travail exprimée en jours-homme ; outil d'analyse fonctionnelle explicité ; expérience utilisateur prise en compte ».

- [ ] Créer **`docs/v1-produit/cadrage/05-charge-jh.md`** :
  - **Outil d'analyse fonctionnelle** : choix justifié (par ex. **MoSCoW** + diagramme de fonctionnalités type **bête à cornes / pieuvre** simplifié) — référencer la convention déjà en place dans le skill `mp-brainstorm-to-features`
  - **Diagramme de fonctionnalités** : visuel (Mermaid `mindmap` ou `flowchart`) listant les features V1 hiérarchisées en **principales** (création soirée, vote, roue, compte), **secondaires** (déjà vu, watch providers, QR code, OG dynamiques), **complémentaires** (i18n EN, mode sombre persisté, rappels in-app)
  - **Estimation J/H** : tableau feature × estimation (en jours-homme) — granularité section de [`livraison-v1.md`](livraison-v1.md) § 1-22 (≈ 22 lots) → total V1 ; idem pour MVP en rétrospectif
  - **Couverture technique des besoins fonctionnels** : argumentée (chaque feature → endpoint + écran + tests prévus)
  - **Expérience utilisateur** : référence à [`../spec.md`](../spec.md) § 9 (Mobile first) et § 8 (Interface et confort)

---

## 13. SWOT + cartographie des risques + veille

> **Objectifs RNCP** :
> - **C1.2.1** : « cartographie SWOT (impact environnemental, adhérences, sécurité, points de vigilance, opportunités) »
> - **C1.2.3** : « cartographie des risques techniques et fonctionnels priorisés + référentiel d'évaluation + indicateurs de contrôle »
> - **C1.3.1** : « méthodologie de recherche, sources, outils de veille, classification des évolutions par impact métier et environnemental »

- [ ] Créer **`docs/v1-produit/cadrage/06-swot.md`** :
  - **SWOT** : Forces (stack moderne, mobile-first, monorepo automatisé) / Faiblesses (équipe solo, pas de canary, pas d'analytics V1) / Opportunités (free tiers cloud, écosystème .NET 10, communauté React) / Menaces (TMDB rate limiting / changement CGU, dépendance Cloud providers, OWASP nouvelles failles)
  - **Adhérences projet** : TMDB, GCP, AWS, MongoDB Atlas, Sentry, Dependabot, GitHub Actions
  - **Impact environnemental** : argumenté (scale-to-zero, cache, image Docker minimale, pas de polling agressif)
  - **Préconisations sécurité** : renvoi vers § 2 (OWASP) + `mp-guardrails`
  - **Points de vigilance** : reset password (anti-énumération), cookie cross-site (CSRF), TMDB clé serveur uniquement
- [ ] Créer **`docs/v1-produit/cadrage/07-risques.md`** :
  - **Référentiel d'évaluation** : grille **Probabilité × Impact** (1-3 × 1-3 = score 1-9) + **criticité** (faible / moyenne / élevée)
  - **Cartographie risques** : techniques (TMDB indispo, Mongo Atlas down, fuite secret, CVE critique) + fonctionnels (abandon utilisateur, mauvaise UX mobile, lien partagé indexé par moteur de recherche)
  - **Indicateurs de contrôle** : taux d'erreur 5xx (Sentry § 7), uptime check GCP (§ 7), CVE high/critical (CI § 24-25), `pnpm audit --audit-level=high`
- [ ] Créer **`docs/v1-produit/cadrage/08-veille.md`** :
  - **Méthodologie** : flux RSS / newsletter / GitHub releases / blogs officiels
  - **Sources** :
    - Tech : [.NET blog](https://devblogs.microsoft.com/dotnet/), [React blog](https://react.dev/blog), [TanStack Discord/blog](https://tanstack.com/), [MongoDB blog](https://www.mongodb.com/blog), [Vite changelog](https://vite.dev/)
    - Sécurité : [OWASP Top 10](https://owasp.org/Top10/), [GitHub Security advisories](https://github.com/advisories), [CVE NVD](https://nvd.nist.gov/), [HaveIBeenPwned](https://haveibeenpwned.com/)
    - Réglementaire : [CNIL actualités](https://www.cnil.fr/fr/actualites), [RGAA / DINUM](https://accessibilite.numerique.gouv.fr/), [eco-conception GreenIT](https://www.greenit.fr/)
  - **Outils** : Dependabot (déjà actif), GitHub Watch sur dépôts clés, agrégateur RSS (Feedly / FreshRSS)
  - **Classification** : tableau **évolution → impact métier → impact environnemental → action** (ex. .NET 10 LTS → migration sereine, OWASP 2025 → réviser § 2)

---

## 14. Modélisation architecture + budget prévisionnel

> **Objectifs RNCP** :
> - **C1.4.2** (non ÉLIM) : « estimation des coûts cohérente avec la charge ; budget prévisionnel (licences, dev, infrastructures) ; architecture schématisée et légendée ; choix méthodo de modélisation justifié (UML, Merise) ; architecture maintenable, sécurisée, extensible ; impact environnemental pris en compte »
> - **C1.5** (non ÉLIM) : « modéliser une architecture logicielle à partir du scénario élaboré, respectant les spécifications fonctionnelles, exigences sécurité, techniques visant à réduire l'impact écologique ; faciliter dev / évolution / déploiement / maintenance »

- [ ] Créer **`docs/v1-produit/cadrage/09-architecture.md`** :
  - **Méthode de modélisation** : choix **C4 Model** (Context → Container → Component → Code) justifié — plus lisible et moderne qu'UML complet pour un projet web ; complément avec **diagramme de séquence** UML sur 2-3 parcours clés (création soirée + lancement roue)
  - **Diagramme C4 niveau 1 (Context)** : utilisateur → Movie Picker → TMDB / Sentry / Email transactionnel
  - **Diagramme C4 niveau 2 (Container)** : navigateur (SPA React) → CloudFront → S3 ; SPA ↔ API .NET (Cloud Run) ↔ MongoDB Atlas + TMDB + Email + Sentry + Cloud Monitoring
  - **Diagramme C4 niveau 3 (Component)** sur API .NET : `Endpoints (Minimal API)` → `Handlers (CQRS-light)` → `Repositories Mongo` ; Middleware sécurité (CORS, RateLimit, CSP, Antiforgery, SecurityHeaders)
  - **Diagrammes de séquence UML** :
    - Création soirée : utilisateur connecté → SPA → POST `/api/v1/events` → DB → réponse + redirection `/e/:slug`
    - Lancement roue : hôte → POST `/api/v1/events/{slug}/wheel` → tirage atomique → broadcast (polling) → animation
  - **Légendes** : signification couleurs / formes / flèches explicitée
  - **Maintenabilité / extensibilité / sécurité** : argumenté (préfixe `/api/v1` versionné, validation centralisée, secrets externes, rate limit configurables, schéma Mongo extensible — cf. [`../roadmap-tech.md`](../roadmap-tech.md))
  - **Impact écologique** : Cloud Run scale-to-zero, cache posters (réduction appels TMDB), CloudFront edge cache, image Docker `mcr.microsoft.com/dotnet/aspnet:10.0` (cf. `apps/api-dotnet/MoviePicker.Api/Dockerfile:20`) — **piste d'optimisation** : migration vers `aspnet:10.0-alpine` ou `aspnet:10.0-noble-chiseled` pour réduire la surface d'attaque et l'empreinte image (à arbitrer selon compatibilité ICU / globalisation et stabilité runtime)
- [ ] Créer **`docs/v1-produit/cadrage/10-budget.md`** :
  - **Estimation coût** : charge V1 (ex. 30 J/H × TJM junior 350 € HT = 10 500 € HT — si simulé en agence)
  - **Postes de coûts récurrents (mensuel, en prod réelle)** :
    - GCP Cloud Run (free tier ≈ 2 M req/mois → ~0 €)
    - GCP Artifact Registry (~0,10 $/Go)
    - GCP Secret Manager (free tier 6 secrets)
    - GCP Cloud Monitoring + uptime check (free tier OK)
    - AWS S3 + CloudFront (free tier 12 mois, puis ~1-5 €)
    - MongoDB Atlas free tier M0 (gratuit ; M2 ~9 $/mois si dépassement)
    - Domaine `.fr` (~10 €/an)
    - Sentry Developer free (5k events/mois)
    - SendGrid / Mailgun free tier (~100 emails/jour) ou AWS SES (~0,10 $ / 1000 emails)
    - **Total estimé en prod réelle** : ~5-15 €/mois pour un trafic projet étudiant
  - **Postes one-shot** : nom de domaine, certificat SSL (gratuit Let's Encrypt / CloudFront), templates email
  - **Budget prévisionnel** : tableau récapitulatif + colonne « hypothèses »

---

## 15. Planification — méthodologie + planning + RACI

> **Objectif RNCP — C3.1 (ÉLIM)** : « méthodologie de gestion de projet justifiée (Agile, Scrum, Kanban, V) ; outil de planification justifié (Gantt, PERT, rétroplanning) ; planning découpé en phases / tâches / lots ; tâches assignées via RACI / RASCI tenant compte des personnes en situation de handicap ; points de vigilance soulignés ».

- [ ] Créer **`docs/v1-produit/pilotage/01-planification.md`** :
  - **Méthodologie retenue** : **Kanban léger** (projet solo, pas de sprints fixes) + **revues hebdomadaires** ; justification : flexibilité, pas de cérémonies lourdes inadaptées au solo, flux continu cohérent avec la roadmap par version (cf. [`../roadmap-product.md`](../roadmap-product.md))
  - **Outil de planification** : combinaison **GitHub Projects** (Kanban des tickets) + **diagramme de Gantt Mermaid** dans ce fichier (vue d'ensemble par phase) — justifié : versionné dans le repo, pas de SaaS supplémentaire à gérer
  - **Découpage en phases** : MVP → Migration .NET → V1 (sous-phases auth → config → enrichissements → OG → i18n → sécurité CI → clôture RNCP) → V1.1
  - **Diagramme de Gantt** (Mermaid) :
    ```mermaid
    gantt
      dateFormat YYYY-MM-DD
      title Movie Picker — planning V1
      section MVP
      ...
      section Migration .NET
      ...
      section V1 produit
      ...
      section Clôture RNCP (cette carte)
      ...
    ```
  - **Matrice RACI** : tableau **tâche → R / A / C / I** ; en projet solo, tous les rôles convergent sur le candidat **mais** identifier les **acteurs externes consultés** (formateur Ynov = consulté ; mainteneurs OSS = informés via dépendances ; tests utilisateurs = consultés ponctuellement)
  - **Prise en compte du handicap** : critères d'accessibilité du référentiel choisi (cf. § 3) appliqués **dès la conception** (clavier, lecteurs d'écran, contraste) — dimension produit ; côté équipe, mention que les outils utilisés (GitHub, VS Code, Cursor) sont accessibles aux personnes en situation de handicap (lecteurs d'écran, raccourcis clavier)
  - **Points de vigilance** : dépendance TMDB (clé + quotas), reset password (transport email), CSP front (à durcir), déploiement progressif assumé absent (cf. couverture C2.2.4)

---

## 16. Pilotage — outil de suivi + indicateurs + tableaux de bord

> **Objectif RNCP — C3.2.1 (ÉLIM)** : « outil de suivi en adéquation avec le projet et la méthodologie ; indicateurs mesurables et quantifiables (délais, coûts, avancement) ; tableaux de bord intégrant avancement, coûts, délais, risques, RH ».

- [ ] Créer **`docs/v1-produit/pilotage/02-suivi-indicateurs.md`** :
  - **Outil de suivi** : **GitHub Projects** (Kanban + vues filtrées) en cohérence avec la méthodologie Kanban (§ 15) ; lien vers la board (capture si non publique)
  - **Indicateurs d'avancement** :
    - % de cases cochées par section dans `livraison-v1.md` et la présente carte (script ou capture périodique)
    - Nombre d'items V1 fermés / total (catalog [`../roadmap-product.md`](../roadmap-product.md) § V1)
    - Nombre de PR mergées / semaine
    - Couverture de tests (Coverlet API + Vitest front, exposée par CI)
  - **Indicateurs de délai** :
    - Date cible V1 vs date réelle (Gantt § 15)
    - Lead time moyen issue → PR mergée
  - **Indicateurs de coût** :
    - Coût cloud mensuel réel (capture facture GCP + AWS) vs estimation § 14
    - Temps passé (si suivi)
  - **Indicateurs de risque** :
    - Vulnérabilités ouvertes (Dependabot + `pnpm audit` + `dotnet list package --vulnerable` + scan image)
    - CI rouge / verte (taux de stabilité)
  - **Indicateurs RH** : projet solo → indicateur de **soutenabilité** (heures / semaine, charge ressentie) si suivi
  - **Tableau de bord récapitulatif** : capture / export hebdomadaire dans le fichier (au moins 3 snapshots sur la durée du projet pour démontrer le suivi)

---

## 17. ADR + comptes rendus + analyse réflexive (pilotage solo)

> **Objectifs RNCP** :
> - **C3.2.2** (non ÉLIM) : « problématique d'arbitrage exposée avec conséquences ; options détaillées ; décision argumentée »
> - **C3.3.1** / **C3.3.2** (non ÉLIM, projet solo) : « pilotage équipe » et « besoins en compétences » → adapter en **analyse réflexive** sur le pilotage de soi et la montée en compétences personnelle
> - **C3.4.1** (non ÉLIM) : « comptes rendus clairs et ordonnés ; points de validation organisés ; indicateurs de satisfaction définis »

- [ ] Créer **`docs/adr/`** avec template ADR (Markdown light, format Michael Nygard) et au minimum **3 ADR** documentant les arbitrages majeurs déjà pris :
  - `0001-choix-stack-back-dotnet.md` : Node/Express → ASP.NET Core .NET 10 (contexte, options, conséquences)
  - `0002-cookie-sessions-vs-jwt.md` : sessions cookie HttpOnly retenues vs JWT
  - `0003-deploiement-direct-vs-canary.md` : déploiement direct Cloud Run, canary écarté pour V1 (cf. C2.2.4)
  - Bonus : `0004-release-please-vs-changesets.md`, `0005-mongodb-vs-postgres.md`
- [ ] Créer **`docs/v1-produit/pilotage/03-analyse-reflexive.md`** (couvre C3.3.1 / C3.3.2 adapté au solo) :
  - **Style de pilotage** : autonome avec **revues régulières** (PR self-review + agent `mp-code-reviewer`)
  - **Grille d'évaluation des compétences** : tableau **compétence → niveau initial → niveau visé → niveau atteint** (.NET, MongoDB, Cloud Run, Sentry, Playwright, OWASP, RGAA / OPQUAST)
  - **Plan de développement personnel** : formations / ressources consultées (docs officielles, blogs identifiés § 13, courses en ligne le cas échéant)
  - **Outils de communication** : agents Cursor (`mp-po`, `mp-code-reviewer`, `mp-pre-push`) explicités comme « équipe virtuelle » — choix d'outils argumenté
  - **Prise en compte du handicap** dans l'environnement de travail (raccourcis clavier, contraste IDE, lecteurs d'écran compatibles)
- [ ] Créer **`docs/v1-produit/pilotage/04-comptes-rendus/`** : un fichier par revue (au moins **3 comptes rendus** sur la durée du projet) :
  - Format court : avancement, blocages, décisions, prochaines étapes
  - **Indicateurs de satisfaction** : auto-évaluation (sur 5) + écart vs objectif initial ; le cas échéant, retours formateur Ynov

---

## 18. Protocole CI/CD formalisé (intégration et déploiement continus)

> **Objectifs RNCP** :
> - **C2.1.1** (non ÉLIM) : « protocole de déploiement continu explicité ; environnement de développement détaillé ; outils mobilisés (compilateur, serveur d'application, gestion de sources) ; séquences de déploiement ; critères qualité / performance »
> - **C2.1.2** (non ÉLIM) : « protocole d'intégration continue explicité ; séquences d'intégration définies »

> Le code et les workflows existent (`.github/workflows/ci-cd.yml`, `scripts/verify-local.cjs`). Ce qui manque : **un schéma unique** lisible par le jury qui consolide ces éléments éparpillés.

- [ ] Créer **`docs/v1-produit/protocole-ci-cd.md`** :
  - **Environnement de développement** : éditeurs (Cursor / VS Code), runtimes (Node 22 LTS, .NET 10 SDK, pnpm), gestionnaires de versions (`pnpm`, `dotnet`), Docker Desktop, MongoDB local (Compass / docker compose)
  - **Outils mobilisés** :
    - Gestion de sources : **Git** + **GitHub** (branche `master`, PR review, protection branche)
    - Build front : **Vite** + **TypeScript strict**
    - Build API : **.NET SDK 10** (`dotnet build` / `dotnet publish`)
    - Compilation image : **Docker** (image `mcr.microsoft.com/dotnet/aspnet:10.0`)
    - Serveur d'application prod : **GCP Cloud Run** (front : **AWS S3 + CloudFront**)
  - **Protocole d'intégration continue** (C2.1.2) — séquence sur chaque PR + push `master` (état **cible V1 close** ; les étapes 6 et 7 sont conditionnées au livrable des § 23-25 de [`livraison-v1.md`](livraison-v1.md), à la date de rédaction encore non livrées) :
    1. `pnpm install` (cache pnpm) — **livré**
    2. `pnpm lint` (ESLint + Prettier check) + `pnpm audit --audit-level=high` — **livré**
    3. `dotnet restore` + `dotnet format --verify-no-changes` + `dotnet list package --vulnerable` (cf. `livraison-v1.md` § 24) — **partiel** (vulnerable scan = cible § 24)
    4. `pnpm build` (front) + `dotnet build` (API) + export OpenAPI — **livré**
    5. `pnpm test` (Vitest + RTL + axe) + `dotnet test` (xUnit + Coverlet + OpenApiContractTests) — **livré**
    6. **Sonar** quality gate (cf. `livraison-v1.md` § 23) — **cible** (non livré à date)
    7. `docker build` API + scan CVE Trivy/Grype (cf. `livraison-v1.md` § 25) — **partiel** (build livré, scan = cible § 25)
  - **Protocole de déploiement continu** (C2.1.1) — séquence sur push `master` après CI verte :
    1. `docker push` vers GCP Artifact Registry (tag SHA)
    2. `gcloud run deploy` sur Cloud Run (région `europe-west1`, secrets via Secret Manager)
    3. Build front prod + sync `aws s3 sync apps/web/dist s3://...` + invalidation CloudFront `/index.html`
    4. **Smoke test** post-déploiement : `GET /health` API + `GET /` front (codes 200 attendus)
  - **Critères de qualité et performance** :
    - Couverture tests minimale (à fixer, ex. 70 % API)
    - Sonar gate verte (cf. `livraison-v1.md` § 23)
    - 0 vulnérabilité high/critical (npm + NuGet + image Docker)
    - Lighthouse front (cf. [`../roadmap-tech.md`](../roadmap-tech.md) § MVP « avant V1 ») non bloquant mais surveillé
  - **Schéma unique** : Mermaid `flowchart` PR → CI → merge → CD → prod, lisible en une page
  - Lien explicite depuis `README.md` racine

---

## 19. Axes d'amélioration argumentés (post-V1)

> **Objectif RNCP — C4.3.1** (non ÉLIM) : « recommandations argumentées d'amélioration permettant d'évaluer les gains (coût, délai) ; recommandations réalistes et réalisables ; renforcent l'attractivité ».

- [ ] Créer **`docs/v1-produit/axes-amelioration.md`** :
  - **Source d'analyse** : indicateurs Sentry (§ 7), uptime check, retours utilisateurs (templates GitHub § 8), backlog produit ([`../roadmap-product.md`](../roadmap-product.md) § Backlog)
  - **Recommandations** (5 à 10 items) chacune avec **gain attendu** + **coût estimé (J/H)** + **délai** + **réaliste oui/non** :
    - Ex. « Push web rappels » : gain rétention +X %, coût ~5 J/H, délai 1 sprint, dépend consentement RGPD
    - Ex. « Cercles d'amis » : gain rétention forte, coût ~10 J/H, délai 2 sprints, levier produit majeur
    - Ex. « Canary deployment » : gain stabilité prod, coût ~3 J/H, délai 1 sprint, recommandé après premier incident utilisateur
  - Lien croisé avec **Backlog produit** ([`../roadmap-product.md`](../roadmap-product.md)) et **Backlog tech** ([`../roadmap-tech.md`](../roadmap-tech.md)) — éviter de dupliquer, **prioriser** ici

---

## 20. Exemple de collaboration avec le support

> **Objectif RNCP — C4.3.3** (non ÉLIM) : « contexte du retour client + explication du problème ; résolution apportée ; explication de la contribution des différentes parties prenantes ».

- [ ] Créer **`docs/v1-produit/collaboration-support.md`** :
  - **Cas concret** : exemple **réel** d'anomalie remontée par un utilisateur de test (ou un évaluateur Ynov) via le template § 8
  - Sections :
    - **Contexte** : qui (persona), quand, sur quel parcours, navigateur/OS
    - **Problème** : symptôme observé, comportement attendu, impact business
    - **Investigation** : reproduction, hypothèses, données Sentry / logs
    - **Résolution** : correctif (lien PR), tests ajoutés, déploiement
    - **Contribution des parties prenantes** : utilisateur (consignation détaillée), candidat développeur (analyse + correctif), formateur Ynov (validation), Sentry (alerting)
  - Inclure liens : issue GitHub, PR, entrée CHANGELOG, capture Sentry — **traçabilité complète**

---

## Synthèse — priorité d'attaque

> Ordre conseillé pour ne pas laisser de critère ÉLIM vide au jury.

1. **P0 ÉLIM Bloc 1** : § 9, § 10, § 11, § 12 — sans ces 4, le bloc cadrage est invalidable
2. **P0 ÉLIM Bloc 3** : § 15, § 16
3. **P0 ÉLIM Bloc 2 / 4** : § 1, § 2, § 3, § 6, § 7, § 8 (déjà priorisés dans `livraison-v1.md` initialement)
4. **P1 non-ÉLIM cadrage** : § 13, § 14
5. **P1 non-ÉLIM pilotage** : § 17
6. **P1 compléments** : § 4, § 5, § 18, § 19, § 20

> **Note de cohérence** : cette carte ne duplique **pas** le code prévu dans `livraison-v1.md` (auth, watch providers, mot de passe oublié, sécurité CI § 23-26, etc.). Tous les renvois `livraison-v1.md § X` sont là pour ancrer les preuves côté code, pas pour dédoubler le travail.
