# 04 Piloter le travail, seul

> **RNCP 39583 Bloc 3, C3.3.1**
>
> **Compétence** : piloter l'équipe tout au long du projet en affectant les missions à réaliser, en prenant en compte les personnes en situation de handicap, en intégrant les spécificités d'un contexte multiculturel et international, en utilisant les différentes techniques de communication et managériales, en veillant au respect du plan établi.
>
> **Livrables attendus** : l'affectation des missions réalisée au cours du projet, le ou les styles managériaux utilisés, les outils de communication utilisés et leurs objectifs.
>
> **Critères d'évaluation**
> - Les spécificités des personnes en situation de handicap sont prises en compte.
> - La charge de travail est répartie sur l'ensemble de l'équipe de manière équilibrée.
> - Le style managérial est identifié et décrit.
> - Les grands principes et techniques de gestion managériale et d'animation d'équipe sont présentés et adaptés au projet.
> - Une analyse critique d'une situation ou d'une posture managériale dans la gestion du projet est présentée.
> - Les recommandations sont réalistes et réalisables dans leur mise en œuvre.
> - Les outils collaboratifs utilisés intègrent le partage de ressources, et les choix d'outils sont pertinents au regard de l'objectif poursuivi.

Alimente les diapositives 14 à 17.

**Posture de ce chapitre.** Le projet a été mené par une seule personne, et le chapitre le dit sans détour : il n'y a pas d'équipe, pas de délégation à une autre personne, et aucun acteur intermédiaire n'est inventé pour remplir le critère. Ce qui est présenté, c'est **comment une personne a affecté ses missions dans le temps et à l'automatisation**, les styles qu'elle a appliqués au processus et à elle-même, ce qu'elle a mis en place pour les trois publics du projet, et une analyse critique d'une posture réelle et mesurée.

---

## Partie A. Une personne, toutes les missions

### A.1 L'affectation des missions dans le temps

Le critère demande **l'affectation des missions réalisée au cours du projet**. Une personne portant toutes les missions, l'affectation ne se lit pas entre profils mais **dans le temps** : quelle mission a occupé quel mois. La mesure est faite sur les 833 commits de la branche principale au 5 septembre 2026, classés en quatre missions par le préfixe du message de commit (`feat`, `fix`, `test`, `ci`, `docs`...), et par mots-clés pour les 184 messages sans préfixe, surtout ceux de mars et d'avril.

| Mission | Ce qu'elle contient | Commits | Part |
|---------|---------------------|--------:|-----:|
| **Produit** | Fonctionnalités, performance, interface | 201 | 24 % |
| **Fiabilité** | Correctifs, tests, refactorisations, style | 427 | 51 % |
| **Chaîne, dépendances, exploitation** | Intégration continue, montées de version, configuration, publication | 107 | 13 % |
| **Documentation, pilotage** | Dossiers, feuilles de route, journal des versions | 98 | 12 % |

| Mois | Commits | Produit | Fiabilité | Chaîne | Documentation |
|------|--------:|--------:|----------:|-------:|--------------:|
| Mars | 28 | 14 % | 72 % | 14 % | 0 % |
| Avril | 72 | 44 % | 35 % | 8 % | 13 % |
| Mai | 150 | 33 % | 50 % | 13 % | 4 % |
| Juin | 227 | 19 % | 64 % | 9 % | 8 % |
| Juillet | 194 | 12 % | 50 % | 17 % | 21 % |
| Août | 127 | 29 % | 43 % | 13 % | 15 % |
| Septembre, 5 jours | 34 | 32 % | 35 % | 24 % | 9 % |

Trois lectures, à dire à l'oral :

1. **Mars est presque entièrement de la fiabilisation** : c'est la migration de l'API, faite à la main, puis stabilisée.
2. **Juin, le mois de la V1 consolidée, est le mois où deux commits sur trois sont des correctifs et des tests.** Le produit s'est payé en fiabilité, pas en fonctionnalités : sur le projet entier, un commit sur deux relève de cette mission.
3. **Juillet est le seul mois où la documentation dépasse 20 %**, autour des deux remises de dossier du titre. La documentation n'est pas un lot de fin de projet, elle suit les échéances de restitution.

### A.2 Ce qui reste à la main, ce qui est confié à la chaîne

La seule répartition réelle du projet est celle qui sépare ce qu'une personne fait elle-même de ce qu'elle confie à l'automatisation. Elle n'a de sens que parce que le contrôle est en sortie : ce qu'une machine vérifie n'est jamais recontrôlé à la main, et ce qui engage le projet n'est jamais confié à une machine.

