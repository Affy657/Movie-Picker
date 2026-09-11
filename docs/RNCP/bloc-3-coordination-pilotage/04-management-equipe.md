# 04 Piloter l'équipe

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

Alimente les diapositives 17 à 20.

**Posture de ce chapitre.** Le projet a été mené seul, et le chapitre le dit sans détour. Il est écrit en trois parties : **A, le dispositif de délégation**, la seule délégation réelle du projet, avec ses traces ; **B, piloter seul**, ce qui a été délégué et gardé, les styles, l'animation, l'inclusion, avec la vérité sur ce qui n'a pas d'équivalent à une personne ; **C, l'analyse critique**, qui porte sur une situation réelle et mesurée.

---

## Partie A. Ce qui a réellement été managé

### A.1 La seule délégation réelle du projet

Le projet a été exécuté seul, mais il n'a pas été exécuté sans délégation. **Une part importante de la production a été déléguée à des agents d'assistance au développement**, encadrés par un dispositif écrit et versionné dans le dépôt.

Ce n'est pas du management d'équipe humaine, et il serait malhonnête de le présenter comme tel. C'est en revanche une situation de **délégation avec cadre, points de contrôle et revue avant intégration**, et les enseignements qu'elle produit sont ceux d'une délégation : ce qu'il faut écrire pour qu'un tiers produise du travail conforme sans redemander, et où placer les points d'arrêt.

### A.2 Le dispositif, et ce qu'il vaut

| Élément | Fichier | Rôle managérial |
|---------|---------|-----------------|
| **Les conventions opposables** | `AGENTS.md` | Le référentiel de règles que tout contributeur applique sans arbitrage au cas par cas : style de code, interdits, exigences de vérification avant remontée. Les règles y sont **argumentées**, pas seulement énoncées |
| **La procédure de réalisation** | `.claude/skills/dev-feature/SKILL.md` | Un flux en 7 étapes, du cadrage au déploiement, avec **trois points d'arrêt obligatoires** où la décision revient explicitement au responsable |
| **La procédure de vérification** | `.claude/skills/verify/SKILL.md` | Comment lancer et éprouver l'application, pour que la vérification ne dépende pas d'une connaissance orale |
| **Le contrôle en sortie** | `.github/PULL_REQUEST_TEMPLATE.md` | Six points de contrôle avant intégration : tests locaux, lint et format, couverture du changement, documentation, journal des versions, issue référencée |

**Les trois points d'arrêt sont l'élément managérial du dispositif.** Ils sont écrits en majuscules dans la procédure, et ils disent tous la même chose : *terminer le message, attendre, ne pas continuer*. Ils se placent après le cadrage, après la maquette et après le test manuel — c'est-à-dire aux trois moments où une erreur d'interprétation coûte cher et où seul le responsable peut trancher.

**Ce que ce dispositif démontre, et que le jury peut vérifier** : la délégation n'a pas consisté à confier une tâche et à espérer. Elle a consisté à écrire d'abord le cadre, puis à placer le contrôle aux points de décision et en sortie, jamais en cours d'exécution.

### A.3 Ce que cette délégation a appris, et qui est transposable

| Enseignement | Ce qui l'a produit | Transposition à une équipe |
|--------------|--------------------|-----------------------------|
| **Une règle non écrite n'est pas une règle** | Les conventions de style ont dû être écrites et argumentées pour être appliquées de façon homogène | Un référentiel de conventions vaut mieux qu'une revue qui répète les mêmes remarques |
| **Le contrôle se place en sortie, pas en cours** | Portes de qualité automatisées et bloquantes, plutôt qu'une surveillance de l'exécution | Le micro-management coûte cher et détecte tard. Une porte automatisée détecte tôt et ne mobilise personne |
| **Un point d'arrêt vaut mieux qu'un cadrage exhaustif** | Le cadrage initial ne peut pas tout prévoir : mieux vaut trois arrêts courts que trente questions en amont | Des points de validation courts et fréquents plutôt qu'une spécification figée |
| **Ce qui n'est pas relu passe** | Les 87 lignes de front modifiées sans revue lors de la migration (chapitre 3) | La revue croisée n'est pas un formalisme, c'est le seul filet contre l'angle mort de celui qui a écrit |

---

## Partie B. Piloter seul

### B.1 L'affectation des missions : ce qui est délégué, ce qui ne l'est pas

La seule affectation réelle du projet est celle qui sépare ce que je fais de ce que je fais faire.

