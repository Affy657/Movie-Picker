# Plan détaillé — Dossier Bloc 2 (RNCP 39583)

> **Statut : PLAN à valider.** Ce fichier décrit la structure et le contenu prévus du dossier ; il ne contient pas encore la rédaction. Une fois validé, il sera développé en `dossier-bloc-2.md` puis exporté en `dossier-bloc-2.pdf`.

## Cadre du livrable

| | |
|---|---|
| **Livrable jury** | `dossier-bloc-2.pdf` (**≤ 30 pages**) + archive `.zip` du code source |
| **Nature** | Document **autonome** : embarque extraits de code, schémas, captures, tableaux (pas de simple renvoi au dépôt) |
| **Candidat** | Adrien MORAND — projet solo, commanditaire fictif (Ynov) |
| **Référentiel accessibilité** | **RGAA 4.1** (transposition française de WCAG 2.1), cible **niveau AA** sur les critères applicables |
| **Compétences ACQUISES (fiche)** | C2.2.1 (prototype), C2.2.2 (harnais de tests unitaires) → présentées de façon condensée |
| **Compétences ÉLIM à prouver** | C2.2.3 (OWASP + a11y), C2.3.1 (cahier de recettes) → sections prioritaires |

## Mapping compétences → sections → critères officiels

| Compétence | ÉLIM | Section(s) | Critères d'évaluation couverts |
|---|:--:|---|---|
| **C2.1.1** Environnements déploiement/test + qualité/perf | | §3, §5, §6 | Protocole CD explicité · env. dev détaillé · outils (compilateur, serveur d'app, gestion de sources) · séquences de déploiement · critères qualité/perf |
| **C2.1.2** Intégration continue | | §4 | Protocole CI explicité · séquences d'intégration |
| **C2.2.1** Prototype | ✅ | §1, §2 | Bonnes pratiques (frameworks, paradigmes) · prototype fonctionnel · user stories · composants d'interface · exigences sécurité |
| **C2.2.2** Harnais de tests unitaires | ✅ | §7 | Tests unitaires couvrant une fonctionnalité · couverture majoritaire du code |
| **C2.2.3** Sécurité + accessibilité | ✅ | §8, §9 | 10 failles OWASP couvertes · référentiel a11y présenté et justifié · exigences du référentiel respectées |
| **C2.2.4** Déploiement continu + historique versions | | §5, §12 | Système de gestion de versions · évolutions tracées · logiciel manipulable en autonomie |
| **C2.3.1** Cahier de recettes | ✅ | §10 | Reprend l'ensemble des fonctionnalités · tests fonctionnels, structurels et de sécurité conformes au plan |
| **C2.3.2** Plan de correction des bogues | | §11 | Bogues détectés, qualifiés, traités · analyse des points d'amélioration par test en échec · corrections conformes |
| **C2.4.1** Documentation d'exploitation | | §13 | Manuels déploiement + utilisation + mise à jour · clarté · choix techno/langages décrits |

---

## Structure du document (13 sections + garde) — budget ~29 pages

### Page de garde + sommaire (1 p.)
- Titre, candidat, date, certification RNCP 39583, bloc 2.
- Sommaire + tableau de mapping compétences→sections (ci-dessus) pour navigation jury.

### §1 — Présentation du projet & prototype — C2.2.1 (2 p.)
- **Objectif produit** : choisir un film à plusieurs sans débat interminable ; parcours hôte / invité.
- **User stories principales** (3-5) : créer une soirée, rejoindre via lien, proposer un film, voter, lancer la roue.
- **Stack & frameworks** : React + Vite + TypeScript (front) ; ASP.NET Core .NET 10 minimal API (back) ; MongoDB ; hébergement GCP Cloud Run + AWS S3/CloudFront.
- **Paradigmes** : SPA + API REST versionnée `/api/v1`, architecture en couches côté API (CQRS-light), organisation par features côté front.
- **Composants d'interface** : captures écran clés (accueil, création soirée, détail soirée + vote, roue) — *captures à générer via preview ou fournies*.
- **Sécurité by design** (renvoi §8) : compte obligatoire, secrets hors dépôt.
- **Preuves à embarquer** : `apps/web/package.json`, `apps/api-dotnet/.../*.csproj`, captures UI.

### §2 — Architecture logicielle — C2.2.1 (2 p.)
- **Méthode** : modèle C4 (justifié vs UML complet).
- **C4 niveau 1 (Context)** : utilisateur → Movie Picker → TMDB / e-mail / Sentry (diagramme Mermaid).
- **C4 niveau 2 (Container)** : SPA (CloudFront/S3) ↔ API .NET (Cloud Run) ↔ MongoDB Atlas + TMDB.
- **Organisation du code** : API (`Endpoints` / `Handlers` / `Repositories` / `Infrastructure`) + middlewares ; front (`app/`, `features/`, `shared/`).
- **Maintenabilité / évolutivité** : préfixe versionné, validation centralisée, schéma extensible.
- **Preuves** : arborescence réelle des dossiers + résumé fidèle de l'architecture archivée (`archive/docs/RNCP/bloc-1-cadrage/10-architecture.md`).

### §3 — Environnement de développement & outils — C2.1.1 (1,5 p.)
- **Éditeurs** : VS Code / Cursor.
- **Runtimes & versions exactes** : Node (LTS), .NET SDK 10, pnpm ; Docker ; MongoDB local.
- **Gestion de sources** : Git + GitHub, branche `master`, PR, protection de branche.
- **Outillage qualité local** : `scripts/verify-local.cjs` (lint + format + tests), hook `pre-push`.
- **Outils = composants identifiables** : compilateur (tsc / dotnet build), serveur d'application (Cloud Run + CloudFront/S3), gestion de sources (Git/GitHub).
- **Preuves** : `package.json` (scripts), `scripts/verify-local.cjs`, Dockerfile API, versions.

### §4 — Intégration continue — C2.1.2 (2 p.)
- **Protocole CI explicité** : déclencheurs (PR + push `master`), filtrage par chemins, actions composites (`setup-web`, `setup-dotnet-cache`).
- **Séquence d'intégration ordonnée** : install → lint (ESLint + tsc + `pnpm audit`) → build (front + API + OpenAPI) → tests (Vitest/RTL/axe + xUnit/Coverlet + contrat OpenAPI) → Sonar.
- **Schéma** : Mermaid `flowchart` PR → jobs CI → merge.
- **Preuves** : `.github/workflows/ci-cd.yml` (extraits jobs), actions composites.

### §5 — Déploiement continu — C2.1.1 / C2.2.4 (2 p.)
- **Protocole CD explicité** : sur push `master` après CI verte.
- **Séquences** : `docker build` → push Artifact Registry (tag digest/SHA) → `gcloud run deploy` (région `europe-west1`, secrets Secret Manager) ; front → `aws s3 sync` → invalidation CloudFront ; **smoke test** `/health`.
- **Déploiement à chaque modification** (C2.2.4) + **rollback** (`rollback.yml`) + nettoyage registre (`registry-cleanup.yml`).
- **Choix assumé** : déploiement direct, **sans canary / bleu-vert** en V1 (justifié : projet solo, trafic faible ; canary = axe d'amélioration §11/roadmap).
- **Preuves** : `.github/workflows/ci-cd.yml` (job deploy), `rollback.yml`, schéma Mermaid CD.

### §6 — Critères de qualité & performance — C2.1.1 (1,5 p.)
- **Couverture de tests** : chiffres réels (front seuils br/li/fn ; API Coverlet) — *valeurs exactes à extraire de la config Vitest + Sonar*.
- **Quality gate SonarCloud** : couverture ingérée, statut (informatif/bloquant).
- **Lighthouse** : perf home (non bloquant, surveillé).
- **Sécurité** : 0 vulnérabilité high/critical (pnpm audit, NuGet, Trivy, Gitleaks).
- **Preuves** : config seuils Vitest, `security-scan.yml`, capture Sonar / mesures.

### §7 — Harnais de tests unitaires — C2.2.2 (2 p.)
- **Front** : ~85 fichiers `*.test.ts(x)` (composants via React Testing Library, hooks, utils, i18n, axe) — 1 exemple de test commenté.
- **API** : suite d'intégration xUnit (`AuthEndpointsTests`, `EventConfigEndpointsTests`, `CriticalPathTests`, `OpenApiContractTests`, `RateLimitingTests`…) — 1 exemple.
- **Couverture** : reprise des chiffres §6, argument « couvre la majorité du code ».
- **Preuves** : liste des fichiers de test + 2 extraits (1 front, 1 API).

### §8 — Sécurité : couverture OWASP Top 10 (2021) — C2.2.3 ÉLIM (4 p.)
- **Tableau A01 → A10** : Faille → Mesure dans le repo → Référence `fichier:ligne` + court extrait de code. Aucune ligne vide.
  - A01 Broken Access Control : compte obligatoire, actions hôte via session, CORS `AllowCredentials` + allowlist, anti-CSRF.
  - A02 Cryptographic Failures : hachage mot de passe (Identity), cookies `Secure`/`HttpOnly`.
  - A03 Injection : `MongoDB.Driver` paramétré, `ValidationErrorFilter`.
  - A04 Insecure Design : rate limiting, garde-fous config soirée, secrets externes.
  - A05 Security Misconfiguration : `SecurityHeadersMiddleware` API (CSP, `frame-ancestors 'none'`…) **+ CSP du front SPA** injectée au build (`apps/web/vite.config.ts`, plugin `moviepicker-csp-meta` ; limite : `frame-ancestors` front = en-tête CloudFront, hors `<meta>`).
  - A06 Vulnerable Components : Dependabot + `pnpm audit` + `dotnet list package --vulnerable` + Trivy.
  - A07 Auth Failures : rate limit login, cooldown, reset anti-énumération.
  - A08 Data Integrity : actions épinglées, images taguées par digest, Gitleaks.
  - A09 Logging & Monitoring : `StructuredHttpRequestLoggingMiddleware`, `CorrelationIdMiddleware`.
  - A10 SSRF : allowlist hosts TMDB / posters.
- **Preuves** : extraits de `SecurityHeadersMiddleware.cs`, `MoviePickerCookieAuthenticationConfigurer.cs`, config CORS/rate limit, `apps/web/vite.config.ts` (plugin CSP front), `security-scan.yml`. *(chemins exacts + lignes à confirmer à la rédaction)*

### §9 — Accessibilité — C2.2.3 ÉLIM (2 p.)
- **Référentiel retenu & justifié** : **RGAA 4.1 / WCAG 2.1 AA** ; lien avec `axe-core` (moteur WCAG).
- **Mesures implémentées** (par thème) :
  - Navigation clavier + lien d'évitement (`AppShell.tsx:67`), menus en disclosure, Échap.
  - Gestion du focus : focus-visible global, restauration.
  - ARIA & sémantique : landmarks, `aria-live`, `aria-label`, hiérarchie des titres.
  - Contraste & thèmes clair/sombre, `prefers-reduced-motion`, attribut `lang`.
- **Tests automatisés** : `axe` sur **9 vues** (8 pages + écran d'erreur serveur) dans `a11y.test.tsx` + audit manuel.
- **Critères reportés / limites** (honnêteté jury).
- **Preuves** : `a11y.test.tsx`, `AppShell.tsx`, extraits focus/ARIA.

### §10 — Cahier de recettes — C2.3.1 ÉLIM (4 p.)
- **Tableau de recettes** : Scénario → Préconditions → Étapes → Résultat attendu → Test E2E associé (`e2e/*.spec.ts`).
- **Couverture fonctionnelle** : création soirée, rejoindre via lien (compte requis, `returnTo`), inscription/connexion/reset, proposer/voter/« déjà vu », config hôte, roue, clôture.
- **Tests structurels** : contrat OpenAPI, envelope d'erreur + correlation id.
- **Tests de sécurité** : 401 sans session, rate limit login, CORS refusé, 404 JSON.
- **Preuves** : `playwright.config.ts` (navigateurs, mobile), scénarios réels extraits de `e2e/`.

### §11 — Plan de correction des bogues — C2.3.2 (2 p.)
- **Processus traçable** : consignation (templates `.github/ISSUE_TEMPLATE/`) → qualification (labels `bug`/`severity:*`/`area:*`) → correctif branche `fix/…` → PR `Closes #n` → merge → vérification recette → entrée CHANGELOG `Fixed`.
- **Analyse des tests en échec** : démarche (repro → cause → correctif → test de non-régression).
- **Exemple réel** : 1-2 anomalies + PR de correction (traçabilité git). *(à sélectionner dans l'historique)*
- **Preuves** : templates issue/PR, exemple d'issue+PR, extrait CHANGELOG.

### §12 — Historique des versions — C2.2.4 (1 p.)
- **Système** : Git + GitHub, `CHANGELOG.md` (Keep a Changelog), **SemVer**, tags + releases.
- **Journal** : extrait du CHANGELOG (0.1.0 MVP → 1.3.1 actuelle) + capture releases GitHub.
- **Preuves** : `CHANGELOG.md`, `git tag`.

### §13 — Manuels d'exploitation — C2.4.1 (3 p.)
- **Manuel de déploiement** : prérequis cloud (GCP, AWS, MongoDB Atlas, TMDB, e-mail), variables/secrets, premier déploiement, rollback (synthèse fidèle de `archive/docs/v1-produit/deploiement-secrets-ci.md`).
- **Manuel d'utilisation** : parcours hôte (créer / configurer / roue / clôturer) + invité (rejoindre / proposer / voter) + captures.
- **Manuel de mise à jour** : dépendances (Dependabot — **fréquence** mensuelle, **périmètre** npm + Actions + NuGet, **type** automatique via PR) → couvre aussi **C4.1.1** ; process release (tag + release) ; hotfix.
- **Preuves** : `.github/dependabot.yml`, doc déploiement archivée, captures parcours.

---

## Notes de production
- **Export PDF** : depuis `dossier-bloc-2.md` (pandoc ou impression navigateur) ; vérifier le compte de pages ≤ 30 avant rendu.
- **Captures d'écran** (§1, §10, §13) : à générer via l'app en local (outil de preview) ou fournies par le candidat ; emplacements réservés sinon.
- **Variable d'ajustement** si dépassement 30 p. : compresser §8 (OWASP en tableau resserré) et §13 (manuels).
- **Preuves « à confirmer »** : les chemins `fichier:ligne` exacts de §8 (middlewares sécurité) et les chiffres de couverture §6 seront vérifiés dans le code à la rédaction.
