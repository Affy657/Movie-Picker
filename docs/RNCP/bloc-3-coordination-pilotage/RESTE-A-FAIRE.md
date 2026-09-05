# Bloc 3 — ce qui reste à faire

> Point de situation au **5 septembre 2026**. Oral le **16 septembre 2026**, soit **11 jours**.
>
> **La rédaction est terminée** : 7 chapitres de matière, 40 diapositives (32 présentées + 8 annexes), les 14 éléments imposés rattachés, les 7 compétences couvertes. Tout ce qui figure ci-dessous est **matériel ou humain**, et ne peut pas être rédigé.

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
| 8 | **Tester l'export sur le matériel de la salle** | Vidéoprojecteur, résolution, lisibilité depuis le fond. Vérifier en particulier les deux diagrammes Mermaid (diapos 6 et 17) et la diapositive 26, la plus dense |
| 9 | **Répéter le minutage global** | 30 minutes, dont 17 sur les trois compétences éliminatoires. Deux passages complets. Le contrôle automatique donne **30 min 10 s**, l'écart de 10 s venant du chapitre 1 (6:40 pour une cible de 6:30) |
| 10 | **Mémoriser les numéros de page des annexes** | A1 = 33 · A2 = 34 · A3 = 35 · A4 = 36 · A5 = 37 · A6 = 38 · A7 = 39 · A8 = 40. En mode présentateur, taper le numéro puis `Entrée` |

---

## 4. Points de vigilance relevés en relecture

Aucun n'est bloquant. Ils se traitent à l'oral, pas dans le support.

| # | Point | Conduite à tenir |
|:-:|-------|------------------|
| 11 | **« 17 jours » désigne deux choses** : la cadence médiane entre deux versions (diapo 13) et le délai de la boucle retour → production (diapo 29) | À l'oral, nommer les deux : *« une version toutes les 17 jours »* et *« 17 jours entre le retour et sa livraison »*. Ne jamais dire « 17 jours » seul |
| 12 | **Le passage 52 % → 94 % revient trois fois** dans le support présenté (diapos 14, 15, 20) | Chaque usage sert un critère différent — constat, décision, style directif. Le dire différemment à chaque fois plutôt que répéter la même phrase |
| 13 | **La diapositive 26 est la plus dense du support** (~2 000 caractères pour 50 s) | C'est une diapositive **preuve**, pas une diapositive support : la désigner, en commenter trois points, ne pas la lire. La note de présentateur le rappelle |
| 14 | **La diapositive 23 est courte pour son enjeu** (40 s pour l'analyse critique, la plus discriminante du chapitre 4) | Ne pas rogner dessus si le minutage dérape. Rogner plutôt sur la diapositive 22 (inclusion, 25 s), dont l'idée tient en une phrase |
| 15 | **Le chapitre 1 déborde de 10 secondes** (6:40 pour 6:30) | Absorbé naturellement. Ne pas retoucher un chapitre validé pour dix secondes |

---

## 5. Décisions en suspens — elles t'appartiennent

| # | Décision | Enjeu |
|:-:|----------|-------|
| 16 | **Ouvrir une pull request** pour la branche `claude/rncp-03-title-crwwov` | 7 commits d'avance sur `master`. Tant que ce n'est pas fusionné, les cases de `suivi-rncp.md` restent non cochées, la convention du dossier exigeant un livrable mergé |
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
