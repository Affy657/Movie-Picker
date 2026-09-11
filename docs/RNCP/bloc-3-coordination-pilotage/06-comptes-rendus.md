# 06 Rendre compte au commanditaire

> **RNCP 39583 Bloc 3, C3.4.1**
>
> **Compétence** : effectuer des comptes rendus d'activités sur l'état d'avancement auprès du client en présentant les évolutions et améliorations du projet, en planifiant des points de validation, en établissant des indicateurs de satisfaction afin de favoriser l'adhésion et permettre la validation des avancées de production.
>
> **Livrables attendus** : la présentation des comptes rendus sur les évolutions et améliorations du projet, la planification des points de validation réalisés, les indicateurs de satisfaction mis en place.
>
> **Critères d'évaluation**
> - Les comptes rendus sont rédigés de manière claire et ordonnée.
> - Les comptes rendus permettent de **faciliter les prises de décision** du client.
> - Les points de validation sont organisés de manière à assurer le suivi qualité du projet.
> - Les indicateurs de satisfaction sont définis et sont cohérents au regard du projet.

Alimente les diapositives 24 à 26.

**Rappel de posture** : ce chapitre est intégralement réel. Les points de validation sont datés, les comptes rendus sont versionnés ou publiés, et les indicateurs de satisfaction proviennent de mesures de production et d'un questionnaire réellement diffusé.

---

## 1. Qui est le commanditaire, et ce que cela change

La cartographie des parties prenantes du Bloc 1 identifie un commanditaire formel : le **formateur et le jury**, décisionnaires sur le cadre du titre et sur la conformité des livrables. Mais le produit a aussi des destinataires qui valident autre chose : **les utilisateurs**, qui valident que ce qui est livré sert.

Ces deux commanditaires n'attendent ni la même chose ni au même rythme, et c'est ce qui structure tout le dispositif.

| | **Commanditaire du titre** | **Commanditaire du produit** |
|--|---------------------------|------------------------------|
| Qui | Formateur et jury | Les 17 utilisateurs inscrits |
| Ce qu'il valide | La conformité aux compétences du référentiel | Que la fonctionnalité livrée sert réellement |
| Rythme | 4 échéances de restitution | 10 versions livrées |
| Forme du compte rendu | Dossiers écrits et présentations orales | Journal des versions, notes de version, résumé poussé dans l'application |
| Ce qui prouve la validation | Acquisition prononcée compétence par compétence | Le comportement mesuré après la livraison |

**Le point à dire à l'oral** : rendre compte à un jury et rendre compte à un utilisateur ne se font pas avec le même document. Le premier attend une démonstration de conformité, le second attend de savoir ce qui a changé pour lui. **Un projet qui n'a qu'un seul format de compte rendu en sert mal au moins un des deux.**

---

## 2. La planification des points de validation

### 2.1 Les 10 versions, points de validation du produit

Chaque version est un point de validation **daté, versionné et vérifiable**, adossé à une étiquette posée sur le commit exact déployé.

| Version | Date | Ce que ce point validait |
|---------|------|--------------------------|
| 0.1.0 | 27/02/2026 | Que le parcours minimal — créer une soirée, proposer, voter, tirer — tient debout |
| 1.0.0 | 19/05/2026 | Que le produit est utilisable par un compte réel, sur la nouvelle API |
| 1.1.0 | 25/05/2026 | Que l'application s'installe et sait notifier |
| 1.2.0 | 11/06/2026 | Que la dimension sociale et la conformité aux données personnelles sont tenables |
| 1.3.0 | 19/06/2026 | Que la navigation et les états vides ne bloquent pas un nouvel arrivant |
| 1.3.1 | 08/07/2026 | Que la chaîne de livraison et la politique de sécurité du contenu ne dégradent rien |
| 1.3.2 | 25/07/2026 | Que la production est **observable** et qu'un utilisateur peut signaler un problème |
| 1.4.0 | 25/08/2026 | Que le produit dépasse la soirée ponctuelle — watchlist, intégration tierce, identité fédérée |
| 1.4.1 | 04/09/2026 | Que le produit est consultable **sans compte**, et que les frictions remontées sont levées |
| 1.5.0 | 07/09/2026 | Que le produit donne envie **avant** la première soirée : un accueil d'exploration ouvert à tous, sagas et sélections thématiques |

### 2.2 Les 4 échéances, points de validation du titre

