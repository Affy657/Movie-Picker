# Bloc 3 — ce qui reste à faire

> Point de situation au **5 septembre 2026**. Oral le **16 septembre 2026**, soit **11 jours**.
>
> **La rédaction est terminée** : 7 chapitres de matière, 40 diapositives (32 présentées + 8 annexes), les 14 éléments imposés rattachés, les 7 compétences couvertes.
>
> ✅ **Le support a été rendu, corrigé puis refondu le 5 septembre.** Le premier rendu réel a montré que des diapositives étaient coupées par le bas du cadre — 17 à la première mesure, 22 au contrôle rejoué. Elles tiennent toutes désormais, et le support a été **épuré** dans la foulée. Détail en § 0.

> Pour **comment** travailler dans ce dossier — règles d'écriture, sources de vérité des chiffres, pièges et scripts de vérification — voir [`PASSATION.md`](PASSATION.md).

---

## 0. Le support a été refondu — ✅ traité

**Le support n'avait jamais été rendu visuellement.** Les contrôles du dossier (compte de diapositives, équilibre des `<div>`, minutage) lisent le Markdown : ils restaient tous verts sur une diapositive dont le tiers inférieur était invisible. Au rendu, **17 diapositives sur 40 étaient coupées** — dont la conclusion de la 15 (C3.2.1, éliminatoire), les modalités handicap de la 26 (un critère de C3.3.2), trois des cinq blocs du gabarit de la 28, et le **logigramme de la 17**, dont 3 nœuds sur 8 étaient visibles.

### Les deux causes techniques, corrigées

| Cause | Correction |
|-------|-----------|
| Le `{scale: …}` d'un bloc **Mermaid n'est pas appliqué** dans cette version de Slidev : le diagramme rend en taille pleine | Les schémas sont désormais en **HTML et CSS**. Le seul Mermaid restant, l'annexe A1, est contraint par `max-height` |
| Tableaux et interlignes trop généreux pour la hauteur disponible | Densité réduite globalement dans `global-bottom.vue`, et **contenu allégé** diapositive par diapositive |

### Ce qui a été fait

| | |
|--|--|
| **Toutes les diapositives tiennent** | Vérifié par [`slides/verifier-rendu.mjs`](slides/verifier-rendu.mjs) : *« les 40 diapositives tiennent dans le cadre »* |
| **Le support est épuré** | Une idée par diapositive, énoncée dans le titre ; la preuve à l'écran, l'argumentation en note de présentateur. Densité maximale ramenée de 2 289 à 1 967 caractères, moyenne 1 217 |
| **Sept tableaux remplacés par des schémas** | Histogrammes d'activité (13), stabilité de la chaîne (14), barres empilées du glissement de périmètre (15), **logigramme en HTML** (17 et A2), répartition de charge par lot (19), grille de compétences en haltères (25), frise des versions (27) |
| **Le mur de 25 indicateurs a disparu** | La diapositive 12 porte désormais la *méthode* de sélection et les 5 axes ; les valeurs vivent sur les deux tableaux de bord, sans doublon |
| **Répétitions supprimées** | *« l'affectation suit la compétence attestée »* (9 et 19), les quatre échéances (5 et 6), les 88 jours actifs (13 et 14). Le seul rappel littéral conservé est volontaire : *« l'arbitrage n'a pas été perdu, il n'a pas été posé »*, thèse de la 23 rappelée en conclusion |
| **Ordre des chapitres vérifié** | Identique à celui du référentiel — C3.1 → C3.2.1 → C3.2.2 → C3.3.1 → C3.3.2 → C3.4.1 → C3.4.2 — et chaque renvoi entre chapitres est une annonce vers l'avant, sauf un rappel arrière assumé (24 → chapitre 3) |
| **Numérotation préservée** | 40 diapositives, 32 présentées, **30:00 pile** chapitre par chapitre, rattachement des 14 éléments imposés inchangé |

### Ce qui reste, sur le rendu

