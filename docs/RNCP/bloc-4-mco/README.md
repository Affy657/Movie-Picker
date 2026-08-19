# Bloc 4 : Maintenir l'application en condition opérationnelle (MCO)

> Grille officielle : [`../referentiel/bloc-04-maintenir-application-mco.md`](../referentiel/bloc-04-maintenir-application-mco.md) | Suivi : [`../suivi-rncp.md`](../suivi-rncp.md)

**État : 🟡 dossier rédigé, preuves à joindre.** Le livrable est [`dossier-bloc-4.md`](dossier-bloc-4.md), couvrant les 8 éléments, y compris les 7 premières réponses au questionnaire intégrées au § 6. Restent : les sept captures d'écran de `captures/`, l'éventuelle mise à jour du § 6 si d'autres réponses arrivent, puis l'export PDF sous le plafond de 20 pages.

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
| C4.1.1 | Description du processus de mise à jour des dépendances (fréquence, périmètre, automatique/manuel) | | ✅ [`mise-a-jour-dependances.md`](mise-a-jour-dependances.md), 4 écosystèmes, 3 rythmes, cas react-router 8.3.0 |
| C4.1.2 | Description du système de supervision (sondes, indicateurs, seuils, signalement, disponibilité) | ✅ | ✅ [`supervision.md`](supervision.md), 3 sondes actives, 5 politiques d'alerte, Sentry (3 règles/projet), tableau de bord, chaîne d'alerte testée |
| C4.2.1 | Processus de collecte/consignation des anomalies **+ une fiche de consignation** | ✅ | ✅ [`processus-anomalies.md`](processus-anomalies.md), 5 canaux, gabarit, sévérités, cycle de vie ; fiche = issue #67 |
| C4.2.2 | Traitement d'une anomalie détectée au cours du projet (via CI/CD) | | ✅ issue #67 + § 6 de [`processus-anomalies.md`](processus-anomalies.md) ; **reste** : captures du pipeline |
| C4.3.1 | Recommandations argumentées d'amélioration (gains, coût, délai) | | ✅ [`axes-amelioration.md`](axes-amelioration.md), 7 recommandations chiffrées sur indicateurs réels et 7 premières réponses au [`questionnaire`](questionnaire-utilisateurs.md) |
| C4.3.2 | Exemplaire du journal de version | ✅ | ✅ [`journal-versions.md`](journal-versions.md) + [`CHANGELOG.md`](../../../CHANGELOG.md) + 7 tags et 7 releases, dont **v1.3.2** du 25/07/2026 |
| C4.3.3 | Exemple de problème résolu en collaboration avec le support client | | ✅ [`collaboration-support.md`](collaboration-support.md), dispositif + cas #67 + contribution des parties prenantes |

## Fichiers du dossier

| Fichier | Contenu |
|---------|---------|
| [`mise-a-jour-dependances.md`](mise-a-jour-dependances.md) | Processus de mise à jour des dépendances (C4.1.1), matière du § 1 du dossier |
| [`supervision.md`](supervision.md) | Système de supervision et d'alerte (C4.1.2), matière du § 2 du dossier |
| [`processus-anomalies.md`](processus-anomalies.md) | Processus de collecte et de consignation (C4.2.1), matière des § 3 à 5 |
| [`axes-amelioration.md`](axes-amelioration.md) | Recommandations argumentées (C4.3.1), matière du § 6 |
| [`journal-versions.md`](journal-versions.md) | Journal des versions déployées (C4.3.2), matière du § 7 |
| [`collaboration-support.md`](collaboration-support.md) | Problème résolu avec le support (C4.3.3), matière du § 8 |
| [`questionnaire-utilisateurs.md`](questionnaire-utilisateurs.md) | Questionnaire de retour utilisateur, **envoyé, 7 réponses reçues** |
