# Bloc 3 : plan de la présentation orale

> Grille officielle : [`../referentiel/bloc-03-coordonner-piloter-projet.md`](../referentiel/bloc-03-coordonner-piloter-projet.md)

Document de travail : structure du support, minutage et matière à produire. Ce n'est pas un livrable jury.

## 1. Cadre de l'épreuve

| | |
|--|--|
| **Épreuve** | Simulation d'une situation de travail, présentation orale d'un projet |
| **Durée** | 45 minutes : 30 de présentation, 15 d'échanges avec le jury |
| **Date** | 16 septembre 2026 |
| **Candidat** | Adrien MORAND |
| **Jury** | 2 membres professionnels externes |
| **Livrable** | Un support de présentation au choix, plus une démonstration du logiciel |
| **Support retenu** | Slidev, même chaîne que le Bloc 1 (`slides/` avec `slides.md`, export PDF) |
| **Éliminatoires** | **C3.1**, **C3.2.1**, **C3.4.2** |
| **Validation** | Acquisition prononcée compétence par compétence, commentaire obligatoire en cas de non-acquisition |

### Les 14 éléments imposés

Le règlement énumère 14 éléments que la présentation doit comporter. Chacun est rattaché ci-dessous à une diapositive précise, pour qu'aucun ne soit implicite.

| # | Élément imposé | Compétence | Diapo |
|:-:|----------------|:----------:|:-----:|
| 1 | Présentation de la méthodologie choisie | C3.1 | 4 |
| 2 | Le planning détaillé du projet | C3.1 | 6, 7 |
| 3 | Les ressources nécessaires | C3.1 | 8 |
| 4 | L'outil de suivi de projet | C3.2.1 | 11 |
| 5 | Un cas d'arbitrage rencontré au cours du projet | C3.2.2 | 16 à 18 |
| 6 | L'affectation des missions réalisée au cours du projet | C3.3.1 | 19 |
| 7 | Le ou les styles managériaux utilisés | C3.3.1 | 20 |
| 8 | Les outils de communication utilisés et leurs objectifs | C3.3.1 | 21 |
| 9 | L'évaluation des besoins en compétences via grille | C3.3.2 | 25 |
| 10 | Le plan de développement des compétences | C3.3.2 | 26 |
| 11 | Les comptes rendus sur les évolutions et améliorations | C3.4.1 | 28 |
| 12 | La planification des points de validation réalisés | C3.4.1 | 27 |
| 13 | Les indicateurs de satisfaction mis en place | C3.4.1 | 29 |
| 14 | Une démonstration des fonctionnalités du logiciel | C3.4.2 | 30 |

## 2. Posture et fil rouge

Le projet a été **exécuté seul**, ce qui est déjà écrit dans les livrables des Blocs 1, 2 et 4. Le Bloc 3, lui, évalue le pilotage d'une équipe. La présentation tient donc deux registres, distingués à voix haute dès la diapositive 3 et jamais confondus ensuite :

- **Le réel**, chiffré et vérifiable : 833 commits du 27 février au 5 septembre 2026, 10 versions livrées en production, 77 pull requests dont 26 fusionnées, 3 fiches d'anomalie toutes fermées, 17 comptes utilisateurs, 19 soirées créées.
- **L'organisation cible**, annoncée comme telle : une équipe de 4 profils sur laquelle sont construits la matrice RACI, l'affectation des missions, la grille de compétences et le plan de développement. C'est la projection d'industrialisation du projet, pas une équipe qui a existé.

Cette annonce explicite est ce qui protège les 15 minutes de questions. Un jury qui découvre le caractère projeté en fin de présentation le vit comme une dissimulation ; un jury prévenu dès le début l'évalue comme un exercice de conception d'organisation.

**Règle de rédaction du support** : aucune formule qui laisse croire à une équipe salariée réelle. On écrit « l'organisation cible prévoit », « la mission serait affectée à », jamais « mon développeur front a livré ».

## 3. Minutage global