| Jalon | Date | Objet de la validation | Résultat |
|-------|------|------------------------|----------|
| Restitution orale Bloc 1 | 11/06/2026 | Cadrage du projet | Tenue à la date |
| Remise du dossier Bloc 2 | 23/07/2026 | Conception et développement | Tenue à la date |
| Remise du dossier Bloc 4 | 21/08/2026 | Maintien en condition opérationnelle | Tenue à la date |
| Restitution orale Bloc 3 | 16/09/2026 | Coordination et pilotage | À venir |

### 2.3 Ce qui fait d'une livraison un point de validation qualité

Le critère de la grille est précis : les points de validation doivent être **organisés de manière à assurer le suivi qualité**. Une date de livraison n'y suffit pas. Sur ce projet, une version n'existe que si elle a franchi une séquence de contrôles, dont **cinq sont bloquants** : quatre avant l'intégration, un après le déploiement.

| Étape | Contrôle | Bloquant |
|-------|----------|:--------:|
| Avant intégration | Tests unitaires et d'intégration, lint et format, couverture minimale | ✅ |
| Avant intégration | Analyse statique et porte de qualité sur le code nouveau | ✅ |
| Avant intégration | Tests de bout en bout, performance et **accessibilité** | ✅ |
| Avant intégration | Scan de vulnérabilités et de secrets | ✅ |
| Après déploiement | Test de fumée vérifiant la joignabilité réelle de la base | ✅ |
| Après déploiement | Sondes de disponibilité depuis trois continents | continu |
| Après livraison | Journal des versions, étiquette, note de version publiée | — |

**L'adéquation entre le développement et les fonctionnalités attendues** — l'autre exigence du critère — est assurée en amont, par le rattachement de chaque item livré à une ligne de feuille de route versionnée. Un item livré qui n'était pas au périmètre se voit dans le diff de la feuille de route, daté.

---

## 3. Les comptes rendus

### 3.1 Trois niveaux, du plus automatique au plus décisionnel

| Niveau | Support | Destinataire | Déclenchement | Ce qu'il permet |
|:------:|---------|--------------|---------------|-----------------|
| **1** | **Résumé poussé dans l'application** : une fenêtre présente les nouveautés à la première visite suivant une mise à jour, une seule fois par version, consultable ensuite depuis le pied de page. **Livrée en v1.4.0**, elle ne couvre donc que les versions suivantes | Utilisateur | Automatique, à chaque version | **Savoir ce qui a changé sans avoir rien à demander** |
| **2** | **Journal des versions** au format Keep a Changelog, plus la note de version publiée et l'étiquette | Utilisateur avancé, exploitant, jury | À chaque version | Retrouver ce qui a été livré, quand, et sur quel commit |
| **3** | **Compte rendu d'arbitrage** : constat mesuré, proposition, coût, priorité | Commanditaire | À chaque revue de fin de cycle | **Prendre une décision** |

Le niveau 1 mérite d'être souligné : c'est le seul compte rendu **poussé** et non disponible. Rendre compte suppose que le destinataire reçoive l'information ; un journal des versions que personne n'ouvre n'est pas un compte rendu, c'est une archive.

À dire honnêtement : ce canal n'existe que depuis la version 1.4.0 du 25 août 2026. Les huit versions précédentes n'ont été annoncées qu'au niveau 2, c'est-à-dire mises à disposition sans être poussées. **Le dispositif s'est corrigé en cours de projet, il n'a pas été conçu complet dès le départ.**

### 3.2 Le gabarit du compte rendu décisionnel

Le critère exige que le compte rendu **facilite une prise de décision**. Un compte rendu qui se contente d'informer ne satisfait pas ce critère. Le gabarit retenu comporte donc cinq blocs, dont trois ne sont pas de l'information.

| Bloc | Contenu | Rôle |
|------|---------|------|
| **Constat** | Le fait mesuré, avec sa source et son ordre de grandeur | Information |
| **Analyse** | Ce que le code ou l'usage explique du constat | Information |
| **Proposition** | Ce qu'il faudrait faire, énoncé de façon exécutable | **Décision** |
| **Coût, délai, gain attendu** | Chiffrés, avec le critère qui dira si le gain est atteint | **Décision** |
| **Priorité et dépendances** | Le rang, et ce qui doit être fait avant | **Décision** |

**La règle de rédaction** : aucun constat sans proposition, aucune proposition sans coût. Un constat seul renvoie la charge de la décision au destinataire ; un coût manquant la rend impossible.

### 3.3 Un exemple complet

Extrait réel du compte rendu de fin de cycle, sur l'adoption des notifications.

