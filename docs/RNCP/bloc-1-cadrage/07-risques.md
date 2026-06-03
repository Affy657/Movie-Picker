# 07 — Cartographie des risques & référentiel

> **RNCP 39583 — C1.2.3** : « Les risques techniques et fonctionnels sont cartographiés et priorisés dans un référentiel. Ce référentiel permet de préciser les risques pour la perte de données, l'interruption du système, les facteurs de dégradation, la sécurité. Les indicateurs de contrôle sont explicités et permettent de contrôler l'impact des risques sur la performance du développement. »

---

## 1. Référentiel d'évaluation des risques

Grille **Probabilité × Impact**, chacun noté de 1 (faible) à 3 (élevé). Le **score de criticité** = Probabilité × Impact (de 1 à 9).

| Score | Criticité | Traitement attendu |
|-------|-----------|--------------------|
| 1–2 | 🟢 Faible | Accepté / surveillé |
| 3–4 | 🟡 Moyenne | Plan de mitigation défini |
| 6–9 | 🔴 Élevée | Mitigation prioritaire + indicateur de contrôle actif |

### Échelles

| Niveau | Probabilité | Impact |
|--------|-------------|--------|
| **1** | Rare | Mineur (gêne ponctuelle) |
| **2** | Possible | Modéré (fonction dégradée) |
| **3** | Probable | Majeur (service ou données compromis) |

---

## 2. Cartographie des risques techniques

| ID | Risque | Catégorie | P | I | Score | Criticité | Mitigation | Indicateur de contrôle |
|----|--------|-----------|---|---|-------|-----------|------------|------------------------|
| RT1 | **TMDB indisponible / rate limiting** | Dégradation | 2 | 2 | 4 | 🟡 | Cache posters (TTL), repli saisie manuelle, rate limit recherche | Taux d'erreur appels TMDB (logs) |
| RT2 | **MongoDB Atlas down** | Interruption | 1 | 3 | 3 | 🟡 | Free tier managé (SLA Atlas), retries TanStack côté client | Uptime check `/health`, alerte 5xx |
| RT3 | **Perte de données** | Perte de données | 1 | 3 | 3 | 🟡 | Persistance managée Atlas (réplication), pas d'état en mémoire | Sauvegardes Atlas, intégrité au démarrage |
| RT4 | **Fuite de secret** (clé TMDB, URI Mongo) | Sécurité | 1 | 3 | 3 | 🟡 | Secret Manager + Gitleaks en CI + jamais en repo | Scan Gitleaks (bloquant si fuite) |
| RT5 | **CVE critique dans une dépendance** | Sécurité | 2 | 2 | 4 | 🟡 | Dependabot mensuel, `pnpm audit`, `dotnet list --vulnerable`, Trivy | CVE High/Critical en CI (bloquant) |
| RT6 | **CSRF (cookie cross-site)** | Sécurité | 2 | 3 | 6 | 🔴 | CORS strict + `SameSite=None; Secure` + mesures anti-CSRF | Revue OWASP A01 (cf. owasp-top-10.md) |
| RT7 | **Pic de charge → coût Cloud Run** | Dégradation | 1 | 2 | 2 | 🟢 | Scale-to-zero, free tier 2 M req, limite de concurrence | Coût mensuel GCP vs budget (§ budget) |
| RT8 | **Désynchronisation SW / bundles** (déploiement front) | Dégradation | 2 | 2 | 4 | 🟡 | Déploiement 3 étapes ordonné + invalidation CloudFront | Smoke test post-déploiement |
| RT9 | **CI instable / rouge** | Dégradation (dev) | 2 | 2 | 4 | 🟡 | Tests déterministes, `verify:local` avant push | Taux de stabilité CI (vert/rouge) |

---

## 3. Cartographie des risques fonctionnels

| ID | Risque | Catégorie | P | I | Score | Criticité | Mitigation | Indicateur de contrôle |
|----|--------|-----------|---|---|-------|-----------|------------|------------------------|
| RF1 | **Abandon utilisateur** (friction) | Adoption | 2 | 3 | 6 | 🔴 | Rejoindre sans compte, mobile-first, partage 1 clic | Taux de complétion parcours (recette / retours) |
| RF2 | **Mauvaise UX mobile** | Dégradation | 2 | 2 | 4 | 🟡 | Mobile-first, tests a11y, Lighthouse | Score Lighthouse, audit a11y |
| RF3 | **Lien partagé indexé** par moteur de recherche | Sécurité/confidentialité | 2 | 2 | 4 | 🟡 | Slug opaque, `noindex` selon visibilité, pas d'info sensible URL | Vérification meta robots |
| RF4 | **Usurpation du rôle hôte** | Sécurité | 1 | 3 | 3 | 🟡 | Lien partagé sans `?host=`, actions hôte via session compte | Tests d'intégration autorisation |
| RF5 | **Doublon de film proposé** | Dégradation | 2 | 1 | 2 | 🟢 | Détection par id TMDB, fallback titre normalisé | Test « doublon refusé » |
| RF6 | **Mauvaise gestion fuseau horaire** (rappels) | Dégradation | 2 | 2 | 4 | 🟡 | Stockage UTC, affichage local, convention explicite | Test affichage date/heure |

---

## 4. Synthèse — risques prioritaires (criticité élevée 🔴)

| ID | Risque | Pourquoi prioritaire | Action immédiate |
|----|--------|----------------------|------------------|
| **RT6** | CSRF cookie cross-site | Faille de sécurité exploitable | Mesures anti-CSRF + revue OWASP A01 |
| **RF1** | Abandon utilisateur | Menace directe sur la valeur produit | Garantir le parcours sans friction (sans compte, mobile) |

---

## 5. Indicateurs de contrôle (suivi de l'impact sur la performance du dev)

Les indicateurs ci-dessous sont **mesurables** et suivis dans le pilotage ([`../pilotage/02-suivi-indicateurs.md`](../bloc-3-coordination-pilotage/02-suivi-indicateurs.md)) :

| Indicateur | Source | Seuil d'alerte |
|------------|--------|----------------|
| Taux d'erreur 5xx API | Sentry / Cloud Monitoring | > 1 % sur 5 min |
| Uptime `/health` | Uptime check GCP | 2 échecs consécutifs |
| CVE High/Critical ouvertes | `pnpm audit` / NuGet / Trivy | > 0 |
| CI verte / rouge | GitHub Actions | Échec sur `master` |
| Coût cloud mensuel | Factures GCP + AWS | > budget prévu (§ budget) |
| Fuite de secret | Gitleaks | > 0 (bloquant) |

---

*Voir aussi : [`06-swot.md`](06-swot.md) (SWOT — C1.2.1), [`03-faisabilite-technique.md`](03-faisabilite-technique.md) (risques de faisabilité — C1.2.2), [`../supervision.md`](../bloc-4-mco/supervision.md) (supervision — C4.1.2).*