| Ch. | Séquence | Durée | Diapos | Compétence |
|:---:|----------|------:|:------:|:----------:|
| 0 | Ouverture, produit, cadre | 1:30 | 3 | |
| 1 | Méthodologie, planning, ressources | 6:30 | 7 | **C3.1** ÉLIM |
| 2 | Outil de suivi, indicateurs, tableaux de bord | 5:00 | 5 | **C3.2.1** ÉLIM |
| 3 | Cas d'arbitrage | 2:30 | 3 | C3.2.2 |
| 4 | Missions, styles managériaux, communication | 3:30 | 5 | C3.3.1 |
| 5 | Grille de compétences, plan de développement | 2:30 | 3 | C3.3.2 |
| 6 | Comptes rendus, points de validation, satisfaction | 2:30 | 3 | C3.4.1 |
| 7 | Démonstration en production | 5:30 | 2 | **C3.4.2** ÉLIM |
| 8 | Conclusion | 0:30 | 1 | |
| | **Total** | **30:00** | **32** | |

**Contrôle du minutage réel du support** (somme des durées portées en note de présentateur) : **30 minutes exactement**, et le minutage est exact **chapitre par chapitre**. Il a été rééquilibré le 5 septembre 2026 : la diapositive 6 passe de 1:20 à 1:10 pour ramener le chapitre 1 à sa cible de 6:30, et le chapitre 4 redistribue cinq secondes de la diapositive 22 vers la diapositive 23, la plus discriminante du chapitre.

Répartition volontaire : les trois compétences éliminatoires absorbent **17 des 30 minutes**, soit 57 %. Les quatre non éliminatoires se partagent 11 minutes. Une diapositive dure en moyenne 50 secondes hors démonstration, ce qui suppose des diapositives qui montrent une preuve et non un paragraphe.

## 4. Déroulé diapositive par diapositive

### Chapitre 0 : ouverture (1:30, 3 diapos)

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 1 | Movie Picker, piloter un projet de développement logiciel | 0:10 | Titre, Bloc 3 RNCP 39583, Adrien MORAND, 16 septembre 2026 |
| 2 | Le produit : un logiciel exploité, pas une maquette | 0:40 | Capture de l'application en production. 10 versions livrées de février à septembre 2026, 17 comptes, 19 soirées, 74 % menées jusqu'au tirage. Objectif : établir qu'on parle d'un logiciel réellement exploité, pas d'une maquette |
| 3 | Deux registres, annoncés maintenant | 0:40 | Les deux registres, réel et organisation cible. Plan en 7 temps |

### Chapitre 1 : planifier l'exécution du projet (6:30, 7 diapos), C3.1 ÉLIMINATOIRE