> **Constat.** 3 abonnements actifs pour 17 inscrits, soit 18 %, alors que la version 1.1 a investi dans les clés de notification, cinq déclencheurs et une interface de préférences.
>
> **Analyse.** Le code explique le chiffre : la demande d'autorisation n'est appelée que par un réglage situé dans la seule page de compte. Aucune sollicitation n'existe dans le parcours, et les préférences par type ne s'affichent qu'une fois abonné. **Le taux ne mesure pas un refus, il mesure une absence d'occasion.**
>
> **Confirmation qualitative.** Sur 7 réponses au questionnaire, **4 ignoraient que l'activation était possible**, y compris des utilisateurs qui se servent de l'application à chaque soirée. L'un d'eux demande spontanément une notification qui **existe déjà**, mais qu'il ne peut pas recevoir faute d'avoir eu l'occasion de s'abonner.
>
> **Proposition.** Proposer l'activation une fois, au moment utile — après création ou participation à une soirée — en énonçant ce qui sera reçu.
>
> **Coût 1 jour. Délai : une itération. Gain attendu : adoption visée au-delà de 40 %.**
>
> **Priorité 3.** Et le point qui rend la décision possible : *si l'adoption ne dépasse pas 40 % sous deux mois, le gel de la fonctionnalité devient défendable — mais il ne l'est pas tant que personne n'a eu l'occasion d'accepter.*

### 3.4 Pourquoi ce format facilite une décision

Trois propriétés, et c'est le commentaire à porter à l'oral.

1. **Il transforme un mauvais chiffre en question tranchable.** 18 % d'adoption, présenté seul, conduit à « la fonctionnalité ne marche pas, on l'abandonne ». Le compte rendu montre que le chiffre mesure autre chose que ce qu'on croit, et il propose l'expérience qui permettra de décider.
2. **Il énonce d'avance le critère d'arrêt.** Au-delà de 40 % sous deux mois, on garde ; en deçà, on gèle. Le destinataire sait à quoi il s'engage en validant, et la décision suivante est déjà cadrée.
3. **Il donne le coût.** Une proposition à 1 jour et une proposition à 3 semaines n'appellent pas le même niveau d'arbitrage. Sans coût, le commanditaire ne peut ni accepter ni refuser, il peut seulement acquiescer.

---

## 4. Les indicateurs de satisfaction

### 4.1 Comment ils sont définis, et pourquoi ceux-là

Le critère demande des indicateurs **cohérents au regard du projet**. À 17 comptes et 19 soirées, un indice de recommandation net n'a aucune validité statistique. Les indicateurs sont donc retenus sur trois familles, et **c'est leur combinaison qui fait la mesure**, pas l'un d'entre eux.

| Famille | Indicateur | Mesure | Ce qu'il vaut |
|---------|-----------|--------|---------------|
| **Comportementale** | Soirées menées jusqu'au tirage | **14 sur 19, soit 74 %** | Le plus fiable : il mesure un acte, pas une opinion |
| | Adoption des notifications | **3 sur 17, soit 18 %** | Fiable, mais il a fallu l'analyser pour savoir ce qu'il mesure (§ 3.3) |
| | Usage déclaré à chaque soirée | **5 répondants sur 7** | Indicatif |
| **Déclarative** | Recommandation, échelle 0 à 10 | notes 10, 10, 10, 8, 9, 10, 10 → **moyenne 9,6** | Le moins fiable : échantillon volontaire, aucun détracteur |
| **Opérationnelle** | Latence au 95<sup>e</sup> centile | **207 ms** | La satisfaction commence par un service qui répond |
| | Taux d'erreur serveur | **0,026 %** | Idem |
| | Disponibilité | **100 %** depuis le 24/07/2026 | Idem |

### 4.2 La limite de l'échantillon, énoncée avant qu'on la trouve

**7 réponses pour 17 comptes.** L'échantillon est réduit et vraisemblablement orienté : cinq des sept répondants utilisent l'application à chaque soirée, ce sont donc les plus engagés qui ont répondu. Aucun détracteur ne figure dans les notes, ce qui est un signal de biais autant qu'un bon résultat.

**Conséquence assumée sur la lecture** : le 9,6 sur 10 n'est pas présenté comme une mesure de satisfaction. Il est présenté comme **l'absence de détracteur parmi les utilisateurs engagés**, ce qui est une information différente et beaucoup plus modeste. Les indicateurs comportementaux — 74 % d'aboutissement, 18 % d'adoption — pèsent plus lourd dans les décisions, parce qu'ils mesurent ce que les gens font et non ce qu'ils disent.

### 4.3 Ce que ces retours ont réellement produit

C'est la partie qui compte : un indicateur de satisfaction ne vaut que par la décision qu'il déclenche. Trois effets, à des stades différents, et il faut les distinguer honnêtement.

