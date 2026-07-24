# Bloc 4 — Maintenir l'application en condition opérationnelle (MCO)

> Grille officielle : [`../referentiel/bloc-04-maintenir-application-mco.md`](../referentiel/bloc-04-maintenir-application-mco.md) · Suivi : [`../suivi-rncp.md`](../suivi-rncp.md)

**État : 🟡 en cours** — matériau technique en place (Sentry, Dependabot, CI/CD, CHANGELOG), dossier à rédiger.

## Attendus du jury

- **Type d'évaluation** : simulation de situation de travail sous forme de **présentation écrite** (pas d'oral).
- **Attendus du candidat** : **réaliser** le monitoring, le traitement des anomalies et la maintenance du logiciel, puis en présenter la mise en œuvre.
- **Livrable** : **un dossier écrit unique de 20 pages maximum** couvrant les 8 éléments ci-dessous (format proche du Bloc 2 : [`../bloc-2-conception-developpement/dossier-bloc-2.md`](../bloc-2-conception-developpement/dossier-bloc-2.md), mais **10 pages de moins**).
- **Jury** : 2 professionnels externes ; acquisition / non-acquisition prononcée **compétence par compétence**.
- **Éliminatoires** : **C4.1.2**, **C4.2.1**, **C4.3.2**.

Ordre des éléments imposé par le règlement : processus de mise à jour des dépendances → système de supervision → processus de collecte et consignation → **fiche de consignation d'une anomalie** → traitement d'une anomalie → recommandations d'amélioration → exemplaire du journal de version → problème résolu avec le support client.

## Livrables attendus & matériau disponible

| Compétence | Livrable attendu | ÉLIM | Matériau existant |
|------------|------------------|:----:|-------------------|
| C4.1.1 | Description du processus de mise à jour des dépendances (fréquence, périmètre, automatique/manuel) | | [`.github/dependabot.yml`](../../../.github/dependabot.yml) · [`security-scan.yml`](../../../.github/workflows/security-scan.yml) · dossier Bloc 2 §13.3 |
| C4.1.2 | Description du système de supervision (sondes, indicateurs, seuils, signalement, disponibilité) | ✅ | [`supervision.md`](supervision.md) — Sentry front + API ; **à compléter** : sonde de disponibilité `GET /health` + politiques d'alerte |
| C4.2.1 | Processus de collecte/consignation des anomalies **+ une fiche de consignation** | ✅ | GitHub Issues + gabarits ; **à produire** |
| C4.2.2 | Traitement d'une anomalie détectée au cours du projet (via CI/CD) | | [`ci-cd.yml`](../../../.github/workflows/ci-cd.yml) · [`rollback.yml`](../../../.github/workflows/rollback.yml) · historique Git des correctifs |
| C4.3.1 | Recommandations argumentées d'amélioration (gains, coût, délai) | | [`../../roadmap-product.md`](../../roadmap-product.md) · [`../../roadmap-tech.md`](../../roadmap-tech.md) · indicateurs PostHog / Lighthouse / Sentry |
| C4.3.2 | Exemplaire du journal de version | ✅ | [`CHANGELOG.md`](../../../CHANGELOG.md) (Keep a Changelog + SemVer) ; releases GitHub à générer |
| C4.3.3 | Exemple de problème résolu en collaboration avec le support client | | Retours utilisateurs des soirées de test ; **à produire** |

## Fichiers du dossier

| Fichier | Contenu |
|---------|---------|
| [`supervision.md`](supervision.md) | Système de supervision Sentry (C4.1.2) — matière première du dossier |
