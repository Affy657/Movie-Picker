# 06 Rendre compte aux utilisateurs

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

Alimente les diapositives 15 et 16, thème 11.

**Rappel de posture** : il n'y a pas de commanditaire, le projet est personnel ; on rend compte aux utilisateurs, et à personne d'autre. Ce chapitre est intégralement réel. Les points de validation sont datés, les comptes rendus sont versionnés ou publiés, et les indicateurs de satisfaction proviennent de mesures de production et d'un questionnaire réellement diffusé.

---

## 1. À qui rendre compte

Il n'y a pas de commanditaire : le projet est personnel, les dates et le périmètre sont ceux de la personne qui le mène. Les seuls destinataires des comptes rendus sont **les utilisateurs**, 21 comptes au 12 septembre 2026, et ce qu'ils valident, c'est que ce qui est livré sert. Le critère « faciliter la prise de décision du client » ne s'applique donc pas, et il n'est pas simulé : les décisions sont instruites dans la feuille de route et dans les documents de décision (chapitre 3).

---

## 2. La planification des points de validation

### 2.1 Les 11 versions, points de validation du produit

Chaque version est un point de validation **daté, versionné et vérifiable**, adossé à une étiquette posée sur le commit exact déployé.

| Version | Date | Ce que ce point validait |
|---------|------|--------------------------|
| 0.1.0 | 27/02/2026 | Que le parcours minimal (créer une soirée, proposer, voter, tirer) tient debout |
| 1.0.0 | 19/05/2026 | Que le produit est utilisable par un compte réel, sur la nouvelle API |
| 1.1.0 | 25/05/2026 | Que l'application s'installe et sait notifier |
| 1.2.0 | 11/06/2026 | Que la dimension sociale et la conformité aux données personnelles sont tenables |
| 1.3.0 | 19/06/2026 | Que la navigation et les états vides ne bloquent pas un nouvel arrivant |
| 1.3.1 | 08/07/2026 | Que la chaîne de livraison et la politique de sécurité du contenu ne dégradent rien |
| 1.3.2 | 25/07/2026 | Que la production est **observable** et qu'un utilisateur peut signaler un problème |
| 1.4.0 | 25/08/2026 | Que le produit dépasse la soirée ponctuelle : watchlist, intégration tierce, identité fédérée |
| 1.4.1 | 04/09/2026 | Que le produit est consultable **sans compte**, et que les frictions remontées sont levées |
| 1.5.0 | 07/09/2026 | Que le produit donne envie **avant** la première soirée : un accueil d'exploration ouvert à tous, sagas et sélections thématiques |
| 1.6.0 | 12/09/2026 | Que la soirée se répète sans effort : récurrence, modèles, plusieurs gagnants, limite de votes ; et que le dépôt public et la sauvegarde nocturne tiennent |

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
| Après livraison | Journal des versions, étiquette, note de version publiée | |

**L'adéquation entre le développement et les fonctionnalités attendues**, l'autre exigence du critère, est assurée en amont, par le rattachement de chaque item livré à une ligne de feuille de route versionnée. Un item livré qui n'était pas au périmètre se voit dans le diff de la feuille de route, daté.

---

## 3. Les comptes rendus

### 3.1 Deux niveaux, du poussé au disponible

| Niveau | Support | Destinataire | Déclenchement | Ce qu'il permet |
|:------:|---------|--------------|---------------|-----------------|
| **1** | **Résumé poussé dans l'application** : une fenêtre présente les nouveautés à la première visite suivant une mise à jour, une seule fois par version, consultable ensuite depuis le pied de page. **Livrée en v1.4.0**, elle ne couvre donc que les versions suivantes | Utilisateur | Automatique, à chaque version | **Savoir ce qui a changé sans avoir rien à demander** |
| **2** | **Journal des versions** au format Keep a Changelog, plus la note de version publiée et l'étiquette | Utilisateur avancé, exploitant | À chaque version | Retrouver ce qui a été livré, quand, et sur quel commit |

Le niveau 1 mérite d'être souligné : c'est le seul compte rendu **poussé** et non disponible. Rendre compte suppose que le destinataire reçoive l'information ; un journal des versions que personne n'ouvre n'est pas un compte rendu, c'est une archive.

À dire honnêtement : ce canal n'existe que depuis la version 1.4.0 du 25 août 2026. Les sept versions précédentes n'ont été annoncées qu'au niveau 2, c'est-à-dire mises à disposition sans être poussées. **Le dispositif s'est corrigé en cours de projet, il n'a pas été conçu complet dès le départ.**

### 3.2 Ce qui n'existe pas, et pourquoi

Pas de compte rendu décisionnel adressé à un commanditaire : il n'y en a pas. Les constats mesurés qui appellent une décision, l'adoption des notifications à 18 % par exemple, sont instruits dans la feuille de route avec leur coût et leur priorité, et tranchés par la personne qui porte le projet.

---

## 4. Les indicateurs de satisfaction

### 4.1 Comment ils sont définis, et pourquoi ceux-là

Le critère demande des indicateurs **cohérents au regard du projet**. À 17 comptes et 19 soirées le 5 septembre 2026, date des mesures ci-dessous (21 comptes au 12 septembre), un indice de recommandation net n'a aucune validité statistique. Les indicateurs sont donc retenus sur trois familles, et **c'est leur combinaison qui fait la mesure**, pas l'un d'entre eux.

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