| Retour | Effet | Statut |
|--------|-------|--------|
| Un répondant se reconnecte à chaque ouverture du lien depuis un navigateur intégré | **Décision déclenchée** : détecter les navigateurs intégrés et proposer l'ouverture dans le navigateur système | ✅ **Livré en v1.4.1**, le 04/09/2026 |
| Un répondant suggère une liste de films à voir | **Décision confirmée** : la fonctionnalité était déjà au périmètre de la V1.4, le retour a confirmé son intérêt sans la déclencher | ✅ Livrée en v1.4.0, le 25/08/2026 |
| Un répondant veut voir *quels* films un utilisateur a proposés, pas seulement combien | Décision instruite, chiffrée à 0,5 jour, priorité 4 | ⬜ Non livrée |

**La boucle, mesurée** : le questionnaire est mis en ligne le **18 août**, le retour est consigné en fiche d'anomalie le **19 août**, la fiche est close le **26 août**, et le correctif atteint la production le **4 septembre**. **Dix-sept jours du retour de l'utilisateur à sa livraison.**

**Et ce qui manque, dit avant qu'on le demande** : le dispositif est **ponctuel, pas continu**. Un questionnaire diffusé une fois ne mesure pas une évolution de la satisfaction, il en donne un point. La mise en place d'une boucle continue — sollicitation courte après une soirée aboutie — est instruite, chiffrée à 1 à 2 jours, et priorisée au rang 3. Tant qu'elle n'est pas livrée, ce chapitre présente **un instantané, pas une tendance**.

---

## 5. Rattachement aux diapositives

| Diapo | Titre | Section source |
|:-----:|-------|----------------|
| 24 | La planification des points de validation | 1, 2 |
| 25 | Le compte rendu type | 3 |
| 26 | Les indicateurs de satisfaction | 4 |

---

## 6. Questions probables sur ce chapitre

| Question | Ligne de réponse |
|----------|------------------|
| Qui est votre commanditaire ? | Il y en a deux, et ils n'attendent pas la même chose. Le formateur et le jury valident la conformité au référentiel, sur quatre échéances de restitution. Les 17 utilisateurs valident que ce qui est livré sert, sur neuf versions. Un projet qui n'a qu'un seul format de compte rendu en sert mal au moins un des deux |
| Sept réponses, est-ce un échantillon valable ? | Non, et c'est écrit tel quel. Il est réduit et orienté vers les plus engagés — cinq des sept utilisent l'application à chaque soirée. C'est pourquoi je ne présente pas le 9,6 comme une mesure de satisfaction, mais comme **l'absence de détracteur parmi les utilisateurs engagés**. Les indicateurs comportementaux pèsent plus lourd : ils mesurent ce que les gens font |
| En quoi vos comptes rendus facilitent-ils une décision ? | Par trois propriétés : aucun constat sans proposition, aucune proposition sans coût, et un **critère d'arrêt énoncé d'avance**. Sur les notifications, le compte rendu ne dit pas « l'adoption est faible », il dit « au-delà de 40 % sous deux mois on garde, en deçà le gel devient défendable ». Le destinataire sait à quoi il s'engage en validant |
| Vos utilisateurs lisent-ils vraiment le journal des versions ? | Probablement pas, et c'est pour cela qu'il existe un second canal : une fenêtre présente les nouveautés à la première visite suivant une mise à jour. C'est le seul compte rendu **poussé** du dispositif. Un journal que personne n'ouvre est une archive, pas un compte rendu |
| Quelle décision un retour utilisateur a-t-il réellement changée ? | Une seule a été déclenchée par un retour et livrée : le bandeau qui propose d'ouvrir l'application dans le navigateur système depuis un navigateur intégré. Dix-sept jours du retour à la production. Une deuxième a été confirmée mais pas déclenchée, elle était déjà au périmètre. Une troisième est instruite et non livrée. Je distingue les trois, parce que présenter une confirmation comme un déclenchement serait surévaluer la boucle |
| Vos points de validation garantissent-ils la qualité ? | Une date de livraison n'y suffirait pas. Une version n'existe que si elle a franchi cinq contrôles bloquants — tests, analyse statique, tests de bout en bout, performance et accessibilité, scan de vulnérabilités — puis un test de fumée après déploiement qui vérifie la joignabilité réelle de la base. Un contrôle rouge annule la livraison |
| Comment mesurez-vous l'évolution de la satisfaction ? | Je ne la mesure pas encore : le dispositif est ponctuel. Un questionnaire diffusé une fois donne un point, pas une tendance. La boucle continue est instruite et chiffrée à un à deux jours, priorité 3. Tant qu'elle n'est pas livrée, je présente un instantané et je le dis |