| Gardé | Pourquoi |
|-------|----------|
| Cadrage et maquette, avant toute ligne de code | C'est là que se décide ce qui sera livré, et une erreur d'interprétation y coûte le plus cher |
| Arbitrages de périmètre, de charge et de socle | Ils engagent le projet, et ils sont consignés par écrit |
| Revue avant intégration | Six contrôles du gabarit de pull request, portes de qualité bloquantes : un travail non conforme est repris, jamais intégré |
| Mise en production et incidents | Geste manuel depuis la chaîne, vérifié par un test de fumée et des sondes |
| Restitutions | Au commanditaire sur quatre échéances, aux utilisateurs à chaque version |

| Délégué aux agents, sous cadre écrit | Cadre |
|--------------------------------------|-------|
| Implémentation d'une fonctionnalité cadrée et maquettée | Conventions de `AGENTS.md`, procédure `dev-feature` en 7 étapes |
| Tests et refactorisations | Relus en sortie, couverts par les portes de qualité |
| Montées de dépendances | Dependabot, regroupées mensuellement, auditées à chaque commit |

**La mesure.** Sur les 833 commits de la branche principale au 5 septembre 2026, **537 sont co-signés par un agent**, soit 64 %. Le premier date du **13 mai 2026**, à la veille de la V1 ; avant, tout a été fait à la main, migration de l'API comprise.

| Mois | Commits | Co-signés | Part |
|------|--------:|----------:|-----:|
| Février à avril | 101 | 0 | 0 % |
| Mai | 150 | 110 | 73 % |
| Juin | 227 | 190 | 84 % |
| Juillet | 194 | 127 | 65 % |
| Août | 127 | 93 | 73 % |
| Septembre, 5 jours | 34 | 17 | 50 % |

### B.2 La charge, et ce que le critère ne peut pas mesurer ici

Le critère demande une charge **répartie sur l'ensemble de l'équipe de manière équilibrée**. Il n'y a pas d'équipe, donc pas de répartition entre personnes, et le dire vaut mieux qu'une répartition inventée. Ce qui existe et se mesure :

- **La répartition entre faire et faire faire**, ci-dessus. Elle n'a de sens que parce que le contrôle est en sortie : la part déléguée peut monter à 84 % sans que la responsabilité bouge.
- **La charge dans le temps**, mesurée au chapitre 2 : 88 jours actifs sur 191, une amplitude de 1 à 7 jours par semaine, une série de 10 jours consécutifs. C'est cette charge, absorbée plutôt que pilotée, qui fait l'objet de l'analyse critique de la partie C.

### B.3 Les quatre styles managériaux, situés

Le critère demande que le style soit **identifié et décrit**. À une personne, le management s'exerce sur ce qu'on délègue et sur soi-même. Les quatre styles du management situationnel sont ici rattachés à une situation réelle du projet, pas définis en théorie.

| Style | Situation du projet où il s'applique | Pourquoi celui-là |
|-------|--------------------------------------|-------------------|
| **Directif** | Le durcissement des portes de qualité en juillet 2026 : la chaîne était à 52 % de succès et les échecs devenaient contournables. La règle est posée sans négociation — un contrôle rouge bloque le déploiement | La compétence n'était pas en cause, la discipline l'était. Le directif est le seul style qui tienne quand l'enjeu est la conformité et que la tentation de contourner existe |
| **Persuasif** | Les conventions de style : la règle « ne jamais écrire de commentaire dans le code » est accompagnée de son motif — si l'intention n'est pas exprimable par le nommage, c'est le code qu'il faut refactoriser | Une règle contre-intuitive n'est appliquée que si elle est comprise. Énoncée seule, elle est contournée dès la première gêne |
| **Participatif** | Le cadrage d'une fonctionnalité : questions ouvertes, reformulation de ce qui a été compris, arrêt obligatoire avant toute ligne de code. Et les retours utilisateurs, qui ont déclenché deux décisions produit | La personne qui exécute détient une information que le responsable n'a pas. Décider sans la solliciter, c'est décider moins bien |
| **Délégatif** | L'étape « développement en autonomie » : l'exécution est confiée entièrement, sans contrôle intermédiaire, et reprise en revue et en tests | La délégation n'est possible que parce que le cadre est écrit et la porte de sortie automatisée. Sans cela, ce n'est pas de la délégation, c'est de l'abandon |

**Le style dominant est le délégatif encadré** : déléguer l'exécution, conserver la décision, contrôler en sortie par des portes automatisées. Il est adapté à ce projet pour une raison simple — c'est le seul style qui reste soutenable quand la capacité de supervision est la ressource la plus rare.

**Sa condition de validité, et sa limite** : il ne fonctionne que si le cadre est écrit *avant*. Un délégatif sans référentiel de conventions produit du travail non conforme qu'il faut reprendre, ce qui coûte plus cher que de l'avoir fait soi-même. C'est ce qui fait de `AGENTS.md` un outil managérial et pas seulement un fichier de style.

### B.4 Les techniques d'animation et les outils de communication

