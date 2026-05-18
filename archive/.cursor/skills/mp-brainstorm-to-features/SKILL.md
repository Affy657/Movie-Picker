---
name: mp-brainstorm-to-features
description: Nettoie un brainstorm en structure prête pour la features list du dépôt (versions, MoSCoW, dépendances). Utiliser après une session d'idées avant d'éditer le fichier.
alwaysApply: false
---

# Brainstorm → features list

## Quand utiliser

Après une phase d'idéation (agent `mp-po` ou chat libre) : produire une **sortie structurée** pour un humain qui mettra à jour la **features list** du dépôt.

## Instructions

1. Reprendre la spec et la features list **déjà présentes** dans le dépôt (fichiers indiqués par l'utilisateur si besoin) pour éviter les doublons.
2. Regrouper les idées par **version cible** (V1, V2, plus tard…).
3. Pour chaque idée : **must / should / could**, une phrase « valeur utilisateur », **dépendances** éventuelles.
4. Lister explicitement ce qui est **hors scope** pour cette version.
5. Ne pas inventer de détail d'implémentation (API, schéma Mongo) — une note « impact tech à estimer » suffit.

## Sortie

Markdown prêt à coller ou à transformer en patch : sections `### Version Vx`, listes à puces, tableau optionnel des dépendances.
