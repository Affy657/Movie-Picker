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

- **Le réel**, chiffré et vérifiable : 713 commits du 27 février au 21 août 2026, 71 issues, 66 pull requests, 7 versions livrées en production, 17 comptes utilisateurs, 19 soirées créées.
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

Répartition volontaire : les trois compétences éliminatoires absorbent **17 des 30 minutes**, soit 57 %. Les quatre non éliminatoires se partagent 11 minutes. Une diapositive dure en moyenne 50 secondes hors démonstration, ce qui suppose des diapositives qui montrent une preuve et non un paragraphe.

## 4. Déroulé diapositive par diapositive

### Chapitre 0 : ouverture (1:30, 3 diapos)

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 1 | Movie Picker, piloter un projet de développement logiciel | 0:10 | Titre, Bloc 3 RNCP 39583, Adrien MORAND, 16 septembre 2026 |
| 2 | Le produit et son état aujourd'hui | 0:40 | Capture de l'application en production. 7 versions livrées de février à juillet 2026, 17 comptes, 19 soirées, 74 % menées jusqu'au tirage. Objectif : établir qu'on parle d'un logiciel réellement exploité, pas d'une maquette |
| 3 | Cadre de la présentation et plan | 0:40 | Les deux registres, réel et organisation cible. Plan en 7 temps |

### Chapitre 1 : planifier l'exécution du projet (6:30, 7 diapos), C3.1 ÉLIMINATOIRE

Critères visés : méthodologie justifiée avec bénéfices attendus, outil de planification argumenté et compatible avec la méthodologie, planning découpé en phases et lots faisant apparaître étude, mesure, conception, réalisation et restitution, tâches affectées selon les compétences via une matrice RACI tenant compte du handicap, points de vigilance soulignés.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 4 | La méthodologie : Kanban léger à revues de version | 1:10 | Le choix et ses bénéfices attendus : flux continu, priorisation permanente, pas de cérémonie inadaptée. Tableau des alternatives écartées avec le motif : Scrum (sprints et cérémonies calibrés pour une équipe), cycle en V (périmètre figé incompatible avec une roadmap par versions) |
| 5 | L'outil de planification : rétroplanning et Gantt | 0:50 | Pourquoi ces deux outils, leurs bénéfices, et surtout leur **compatibilité avec Kanban** : le Gantt porte les phases et les jalons de version, le tableau Kanban porte le flux quotidien. Les deux ne se contredisent pas, ils opèrent à deux échelles de temps |
| 6 | Le planning en 5 phases | 1:20 | Diagramme de Gantt Mermaid, du 27 février au 16 septembre 2026, avec les 5 phases exigées : étude, mesure, conception, réalisation, restitution. Dire explicitement que les phases se **chevauchent**, propriété d'un flux Kanban, et non se succèdent comme dans un cycle en V |
| 7 | Le découpage en lots et la charge | 0:50 | Les 4 lots et leur charge : MVP 27 J/H, migration .NET 13, V1 produit 35, clôture RNCP 23. Total 98 J/H, méthode analogique, marge de 20 %. Source : chiffrage du Bloc 1 |
| 8 | Les ressources nécessaires | 0:50 | Trois familles. Humaines : les 4 profils de l'organisation cible et leur charge. Matérielles : poste de développement, outillage, services tiers. Financières : 34 300 € de valeur de développement, moins de 200 € par an de trésorerie réelle |
| 9 | La matrice RACI | 0:50 | Tableau tâche par rôle avec R, A, C, I sur les 4 profils, plus les acteurs consultés et informés. Ligne dédiée à la prise en compte du handicap : poste adapté, outillage compatible lecteur d'écran, accessibilité du produit traitée comme exigence et non comme option |
| 10 | Les points de vigilance | 0:50 | Dépendance à l'API TMDB (clé, quotas, rupture de contrat), transport des emails transactionnels, durcissement CSP côté front, absence assumée de déploiement progressif, et le point de vigilance structurel : la concentration des rôles sur une personne |