Critères visés : méthodologie justifiée avec bénéfices attendus, outil de planification argumenté et compatible avec la méthodologie, planning découpé en phases et lots faisant apparaître étude, mesure, conception, réalisation et restitution, tâches affectées selon les compétences via une matrice RACI tenant compte du handicap, points de vigilance soulignés.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 4 | La méthodologie : Kanban léger à revues de version | 1:10 | Le choix et ses bénéfices attendus : flux continu, priorisation permanente, pas de cérémonie inadaptée. Tableau des alternatives écartées avec le motif : Scrum (sprints et cérémonies calibrés pour une équipe), cycle en V (périmètre figé incompatible avec une roadmap par versions) |
| 5 | Deux outils de planification, deux horizons | 0:50 | Pourquoi ces deux outils, leurs bénéfices, et surtout leur **compatibilité avec Kanban** : le Gantt porte les phases et les jalons de version, le tableau Kanban porte le flux quotidien. Les deux ne se contredisent pas, ils opèrent à deux échelles de temps |
| 6 | Le planning en cinq phases | 1:10 | Diagramme de Gantt en HTML et CSS, du 27 février au 16 septembre 2026, avec les 5 phases exigées : étude, mesure, conception, réalisation, restitution. Dire explicitement que les phases se **chevauchent**, propriété d'un flux Kanban, et non se succèdent comme dans un cycle en V |
| 7 | Quatre lots, 98 jours-homme | 0:50 | Les 4 lots et leur charge : MVP 27 J/H, migration .NET 13, V1 produit 35, clôture RNCP 23. Total 98 J/H, méthode analogique, marge de 20 %. Source : chiffrage du Bloc 1 |
| 8 | Les ressources nécessaires | 0:50 | Trois familles. Humaines : les 4 profils de l'organisation cible et leur charge. Matérielles : poste de développement, outillage, services tiers. Financières : 34 300 € de valeur de développement, moins de 200 € par an de trésorerie réelle |
| 9 | La matrice RACI, et le handicap dedans | 0:50 | Tableau tâche par rôle avec R, A, C, I sur les 4 profils, plus les acteurs consultés et informés. Ligne dédiée à la prise en compte du handicap : poste adapté, outillage compatible lecteur d'écran, accessibilité du produit traitée comme exigence et non comme option |
| 10 | Les points de vigilance | 0:50 | Dépendance à l'API TMDB (clé, quotas, rupture de contrat), transport des emails transactionnels, durcissement CSP côté front, absence assumée de déploiement progressif, et le point de vigilance structurel : la concentration des rôles sur une personne |

### Chapitre 2 : piloter l'avancement (5:00, 5 diapos), C3.2.1 ÉLIMINATOIRE

Critères visés : outil de suivi en adéquation avec le projet et la méthodologie, indicateurs mesurables et quantifiables couvrant délais, coûts et avancement, tableaux de bord intégrant avancement, coûts, délais, risques et ressources humaines.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 11 | L'outil de suivi | 1:00 | GitHub comme outil unique, cinq surfaces : issues, pull requests, Actions, releases, fichiers de feuille de route versionnés. Le critère de choix énoncé : la distance entre le travail et sa trace, aucun indicateur ne reposant sur une saisie déclarative. Adéquation avec Kanban vérifiée propriété par propriété. Capture du tableau de flux si structuré avant l'oral |
| 12 | Comment un indicateur entre au tableau de bord | 1:00 | La règle de sélection en quatre conditions, dont « rattaché à une décision ». Les cinq axes : avancement, délais, coûts, risques, ressources humaines. Et les trois indicateurs **écartés** faute de mesurabilité |
| 13 | Tableau de bord : avancement et délais | 1:00 | Commits, jours actifs et fusions par mois (833, 88, 122), les 10 versions et leurs écarts réels, médiane de 17 jours, et les 4 échéances de restitution tenues. Deux lectures d'indicateur à porter à voix haute : le pic de fusions de juin est un changement de pratique, pas de production |
| 14 | Tableau de bord : coûts, risques, ressources | 1:00 | Coût réel contre budget, les deux échéances de coût suivies bien qu'elles vaillent zéro, les huit indicateurs de risque dont deux en alerte, le détail mensuel de la stabilité de la chaîne (52 % → 94 % après correction), et la soutenabilité de la charge : 3,1 jours par semaine mais une amplitude de 1 à 7 |
| 15 | L'écart n'est pas où on le cherche | 1:00 | 98 J/H prévus contre 88 reconstitués, mais un périmètre de +51 items jamais chiffrés : l'écart n'est pas un écart de charge, c'est un glissement de périmètre que rien ne mesurait. Les trois décisions prises à partir d'une mesure, et l'autocritique du dispositif. Elle amène naturellement le chapitre suivant |

### Chapitre 3 : le cas d'arbitrage (2:30, 3 diapos), C3.2.2

Critères visés : problématique exposée avec ses conséquences, options détaillées, décision argumentée qui résout la problématique. La grille nomme explicitement le **logigramme** comme outil d'aide à la décision.