| À la main | Pourquoi |
|-----------|----------|
| Cadrage et maquette, avant toute ligne de code | C'est là que se décide ce qui sera livré, et une erreur d'interprétation y coûte le plus cher |
| Arbitrages de périmètre, de charge et de socle | Ils engagent le projet, et ils sont consignés par écrit |
| Revue avant intégration | Le gabarit de pull request à six contrôles : tests locaux, lint et format, couverture du changement, documentation, journal des versions, issue référencée |
| Mise en production et incidents | Un geste vérifié par un test de fumée et des sondes, jamais un automatisme lancé sans regarder |
| Restitutions | Au commanditaire sur quatre échéances, aux utilisateurs à chaque version |

| Confié à la chaîne | Ce qui le rend sûr |
|--------------------|--------------------|
| Tests, analyse statique, scans de vulnérabilités et de secrets | Portes bloquantes : un contrôle rouge refuse le déploiement |
| Déploiement et test de fumée | À chaque fusion sur la branche principale, avec vérification de la joignabilité réelle de la base |
| Montées de dépendances | Dependabot, regroupées mensuellement, auditées à chaque commit |
| Alertes de supervision | Cinq politiques d'alerte, trois sondes sur trois continents |

### A.3 La charge, et ce que le critère ne peut pas mesurer ici

Le critère demande une charge **répartie sur l'ensemble de l'équipe de manière équilibrée**. Il n'y a pas d'équipe, donc pas de répartition entre personnes, et le dire vaut mieux qu'une répartition inventée. Ce qui existe et se mesure, c'est **la charge dans le temps**, relevée au chapitre 2 : 88 jours actifs sur 191, une amplitude de 1 à 7 jours par semaine, une série de 10 jours consécutifs, 5 semaines à zéro. Elle n'a pas été équilibrée non plus : elle a été absorbée plutôt que pilotée, et c'est l'objet de l'analyse critique de la partie C.

---

## Partie B. Les styles, l'animation, l'inclusion

### B.1 Les quatre styles managériaux, situés

Le critère demande que le style soit **identifié et décrit**. À une personne, le management s'exerce sur le processus, sur l'automatisation et sur soi-même. Les quatre styles du management situationnel sont ici rattachés à une situation réelle du projet, pas définis en théorie.

| Style | Situation du projet où il s'applique | Pourquoi celui-là |
|-------|--------------------------------------|-------------------|
| **Directif** | Le durcissement des portes de qualité en juillet 2026 : la chaîne était à 52 % de succès et les échecs devenaient contournables. La règle est posée sans négociation : un contrôle rouge bloque le déploiement | La compétence n'était pas en cause, la discipline l'était. Le directif est le seul style qui tienne quand l'enjeu est la conformité et que la tentation de contourner existe, y compris pour soi-même |
| **Persuasif** | Les conventions du dépôt : la règle « ne jamais écrire de commentaire dans le code » est accompagnée de son motif : si l'intention n'est pas exprimable par le nommage, c'est le code qu'il faut refactoriser | Une règle contre-intuitive n'est appliquée que si elle est comprise. Énoncée seule, elle est contournée dès la première gêne, par son auteur comme par un autre |
| **Participatif** | Les utilisateurs : questionnaire, fiches d'anomalie et d'idée ouvertes, retours intégrés à la feuille de route. Deux décisions produit ont été déclenchées par ces retours | Ceux qui utilisent le produit détiennent une information que le responsable n'a pas. Décider sans la solliciter, c'est décider moins bien |
| **Délégatif** | À l'automatisation : tout ce qu'une machine vérifie, tests, analyse, scans, déploiement, test de fumée, n'est jamais recontrôlé à la main. La décision reste humaine | La délégation à la chaîne n'est possible que parce que la règle est écrite et la porte de sortie bloquante. Sans cela, ce n'est pas de la délégation, c'est de l'abandon |

**Le style dominant est le délégatif à l'automatisation** : confier à la chaîne tout ce qui est vérifiable mécaniquement, conserver la décision, contrôler en sortie. Il est adapté à ce projet pour une raison simple : c'est le seul style qui reste soutenable quand la capacité de contrôle humain est la ressource la plus rare.

**Sa condition de validité, et sa limite** : il ne fonctionne que si la règle est écrite *avant*, et que la porte est bloquante. Une chaîne dont on peut contourner les contrôles n'est pas une délégation, c'est une absence de contrôle. C'est ce qui fait du durcissement de juillet une décision managériale et pas seulement une correction technique.

