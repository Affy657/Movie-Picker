# Bloc 3 — ce qui reste à faire

> Point de situation au **5 septembre 2026**. Oral le **16 septembre 2026**, soit **11 jours**.
>
> **La rédaction est terminée** : 7 chapitres de matière, 40 diapositives (32 présentées + 8 annexes), les 14 éléments imposés rattachés, les 7 compétences couvertes.
>
> ⚠️ **Mais une seconde relecture, le 5 septembre, a rendu le support pour la première fois et découvert que 17 diapositives sont coupées par le bas du cadre.** C'est désormais le point bloquant n° 1, avant la démonstration. Voir § 0.

> Pour **comment** travailler dans ce dossier — règles d'écriture, sources de vérité des chiffres, pièges et scripts de vérification — voir [`PASSATION.md`](PASSATION.md).

---

## 0. Bloquant — le support est coupé à l'écran

**Le support n'avait jamais été rendu visuellement.** Les contrôles du dossier (compte de diapositives, équilibre des `<div>`, minutage) restent tous verts sur une diapositive dont le tiers inférieur est invisible : ils lisent le Markdown, pas la page.

Le rendu à 1280 × 720 avec la police du thème donne **17 diapositives dont du contenu passe sous le bas du cadre** — 13 présentées sur 32, et 4 annexes sur 8. Ce qui disparaît n'est pas du décor : c'est souvent la conclusion de la diapositive.

| Diapo | Compétence | Ce qui est coupé | Dépassement |
|:-----:|:----------:|------------------|------------:|
| 11 | **C3.2.1** ÉLIM | La phrase sur la distance entre le travail et sa trace | 13 px |
| 12 | **C3.2.1** ÉLIM | Fin du tableau des indicateurs (axe coûts) | 67 px |
| 15 | **C3.2.1** ÉLIM | Le tableau de répartition des 88 jours **et** le bandeau « ce que le suivi n'a pas vu », qui est la conclusion du chapitre | 132 px |
| 16 | C3.2.2 | Fin de la chronologie de l'arbitrage | 42 px |
| 17 | C3.2.2 | **Le logigramme**, nommé explicitement par la grille : 3 nœuds sur 8 sont visibles. Le `{scale: 0.52}` du bloc Mermaid **n'est pas appliqué** au rendu | 677 px |
| 21 | C3.3.1 | La phrase sur l'absence de messagerie | 20 px |
| 23 | C3.3.1 | Les trois recommandations de l'analyse critique | 167 px |
| 24 | C3.3.2 | Fin de la cartographie des compétences | 194 px |
| 25 | C3.3.2 | La lecture qui rend la grille crédible | 21 px |
| 26 | C3.3.2 | **Les modalités de formation adaptées au handicap** — un critère de la grille, entièrement invisible | 282 px |
| 27 | C3.4.1 | Fin des contrôles bloquants | 87 px |
| 28 | C3.4.1 | **Trois des cinq blocs du gabarit décisionnel** — donc le point de la diapositive | 206 px |
| 29 | C3.4.1 | Ce que les retours ont produit | 157 px |
| 32 | — | La phrase de clôture et le remerciement | 68 px |
| 34 | annexe | **A2, le logigramme complet** — celui qu'on ouvre justement si le jury interroge la 17 | 187 px |
| 37 | annexe | A5, la chaîne d'intégration et de déploiement | 122 px |
| 40 | annexe | A8, les retours utilisateurs question par question | 54 px |

**Deux natures de problème, deux remèdes :**

1. **La diapositive 17 est un défaut mécanique**, pas un excès de contenu : le paramètre d'échelle du bloc Mermaid n'a aucun effet dans cette version. À traiter en réduisant l'échelle par CSS, ou en scindant le logigramme.
2. **Les seize autres sont un excès de contenu** pour la hauteur disponible. Chaque diapositive demande un arbitrage éditorial — que couper, que renvoyer en note de présentateur — qui appartient au propriétaire du dossier. Le minutage n'en est pas affecté : ce qui est coupé n'était de toute façon pas lisible par le jury.

**Le contrôle est désormais outillé et rejouable** : [`slides/verifier-rendu.mjs`](slides/verifier-rendu.mjs), mode d'emploi en tête du fichier. À relancer après chaque retouche, et **avant** l'export PDF.

> ⚠️ **Piège de rendu** : la police du thème (Nunito Sans) est chargée depuis Google Fonts **au moment du rendu**. Sans réseau, le navigateur retombe sur une police plus large et **le support se dégrade encore**. L'export PDF fige les polices : c'est un argument de plus pour présenter depuis le PDF (§ 3, action 7) et non depuis le support en ligne.

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
| 8 | **Tester l'export sur le matériel de la salle** | Vidéoprojecteur, résolution, lisibilité depuis le fond. Le seul diagramme Mermaid du support présenté est celui de la **diapositive 17** — la 6 est un Gantt en HTML, l'annexe 34 le second Mermaid. Après le traitement du § 0, relancer `verifier-rendu.mjs` puis contrôler le PDF page à page |
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
| 16 | ~~Ouvrir une pull request~~ → **[PR #83](https://github.com/Affy657/Movie-Picker/pull/83) ouverte** le 05/09/2026 | ✅ Fait. Reste à la **relire et la fusionner** : tant que ce n'est pas fusionné, les cases de `suivi-rncp.md` restent non cochées, la convention du dossier exigeant un livrable mergé |
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