**Cas retenu, confirmé par l'historique** : le remplacement de l'API Node/Express par ASP.NET Core, décidé le 18 mars 2026, deux jours après la livraison du MVP. La migration est **absente** de la feuille de route du MVP au moment où celui-ci est déclaré terminé, ce qui établit qu'il s'agit d'une décision prise en cours de projet et non de l'exécution d'un plan. Le lot est chiffré 13 J/H au Bloc 1, mais ce chiffrage a été formalisé en juin 2026, donc a posteriori : la formulation « non prévu au chiffrage » est à éviter, elle serait démentie par le dossier du Bloc 1 lui-même.

Deux cas de réserve pour les questions : le contrôle de performance instable qui bloquait les fusions (52 % → 94 % de succès de la chaîne), et l'abandon de l'application mobile (démarrée le 16/05/2026, archivée le 26/05). Le cas « environnement de test rejeté malgré un gain de 30 % » envisagé initialement n'a **aucune trace dans le dépôt** et a été retiré.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 16 | La dérive constatée et ses conséquences | 0:50 | La chronologie à l'heure près, les 4 exigences que l'API du MVP ne satisfaisait pas, et la conséquence qui tranche : le périmètre à réécrire pesait 944 lignes le 18 mars, la même API en porte 44 663 aujourd'hui. Le coût de la décision croissait chaque jour |
| 17 | Quatre options, et le logigramme qui tranche | 1:00 | **Logigramme** en HTML et CSS, écrit pour être réutilisable (aucune techno n'y figure), parcouru à voix haute sur le chemin réellement suivi. Les **quatre** options avec leur coût et leur risque, le temps utile allant à l'option D : migrer progressivement paraît plus prudent et ne l'est pas à effectif 1 |
| 18 | La décision, et ce qu'elle a produit | 0:40 | L'argumentation en 4 temps, le critère de succès défini avant de commencer, les 5 objectifs et leur résultat mesuré, et le bandeau d'honnêteté : les 87 lignes de front modifiées contre un objectif de zéro, et le chiffrage a posteriori du lot |

### Chapitre 4 : piloter l'équipe (3:30, 5 diapos), C3.3.1

Critères visés : handicap pris en compte, charge répartie de manière équilibrée, style managérial identifié et décrit, principes et techniques d'animation présentés et adaptés au projet, analyse critique d'une situation ou d'une posture, recommandations réalistes, outils collaboratifs intégrant le partage de ressources et choix pertinents.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 19 | L'organisation cible et l'affectation des missions | 0:50 | Les 4 profils, le critère d'affectation (compétence attestée, jamais disponibilité), et la répartition des 98 J/H. Le point à défendre : **une somme équilibrée n'est pas un équilibre** — le back porte 36 %, et l'équilibre se vérifie sur le profil de charge dans le temps |
| 20 | Les quatre styles managériaux, situés | 0:55 | Directif, persuasif, participatif, délégatif : chacun situé sur une situation concrète du projet plutôt que défini en théorie. Le style dominant est identifié et décrit |
| 21 | Animation, et les outils qui portent le partage | 0:40 | **Le dispositif réel de délégation** : le projet a été exécuté seul mais pas sans déléguer — conventions opposables (`AGENTS.md`), procédure à 3 points d'arrêt, revue en sortie. Puis les 8 outils avec ce que chacun **partage**. Aucun n'est une messagerie, et c'est délibéré : aucun n'exige la simultanéité |
| 22 | Inclusion : un seul dispositif, trois contraintes | 0:20 | Une seule idée : le **même dispositif** — l'écrit asynchrone versionné — répond au handicap, aux fuseaux horaires et à la langue. Ce n'est pas trois politiques, c'est une décision d'organisation. Preuves sur le réel : produit bilingue FR/EN, accessibilité en porte bloquante |
| 23 | Analyse critique : une posture qui a réussi | 0:45 | **Situation retenue : du 17 au 26 août 2026, 10 jours travaillés consécutifs** pour absorber deux échéances superposées (dossier Bloc 4 le 21, v1.4.0 le 25). Les deux sont tenues, et la chaîne passe de 94 % à 78 % le mois même, puis 38 % début septembre. La phrase centrale : *l'arbitrage n'a pas été perdu, il n'a pas été posé*. Trois recommandations avec leur indicateur de contrôle. Diapositive la plus discriminante du chapitre — le marqueur de sincérité est que la posture critiquée a **réussi** |

### Chapitre 5 : les besoins en compétences (2:30, 3 diapos), C3.3.2

Critères visés : compétences à mobiliser identifiées, grille des compétences actuelles et à acquérir commentée, plan de développement établi et détaillé, formations préconisées selon les besoins et les profils, modalités de formation adaptées au handicap.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 24 | Les compétences, déduites des lots | 0:40 | La **méthode** avant le catalogue : les compétences sont déduites des lots, et chacune correspond à une technologie présente dans le dépôt avec une date d'introduction vérifiable. La chronologie en **4 vagues** — produire, fiabiliser, exploiter, enrichir — et le lien avec le chapitre 3 : la vague 1 tient sur quatre jours et n'apparaît dans aucune ligne du chiffrage |
| 25 | La grille d'évaluation, et ce qu'elle avoue | 1:00 | Échelle **comportementale** en 5 niveaux, grille par profil, et surtout la phrase d'ouverture obligatoire : *le niveau actuel n'évalue personne, c'est le socle attendu au recrutement*. **Commentée à l'oral** en trois lectures, dont celle qui la rend crédible : les deux plus gros écarts du lead ne sont pas techniques et désignent les mêmes faiblesses que les indicateurs des chapitres 2 et 3 |
| 26 | Le plan de développement des compétences | 0:50 | 8 actions classées par **coût d'un écart non comblé**, chacune avec sa modalité, sa durée et son **indicateur de réussite** — 20 J/H, 2 100 €, 20 % de la charge projet. La logique **recruter ou former** transmise aux RH. Modalités handicap posées par défaut, en citant les trois qui ont un coût réel donc vérifiable |

### Chapitre 6 : rendre compte au commanditaire (2:30, 3 diapos), C3.4.1

Critères visés : comptes rendus clairs et ordonnés, facilitant la prise de décision du client, points de validation organisés pour assurer le suivi qualité, indicateurs de satisfaction définis et cohérents.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 27 | Les points de validation | 0:50 | **Deux commanditaires, deux rythmes** : le jury valide la conformité sur 4 échéances, les 17 utilisateurs valident l'usage sur 9 versions. Ce que chaque version validait, et surtout ce qui fait d'une livraison un point de validation **qualité** : 5 contrôles bloquants puis un test de fumée après déploiement. Un contrôle rouge annule la livraison |
| 28 | Le compte rendu qui fait décider | 0:50 | Trois niveaux, du plus automatique au plus décisionnel — dont la fenêtre de nouveautés in-app, seul compte rendu **poussé**. Le gabarit en 5 blocs dont 3 ne sont pas de l'information, la règle *aucun constat sans proposition, aucune proposition sans coût*, et un exemple réel complet avec son **critère d'arrêt énoncé d'avance** |
| 29 | Les indicateurs de satisfaction | 0:50 | Trois familles — comportementale, déclarative, opérationnelle — parce qu'à 17 comptes un indice de recommandation n'a aucune validité. Le 9,6 présenté pour ce qu'il est : l'absence de détracteur parmi les engagés, pas une mesure de satisfaction. Puis ce que les retours ont produit, en distinguant **déclenchée, confirmée, instruite non livrée**, et la boucle mesurée : **17 jours** du retour à la production |

### Chapitre 7 : la démonstration (5:30, 2 diapos), C3.4.2 ÉLIMINATOIRE

Critères visés : le logiciel est utilisable, la démonstration reprend les fonctionnalités attendues, le vocabulaire est adapté à une présentation client, la démonstration permet d'aboutir à une validation.

| # | Titre | Durée | Contenu |
|:-:|-------|------:|---------|
| 30 | Ce que je vais vous montrer | 0:20 | Annonce des 6 temps en vocabulaire client. **Changement de registre qui doit s'entendre** : diapositive épurée, débit ralenti. Précision que la démonstration se déroule sur la version en production, avec deux appareils. Le plan de repli à 4 niveaux est en note de présentateur |
| | **Démonstration en direct** | 4:50 | Parcours détaillé au point 5 |
| 31 | Ce qui est validé, ce qui vient ensuite | 0:20 | Le périmètre validé énoncé en 6 verbes, les 3 évolutions suivantes chiffrées et priorisées, puis **la demande de validation formulée telle quelle** : *sur cette base, je vous demande de valider le périmètre livré, pour engager le lot suivant*. C'est ce geste, et non la qualité de la démonstration, qui satisfait le 4e critère de C3.4.2 |

### Chapitre 8 : conclusion (0:30, 1 diapo)

| # | Titre | Durée | Contenu |
|:-:|-------|------:|---------|
| 32 | Bilan de pilotage | 0:30 | Trois enseignements de pilotage, dont un échec assumé. Ouverture sur les 15 minutes d'échange |

## 5. La démonstration en direct (4:50)

Éliminatoire, sur la version en production. Le vocabulaire est celui d'un client, jamais celui d'un développeur : on dit « la soirée est partagée par un lien », pas « le point d'entrée renvoie un identifiant ».

| Étape | Durée | Ce qui est montré | Fonctionnalité couverte |
|-------|------:|-------------------|-------------------------|
| 1 | 0:40 | Création d'une soirée : titre, date, paramètres | Parcours hôte |
| 2 | 0:40 | Partage par lien et QR code, un participant rejoint depuis un second appareil | Partage et arrivée d'un invité |
| 3 | 0:50 | Recherche et proposition de films, note de présentation | Intégration du catalogue de films |
| 4 | 0:50 | Vote, marqueur déjà vu, mise à jour visible côté hôte | Décision collective |
| 5 | 1:00 | Configuration puis lancement de la roue, film gagnant | Cœur du produit |
| 6 | 0:50 | Clôture, historique, profil public et statistiques | Suivi et dimension sociale |

**Préparation obligatoire** : la liste complète est en § 4 de [`07-demonstration.md`](07-demonstration.md) — 8 points la veille, 8 vérifications dans les dix minutes précédentes. Le **plan de repli à quatre niveaux** est en § 5, avec sa phrase de bascule préparée. La compétence est éliminatoire, elle ne peut pas dépendre du wifi d'une salle d'examen.

> **Détail du parcours, glossaire de vocabulaire client et séquence de clôture** : [`07-demonstration.md`](07-demonstration.md). Le tableau ci-dessus en est le résumé ; le script d'exécution, mot pour mot avec les libellés réels de l'interface, est dans le chapitre.

## 6. Diapositives annexes pour les 15 minutes d'échange

Placées après la conclusion, jamais présentées, appelées seulement si une question les demande.

| # | Page | Contenu |
|:-:|:----:|---------|
| A1 | **33** | Architecture technique : déploiement, découpage hexagonal de l'API, volume et qualité |
| A2 | **34** | Le logigramme d'arbitrage en version complète, avec le chemin réellement suivi le 18/03/2026 |
| A3 | **35** | Les deux arbitrages de réserve : la porte de qualité instable (52 % → 94 %), l'abandon de l'application mobile |
| A4 | **36** | Le budget prévisionnel détaillé : valeur de développement par lot, infrastructure poste par poste |
| A5 | **37** | La chaîne d'intégration et de déploiement, ses 15 jobs et leur caractère bloquant |
| A6 | **38** | La matrice RACI complète, 15 lignes, et ses trois propriétés |
| A7 | **39** | Le journal des versions et le détail de la v1.3.2, avec la traçabilité bidirectionnelle |
| A8 | **40** | Les retours utilisateurs question par question, et ce qu'ils ont produit |

**Navigation pendant les échanges** : en mode présentateur, taper le numéro de page puis `Entrée`. Les huit annexes ne sont jamais présentées ; elles portent la mention `ANNEXE` en bas à gauche.

## 7. Préparation des questions du jury

Les questions les plus probables sont celles qui touchent aux points faibles connus. Chacune doit avoir une réponse préparée, courte et honnête. Un jury de professionnels ne sanctionne pas une limite assumée, il sanctionne une limite dissimulée qu'il découvre lui-même.

| Question probable | Ligne de réponse |
|-------------------|------------------|
| Combien de personnes dans l'équipe ? | Le projet a été exécuté seul. L'organisation cible à 4 profils est annoncée comme projection dès le début de la présentation. Elle sert à démontrer la conception des outils de pilotage, pas à faire croire à une équipe |
| Vos étiquettes de version ont-elles été posées au fil de l'eau ? | Les dates de livraison réelles sont celles du journal des versions, vérifiables dans l'historique des commits et des déploiements. La formalisation du versionnage est intervenue en juillet 2026, les six premières étiquettes ont donc été posées à ce moment-là |
| Votre tableau de suivi semble récent | Le suivi quotidien s'est fait sur les issues, les pull requests, les exécutions du pipeline et les releases, toutes horodatées au moment du geste. Le tableau consolide cette matière, il ne la crée pas. La limite est écrite en 1.5 du chapitre 2 |
| Comment avez-vous estimé les 98 J/H ? | Méthode analogique par comparaison entre lots de complexité voisine, marge d'incertitude de 20 % assumée au chiffrage |
| Sept réponses, est-ce un échantillon valable ? | Non, et c'est écrit tel quel dans l'analyse. L'échantillon est réduit et orienté vers les utilisateurs les plus engagés. Le 9,6 n'est donc pas présenté comme une mesure de satisfaction mais comme l'absence de détracteur parmi les engagés ; les indicateurs comportementaux pèsent plus lourd dans les décisions |
| Pourquoi aucun déploiement progressif ? | Arbitrage documenté : coût de mise en place face au volume réel et à la tolérance de panne acceptée. Décision réversible, tracée |
| Qu'auriez-vous fait différemment ? | Réponse préparée sur la diapositive 23, avec une décision précise et son coût |

## 8. Matière à produire

Un fichier source par chapitre, qui alimente les diapositives. Le support ne se rédige pas directement dans `slides.md`.

| Fichier | Alimente | État |
|---------|----------|------|
| `01-planification.md` | Diapos 4 à 10, C3.1 | ✅ Produit |
| `02-suivi-indicateurs.md` | Diapos 11 à 15, C3.2.1 | ✅ Produit |
| `03-arbitrage.md` | Diapos 16 à 18, C3.2.2 | ✅ Produit |
| `04-management-equipe.md` | Diapos 19 à 23, C3.3.1 | ✅ Produit |
| `05-competences.md` | Diapos 24 à 26, C3.3.2 | ✅ Produit |
| `06-comptes-rendus.md` | Diapos 27 à 29, C3.4.1 | ✅ Produit |
| `07-demonstration.md` | Diapos 30 et 31, C3.4.2 | ✅ Produit |
| `slides/slides.md` | Le support complet | ✅ **40 diapositives** : les 32 présentées et les 8 annexes |

**Règle de numérotation du support** : aucune diapositive de séparation de chapitre. La page `N` de Slidev correspond exactement à la diapositive `N` de ce plan, et donc au rattachement des 14 éléments imposés du § 1. Le titre de chapitre est porté par la première diapositive du chapitre. Toute insertion impose de mettre à jour ce plan et la table `REFS` de `global-bottom.vue` dans le même mouvement.

Deux actions hors rédaction restent à mener : structurer le tableau GitHub Projects et en produire une capture pour la diapositive 11, et relever une capture de facturation GCP et AWS pour étayer la ligne « coût réel » de la diapositive 14.
