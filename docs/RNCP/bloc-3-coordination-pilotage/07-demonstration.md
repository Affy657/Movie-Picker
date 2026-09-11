# 07 La démonstration des fonctionnalités

> **RNCP 39583 Bloc 3, C3.4.2, ÉLIMINATOIRE**
>
> **Compétence** : réaliser une démonstration des fonctionnalités en s'appuyant sur la dernière version logicielle développée, en employant un vocabulaire adapté à son audience afin d'obtenir la validation du commanditaire avant livraison.
>
> **Livrable attendu** : une démonstration des fonctionnalités du logiciel par le candidat devant le jury.
>
> **Critères d'évaluation**
> - Le logiciel est utilisable.
> - La démonstration reprend les fonctionnalités attendues.
> - Le vocabulaire employé est adapté à une présentation client.
> - La démonstration permet d'aboutir à une **validation** du projet.

Alimente la diapositive 2, les 4 minutes 50 de démonstration en direct qui la suivent, et la demande de validation de la diapositive 27. **La démonstration ouvre la présentation** ; la validation la ferme.

**Ce chapitre est différent des six autres.** Les autres se préparent en écrivant ; celui-ci se prépare en répétant. Le document ci-dessous n'est pas un livrable à lire au jury : c'est un **script d'exécution**, un glossaire, une liste de préparation et un plan de repli. Sa qualité se mesure au fait que la démonstration se déroule sans hésitation.

---

## 1. Ce que le jury évalue, et ce que cela impose

Les quatre critères ne se satisfont pas des mêmes gestes. Traduits en exigences concrètes :

| Critère | Ce qu'il impose réellement |
|---------|---------------------------|
| **Le logiciel est utilisable** | La démonstration se déroule sur **la version en production**, pas sur un environnement local. Aucune manipulation ne doit échouer, ce qui se joue à la préparation (§ 4) et au plan de repli (§ 5) |
| **La démonstration reprend les fonctionnalités attendues** | Le parcours doit couvrir la promesse du produit de bout en bout, pas une sélection de fonctionnalités impressionnantes. La couverture est vérifiée en § 2.3 |
| **Le vocabulaire est adapté à une présentation client** | Aucun terme technique. C'est le critère le plus facile à rater par réflexe, et le plus facile à tenir avec un glossaire préparé (§ 3) |
| **La démonstration aboutit à une validation** | Il faut **demander la validation**, explicitement, à la fin. Montrer ne suffit pas (§ 6) |

**Le point qui décide de tout** : la compétence est éliminatoire. Une démonstration qui échoue faute de réseau ne se rattrape pas par la qualité du reste de la présentation. Le plan de repli n'est donc pas une précaution, c'est une partie du livrable.

---

## 2. Le parcours de démonstration

### 2.1 Le principe de construction

Le parcours suit **un seul fil narratif : celui que le produit raconte déjà à ses utilisateurs**. La page publique de présentation annonce le produit en quatre étapes — *Lancez la soirée, Proposez vos films, Votez ensemble, La roue tranche*. La démonstration suit exactement cet enchaînement, augmenté de ce qui l'encadre : l'arrivée d'un invité, et ce qui reste après la soirée.

Ce choix a deux conséquences. Le jury entend le même récit que celui affiché sur le produit, ce qui est cohérent. Et le vocabulaire de la démonstration est **déjà écrit dans l'interface** : il suffit de dire ce que l'écran affiche.

### 2.2 Les six étapes, minutées

Chaque étape indique l'écran, le geste, et la phrase qui l'accompagne. Les libellés entre guillemets sont ceux de l'interface, mot pour mot.

