# Bloc 4 — Maintenir l'application logicielle en condition opérationnelle (MCO)

> **Certification :** Expert en développement logiciel — **RNCP 39583**
> Document issu des grilles d'évaluation officielles (reformaté en Markdown, UTF-8).
> *Résultats / commentaires : à remplir par le jury.*

---

## Identité candidat

| | |
|--|--|
| **Nom** | _________________________ |
| **Prénom** | _________________________ |
| **Date** | _________________________ |

---

*Résultat : **Acquis** / **Non acquis** (selon jury).*

---

## Modalités d'évaluation

**Type d'évaluation**

Mise en situation professionnelle réelle ou fictive — **simulation de situation de travail sous la forme d'une présentation écrite d'un projet**.

**Attendus du candidat**

Le candidat **réalise** le monitoring, le traitement des anomalies et la maintenance d'un logiciel développé au cours d'un projet réalisé dans sa formation, et remet au jury un dossier présentant cette mise en œuvre.

**Livrable attendu**

Le candidat remet au jury un **dossier écrit de 20 pages maximum** comprenant :

1. La description du processus de mise à jour des dépendances *(C4.1.1)*
2. La description du système de supervision *(C4.1.2)*
3. La description du processus de collecte et de consignation des anomalies *(C4.2.1)*
4. La présentation d'une fiche de consignation d'une anomalie rencontrée au cours du projet *(C4.2.1)*
5. La présentation du traitement d'une anomalie détectée au cours du projet *(C4.2.2)*
6. La présentation des recommandations argumentées d'amélioration *(C4.3.1)*
7. La présentation d'un exemplaire du journal de version *(C4.3.2)*
8. Un exemple de problème résolu en collaboration avec le support client *(C4.3.3)*

**Évaluateur**

Jury d'évaluation composé de **2 membres professionnels externes** dans le domaine visé.

**Modalités de validation**

Pour chaque compétence, le jury indique l'**acquisition** ou la **non-acquisition** de la compétence et motive sa décision par un commentaire en cas de non-acquisition.

