# 06 — Analyse SWOT (opportunités & menaces)

> **RNCP 39583 — C1.2.1**
>
> **Compétence** — Cartographier les opportunités et les menaces du projet, en analysant l'impact environnemental et les adhérences du projet afin de déterminer les actions à mener.
>
> **Livrable attendu** — La cartographie des opportunités et menaces du projet.
>
> **Critères d'évaluation**
> - Une cartographie des menaces et des opportunités est réalisée à l'aide d'un outil adapté (ex : SWOT).
> - L'analyse permet de définir : l'impact des interactions avec d'autres projets le cas échéant, l'impact environnemental du projet, les préconisations sur la sécurité du projet logiciel, les points de vigilance à mettre sous contrôle, les opportunités à exploiter.

---

## 1. Matrice SWOT

| | **Origine interne** | **Origine externe** |
|--|---------------------|---------------------|
| **Positif** | **Forces (Strengths)** | **Opportunités (Opportunities)** |
| | • Stack moderne et maîtrisée (TS / .NET 10 LTS) <br> • Architecture découplée & hexagonale (maintenable, testable) <br> • Monorepo automatisé (CI/CD, Dependabot, scans) <br> • Mobile-first cohérent avec l'usage réel <br> • Sécurité intégrée tôt (OWASP, cookie HttpOnly, rate limit) | • Free tiers cloud généreux (coût ≈ 0) <br> • Écosystème .NET 10 LTS (support long) <br> • Communauté React / TanStack riche <br> • API TMDB gratuite et complète <br> • Scale-to-zero serverless (élasticité gratuite) |
| **Négatif** | **Faiblesses (Weaknesses)** | **Menaces (Threats)** |
| | • Équipe **solo** (pas de relecture par les pairs) <br> • Pas de déploiement progressif (canary/bleu-vert) en V1 <br> • Pas d'analytics produit en V1 <br> • Bi-cloud = double surface d'exploitation | • TMDB : rate limiting / changement de CGU <br> • Dépendance aux fournisseurs cloud (GCP/AWS) <br> • Nouvelles failles OWASP / CVE des dépendances <br> • Lien partagé potentiellement indexé par moteurs <br> • Coût cloud en cas de pic imprévu |

---

## 2. Adhérences & interactions avec d'autres projets

Le projet n'interagit pas avec un SI interne (greenfield), mais il **adhère** à des services tiers dont la disponibilité et les conditions conditionnent le sien :

| Adhérence | Type | Impact si défaillance |
|-----------|------|------------------------|
| **TMDB** | API métier | Recherche film dégradée (repli saisie manuelle) |
| **GCP** (Cloud Run / Secret Manager / Artifact Registry) | Infra back | API indisponible |
| **AWS** (S3 / CloudFront) | Infra front | Front indisponible |
| **MongoDB Atlas** | Données | Perte d'accès aux données |
| **Resend** | Email | Reset mot de passe KO (dégradable) |
| **GitHub Actions** | CI/CD | Blocage des déploiements |
| **Dependabot / Trivy / Gitleaks / SonarCloud** | Qualité/sécurité | Veille dégradée (non bloquant pour l'usage) |

> Aucune interaction inter-projets interne ; les adhérences externes sont **toutes en free tier** et **découplées** (un repli existe pour TMDB et Resend).

---

## 3. Impact environnemental

| Levier | Effet |
|--------|-------|
| **Scale-to-zero** (Cloud Run) | Aucune consommation à l'idle (pas de serveur 24/7) |
| **Cache posters** (TTL) | Moins d'appels réseau TMDB, moins de bande passante |
| **CloudFront edge cache** | Réduction des trajets réseau, contenu servi au plus près |
| **Front statique** | Aucun calcul serveur pour le rendu des pages |
| **Image Docker** | Piste : passage `alpine`/`chiseled` pour réduire l'empreinte |

> L'éco-conception est un **critère de choix d'architecture assumé**, pas un ajout cosmétique.

---

## 4. Préconisations de sécurité

- Couverture **OWASP Top 10** mappée au code.
- **Sessions cookie HttpOnly** + CORS strict (`ALLOWED_ORIGINS`) + `SameSite=None; Secure` cross-site.
- **Rate limiting** par IP sur les endpoints sensibles (login, création, join, mutations).
- **Secrets** via GCP Secret Manager (jamais en repo) + scan Gitleaks en CI.
- **Clé TMDB côté serveur uniquement** (jamais exposée au client).
- Scans automatisés : `pnpm audit`, `dotnet list package --vulnerable`, Trivy (image Docker).

---

## 5. Points de vigilance à mettre sous contrôle

| Point de vigilance | Risque | Mise sous contrôle |
|--------------------|--------|--------------------|
| **Reset mot de passe** | Énumération de comptes | Réponse neutre, lien TTL court, invalidation après usage |
| **Cookie cross-site** | CSRF | CORS strict + mesures anti-CSRF (cf. OWASP A01) |
| **Clé TMDB** | Fuite / abus de quota | Serveur uniquement + cache + rate limit recherche |
| **Lien partagé** | Indexation moteur de recherche | Slug opaque, pas d'info sensible dans l'URL, `robots`/`noindex` selon visibilité |
| **Charge solo** | Retard / dette | Automatisation + périmètre versionné + backlog priorisé |

---

## 6. Opportunités à exploiter

- **Free tiers** : valider le produit sans coût d'infrastructure.
- **.NET 10 LTS** : socle stable pour itérer sans migration forcée à court terme.
- **Watch providers TMDB** : différenciation produit (aide à la décision) sans coût supplémentaire.
- **Scale-to-zero** : absorber des pics ponctuels (soirées) sans surdimensionner.
- **Automatisation** : transformer la contrainte solo en démonstration de maîtrise CI/CD pour le jury.
