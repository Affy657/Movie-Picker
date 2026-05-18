---
name: mp-sprint-ticket
description: Crée des tickets Markdown de sprint concis et des roadmaps de sprint avec un petit en-tête YAML. L'utilisateur indique le dossier racine des sprints (backlog / tickets).
---

# mp-sprint-ticket

Modèles : [templates/ticket-index.md](templates/ticket-index.md) · [templates/sprint-roadmap.md](templates/sprint-roadmap.md)  
Emplacements : **dossier racine fourni par l’utilisateur** (ex. `sprint/{nom-sprint}/`, `sprint/backlog/tickets/`).

**Règles** : `MP-XX` + slug kebab unique ; statuts `Todo` | `In progress` | `In review` | `Done` ; tickets du sprint sous `{racine}/{dossier-sprint}/tickets/…`, backlog sous `{racine}/backlog/tickets/…` (adapter `{racine}` au projet). Pas de champs YAML vers `.cursor` ou autres dépendances inutiles. Corps **court** : faits, tâches, critères de vérif — pas de prose process / agent.

Ticket : YAML (`id`, `status`) puis `# Titre` et sections au besoin (souvent Contexte, tâches, Vérification). Roadmap sprint : YAML (`sprint_id`, `folder`, `name`, `objective`) + table Tickets + le strict nécessaire.

Nouveau ticket dans un sprint : ajouter une ligne dans la table **Tickets** de la roadmap du sprint.

**Checklist** : YAML valide · bons chemins sprint/backlog · table Tickets à jour · pas de blocs vides décoratifs.