> ⚠️ **La police du thème est chargée depuis Google Fonts au moment du rendu.** Sans réseau, le navigateur retombe sur une police plus large et le support se dégrade. **L'export PDF fige les polices** : c'est la raison la plus solide de présenter depuis le PDF (§ 3, action 7) et non depuis le support en ligne. Le mode d'emploi pour récupérer la police localement est en tête de `verifier-rendu.mjs`.

**Relancer `npm run verify:rendu` après toute retouche du support, et avant l'export PDF.**

---

## 1. Bloquant — conditionne une compétence éliminatoire

Ces quatre points portent **C3.4.2**, éliminatoire. Une démonstration qui échoue ne se rattrape pas par la qualité du reste de la présentation.

| # | Action | Détail | Quand |
|:-:|--------|--------|-------|
| 1 | **Répéter le parcours de démonstration** | 4 min 50, chronomètre en main. Le script est en [§ 2.2 de `07-demonstration.md`](07-demonstration.md). **Trois passages minimum** — le minutage ne tient pas au premier essai | Dès maintenant |
| 2 | **Créer le jeu de données de démonstration** | Compte principal (pseudo neutre, avatar, profil public activé), second compte connecté sur le second appareil, **deux soirées terminées** dont une avec gagnant, flamme de participation active. Liste complète en [§ 4.1](07-demonstration.md) | La veille, 15/09 |
| 3 | **Enregistrer la vidéo de repli** | Parcours complet commenté. C'est le repli de niveau 3 : sans elle, une panne de réseau et de poste met la compétence en échec | La veille, 15/09 |
| 4 | **Préparer l'environnement local** | Application et base prêtes à démarrer sur le poste. Repli de niveau 2. Vérifier qu'il démarre **sans réseau** | La veille, 15/09 |

> ⚠️ Le point 5 de la préparation de la veille est facile à oublier et coûte cher : **ouvrir l'application une fois sur chaque appareil** pour absorber la fenêtre « Nouveautés », qui s'afficherait sinon en pleine démonstration.

---

## 2. Preuves à produire — deux diapositives incomplètes

| # | Action | Diapo | Compétence | Détail |
|:-:|--------|:-----:|:----------:|--------|
| 5 | **Structurer le tableau GitHub Projects** et en faire une capture | 11 | **C3.2.1** ÉLIM | La diapositive tient sans, mais une capture rendrait l'outil de suivi visible. Le chapitre 2 § 1.5 assume déjà que le tableau est postérieur au travail : ne pas le présenter autrement |
| 6 | **Relever une capture de facturation** GCP et AWS | 14 | **C3.2.1** ÉLIM | Étaye la ligne « coût réel » du tableau de bord. Aujourd'hui la valeur *0 €/mois* repose sur les paliers gratuits documentés, pas sur une facture |

---

## 3. Finalisation du support

| # | Action | Détail |
|:-:|--------|--------|
| 7 | **Exporter le support en PDF** | `cd slides && npm install && npm run export`. Le premier export peut demander `npx playwright install chromium` |
| 8 | **Tester l'export sur le matériel de la salle** | Vidéoprojecteur, résolution, lisibilité depuis le fond. **Le seul bloc Mermaid restant est le schéma d'architecture de l'annexe A1 (diapositive 33)** — tous les autres schémas, dont le Gantt de la 6 et le logigramme de la 17, sont en HTML et CSS. Après le traitement du § 0, relancer `verifier-rendu.mjs` puis contrôler le PDF page à page |
| 9 | **Répéter le minutage global** | 30 minutes, dont 17 sur les trois compétences éliminatoires. Deux passages complets. Le contrôle automatique donne **30:00 pile**, exact chapitre par chapitre |
| 10 | **Mémoriser les numéros de page des annexes** | A1 = 33 · A2 = 34 · A3 = 35 · A4 = 36 · A5 = 37 · A6 = 38 · A7 = 39 · A8 = 40. En mode présentateur, taper le numéro puis `Entrée` |

---

## 4. Points de vigilance relevés en relecture — **traités**