### B.2 Les techniques d'animation et les outils de communication

Le critère nomme l'empathie, l'écoute, la bienveillance et le leadership. Chacune est ici traduite en **dispositif** plutôt qu'en intention : une posture qui ne s'incarne pas dans un outil ou une procédure n'est pas vérifiable.

| Principe | Dispositif qui l'incarne | Trace |
|----------|--------------------------|-------|
| **Écoute** | Trois canaux entrants outillés : bouton « Proposer une idée » créant une issue, lien « Signaler un problème » pré-rempli avec le contexte technique, questionnaire utilisateurs | Issues étiquetées `idée-utilisateur`, `bug` |
| **Bienveillance** | Le gabarit d'anomalie décrit un **comportement attendu et observé**, jamais une responsabilité. La qualification cherche une cause, pas un coupable | `.github/ISSUE_TEMPLATE/bug_report.yml` |
| **Empathie** | Le délai de réponse à un retour : 17 jours entre le questionnaire du 18 août et le correctif en production, et une réponse écrite à chaque fiche ouverte | Fiche ouverte le 19/08, close le 26/08, v1.4.1 le 04/09 |
| **Leadership** | Décider avec l'information disponible et l'assumer par écrit, y compris les inconvénients acceptés, le cas d'arbitrage du chapitre 3 | Document d'aide à la décision du 18/03/2026 |

**Trois publics, et ce que chacun reçoit.** Il n'y a pas d'équipe à animer ; il y a trois publics à servir, et tout ce qu'ils reçoivent est écrit et versionné.

| Public | Ce qu'il reçoit | Objectif |
|--------|-----------------|----------|
| **Les utilisateurs** | La fenêtre de nouveautés à chaque version, le questionnaire, le lien « signaler un problème » | Savoir ce qui a changé sans rien demander, et pouvoir répondre |
| **Le commanditaire** | Quatre restitutions datées, les comptes rendus d'arbitrage | Valider la conformité, décider sur une proposition chiffrée |
| **Le contributeur à venir** | Les conventions écrites avec leur motif, les gabarits, les procédures exécutables | Être opérationnel en une journée, sans savoir oral à transmettre |

**Les outils de communication et le partage de ressources.** Le critère est explicite : les outils doivent **intégrer le partage de ressources**. Tous les outils ci-dessous sont versionnés dans le dépôt, donc accessibles, datés et modifiables par toute personne qui le clone.

| Outil | Objectif poursuivi | Ce qu'il partage |
|-------|--------------------|------------------|
| **Dépôt unique en monorepo** | Une seule source de vérité pour le code, la documentation, les feuilles de route et l'infrastructure | L'ensemble du contexte projet, en un lieu, versionné |
| **Conventions du dépôt** | Rendre les règles opposables sans arbitrage au cas par cas | Le référentiel de règles et leurs motifs |
| **Gabarits d'issue** (anomalie, idée) | Qualifier une demande entrante de façon homogène, quel qu'en soit l'émetteur | Un formulaire structuré, donc une qualification comparable |
| **Gabarit de pull request** | Ne pas dépendre de la mémoire pour les contrôles d'intégration | Une liste de six vérifications, identique à chaque changement |
| **Actions composites de la chaîne** | Ne pas dupliquer la configuration d'environnement entre les jobs | Des briques d'intégration réutilisables |
| **Procédures exécutables** | Transformer une connaissance orale en procédure suivable | Le flux de réalisation et la méthode de vérification |
| **`CHANGELOG.md` et releases** | Rendre compte sans exiger la lecture du code | L'état livré, version par version |
| **Feuilles de route versionnées** | Tenir le backlog priorisé là où chaque modification est datée et attribuable | Le périmètre et ses évolutions |

Le point à dire : **aucun de ces outils n'est un outil de communication au sens d'une messagerie.** C'est délibéré. Sur un projet dont les acteurs ne sont pas synchrones, l'écrit versionné est le seul canal qui reste consultable après coup, qui n'oblige personne à être présent au bon moment, et qui ne perd pas l'information dans un fil de discussion.

### B.3 Inclusion : handicap et contexte international

Le chapitre 1 § 5.1 traite la prise en compte du handicap à trois niveaux (affectation, poste de travail et organisation, produit lui-même). Ce chapitre ajoute ce qui relève de l'animation, et le volet international.

**Le point structurant, qui vaut pour les deux sujets** : le dispositif décrit en B.2 est **entièrement asynchrone et écrit**. Or l'asynchrone écrit est la réponse commune à trois contraintes que l'on traite habituellement séparément.