**Conséquence assumée sur la lecture** : le 9,6 sur 10 n'est pas présenté comme une mesure de satisfaction. Il est présenté comme **l'absence de détracteur parmi les utilisateurs engagés**, ce qui est une information différente et beaucoup plus modeste. Les indicateurs comportementaux, 74 % d'aboutissement, 18 % d'adoption, pèsent plus lourd dans les décisions, parce qu'ils mesurent ce que les gens font et non ce qu'ils disent.

### 4.3 Ce que ces retours ont réellement produit

C'est la partie qui compte : un indicateur de satisfaction ne vaut que par la décision qu'il déclenche. Trois effets, à des stades différents, et il faut les distinguer honnêtement.

| Retour | Effet | Statut |
|--------|-------|--------|
| Un répondant se reconnecte à chaque ouverture du lien depuis un navigateur intégré | **Décision déclenchée** : détecter les navigateurs intégrés et proposer l'ouverture dans le navigateur système | ✅ **Livré en v1.4.1**, le 04/09/2026 |
| Un répondant suggère une liste de films à voir | **Décision confirmée** : la fonctionnalité était déjà au périmètre de la V1.4, le retour a confirmé son intérêt sans la déclencher | ✅ Livrée en v1.4.0, le 25/08/2026 |
| Un répondant veut voir *quels* films un utilisateur a proposés, pas seulement combien | Décision instruite, chiffrée à 0,5 jour, priorité 4 | ⬜ Non livrée |

**La boucle, mesurée** : le questionnaire est mis en ligne le **18 août**, le retour est consigné en fiche d'anomalie le **19 août**, la fiche est close le **26 août**, et le correctif atteint la production le **4 septembre**. **Dix-sept jours du retour de l'utilisateur à sa livraison.**

**Et ce qui manque, dit avant qu'on le demande** : le dispositif est **ponctuel, pas continu**. Un questionnaire diffusé une fois ne mesure pas une évolution de la satisfaction, il en donne un point. La mise en place d'une boucle continue, sollicitation courte après une soirée aboutie, est instruite, chiffrée à 1 à 2 jours, et priorisée au rang 3. Tant qu'elle n'est pas livrée, ce chapitre présente **un instantané, pas une tendance**.

---

## 5. Rattachement aux diapositives

| Diapo | Titre | Section source |
|:-----:|-------|----------------|
| 14 | 11. Rendre compte aux utilisateurs, et mesurer | 1, 2, 3, 4 |
| 15 | Bilan, et la validation du périmètre livré | chapitre 07, § 6 |

---

## 6. Questions probables sur ce chapitre

| Question | Ligne de réponse |
|----------|------------------|
| Qui est votre commanditaire ? | Personne : c'est un projet personnel, les dates et le périmètre sont les miens. Je rends compte aux utilisateurs, 21 comptes, sur onze versions, et ce qu'ils valident, c'est que ce qui est livré sert |
| Sept réponses, est-ce un échantillon valable ? | Non, et c'est écrit tel quel. Il est réduit et orienté vers les plus engagés, cinq des sept utilisent l'application à chaque soirée. C'est pourquoi je ne présente pas le 9,6 comme une mesure de satisfaction, mais comme **l'absence de détracteur parmi les utilisateurs engagés**. Les indicateurs comportementaux pèsent plus lourd : ils mesurent ce que les gens font |
| En quoi vos comptes rendus facilitent-ils une décision ? | Ils ne s'adressent pas à un décideur externe, il n'y a pas de commanditaire. Ils informent les utilisateurs de ce qui a changé. Les décisions, elles, sont instruites dans la feuille de route avec leur coût et leur priorité, et dans les documents de décision, chapitre 3 |
| Vos utilisateurs lisent-ils vraiment le journal des versions ? | Probablement pas, et c'est pour cela qu'il existe un second canal : une fenêtre présente les nouveautés à la première visite suivant une mise à jour. C'est le seul compte rendu **poussé** du dispositif. Un journal que personne n'ouvre est une archive, pas un compte rendu |
| Quelle décision un retour utilisateur a-t-il réellement changée ? | Une seule a été déclenchée par un retour et livrée : le bandeau qui propose d'ouvrir l'application dans le navigateur système depuis un navigateur intégré. Dix-sept jours du retour à la production. Une deuxième a été confirmée mais pas déclenchée, elle était déjà au périmètre. Une troisième est instruite et non livrée. Je distingue les trois, parce que présenter une confirmation comme un déclenchement serait surévaluer la boucle |
| Vos points de validation garantissent-ils la qualité ? | Une date de livraison n'y suffirait pas. Une version n'existe que si elle a franchi quatre contrôles bloquants avant l'intégration, tests, analyse statique, tests de bout en bout avec performance et accessibilité, scan de vulnérabilités, puis un test de fumée après déploiement qui vérifie la joignabilité réelle de la base. Un contrôle rouge annule la livraison |
| Comment mesurez-vous l'évolution de la satisfaction ? | Je ne la mesure pas encore : le dispositif est ponctuel. Un questionnaire diffusé une fois donne un point, pas une tendance. La boucle continue est instruite et chiffrée à un à deux jours, priorité 3. Tant qu'elle n'est pas livrée, je présente un instantané et je le dis |
