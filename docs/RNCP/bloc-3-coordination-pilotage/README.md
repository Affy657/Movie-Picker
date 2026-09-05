# Bloc 3 — Coordonner et piloter un projet de développement

> Grille officielle : [`../referentiel/bloc-03-coordonner-piloter-projet.md`](../referentiel/bloc-03-coordonner-piloter-projet.md) · Suivi : [`../suivi-rncp.md`](../suivi-rncp.md)

**État : ✅ support complet — 7 chapitres de matière, 40 diapositives (32 présentées + 8 annexes), les 14 éléments imposés rattachés et les 3 compétences éliminatoires couvertes. Reste la préparation matérielle de la démonstration (§ *Actions hors rédaction*).** Structure, minutage et mapping des 14 éléments imposés dans [`00-plan-presentation-orale.md`](00-plan-presentation-orale.md).

> 🧭 **Vous reprenez ce dossier ?** Commencez par [`PASSATION.md`](PASSATION.md) — il dit comment travailler ici sans casser ce qui existe. Ce qui reste à faire est dans [`RESTE-A-FAIRE.md`](RESTE-A-FAIRE.md).

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
| C3.2.2 | Un cas d'arbitrage rencontré au cours du projet, logigramme à l'appui | | ✅ [`03-arbitrage.md`](03-arbitrage.md) et diapos 16 à 18. Cas confirmé : le remplacement de l'API Node/Express par ASP.NET Core, décidé le 18/03/2026 |
| C3.3.1 | Affectation des missions, styles managériaux, outils de communication | | ✅ [`04-management-equipe.md`](04-management-equipe.md) et diapos 19 à 23. Organisation cible à 4 profils **et** dispositif réel de délégation, analyse critique sur la série de 10 jours du 17 au 26/08/2026 |
| C3.3.2 | Grille d'évaluation des compétences et plan de développement | | ✅ [`05-competences.md`](05-competences.md) et diapos 24 à 26. Grille étalonnée sur la chronologie d'introduction réelle des technologies dans le dépôt |
| C3.4.1 | Comptes rendus, points de validation planifiés, indicateurs de satisfaction | | ✅ [`06-comptes-rendus.md`](06-comptes-rendus.md) et diapos 27 à 29. Deux commanditaires distingués, 3 niveaux de compte rendu, gabarit décisionnel, et la boucle retour → production mesurée à 17 jours |
| C3.4.2 | Démonstration des fonctionnalités devant le jury | ✅ | ✅ [`07-demonstration.md`](07-demonstration.md) et diapos 30 à 31. Parcours minuté en 6 étapes sur les libellés réels de l'interface, glossaire de vocabulaire client, préparation en 16 points, plan de repli à 4 niveaux, séquence de clôture qui **demande** la validation |

## Fichiers du dossier

| Fichier | Contenu |
|---------|---------|
| [`PASSATION.md`](PASSATION.md) | **À lire avant de toucher au dossier** : état exact, règles d'écriture à ne pas enfreindre, sources de vérité des chiffres, pièges rencontrés, et scripts de vérification prêts à l'emploi |
| [`RESTE-A-FAIRE.md`](RESTE-A-FAIRE.md) | **Ce qui reste à faire** : actions bloquantes pour la compétence éliminatoire, preuves à produire, finalisation du support, points de vigilance de relecture, décisions en suspens |
| [`00-plan-presentation-orale.md`](00-plan-presentation-orale.md) | Cadre de l'épreuve, minutage des 30 minutes, déroulé des 32 diapositives, script de démonstration, préparation des questions du jury |
| [`01-planification.md`](01-planification.md) | **C3.1** : méthodologie et alternatives écartées, rétroplanning et Gantt, planning en 5 phases, découpage en 4 lots et 98 J/H, ressources humaines, matérielles et financières, matrice RACI et prise en compte du handicap, 7 points de vigilance |
| [`02-suivi-indicateurs.md`](02-suivi-indicateurs.md) | **C3.2.1** : l'outil de suivi et son adéquation avec Kanban, les limites assumées du dispositif, 25 indicateurs sur 5 axes, deux tableaux de bord (avancement et délais ; coûts, risques et ressources humaines), analyse de l'écart prévisionnel / réel et les 3 décisions prises à partir d'une mesure |
| [`03-arbitrage.md`](03-arbitrage.md) | **C3.2.2** : le cas d'arbitrage instruit (remplacement de l'API), sa chronologie datée, les 4 options avec leur coût et leur risque, les 5 critères de décision, le **logigramme** réutilisable, la décision argumentée et son résultat mesuré — y compris les deux objectifs non tenus. Les 2 arbitrages de réserve pour les questions |
| [`04-management-equipe.md`](04-management-equipe.md) | **C3.3.1** : le dispositif réel de délégation et ce qu'il apprend, puis l'organisation cible — affectation des missions, équilibrage de la charge vérifié dans le temps, les 4 styles managériaux situés sur des situations du projet, les 8 outils collaboratifs et ce que chacun partage, l'inclusion traitée par l'écrit asynchrone. Analyse critique d'une posture datée et ses 3 recommandations |
| [`05-competences.md`](05-competences.md) | **C3.3.2** : la chronologie d'introduction des technologies en 4 vagues, la cartographie des compétences déduite des lots, une grille d'évaluation à échelle comportementale commentée en 4 lectures, un plan de développement de 8 actions classées par coût d'un écart non comblé (20 J/H, 2 100 €), la logique recruter / former transmise aux RH, et les modalités de formation adaptées au handicap |
| [`06-comptes-rendus.md`](06-comptes-rendus.md) | **C3.4.1** : les deux commanditaires et leurs rythmes, les 9 versions et les 4 échéances comme points de validation, les 5 contrôles bloquants qui font d'une livraison un point qualité, 3 niveaux de compte rendu dont un poussé, le gabarit décisionnel et son exemple réel, les indicateurs de satisfaction en 3 familles avec leur limite d'échantillon, et la boucle retour → production mesurée à 17 jours |
| [`07-demonstration.md`](07-demonstration.md) | **C3.4.2 ÉLIM** : les 4 critères traduits en exigences concrètes, le parcours en 6 étapes minutées avec l'écran, le geste et la phrase, la vérification de couverture fonctionnelle, le glossaire de traduction technique → client, la préparation la veille et le jour même, le plan de repli à 4 niveaux, et la séquence de clôture qui demande la validation |
| [`slides/`](slides/) | Le support Slidev **complet** : 40 diapositives, dont 32 présentées et 8 annexes appelées sur question |

---

## Ce qui reste à faire

La rédaction est terminée. Tout ce qui reste est **matériel ou humain** et ne peut pas être rédigé : répétitions minutées, jeu de données de démonstration, vidéo de repli, environnement local, deux captures de preuve, export PDF.

👉 **La liste complète, priorisée, est dans [`RESTE-A-FAIRE.md`](RESTE-A-FAIRE.md)** — avec les points de vigilance relevés en relecture et les décisions en suspens.

> Quatre des actions listées conditionnent **C3.4.2**, compétence éliminatoire qui ne peut pas dépendre du réseau d'une salle d'examen.