Le critère nomme l'empathie, l'écoute, la bienveillance et le leadership. Chacune est ici traduite en **dispositif** plutôt qu'en intention : une posture qui ne s'incarne pas dans un outil ou une procédure n'est pas vérifiable.

| Principe | Dispositif qui l'incarne | Trace |
|----------|--------------------------|-------|
| **Écoute** | Trois canaux entrants outillés : bouton « Proposer une idée » créant une issue, lien « Signaler un problème » pré-rempli avec le contexte technique, questionnaire utilisateurs | Issues étiquetées `idée-utilisateur`, `bug` |
| **Bienveillance** | Le gabarit d'anomalie décrit un **comportement attendu et observé**, jamais une responsabilité. La qualification cherche une cause, pas un coupable | `.github/ISSUE_TEMPLATE/bug_report.yml` |
| **Empathie** | Les points d'arrêt de la procédure : on n'avance pas tant que l'autre n'a pas validé, même si l'on est certain d'avoir compris | Trois arrêts explicites dans le flux de réalisation |
| **Leadership** | Décider avec l'information disponible et l'assumer par écrit, y compris les inconvénients acceptés — le cas d'arbitrage du chapitre 3 | Document d'aide à la décision du 18/03/2026 |

**Les outils de communication et le partage de ressources.** Le critère est explicite : les outils doivent **intégrer le partage de ressources**. Tous les outils ci-dessous sont versionnés dans le dépôt, donc accessibles, datés et modifiables par toute personne qui le clone.

| Outil | Objectif poursuivi | Ce qu'il partage |
|-------|--------------------|------------------|
| **Dépôt unique en monorepo** | Une seule source de vérité pour le code, la documentation, les feuilles de route et l'infrastructure | L'ensemble du contexte projet, en un lieu, versionné |
| **`AGENTS.md`** | Rendre les conventions opposables sans arbitrage humain | Le référentiel de règles et leurs motifs |
| **Gabarits d'issue** (anomalie, idée) | Qualifier une demande entrante de façon homogène, quel qu'en soit l'émetteur | Un formulaire structuré, donc une qualification comparable |
| **Gabarit de pull request** | Ne pas dépendre de la mémoire pour les contrôles d'intégration | Une liste de six vérifications, identique pour tous |
| **Actions composites de la chaîne** | Ne pas dupliquer la configuration d'environnement entre les jobs | Des briques d'intégration réutilisables |
| **Procédures exécutables** (`dev-feature`, `verify`) | Transformer une connaissance orale en procédure suivable | Le flux de réalisation et la méthode de vérification |
| **`CHANGELOG.md` et releases** | Rendre compte sans exiger la lecture du code | L'état livré, version par version |
| **Feuilles de route versionnées** | Tenir le backlog priorisé là où chaque modification est datée et attribuable | Le périmètre et ses évolutions |

Le point à dire : **aucun de ces outils n'est un outil de communication au sens d'une messagerie.** C'est délibéré. Sur un projet dont les acteurs ne sont pas synchrones, l'écrit versionné est le seul canal qui reste consultable après coup, qui n'oblige personne à être présent au bon moment, et qui ne perd pas l'information dans un fil de discussion.

### B.5 Inclusion : handicap et contexte international

Le chapitre 1 § 5.1 traite la prise en compte du handicap à trois niveaux — affectation, poste de travail et organisation, produit lui-même. Ce chapitre ajoute ce qui relève de l'animation d'équipe, et le volet international.

**Le point structurant, qui vaut pour les deux sujets** : le dispositif décrit en B.4 est **entièrement asynchrone et écrit**. Or l'asynchrone écrit est la réponse commune à trois contraintes que l'on traite habituellement séparément.

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

**Pourquoi c'est une faute managériale et pas seulement une fatigue personnelle.** Appliquée à une équipe, cette posture porte un nom : demander un effort exceptionnel plutôt qu'arbitrer le périmètre. Elle fonctionne une fois. À la deuxième, elle est perçue comme la norme, et le responsable qui l'a instaurée n'a plus d'argument pour la refuser. **Le pilotage consistait ici à décider ce qui ne serait pas livré le 25 août ; il a consisté à décider que tout le serait.**

Il faut aussi nommer ce qui a bien fonctionné, sans quoi l'autocritique n'est pas une analyse mais une flagellation : les deux échéances étaient réelles et non négociables, et le périmètre de la 1.4.0 avait une valeur produit vérifiée. La faute n'est pas d'avoir travaillé dix jours, elle est de **ne pas avoir instruit l'option de décaler** — l'arbitrage n'a pas été perdu, il n'a pas été posé.

### C.3 Trois recommandations

Réalistes signifie ici : applicables sans moyen supplémentaire, et vérifiables par un indicateur déjà en place.