Les cinq points relevés le 5 septembre ont été corrigés dans le support, ils ne relèvent plus de la vigilance orale.

| # | Point | Traitement appliqué |
|:-:|-------|---------------------|
| 11 | **« 17 jours » désignait deux choses** : la cadence entre versions et la boucle retour → production | Les quatre occurrences sont désormais explicites : *« une version toutes les 17 jours »* d'un côté, *« 17 jours entre le retour d'un utilisateur et sa mise en production »* de l'autre |
| 12 | **Le passage 52 % → 94 % revenait trois fois** littéralement | La troisième occurrence (diapositive 20, style directif) est reformulée en *« une chaîne qui échouait une fois sur deux »*. Le chiffre exact ne figure plus qu'aux diapositives 14 et 15, où il sert le constat puis la décision |
| 13 | **La diapositive 26 était la plus dense** du support (2 303 caractères pour 50 s) | Condensée à **1 915 caractères**, soit −17 %. Elle rejoint le niveau des diapositives 6, 10 et 25 au lieu de le dominer |
| 14 | **La diapositive 23 était courte** pour son enjeu (40 s pour l'analyse critique) | Portée à **0:45**, financées par la diapositive 22 ramenée à 0:20. Le chapitre 4 reste à 3:30 |
| 15 | **Le chapitre 1 débordait de 10 secondes** (6:40 pour 6:30) | La diapositive 6 passe de 1:20 à 1:10. **Le minutage est désormais exact chapitre par chapitre, et le total tombe à 30:00 pile** |

**Reste une seule vigilance, purement orale** : la diapositive 26 demeure parmi les plus denses. C'est une diapositive **preuve**, à désigner en commentant trois points, jamais à lire.

## 4 bis. Seconde relecture du 5 septembre — corrections appliquées

Onze écarts trouvés en recoupant chaque chiffre contre le dépôt, et corrigés dans le même mouvement. Les deux premiers étaient **vérifiables par le jury** et auraient été trouvés par un examinateur qui ouvre le dépôt.

| # | Écart | Correction |
|:-:|-------|-----------|
| 23 | **L'API Node du MVP comptait 18 fichiers, pas 21** (944 lignes, vérifié au commit `mvp done`). Le chiffre servait aussi à la comparaison « 111 fichiers structurés contre 21 » du chapitre 3 | 4 occurrences corrigées, chapitre 3 et diapositive 16 |
| 24 | **Les 87 lignes de front sont dans le commit de 11 h 57**, pas dans celui de 12 h 12 que la chronologie du chapitre nomme « Bascule » — lequel ne touche aucun fichier du front. Un examinateur qui vérifiait tombait sur zéro | Le commit est désormais désigné sans ambiguïté |
| 25 | **Le chapitre 1 comptait 8 versions et s'arrêtait à la v1.4.0**, quand les chapitres 2 et 6 et la diapositive 2 en comptent 9 | Le chapitre 1, son Gantt et la note de la diapositive 6 passent à 9 versions, v1.4.1 comprise |
| 26 | **Le Gantt appelait « Lot 4 » les versions V1.1 à V1.4**, alors que le lot 4 du chiffrage est la clôture du titre. Cette confusion effaçait le constat central du chapitre 2 : ces versions sont **hors chiffrage initial** | Deux barres distinctes, dont une explicitement « hors chiffrage initial » |
| 27 | **La phase de restitution était datée du 03/06**, alors que son propre contenu et le Gantt la font commencer au 27/02 avec la première mise en production | Corrigé en 27/02 |
| 28 | **La ligne « infrastructure : 1 à 5 €/mois » de la diapositive 8** contredisait le « 0 €/mois » de la diapositive 14, faute de rappeler les 12 mois offerts | Les deux diapositives et le chapitre 1 portent désormais la même formulation que l'annexe A4 |
| 29 | **Les commits de documentation ne sont pas concentrés en août-septembre** : 50 des 80 tombent en juillet et août, autour des remises des Blocs 2 et 4. L'affirmation était contredite par l'historique | Reformulé sur la mesure réelle, l'argument en sort renforcé |
| 30 | **La vague 1 des compétences était datée « 16 au 18 mars »**, soit une fenêtre fermée le jour de la décision, avant que le travail .NET commence (18–19 mars au chapitre 3) | Fenêtre portée au 16–19 mars, « trois jours » devient « quatre jours » |
| 31 | **La densité hebdomadaire valait 3,2 dans le plan et 3,1 partout ailleurs** (88 jours / 28 semaines) | Plan aligné sur 3,1 |
| 32 | **Le plan n'avait pas suivi le rééquilibrage du minutage** : son tableau diapositive par diapositive gardait 1:20 pour la 6, 0:25 pour la 22 et 0:40 pour la 23, en contradiction avec son propre § 3 et avec le support | Les trois lignes sont alignées sur le support |
| 33 | **Les chiffres n'étaient datés que par le jour**, alors que `master` a avancé de 5 commits dans la journée du 5 septembre | Le chapitre 2 ancre désormais son relevé sur le commit `5ce0a05f`, ce qui rend chaque comptage reproductible |

**Un point n'a pas été corrigé, il demande un arbitrage** : le chapitre 3 § 2.2 justifie l'exigence de « socle à support long terme » par *« 59 des 77 pull requests du projet sont des montées de dépendances »*. C'est une mesure de **septembre 2026**, présentée parmi les quatre exigences connues au **18 mars**. Le chapitre est par ailleurs scrupuleux sur cette distinction — il précise lui-même que le rapport de 1 à 47 est « la justification a posteriori de la décision, pas son argument d'origine ». Il manque ici la même précaution.

---

## 5. Décisions en suspens — elles t'appartiennent

| # | Décision | Enjeu |
|:-:|----------|-------|
| 16 | ~~Ouvrir puis fusionner une pull request~~ → **[PR #83](https://github.com/Affy657/Movie-Picker/pull/83) fusionnée** le 06/09/2026 | ✅ Fait. Les cases du Bloc 3 dans `suivi-rncp.md` sont cochées. Tout travail ultérieur repart de `master` : une PR fusionnée ne se réutilise pas |
| 17 | **Garder ou retirer la partie A du chapitre 4** (la délégation à des agents d'assistance comme ancrage réel du management) | C'est un pari : il donne au chapitre le plus théorique un ancrage vérifiable, mais tous les jurys ne le recevront pas de la même façon. Le chapitre tient sans — il perd son volet réel. Retrait en deux minutes si besoin |
| 18 | **Le cas d'arbitrage de réserve « environnement de test rejeté malgré un gain de 30 % »**, envisagé au plan initial, n'a **aucune trace dans le dépôt** et a été remplacé par l'abandon de l'application mobile | S'il correspond à une décision réelle non tracée, le dire et il sera réintégré en annexe A3 |

---

## 6. Hors Bloc 3, repéré en chemin

Sans effet sur l'oral du 16 septembre, mais à ne pas perdre.

| # | Constat | Où |
|:-:|---------|-----|
| 19 | **La chaîne d'intégration est à 38 % de succès sur les premiers jours de septembre** (8 exécutions). Une dette d'intégration est en cours de traitement sur la branche courante | Chapitre 2 § 4.2 |
| 20 | Le dispositif de **satisfaction est ponctuel, pas continu** : un questionnaire diffusé une fois donne un point, pas une tendance. La boucle continue est instruite et chiffrée à 1–2 jours | Chapitre 6 § 4.3 |
| 21 | **Aucun indicateur ne compare le périmètre courant au périmètre chiffré**, ce qui a laissé passer 37 items hors chiffrage. Un compteur d'items hors chiffrage initial est la correction proposée | Chapitre 2 § 5.5 |
| 22 | ~~Deux liens cassés vers `../spec.md` dans `suivi-rncp.md`~~ — le fichier avait été déplacé vers `archive/docs/` en juin sans que les liens suivent. **Corrigé** le 05/09/2026 | `suivi-rncp.md` |
