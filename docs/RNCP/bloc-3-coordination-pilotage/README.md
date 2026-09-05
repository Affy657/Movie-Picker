# Bloc 3 — Coordonner et piloter un projet de développement

> Grille officielle : [`../referentiel/bloc-03-coordonner-piloter-projet.md`](../referentiel/bloc-03-coordonner-piloter-projet.md) · Suivi : [`../suivi-rncp.md`](../suivi-rncp.md)

**État : 🟡 plan arrêté, chapitres 1 et 2 produits (C3.1 et C3.2.1, les deux compétences éliminatoires de l'écrit), chapitres 3 à 8 à produire.** Structure, minutage et mapping des 14 éléments imposés dans [`00-plan-presentation-orale.md`](00-plan-presentation-orale.md).

## Attendus du jury

- **Type d'évaluation** : simulation d'une situation de travail sous forme de **présentation orale** (pas de dossier écrit).
- **Durée** : **45 minutes**, dont 30 de présentation et 15 d'échanges avec le jury.
- **Date** : 16 septembre 2026.
- **Livrable** : un **support de présentation au choix** (Slidev retenu, même chaîne que le Bloc 1), complété par une **démonstration du logiciel** menée par le candidat.
- **Jury** : 2 professionnels externes ; acquisition / non-acquisition prononcée **compétence par compétence**.
- **Éliminatoires** : **C3.1**, **C3.2.1**, **C3.4.2**.

La présentation doit comporter **14 éléments imposés** par le règlement. Leur rattachement diapositive par diapositive est établi dans [`00-plan-presentation-orale.md`](00-plan-presentation-orale.md) § 1, afin qu'aucun ne reste implicite.

## Posture retenue

Le projet a été **exécuté seul**, comme les livrables des Blocs 1, 2 et 4 l'établissent. Les outils de pilotage d'équipe exigés par C3.3.1 et C3.3.2 (matrice RACI, affectation des missions, grille de compétences, plan de développement) sont donc construits sur une **organisation cible de 4 profils**, annoncée comme projection d'industrialisation dès l'ouverture de la présentation et jamais présentée comme une équipe réelle.

## Livrables attendus & matériau disponible

| Compétence | Livrable attendu | ÉLIM | Matériau |
|------------|------------------|:----:|----------|
| C3.1 | Méthodologie choisie, planning détaillé, ressources nécessaires | ✅ | ✅ [`01-planification.md`](01-planification.md) et diapos 4 à 10 |
| C3.2.1 | L'outil de suivi de projet, ses indicateurs et ses tableaux de bord | ✅ | ✅ [`02-suivi-indicateurs.md`](02-suivi-indicateurs.md) et diapos 11 à 15. Reste à produire hors rédaction : capture du tableau GitHub Projects, capture de facturation GCP et AWS |
| C3.2.2 | Un cas d'arbitrage rencontré au cours du projet, logigramme à l'appui | | `03-arbitrage.md` à produire ; cas pressenti : migration de l'API vers ASP.NET Core |
| C3.3.1 | Affectation des missions, styles managériaux, outils de communication | | `04-management-equipe.md` à produire ; organisation cible à 4 profils |
| C3.3.2 | Grille d'évaluation des compétences et plan de développement | | `05-competences.md` à produire |
| C3.4.1 | Comptes rendus, points de validation planifiés, indicateurs de satisfaction | | `06-comptes-rendus.md` à produire ; 9 versions datées du CHANGELOG, questionnaire utilisateurs (7 réponses, recommandation moyenne 9,6/10) |
| C3.4.2 | Démonstration des fonctionnalités devant le jury | ✅ | `07-demonstration.md` à produire ; application en production, parcours minuté et plan de repli |

## Fichiers du dossier

| Fichier | Contenu |
|---------|---------|
| [`00-plan-presentation-orale.md`](00-plan-presentation-orale.md) | Cadre de l'épreuve, minutage des 30 minutes, déroulé des 32 diapositives, script de démonstration, préparation des questions du jury |
| [`01-planification.md`](01-planification.md) | **C3.1** : méthodologie et alternatives écartées, rétroplanning et Gantt, planning en 5 phases, découpage en 4 lots et 98 J/H, ressources humaines, matérielles et financières, matrice RACI et prise en compte du handicap, 7 points de vigilance |
| [`02-suivi-indicateurs.md`](02-suivi-indicateurs.md) | **C3.2.1** : l'outil de suivi et son adéquation avec Kanban, les limites assumées du dispositif, 25 indicateurs sur 5 axes, deux tableaux de bord (avancement et délais ; coûts, risques et ressources humaines), analyse de l'écart prévisionnel / réel et les 3 décisions prises à partir d'une mesure |
| [`slides/`](slides/) | Le support Slidev. Chapitres 0 à 2 produits, diapositives 1 à 15 |