| # | Recommandation | Mise en œuvre concrète | Indicateur de contrôle |
|:-:|----------------|------------------------|------------------------|
| **1** | **Traiter un chevauchement d'échéances comme un arbitrage, pas comme une contrainte** | Dès que deux échéances tombent dans la même quinzaine, poser explicitement les trois options — décaler la version, réduire son périmètre, ou absorber — et écrire celle qui est retenue et pourquoi | Nombre de chevauchements ayant donné lieu à une décision écrite |
| **2** | **Poser une limite de charge comme on pose une limite de travail en cours** | Au-delà de **5 jours consécutifs**, c'est la version qui décale, pas la semaine de travail qui s'allonge. La limite est une règle, pas une intention | Plus longue série de jours consécutifs, relevée mensuellement — indicateur déjà au tableau de bord |
| **3** | **Rendre la revue croisée obligatoire sur les changements structurants** | Migration, changement de contrat d'interface, modification de la chaîne : aucune intégration sans une relecture par un tiers, humaine ou outillée | Part des changements structurants passés par une revue formelle |

La recommandation 2 est la seule qui aurait empêché la situation de C.1. Les deux autres en réduisent les conséquences. **C'est celle qui est la plus difficile à tenir, parce qu'elle oblige à annoncer un décalage avant d'avoir essayé d'y échapper.**

---

## Rattachement aux diapositives

| Diapo | Titre | Section source |
|:-----:|-------|----------------|
| 17 | Piloter seul : ce qui est délégué, ce qui ne l'est pas | A, B.1, B.2 |
| 18 | Les quatre styles managériaux | B.3 |
| 19 | Animer, partager, inclure : animation, outils, handicap et contexte international | A.2, B.4, B.5 |
| 20 | Analyse critique d'une posture et recommandations | C |

---

## Questions probables sur ce chapitre

| Question | Ligne de réponse |
|----------|------------------|
| Vous n'avez managé personne. Que vaut ce chapitre ? | Je n'ai managé personne, et je ne présente aucune équipe. Il y a eu une délégation réelle et mesurée, à des agents d'assistance au développement : 537 commits sur 833 co-signés, avec un cadre écrit, trois points d'arrêt et une revue en sortie. Le chapitre montre ce que cette délégation exige, ce qui se transpose à une équipe et ce qui ne se transpose pas, et l'analyse critique porte sur ma propre posture, mesurée |
| Déléguer à un agent, est-ce comparable à manager une personne ? | Non, et je ne le présente pas ainsi. Un agent n'a ni motivation ni progression, ce qui retire au management sa moitié humaine. Ce qui se transpose est l'autre moitié : écrire le cadre avant de déléguer, placer le contrôle en sortie plutôt qu'en cours d'exécution, et accepter qu'une règle non écrite ne soit pas une règle |
| La charge est-elle répartie de manière équilibrée ? | Il n'y a pas d'équipe, donc pas de répartition entre personnes, et je préfère le dire que l'inventer. Ce qui se mesure : la part déléguée aux agents, 65 à 84 % des commits par mois depuis mai, sous contrôle en sortie ; et la charge dans le temps, 88 jours actifs, une amplitude de 1 à 7 jours par semaine, dix jours consécutifs en août. C'est cette dernière que l'analyse critique traite |
| Quel est votre style managérial dominant ? | Le délégatif encadré : déléguer l'exécution, garder la décision, contrôler en sortie par des portes automatisées. Sa condition de validité est que le cadre soit écrit avant. Un délégatif sans référentiel de conventions n'est pas de la délégation, c'est de l'abandon |
| Vos outils de communication n'incluent aucune messagerie. Pourquoi ? | C'est délibéré. Aucun dispositif du projet n'exige la simultanéité, et c'est ce qui le rend compatible à la fois avec un contributeur d'un autre fuseau horaire et avec une personne qui ne peut pas suivre une réunion en direct. L'écrit versionné reste consultable après coup, un fil de discussion non |
| La prise en compte du handicap n'est-elle pas une clause de style ? | Elle porte un responsable identifié dans la matrice RACI, des aménagements nommés et accordés sans justification à produire, une documentation en texte structuré compatible lecteur d'écran, et une exigence d'accessibilité du produit **bloquante** dans la chaîne de livraison, au niveau maximum sur tous les écrans |
| Qu'auriez-vous fait différemment ? | Du 17 au 26 août, j'ai travaillé dix jours d'affilée pour tenir deux échéances superposées. Elles ont été tenues, et la qualité de la chaîne est passée de 94 % à 78 % le mois même, puis à 38 % début septembre. L'erreur n'est pas d'avoir travaillé dix jours, c'est de **ne pas avoir posé l'arbitrage** : décider ce qui ne serait pas livré le 25 août. Aujourd'hui je poserais une limite à cinq jours consécutifs, au-delà de laquelle c'est la version qui décale |