| Contrainte | Ce que l'asynchrone écrit apporte |
|------------|-----------------------------------|
| **Handicap** | Documentation en texte structuré versionné plutôt qu'en présentations non balisées, donc compatible lecteur d'écran et navigation clavier. Comptes rendus écrits systématiques : suivre le projet ne suppose pas d'être présent en direct |
| **Fuseaux horaires** | Aucun dispositif n'exige la simultanéité. Un contributeur d'un autre fuseau dispose du même contexte sans réunion |
| **Barrière de langue** | Le contexte est lisible et traduisible, là où une réunion orale ne l'est pas |

**Le volet international, sur le réel** : l'application est **bilingue français / anglais** (`apps/web/src/shared/i18n/locales/fr.ts` et `en.ts`), et la page publique de présentation est indexable dans les deux langues. Le produit ne suppose donc pas un utilisateur francophone.

**Sur le réel** : personne en situation de handicap, d'un autre fuseau horaire ou d'une autre langue n'a travaillé sur le projet. Le dispositif le permettrait sans réunion ni présence, et c'est ce qui est vérifiable. Pour une personne en situation de handicap qui rejoindrait le projet, les aménagements seraient accordés à la demande et sans justification médicale à produire : poste adapté, outillage compatible lecteur d'écran et navigation exclusivement au clavier, télétravail et horaires aménagés, temps supplémentaire sur les activités de recette et de formation. C'est un engagement écrit ici, pas un fait vécu.

**Et sur le produit** : l'accessibilité est une porte de qualité **bloquante** dans la chaîne, au niveau maximum mesuré sur l'ensemble des écrans. Livrer un produit inaccessible et se dire inclusif ne tiendrait pas.

---

## Partie C. Analyse critique d'une posture, et recommandations

C'est le critère le plus discriminant du chapitre. Il porte sur une situation **réelle**, mesurée, et sur la posture qui y a été adoptée.

### C.1 La situation : du 17 au 26 août 2026

| | |
|--|--|
| **Fait mesuré** | **10 jours travaillés consécutifs**, la plus longue série du projet |
| **Ce qui la provoque** | Deux échéances superposées : la remise du dossier Bloc 4 le **21 août**, et la version 1.4.0 le **25 août** |
| **La posture adoptée** | Absorber. Ne pas arbitrer le périmètre, ne pas décaler, compenser par l'intensité |
| **Le résultat immédiat** | Les deux échéances sont tenues. Aucune date n'a glissé |

### C.2 Ce qui n'a pas fonctionné

**La posture a réussi, et c'est exactement le problème.** Une posture qui produit le résultat attendu ne s'auto-corrige pas : elle se répète. Trois éléments mesurés montrent ce qu'elle a coûté.

| Constat | Mesure |
|---------|--------|
| **La qualité de la chaîne baisse le mois même** | Taux de succès sur la branche principale : **94 % en juillet, 78 % en août** |
| **La dette n'a pas été absorbée, elle a été déplacée** | **38 %** de succès sur les premiers jours de septembre, et une série de correctifs d'intégration à traiter ensuite |
| **Le découpage du travail s'est relâché** | Taille moyenne d'une branche avant intégration : **2,7 commits en juillet, 6,1 en août**, soit des branches 2,3 fois plus grosses au moment d'être relues. C'est le mécanisme qui, en mars, avait laissé passer les 87 lignes de front non prévues (chapitre 3) |

**Pourquoi c'est une faute managériale et pas seulement une fatigue personnelle.** Transposée à une équipe, cette posture porterait un nom : demander un effort exceptionnel plutôt qu'arbitrer le périmètre. Elle fonctionne une fois. À la deuxième, elle est perçue comme la norme, et le responsable qui l'a instaurée n'a plus d'argument pour la refuser. **Le pilotage consistait ici à décider ce qui ne serait pas livré le 25 août ; il a consisté à décider que tout le serait.**

Il faut aussi nommer ce qui a bien fonctionné, sans quoi l'autocritique n'est pas une analyse mais une flagellation : les deux échéances étaient réelles et non négociables, et le périmètre de la 1.4.0 avait une valeur produit vérifiée. La faute n'est pas d'avoir travaillé dix jours, elle est de **ne pas avoir instruit l'option de décaler**, l'arbitrage n'a pas été perdu, il n'a pas été posé.

### C.3 Trois recommandations

Réalistes signifie ici : applicables sans moyen supplémentaire, et vérifiables par un indicateur déjà en place.