### Chapitre 2 : piloter l'avancement (5:00, 5 diapos), C3.2.1 ÉLIMINATOIRE

Critères visés : outil de suivi en adéquation avec le projet et la méthodologie, indicateurs mesurables et quantifiables couvrant délais, coûts et avancement, tableaux de bord intégrant avancement, coûts, délais, risques et ressources humaines.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 11 | L'outil de suivi | 1:00 | GitHub comme outil unique : issues pour le travail à faire, pull requests pour la revue, tableau Projects pour le flux, Actions pour la vérification. Pourquoi c'est en adéquation avec Kanban : colonnes de flux, limite de travail en cours, pas de planification par sprint. Capture du tableau |
| 12 | Les indicateurs retenus | 1:00 | Tableau des indicateurs par axe, chacun mesurable et quantifiable, avec sa source et sa fréquence de relevé. Cinq axes : avancement, délais, coûts, risques, ressources humaines |
| 13 | Tableau de bord : avancement et délais | 1:00 | Commits par mois (1, 28, 72, 150, 227, 192, 43), versions livrées et leurs dates réelles, délai moyen entre ouverture d'issue et fusion, taux d'aboutissement des pull requests |
| 14 | Tableau de bord : coûts, risques, ressources | 1:00 | Coût d'infrastructure réel comparé au budget prévisionnel, vulnérabilités ouvertes, stabilité de la chaîne d'intégration, couverture de tests, et pour les ressources humaines l'indicateur de soutenabilité de la charge hebdomadaire |
| 15 | L'écart entre le prévisionnel et le réel | 1:00 | Les 98 J/H prévus face à la charge réellement consommée, l'origine des écarts, et ce que le pilotage en a fait. C'est la diapositive qui prouve que le suivi a servi à décider et pas seulement à mesurer. Elle amène naturellement le chapitre suivant |

### Chapitre 3 : le cas d'arbitrage (2:30, 3 diapos), C3.2.2

Critères visés : problématique exposée avec ses conséquences, options détaillées, décision argumentée qui résout la problématique. La grille nomme explicitement le **logigramme** comme outil d'aide à la décision.

**Cas retenu** : la migration de l'API de Node/Express vers ASP.NET Core en cours de projet, 13 J/H non prévus au chiffrage initial. À confirmer. Deux cas de réserve pour les questions : le contrôle Lighthouse instable qui bloquait les fusions, et le remplacement de l'environnement de test rejeté malgré son gain de 30 %.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 16 | La dérive constatée et ses conséquences | 0:50 | Le constat mesuré, et ce qu'il menaçait : décalage de la V1, charge non budgétée, risque sur les livrables du titre |
| 17 | Les options et le logigramme de décision | 1:00 | **Logigramme** Mermaid des critères de décision, et les trois options détaillées avec leur coût, leur délai et leur risque |
| 18 | La décision et son résultat mesuré | 0:40 | La décision, son argumentation, et la vérification a posteriori : ce que l'indicateur a montré après l'arbitrage |

### Chapitre 4 : piloter l'équipe (3:30, 5 diapos), C3.3.1

Critères visés : handicap pris en compte, charge répartie de manière équilibrée, style managérial identifié et décrit, principes et techniques d'animation présentés et adaptés au projet, analyse critique d'une situation ou d'une posture, recommandations réalistes, outils collaboratifs intégrant le partage de ressources et choix pertinents.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 19 | L'organisation cible et l'affectation des missions | 0:50 | Les 4 profils, les missions affectées selon les compétences, et la répartition des 98 J/H montrant l'équilibrage de la charge. Rappel qu'il s'agit de l'organisation cible |
| 20 | Les quatre styles managériaux | 0:55 | Directif, persuasif, participatif, délégatif : chacun situé sur une situation concrète du projet plutôt que défini en théorie. Le style dominant est identifié et décrit |
| 21 | Techniques d'animation et outils de communication | 0:40 | Chaque outil avec son objectif, et le critère de partage de ressources traité explicitement : dépôt, revue de code écrite, journal des décisions, documentation versionnée |
| 22 | Inclusion : handicap et contexte multiculturel | 0:25 | Intégration et poste de travail adapté, et le volet international : documentation et code en anglais, interface bilingue, fuseaux horaires |
| 23 | Analyse critique d'une posture et recommandations | 0:40 | Une situation où la posture adoptée a été contre-productive, l'analyse de ce qui n'a pas fonctionné, et deux ou trois recommandations réalistes. C'est la diapositive la plus discriminante du chapitre : un jury de professionnels distingue immédiatement une autocritique sincère d'une autocritique de façade |