**Compétences éliminatoires** : **C4.1.2** (système de supervision et d'alerte) · **C4.2.1** (consignation des anomalies) · **C4.3.2** (journal des versions déployées).

---

## Référentiel d'activités

| Activité | Situations de travail | Compétences |
|----------|----------------------|-------------|
| **A.4.1 Monitorer l'application logicielle** | Mise à jour des dépendances logicielles | C4.1.1 |
| | Mise en place des sondes de suivi · Définition des seuils d'alerte · Configuration de la modalité de signalement | C4.1.2 |
| **A.4.2 Traitement des anomalies détectées en production** | Consignation des anomalies détectées en production | C4.2.1 |
| | Réalisation des corrections nécessaires · Déploiement du correctif | C4.2.2 |
| **A.4.3 Assurer la maintenance du logiciel** | Proposition d'axes d'amélioration / de perfectionnement | C4.3.1 |
| | Traçabilité des actions de maintenance et d'évolution | C4.3.2 |
| | Collaboration avec le support client | C4.3.3 |

## Synthèse des livrables

| Compétence | Livrable attendu | Éliminatoire |
|------------|------------------|:------------:|
| C4.1.1 | La description du processus de mise à jour des dépendances | Non |
| C4.1.2 | La description du système de supervision | **Oui** |
| C4.2.1 | La description du processus de collecte et de consignation des anomalies + la présentation d'une fiche de consignation d'une anomalie rencontrée au cours du projet | **Oui** |
| C4.2.2 | La présentation du traitement d'une anomalie détectée au cours du projet | Non |
| C4.3.1 | La présentation des recommandations argumentées d'amélioration | Non |
| C4.3.2 | La présentation d'un exemplaire du journal de version | **Oui** |
| C4.3.3 | Un exemple de problème résolu en collaboration avec le support client | Non |

*Caractère éliminatoire issu de la [fiche récapitulative](00-fiche-recapitulative-rncp-39583.md).*

---

### C4.1.1 Gérer les mises à jour des dépendances

C4.1.1 Gérer les mises à jour des dépendances et des bibliothèques tiers, en surveillant régulièrement les nouvelles versions, en évaluant les impacts des mises à jour, et en les intégrant de manière sécurisée pour maintenir l'application à jour et sécurisée.

**Livrable attendu**

La description du processus de mise à jour des dépendances

**Critères d'évaluation**

Le processus de mise à jour des dépendances précise :
- La fréquence des mises à jour
- Le périmètre logiciel concerné
- Le type de mise à jour (automatique ou manuel)

| Résultat * | Commentaires |
|------------|-------------|
|  |  |

### C4.1.2 Concevoir un système de supervision et d'alerte

C4.1.2 Concevoir un système de supervision et d'alerte en déterminant le périmètre de supervision et en identifiant les indicateurs de suivi pertinents, en mettant en place des sondes, en configurant la modalité des signalements afin de garantir une disponibilité permanente du logiciel.

**Livrable attendu**

La description du système de supervision

**Critères d'évaluation**

Le système de supervision est adapté à la typologie de logiciel développé.

Les sondes mises en place et leur finalité sont explicitées.

Les critères de qualité et de performance sont décrits. Ils sont adaptés au projet.

Le système de supervision permet de surveiller la disponibilité du logiciel.

| Résultat * | Commentaires |
|------------|-------------|
|  |  |

### C4.2.1 Consigner les anomalies détectées en production

C4.2.1 Consigner les anomalies détectées en élaborant un processus de collecte et consignation, en utilisant des outils de collecte et en y intégrant toutes les informations pertinentes, afin de déterminer le correctif à mettre en place.

**Livrable attendu**

La description du processus de collecte et de consignation des anomalies

La présentation d'une fiche de consignation d'une anomalie rencontrée au cours du projet

**Critères d'évaluation**

Le processus de collecte est structuré et adapté à la typologie du logiciel.

La fiche de consignation contient les informations permettant de reproduire le bogue.

L'analyse du bogue et les préconisations de corrections sont explicitées et permettent de corriger l'anomalie.

| Résultat * | Commentaires |
|------------|-------------|
|  |  |

### C4.2.2 Créer et déployer un correctif

C4.2.2 Créer et déployer un correctif en respectant le processus d'intégration et de déploiement continu afin de résoudre l'anomalie.

**Livrable attendu**

La présentation du traitement d'une anomalie détectée au cours du projet

**Critères d'évaluation**

Le traitement de l'anomalie tire profit du processus d'intégration et de déploiement continu.

Le correctif mis en place est décrit et permet la résolution de l'anomalie.

| Résultat * | Commentaires |
|------------|-------------|
|  |  |

### C4.3.1 Proposer des axes d'amélioration

C4.3.1 Proposer des axes d'amélioration en prenant en compte les indicateurs de performance et en analysant les retours utilisateurs afin de maintenir et renforcer l'attractivité du logiciel.

**Livrable attendu**

La présentation des recommandations argumentées d'amélioration.

**Critères d'évaluation**

Les recommandations d'amélioration sont argumentées et permettent d'évaluer les gains de performance en termes de coût, délai de mise en œuvre, etc.

Les recommandations sont réalistes et réalisables au regard du projet.
Elles permettent de renforcer l'attractivité du logiciel.

| Résultat * | Commentaires |
|------------|-------------|
|  |  |

### C4.3.2 Établir un journal des versions

C4.3.2 Établir un journal des versions déployées en y intégrant la documentation des correctifs réalisés pour suivre les différentes évolutions réalisées sur le logiciel.

**Livrable attendu**

La présentation d'un exemplaire du journal de version

**Critères d'évaluation**

Le journal de version contient les différentes améliorations amenées par cette version du logiciel (ex : anomalies corrigées, nouvelles fonctionnalités etc.).

Les correctifs déployés sont documentés.

| Résultat * | Commentaires |
|------------|-------------|
|  |  |

### C4.3.3 Collaborer avec les équipes de support

C4.3.3 Collaborer avec les équipes de support, en fournissant une expertise technique, en répondant aux retours clients, en résolvant des problèmes complexes afin d'améliorer le logiciel.

**Livrable attendu**

Un exemple de problème résolu en collaboration avec le support client

**Critères d'évaluation**

La présentation comporte :
- Le contexte du retour client avec une explication du problème à résoudre
- La résolution apportée
- Une explication de la contribution des différentes parties prenantes.

NOM : ____________________________________

Prénom : _________________________________

Signature

| Résultat * | Commentaires |
|------------|-------------|
|  |  |

---

## Jury

| Juré 1 | Juré 2 | Juré 3 |
|--------|--------|--------|
| Nom : _________________ | Nom : _________________ | Nom : _________________ |
| Signature | Signature | Signature |