| # | Recommandation | Mise en œuvre concrète | Indicateur de contrôle |
|:-:|----------------|------------------------|------------------------|
| **1** | **Traiter un chevauchement d'échéances comme un arbitrage, pas comme une contrainte** | Dès que deux échéances tombent dans la même quinzaine, poser explicitement les trois options (décaler la version, réduire son périmètre, ou absorber) et écrire celle qui est retenue et pourquoi | Nombre de chevauchements ayant donné lieu à une décision écrite |
| **2** | **Poser une limite de charge comme on pose une limite de travail en cours** | Au-delà de **5 jours consécutifs**, c'est la version qui décale, pas la semaine de travail qui s'allonge. La limite est une règle, pas une intention | Plus longue série de jours consécutifs, relevée mensuellement, indicateur déjà au tableau de bord |
| **3** | **Rendre obligatoire une relecture par un tiers sur les changements structurants** | Migration, changement de contrat d'interface, modification de la chaîne : aucune intégration sans une relecture par un tiers, humaine ou outillée | Part des changements structurants passés par une revue formelle |

La recommandation 2 est la seule qui aurait empêché la situation de C.1. Les deux autres en réduisent les conséquences. **C'est celle qui est la plus difficile à tenir, parce qu'elle oblige à annoncer un décalage avant d'avoir essayé d'y échapper.**

---

## Rattachement aux diapositives

| Diapo | Titre | Section source |
|:-----:|-------|----------------|
| 14 | Une personne, toutes les missions | A |
| 15 | Les quatre styles managériaux, situés | B.1 |
| 16 | Animer, partager, inclure : écrit, versionné, asynchrone | B.2, B.3 |
| 17 | Analyse critique : une posture qui a réussi | C |

---

## Questions probables sur ce chapitre

| Question | Ligne de réponse |
|----------|------------------|
| Vous n'avez managé personne. Que vaut ce chapitre ? | Je n'ai managé personne, et je ne présente aucune équipe. Le chapitre montre comment une personne a affecté ses missions dans le temps et à l'automatisation, mesuré sur les 833 commits, les styles qu'elle a appliqués au processus et à elle-même, ce que reçoivent les trois publics du projet, et une analyse critique de ma propre posture, mesurée |
| La charge est-elle répartie de manière équilibrée ? | Il n'y a pas d'équipe, donc pas de répartition entre personnes, et je préfère le dire que l'inventer. Ce qui se mesure, c'est la charge dans le temps : 88 jours actifs, une amplitude de 1 à 7 jours par semaine, dix jours consécutifs en août. Elle n'a pas été équilibrée non plus, et c'est ce que l'analyse critique traite |
| Quel est votre style managérial dominant ? | Le délégatif à l'automatisation : confier à la chaîne tout ce qui est vérifiable mécaniquement, garder la décision, contrôler en sortie. Sa condition de validité est que la règle soit écrite avant et que la porte soit bloquante. Une chaîne contournable n'est pas une délégation, c'est une absence de contrôle |
| Un style managérial à une personne, cela a-t-il un sens ? | Oui, sur trois objets : le processus, l'automatisation et soi-même. La règle directive de juillet s'est appliquée d'abord à moi, et l'indicateur qui en mesure l'effet, 52 puis 94 %, ne dépend pas de qui l'a subie |
| Vos outils de communication n'incluent aucune messagerie. Pourquoi ? | C'est délibéré. Aucun dispositif du projet n'exige la simultanéité, et c'est ce qui le rend compatible à la fois avec un contributeur d'un autre fuseau horaire et avec une personne qui ne peut pas suivre une réunion en direct. L'écrit versionné reste consultable après coup, un fil de discussion non |
| La prise en compte du handicap n'est-elle pas une clause de style ? | Elle porte un responsable identifié dans la matrice RACI, des aménagements nommés et accordés sans justification à produire, une documentation en texte structuré compatible lecteur d'écran, et une exigence d'accessibilité du produit **bloquante** dans la chaîne de livraison, au niveau maximum sur tous les écrans |
| Qu'auriez-vous fait différemment ? | Du 17 au 26 août, j'ai travaillé dix jours d'affilée pour tenir deux échéances superposées. Elles ont été tenues, et la qualité de la chaîne est passée de 94 % à 78 % le mois même, puis à 38 % début septembre. L'erreur n'est pas d'avoir travaillé dix jours, c'est de **ne pas avoir posé l'arbitrage** : décider ce qui ne serait pas livré le 25 août. Aujourd'hui je poserais une limite à cinq jours consécutifs, au-delà de laquelle c'est la version qui décale |