| # | Durée | Écran et geste | Ce qui est dit |
|:-:|------:|----------------|----------------|
| **1** | 0:40 | **« Nouvelle soirée »**. Saisir un titre, une date, une heure. Ouvrir les réglages : « Films max par personne », mode de la roue | « J'organise une soirée film avec des amis. Je lui donne un nom, une date, et je décide de quelques règles : combien de films chacun peut proposer, et comment le choix final sera fait. » |
| **2** | 0:40 | Bouton **« Partager »**, onglet **« Lien et QR »**. Montrer « Copier le lien », puis le QR code. **Sur le second appareil**, scanner le QR, saisir un pseudo, **« Rejoindre »** | « Pour inviter, un lien ou un QR code. Mon invité n'a rien à installer et n'a pas besoin de compte : il scanne, il donne son prénom, il est dans la soirée. » *(Montrer le second écran)* |
| **3** | 0:50 | **« Proposer un film »**. Rechercher un titre, ajouter. Montrer l'affiche, la note, les plateformes. Ajouter un second film **depuis le second appareil**. Tenter un doublon → **« Déjà proposé dans cette soirée »** | « Chacun propose ce qu'il a envie de voir. On retrouve l'affiche, la note, et où le film est disponible en streaming. Et si quelqu'un propose un film déjà dans la liste, l'application le signale. » |
| **4** | 0:50 | Voter depuis les deux appareils. Montrer le compteur **« X votants sur Y »**. Marquer un film **« Déjà vu »**. Montrer la mise à jour **automatique** côté hôte | « Tout le monde vote. Et chacun peut signaler un film qu'il a déjà vu, parce que le but n'est pas de faire revoir le même film à quelqu'un. Ce qui se passe sur un téléphone apparaît chez les autres **sans avoir à recharger la page**. » |
| **5** | 1:00 | Section **« Roue »**. Montrer le réglage du mode, puis **« Lancer la roue »**. Attendre l'animation, révéler **« Gagnant : … »**. Mentionner **« Relancer la roue »** et **« Choisir moi-même »** | « Le moment de trancher. La roue tient compte des votes. » *(lancer, laisser l'animation)* « Et voilà le film de la soirée. Si le groupe n'est pas convaincu, l'organisateur peut relancer, ou choisir lui-même. » |
| **6** | 0:50 | **« Clôturer la soirée »**. Puis **« Mes soirées »**, onglet **« Historique »**. Ouvrir le **profil public** : films proposés, soirées, flamme de participation | « La soirée se clôture, et elle reste dans l'historique : ce qu'on a regardé, avec qui. Chaque participant a un profil public avec ses statistiques et une flamme qui compte ses semaines de participation. C'est ce qui fait revenir le groupe la semaine suivante. » |

### 2.3 La couverture des fonctionnalités attendues

Le critère demande que la démonstration reprenne **les fonctionnalités attendues**. Vérification par rapport aux trois profils d'utilisateurs identifiés au cadrage.

| Profil attendu (Bloc 1) | Ce qu'il attend | Étape qui le couvre |
|-------------------------|-----------------|:-------------------:|
| **L'hôte organisatrice** | Créer, paramétrer, inviter, trancher, clôturer | 1, 2, 5, 6 |
| **Le participant invité** | Rejoindre sans friction, proposer, voter | 2, 3, 4 |
| **Le groupe récurrent** | Retrouver l'historique, la dimension sociale, revenir | 6 |

| Fonctionnalité majeure livrée | Montrée ? |
|-------------------------------|:---------:|
| Création et paramétrage d'une soirée | ✅ étape 1 |
| Partage par lien et par QR code | ✅ étape 2 |
| Participation sans compte | ✅ étape 2 |
| Recherche dans le catalogue, affiches, notes, plateformes | ✅ étape 3 |
| Vote et marqueur « déjà vu » | ✅ étape 4 |
| Mise à jour en direct entre appareils | ✅ étape 4 |
| Roue, modes de tirage, choix manuel | ✅ étape 5 |
| Clôture, historique, profil public, flamme | ✅ étape 6 |
| Liste personnelle « Ma liste » et intégration tierce | ⬜ **citée, non montrée** |
| Notifications, application installable, connexion sociale | ⬜ **citées, non montrées** |

**Ce qui n'est pas montré est assumé et annoncé** : en 4 minutes 50, montrer plus reviendrait à montrer moins bien. Les fonctionnalités non démontrées sont citées d'une phrase en diapositive 27, et deux d'entre elles peuvent être ouvertes à la demande si le jury le souhaite pendant les questions.

---

## 3. Le vocabulaire

### 3.1 La règle

**On dit ce que l'utilisateur voit, jamais ce que le logiciel fait.** L'interface est en français courant : la démonstration n'a qu'à la lire à voix haute.

Le piège n'est pas de connaître le vocabulaire client, c'est de **retomber dans le vocabulaire technique sous l'effet du stress**, en particulier si un jury pose une question technique en cours de démonstration. La parade est de répondre dans le registre client et de proposer d'y revenir après : « techniquement il se passe autre chose, je peux le détailler si vous voulez, après la démonstration ».

