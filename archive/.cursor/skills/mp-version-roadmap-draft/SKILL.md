---
name: mp-version-roadmap-draft
description: Génère ou met à jour une roadmap par version dans un dossier choisi par l'utilisateur (fichier 01-roadmap-v{n}.md, type MVP roadmap). Utiliser quand une release est cadrée et qu'il faut un plan par vagues / sprints.
alwaysApply: false
---

# Roadmap de version (dossier `{version}/`)

## Quand utiliser

Une version (ex. V1) est **cadrée** dans la features list / spec (fichiers fournis par l’utilisateur) ; il faut un plan opérationnel avec cases à cocher (style roadmap MVP : sections numérotées, cases `[ ]` / `[x]`).

## Convention

- **Dossier** : chemin fourni par l’utilisateur (ex. `v1-produit/`, `planning/v2/`) — une version = un dossier dédié.
- **Roadmap principale** : `01-roadmap-v{n}.md` (le `n` du fichier = celui de la version).
- **Autres fichiers de la même version** : `02-nom-v{n}.md`, etc.

## Instructions

1. Créer ou ouvrir `{dossier-version}/01-roadmap-v{n}.md` ; s’appuyer sur un modèle existant du dépôt si l’utilisateur en fournit un, sinon structure type : objectifs, lots, tâches numérotées, critères de fin.
2. Dériver les tâches depuis la features list pour **cette version uniquement** ; ordre logique (fondations → features → durcissement).
3. Pour chaque tâche potentiellement **manuelle** (cloud, secrets, permis), prévoir un fichier `NN-nom-v{n}.md` dans le même dossier si l’utilisateur le souhaite.
4. Prévoir une section « **Après coup** » pour refacto / dette / petites features opportunistes.
5. Rappeler en bas : fin de version → `pnpm run verify:local` + mise à jour des **artefacts produit** (features list, issues) selon la convention de l’équipe.

## Sortie

Fichiers Markdown dans le **dossier de version** choisi uniquement ; pas de code sauf si une tâche d’implémentation est explicitement demandée après coup.
