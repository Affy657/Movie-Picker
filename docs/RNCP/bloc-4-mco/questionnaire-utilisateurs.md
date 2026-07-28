# Questionnaire de retour utilisateur

> Support de collecte des retours pour les axes d'amélioration ([`axes-amelioration.md`](axes-amelioration.md), C4.3.1) et pour le suivi de la satisfaction.
>
> **Statut : à envoyer.** Cible : les 17 comptes inscrits en production. Durée annoncée : trois minutes.
> **Formulaire** : [Google Forms](https://docs.google.com/forms/d/1u_FlEJPyoUATSZp18kE-Ak3hb6upPQv4mu8Znksd8_o/edit), généré par [`questionnaire-google-form.gs`](questionnaire-google-form.gs).

## Ce que le questionnaire cherche à établir

Les indicateurs de production disent **ce que** les utilisateurs font, jamais **pourquoi**. Trois écarts mesurés restent inexpliqués, et chaque question sert à en éclairer un.

| Écart mesuré | Hypothèse à tester |
|--------------|--------------------|
| 78 votes pour 76 participations et 58 films proposés | Les boutons « Voter pour » et « Voter contre » sont-ils vus ? Leur effet est-il compris, sachant que **toutes les soirées tournent en mode aléatoire strict**, où le vote n'influence pas le tirage ? |
| 3 abonnements aux notifications système sur 17 inscrits | Refus délibéré, demande d'autorisation arrivée trop tôt, ou cloche in-app jugée suffisante ? |
| 19 soirées en trois mois et demi, usage par événement | Quelles fonctionnalités existantes sont ignorées, et qu'est-ce qui déclencherait une nouvelle soirée ? |

## Réglages du formulaire

| Réglage | Valeur | Pourquoi |
|---------|--------|----------|
| Collecte des adresses e-mail | **Non** | Sur un panel de 17 personnes qui se connaissent, l'anonymat est la condition d'un retour franc |
| Limiter à une réponse par personne | **Non** | Exigerait une connexion Google et lèverait l'anonymat |
| Barre de progression | Oui | Rassure sur la brièveté annoncée |
| Ordre des questions mélangé | Non | La progression va du général au particulier |
| Message de confirmation | « Merci, c'est noté. Les retours sont lus un par un. » | |

## Titre et introduction

**Titre** : Movie Picker : ton avis en 3 minutes

**Description** :

> Tu as utilisé Movie Picker pour choisir un film à plusieurs. J'aimerais l'améliorer et j'ai besoin de ton avis.
> Neuf questions, trois minutes, réponses anonymes. Les retours négatifs sont les plus utiles : n'hésite pas.

## Questions

### Q1. Fréquence d'utilisation

| | |
|---|---|
| **Type** | Choix multiple, une seule réponse |
| **Obligatoire** | Oui |
| **« Autre »** | Non |

**À quelle fréquence utilises-tu Movie Picker ?**

1. À chaque soirée film
2. De temps en temps
3. Une seule fois, pour essayer
4. Jamais vraiment utilisé après l'inscription

*Éclaire R5. L'option 4 identifie les comptes créés sans usage, invisibles dans les données de soirées.*

### Q2. Irritant principal

| | |
|---|---|
| **Type** | Paragraphe |
| **Obligatoire** | Non |
| **Aide** | Même une petite gêne compte. Si rien ne t'a dérangé, laisse vide. |

**Qu'est-ce qui t'a le plus manqué ou agacé lors de ta dernière utilisation ?**

*Fait remonter les irritants qui ne lèvent aucune exception et qu'aucune sonde ne détecte.*

### Q3. Usage des boutons de vote

| | |
|---|---|
| **Type** | Choix multiple, une seule réponse |
| **Obligatoire** | Oui |
| **« Autre »** | Non |
| **Aide** | Sur chaque film proposé, deux boutons permettent de voter pour ou contre. |

**As-tu utilisé les boutons « Voter pour » et « Voter contre » ?**

1. Oui, sur la plupart des films proposés
2. Oui, sur un ou deux films seulement
3. Non, je n'ai jamais voté
4. Je n'avais pas remarqué ces boutons

*Éclaire R2. L'option 4 distingue un défaut de visibilité d'un manque d'intérêt : deux causes qui appellent des corrections opposées.*

### Q4. Compréhension de l'effet du vote

| | |
|---|---|
| **Type** | Choix multiple, une seule réponse |
| **Obligatoire** | Oui |
| **« Autre »** | Non |
| **Aide** | L'hôte peut choisir entre un tirage totalement aléatoire et un tirage où les films les mieux votés ont plus de chances de sortir. |

**Selon toi, tes votes influencent-ils le résultat de la roue ?**

1. Oui, les films les plus votés ont plus de chances de sortir
2. Non, le tirage est totalement aléatoire quoi qu'il arrive
3. Ça dépend d'un réglage choisi par l'hôte
4. Je ne me suis jamais posé la question

*Question centrale. Toutes les soirées ont tourné en mode aléatoire strict, où le vote n'a aucun effet sur le tirage. Si les réponses montrent que les participants croient l'inverse, ou l'ignorent, l'écart entre la promesse et le comportement réel du produit est établi, et R2 change de nature : il ne s'agit plus d'inciter à voter, mais de réconcilier le vote et son effet.*

### Q5. Frein au vote

| | |
|---|---|
| **Type** | Cases à cocher, plusieurs réponses possibles |
| **Obligatoire** | Non |
| **« Autre »** | **Oui**, avec champ libre |

**Si tu n'as pas voté, ou peu voté, qu'est-ce qui t'en a empêché ?**

1. Je n'avais pas remarqué les boutons
2. Je ne voyais pas à quoi servait mon vote
3. Je pensais que le tirage était de toute façon aléatoire
4. Je ne connaissais pas assez les films proposés pour me prononcer
5. Je préférais laisser choisir les autres
6. Les films ont été ajoutés après mon passage

### Q6. Notifications système

| | |
|---|---|
| **Type** | Choix multiple, une seule réponse |
| **Obligatoire** | Oui |
| **« Autre »** | Non |
| **Aide** | Il s'agit des notifications qui s'affichent sur ton téléphone ou ton ordinateur même quand Movie Picker est fermé, à ne pas confondre avec la cloche à l'intérieur de l'application. |

**As-tu autorisé les notifications système de Movie Picker ?**

1. Oui, je les reçois
2. Non, j'ai refusé quand on me l'a demandé
3. Je ne me souviens pas qu'on me l'ait proposé
4. Je ne savais pas que ça existait

### Q7. Frein aux notifications

| | |
|---|---|
| **Type** | Cases à cocher, plusieurs réponses possibles |
| **Obligatoire** | Non |
| **« Autre »** | **Oui**, avec champ libre |

**Si tu ne les as pas autorisées, pourquoi ?**

1. Je refuse les notifications système par principe
2. On me l'a demandé trop tôt, avant que je comprenne l'application
3. Je ne voyais pas ce que j'allais recevoir
4. La cloche dans l'application me suffit
5. J'en reçois déjà trop ailleurs

*Éclaire R3. L'option 2 teste directement l'hypothèse du moment mal choisi, l'option 4 celle d'un canal in-app déjà suffisant, auquel cas l'arrêt de l'investissement se justifie.*

### Q8. Fonctionnalités connues

| | |
|---|---|
| **Type** | Cases à cocher, plusieurs réponses possibles |
| **Obligatoire** | Non |
| **« Autre »** | Non |
| **Aide** | Coche celles que tu connaissais, même si tu ne les as pas utilisées. |

**Parmi ces fonctionnalités existantes, lesquelles connaissais-tu ?**

1. La petite note de présentation pour défendre son film en quelques mots
2. La marque « déjà vu », qui signale un film aux autres sans influencer le tirage
3. Le réglage du mode de la roue, aléatoire ou pondéré par les votes
4. L'ajout de la soirée à son agenda
5. Les séries en plus des films
6. Le filtre par durée dans la recherche
7. Le profil public et le suivi d'autres utilisateurs
8. L'installation de Movie Picker sur l'écran d'accueil, comme une application
9. Aucune de ces fonctionnalités

*Mesure la découvrabilité. Une fonctionnalité livrée mais inconnue coûte de la maintenance sans rien rapporter : le résultat arbitre entre mieux exposer l'existant et développer du neuf.*

### Q9. Ce qui ferait revenir

| | |
|---|---|
| **Type** | Cases à cocher, plusieurs réponses possibles |
| **Obligatoire** | Non |
| **« Autre »** | **Oui**, avec champ libre |

**Qu'est-ce qui te ferait utiliser Movie Picker plus souvent ?**

1. Relancer une soirée avec le même groupe en un clic
2. Un rappel quand la date de fin des propositions approche
3. Voir clairement l'effet de mes votes sur le tirage
4. Des suggestions de films adaptées aux goûts du groupe
5. Garder la trace des films déjà regardés ensemble
6. Rien de particulier, je l'utilise quand j'en ai besoin

*Éclaire R5 et R2. Les options 1, 2, 3 et 5 correspondent à des évolutions réalisables sur l'existant ; l'option 6 est proposée pour éviter de forcer une attente qui n'existe pas.*

### Q10. Recommandation

| | |
|---|---|
| **Type** | Échelle linéaire, 0 à 10 |
| **Obligatoire** | Oui |
| **Étiquettes** | 0 : Pas du tout, 10 : Sans hésiter |

**Recommanderais-tu Movie Picker à un ami ?**

### Q11. Champ libre

| | |
|---|---|
| **Type** | Paragraphe |
| **Obligatoire** | Non |

**Autre chose à dire ?**

## Exploitation prévue

Les réponses sont synthétisées par thème, sans donnée nominative, puis confrontées aux indicateurs mesurés en production. La synthèse alimente le §6 du dossier, en confirmant, en infirmant ou en réordonnant les recommandations. Une anomalie fonctionnelle révélée par une réponse est consignée en fiche selon [`processus-anomalies.md`](processus-anomalies.md).

| Question | Ce qu'elle arbitre |
|----------|--------------------|
| Q1, Q9 | R5, encourager la récurrence |
| Q2, Q11 | Irritants invisibles pour la supervision, entrées possibles pour de nouvelles fiches |
| Q3, Q4, Q5 | R2, réconcilier le vote et son effet sur le tirage |
| Q6, Q7 | R3, trancher le sort des notifications système |
| Q8 | Arbitrage entre mieux exposer l'existant et développer du neuf |
| Q10 | R4, valeur de départ de la boucle de satisfaction |