### 3.2 Le glossaire de traduction

À apprendre, pas à improviser.

| Ce qu'il ne faut pas dire | Ce qu'il faut dire |
|--------------------------|--------------------|
| L'API, un endpoint, une requête | *(rien — on ne mentionne pas le mécanisme)* |
| Le slug de l'événement | « le lien de la soirée » |
| Le jeton hôte, le cookie de session | « vous êtes reconnu comme l'organisateur » |
| TMDB, le catalogue externe | « le catalogue de films » |
| Le polling, la synchronisation, le rafraîchissement | « la liste se met à jour toute seule » |
| La PWA, le service worker | « l'application s'installe sur le téléphone » |
| Les notifications push, les clés VAPID | « les participants sont prévenus » |
| OAuth, le fournisseur d'identité | « se connecter avec son compte Google » |
| Le cache des affiches | « l'affiche s'affiche instantanément » |
| La base de données, le déploiement, la CI | *(rien — hors sujet dans une démonstration client)* |
| Le jeu de données de démonstration | *(rien — la soirée d'exemple est « une soirée de la semaine dernière »)* |

### 3.3 Les mots à ne pas prononcer

Une liste courte, apprise par cœur, plus efficace qu'une longue : **API, base de données, déploiement, cache, jeton**. Si l'un d'eux sort, ne pas se reprendre à voix haute — se reprendre attire l'attention sur l'erreur. Continuer.

---

## 4. La préparation

### 4.1 La veille : le jeu de données

Une démonstration en direct échoue sur des détails triviaux. Tout ce qui suit est fait **la veille**, jamais le matin même.

| # | À préparer | Pourquoi |
|:-:|-----------|----------|
| 1 | Un **compte de démonstration** avec pseudo neutre, avatar et profil public activé | Un profil vide à l'étape 6 rendrait la dimension sociale illisible |
| 2 | Un **second compte** sur le second appareil, déjà connecté | Se connecter en direct coûte 40 secondes et un risque de faute de frappe |
| 3 | **Deux soirées terminées** dans l'historique, dont une avec un film gagnant | L'historique de l'étape 6 doit contenir quelque chose |
| 4 | Une **flamme de participation active** sur le profil de démonstration | Idem : la fonctionnalité ne se voit que si elle a une valeur |
| 5 | **Ouvrir l'application une fois sur chaque appareil** pour absorber la fenêtre « Nouveautés » | Cette fenêtre s'affiche à la première visite suivant une mise à jour. Elle interromprait la démonstration |
| 6 | Vérifier que **la production répond**, y compris la sonde de disponibilité | Confirmer que le service est en ligne et que la base est joignable |
| 7 | **Enregistrer la vidéo** du parcours complet, commentée | Plan de repli niveau 3 (§ 5) |
| 8 | Préparer **l'environnement local** prêt à démarrer | Plan de repli niveau 2 |

### 4.2 Les dix minutes avant

| # | Vérification |
|:-:|-------------|
| 1 | La production répond sur les deux appareils |
| 2 | Les deux sessions sont ouvertes, sur les bons comptes |
| 3 | Les onglets sont ouverts **dans l'ordre du parcours**, et aucun autre |
| 4 | Téléphone en mode « ne pas déranger », luminosité au maximum, rotation verrouillée |
| 5 | Notifications système désactivées sur les deux appareils |
| 6 | Le partage d'écran ou le miroir du téléphone fonctionne, testé avec le vidéoprojecteur de la salle |
| 7 | Zoom du navigateur réglé pour que le texte soit lisible **depuis le fond de la salle** |
| 8 | La vidéo de repli est ouverte dans un onglet, prête, en pause |

---

## 5. Le plan de repli

**La compétence est éliminatoire : elle ne peut pas dépendre du réseau d'une salle d'examen.** Quatre niveaux, du moins au plus dégradé. Le passage de l'un à l'autre doit se faire en moins de vingt secondes et sans commentaire embarrassé.

| Niveau | Déclencheur | Bascule | Ce qui est perdu |
|:------:|-------------|---------|------------------|
| **0** | Nominal | Production, sur le réseau de la salle | — |
| **1** | Réseau lent ou instable | **Partage de connexion** depuis le téléphone, activé d'avance | Rien |
| **2** | Réseau indisponible | **Environnement local** déjà démarré : application et base de données sur le poste | La démonstration n'est plus sur la production. **Le dire.** Les deux appareils deviennent deux fenêtres du même écran |
| **3** | Poste ou environnement local défaillant | **Vidéo enregistrée** du parcours complet, commentée en direct par-dessus | L'interaction. On commente en disant « voici ce que vous verriez » |
| **4** | Aucune projection possible | **Captures d'écran imprimées**, dans l'ordre du parcours | Presque tout, mais le parcours reste racontable |

**La phrase de bascule, préparée** : au niveau 2, dire simplement *« le réseau de la salle ne suit pas, je bascule sur la même version, installée sur mon poste »*, et continuer. Un incident annoncé calmement se lit comme de la préparation ; un incident subi en silence se lit comme une défaillance du logiciel.

---

## 6. Aboutir à une validation

### 6.1 Le critère le plus subtil

« La démonstration permet d'aboutir à une validation du projet » n'est pas une conséquence automatique d'une bonne démonstration. C'est un geste : **il faut demander la validation**.

Une démonstration qui se termine par « voilà, c'est tout » laisse le jury sans rien à valider. Une démonstration qui se termine par un périmètre énoncé et une question ferme met le commanditaire en position de trancher, ce qui est exactement ce que la compétence décrit — *obtenir la validation du commanditaire avant livraison*.

### 6.2 La séquence de clôture

Trois temps, sur la diapositive 27, en fin de présentation.

**1. Ce qui est validé.** « Ce que vous venez de voir est en ligne, utilisé, et couvre l'intégralité du parcours annoncé : organiser, inviter, proposer, voter, trancher, garder une trace. »

**2. Ce qui vient ensuite, déjà arbitré.** « Trois évolutions sont instruites et chiffrées : rendre les notifications atteignables, réconcilier le vote avec son effet sur le tirage, et une boucle de retour utilisateur continue. Elles représentent quatre à six jours. »

**3. La demande de validation, formulée.** « Sur cette base, je vous demande de valider le périmètre livré, pour engager le lot suivant. »

**Pourquoi cette formulation** : elle donne au jury quelque chose de précis à valider, elle montre que la suite est déjà instruite plutôt qu'improvisée, et elle place la démonstration dans un cycle de projet — ce qui est le sujet du Bloc 3 — au lieu d'en faire une présentation de produit isolée.

---

## 7. Rattachement aux diapositives

| Diapo | Titre | Section source |
|:-----:|-------|----------------|
| 2 | Le produit, en production | 2.1, 3 |
| — | **Démonstration en direct (4:50)** | 2.2 |
| 27 | Bilan, et la validation du périmètre livré, en fin de présentation | 6.2 |
| A1 | Architecture technique, si une question technique est posée | — |

---

## 8. Questions probables sur ce chapitre

| Question | Ligne de réponse |
|----------|------------------|
| Est-ce une maquette ou la vraie application ? | La version en production, celle qu'utilisent les 17 comptes inscrits. L'adresse est visible dans la barre du navigateur, et le numéro de version s'affiche en pied de page |
| Combien de personnes l'utilisent réellement ? | 17 comptes, 19 soirées créées, dont 74 % menées jusqu'au tirage. C'est un usage réel mais modeste, et je ne le présente pas autrement |
| *(question technique posée pendant la démonstration)* | Répondre dans le registre client, puis proposer d'y revenir : « techniquement il se passe autre chose, je peux le détailler après la démonstration si vous le souhaitez ». Ne pas basculer en vocabulaire technique au milieu du parcours |
| Pouvez-vous montrer *(fonctionnalité non prévue au parcours)* ? | Oui — deux d'entre elles sont accessibles en deux clics depuis l'écran courant. Les autres, je préfère les montrer après la démonstration pour ne pas casser le fil |
| Que se passe-t-il si un participant n'a pas de compte ? | C'est le cas montré à l'étape 2 : il scanne, il donne son prénom, il participe. Le compte n'est nécessaire que pour retrouver son historique et son profil |
| Et si la roue ne convient pas au groupe ? | L'organisateur peut relancer, ou choisir lui-même le film. Les deux boutons sont à l'écran. C'est une évolution issue de l'usage : les utilisateurs relançaient la roue jusqu'à tomber sur un film qui convenait |
