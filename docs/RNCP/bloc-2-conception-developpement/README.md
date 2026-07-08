# Bloc 2 — Concevoir et développer des applications logicielles

> Grille officielle : [`../referentiel/bloc-02-concevoir-developer-applications.md`](../referentiel/bloc-02-concevoir-developer-applications.md) · Suivi : [`../suivi-rncp.md`](../suivi-rncp.md)

**Livrable jury : `dossier-bloc-2.pdf` (≤ 30 pages) + archive `.zip` du code source.**

Le dossier PDF est **autonome** : il embarque les preuves (extraits de code, schémas, captures, tableaux). Il ne se contente pas de renvoyer au dépôt. Le fichier source de travail est [`dossier-bloc-2.md`](dossier-bloc-2.md), exporté en PDF au moment du rendu.

## Couverture des compétences (état réel du dépôt)

| Compétence | ÉLIM | Preuve principale dans le code | État |
|---|:--:|---|---|
| **C2.1.1** — Environnements déploiement/test + qualité/perf | | Pipeline `.github/workflows/` (ci-cd, security-scan, rollback, registry-cleanup) + [`scripts/verify-local.cjs`](../../../scripts/verify-local.cjs) + SonarCloud | ✅ code · dossier |
| **C2.1.2** — Intégration continue | | Jobs lint / test / build de `ci-cd.yml` | ✅ code · dossier |
| **C2.2.1** — Prototype | ✅ | Application en production + architecture (archivée) | **ACQUIS** (fiche) |
| **C2.2.2** — Harnais de tests unitaires | ✅ | ~85 fichiers de test front + suite d'intégration API | **ACQUIS** (fiche) |
| **C2.2.3** — Sécurité (OWASP Top 10) + accessibilité | ✅ | Middlewares sécurité (CSP, CORS, rate limit) + a11y (skip link, axe 7 pages) | ✅ code · dossier |
| **C2.2.4** — Déploiement continu + historique versions | | CD auto sur `master` + [`CHANGELOG.md`](../../../CHANGELOG.md) + versionnage SemVer | ✅ code |
| **C2.3.1** — Cahier de recettes | ✅ | E2E Playwright ([`e2e/`](../../../e2e/)) | ✅ code · dossier |
| **C2.3.2** — Plan de correction des bogues | | Templates issue/PR ([`.github/`](../../../.github/)) + flux git/PR | ✅ code · dossier |
| **C2.4.1** — Manuels d'exploitation | | Déploiement (archivé) + utilisation + mise à jour | dossier |

**Légende** — « ✅ code » : la preuve existe dans le dépôt · « dossier » : à présenter dans le PDF jury.

> **Note** : contrairement à une version antérieure de ce dossier, l'E2E Playwright, l'accessibilité (skip link, focus-visible, couverture axe) et le pipeline CI/CD complet **sont déjà livrés** dans le code. Le travail restant est de **présenter** ces preuves au jury dans le PDF, pas de les implémenter.