### Chapitre 5 : les besoins en compétences (2:30, 3 diapos), C3.3.2

Critères visés : compétences à mobiliser identifiées, grille des compétences actuelles et à acquérir commentée, plan de développement établi et détaillé, formations préconisées selon les besoins et les profils, modalités de formation adaptées au handicap.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 24 | Les compétences à mobiliser | 0:40 | Cartographie des compétences que le projet exige, techniques et transverses, rattachées aux lots qui les mobilisent |
| 25 | La grille d'évaluation des compétences | 1:00 | Grille niveau actuel, niveau cible, écart, par profil et par compétence, avec l'échelle utilisée. **Commentée à l'oral** : le critère exige un commentaire et pas seulement un tableau affiché |
| 26 | Le plan de développement des compétences | 0:50 | Les actions de montée en compétences, les formations préconisées par profil, et les modalités adaptées au handicap : aménagement matériel, temps supplémentaire, supports accessibles |

### Chapitre 6 : rendre compte au commanditaire (2:30, 3 diapos), C3.4.1

Critères visés : comptes rendus clairs et ordonnés, facilitant la prise de décision du client, points de validation organisés pour assurer le suivi qualité, indicateurs de satisfaction définis et cohérents.

| # | Titre | Durée | Contenu et preuve à l'écran |
|:-:|-------|------:|------------------------------|
| 27 | La planification des points de validation | 0:50 | Les 7 versions livrées comme points de validation datés : 0.1.0 le 27/02, 1.0.0 le 19/05, 1.1.0 le 25/05, 1.2.0 le 11/06, 1.3.0 le 19/06, 1.3.1 le 08/07, 1.3.2 le 25/07. Ce que chaque point validait et comment il assurait le suivi qualité |
| 28 | Le compte rendu type | 0:50 | Le format retenu et un exemple complet sur une version : périmètre livré, écarts, décisions à prendre. Montrer en quoi il **facilite une décision** et ne se limite pas à informer |
| 29 | Les indicateurs de satisfaction | 0:50 | Les indicateurs réellement en place et leurs mesures : recommandation moyenne 9,6 sur 10 (7 répondants sur 17, limite d'échantillon assumée), 74 % des soirées menées jusqu'au tirage, 18 % d'adoption des notifications, latence p95 à 207 ms, taux d'erreur de 0,026 %. Et surtout : les deux décisions produit que ces retours ont déclenchées |

### Chapitre 7 : la démonstration (5:30, 2 diapos), C3.4.2 ÉLIMINATOIRE

Critères visés : le logiciel est utilisable, la démonstration reprend les fonctionnalités attendues, le vocabulaire est adapté à une présentation client, la démonstration permet d'aboutir à une validation.

| # | Titre | Durée | Contenu |
|:-:|-------|------:|---------|
| 30 | Ce que je vais vous montrer | 0:20 | Annonce du parcours en vocabulaire client, sans terme technique. Précision que la démonstration se déroule sur la version en production |
| | **Démonstration en direct** | 4:50 | Parcours détaillé au point 5 |
| 31 | Ce qui est validé, ce qui vient ensuite | 0:20 | Retour sur support : le périmètre validé, et les évolutions suivantes déjà arbitrées |

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

**Préparation obligatoire** : un compte de démonstration et une soirée pré-remplie créés la veille, un second appareil pour le rôle du participant, et un **plan de repli** si le réseau de la salle tombe : vidéo du parcours complet enregistrée à l'avance, plus l'environnement local prêt à démarrer. La compétence est éliminatoire, elle ne peut pas dépendre du wifi d'une salle d'examen.

## 6. Diapositives annexes pour les 15 minutes d'échange

Placées après la conclusion, jamais présentées, appelées seulement si une question les demande.

| # | Contenu |
|:-:|---------|
| A1 | Architecture technique de l'application |
| A2 | Le logigramme d'arbitrage en version complète |
| A3 | Les deux arbitrages de réserve |
| A4 | Le budget prévisionnel détaillé |
| A5 | La chaîne d'intégration et de déploiement continus |
| A6 | La matrice RACI en version complète |
| A7 | Le journal des versions et le détail d'une release |
| A8 | Les retours utilisateurs question par question |

## 7. Préparation des questions du jury

Les questions les plus probables sont celles qui touchent aux points faibles connus. Chacune doit avoir une réponse préparée, courte et honnête. Un jury de professionnels ne sanctionne pas une limite assumée, il sanctionne une limite dissimulée qu'il découvre lui-même.

| Question probable | Ligne de réponse |
|-------------------|------------------|
| Combien de personnes dans l'équipe ? | Le projet a été exécuté seul. L'organisation cible à 4 profils est annoncée comme projection dès le début de la présentation. Elle sert à démontrer la conception des outils de pilotage, pas à faire croire à une équipe |
| Vos étiquettes de version ont-elles été posées au fil de l'eau ? | Les dates de livraison réelles sont celles du journal des versions, vérifiables dans l'historique des commits et des déploiements. La formalisation du versionnage est intervenue en juillet 2026, les six premières étiquettes ont donc été posées à ce moment-là |
| Votre tableau de suivi semble récent | Le suivi quotidien s'est fait sur les issues et les pull requests, datées et vérifiables. Le tableau consolide cette matière |
| Comment avez-vous estimé les 98 J/H ? | Méthode analogique par comparaison entre lots de complexité voisine, marge d'incertitude de 20 % assumée au chiffrage |
| Sept réponses, est-ce un échantillon valable ? | Non, et c'est écrit tel quel dans l'analyse. L'échantillon est réduit et orienté vers les utilisateurs les plus engagés. Les retours sont traités comme des signaux à confirmer, pas comme des mesures |
| Pourquoi aucun déploiement progressif ? | Arbitrage documenté : coût de mise en place face au volume réel et à la tolérance de panne acceptée. Décision réversible, tracée |
| Qu'auriez-vous fait différemment ? | Réponse préparée sur la diapositive 23, avec une décision précise et son coût |

## 8. Matière à produire

Un fichier source par chapitre, qui alimente les diapositives. Le support ne se rédige pas directement dans `slides.md`.

| Fichier | Alimente | État |
|---------|----------|------|
| `01-planification.md` | Diapos 4 à 10, C3.1 | À produire |
| `02-suivi-indicateurs.md` | Diapos 11 à 15, C3.2.1 | À produire |
| `03-arbitrage.md` | Diapos 16 à 18, C3.2.2 | À produire |
| `04-management-equipe.md` | Diapos 19 à 23, C3.3.1 | À produire |
| `05-competences.md` | Diapos 24 à 26, C3.3.2 | À produire |
| `06-comptes-rendus.md` | Diapos 27 à 29, C3.4.1 | À produire |
| `07-demonstration.md` | Diapos 30 et 31, C3.4.2 | À produire |
| `slides/slides.md` | Le support complet | À produire |

Deux actions hors rédaction restent à mener : structurer le tableau GitHub Projects, et relever les mesures de coût d'infrastructure réel pour la diapositive 14.
