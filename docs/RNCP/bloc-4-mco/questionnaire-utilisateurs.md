# Questionnaire de retour utilisateur

> Support de collecte des retours pour les axes d'amélioration ([`axes-amelioration.md`](axes-amelioration.md), C4.3.1) et pour le suivi de la satisfaction.
>
> **Statut : à envoyer.** Cible : les 17 comptes inscrits en production. Durée annoncée : quatre minutes.
> **Formulaire** : [Google Forms](https://docs.google.com/forms/d/1u_FlEJPyoUATSZp18kE-Ak3hb6upPQv4mu8Znksd8_o/edit), généré par [`questionnaire-google-form.gs`](questionnaire-google-form.gs).

## Ce que le questionnaire cherche à établir

Les indicateurs de production disent **ce que** les utilisateurs font, jamais **pourquoi**. Trois écarts mesurés restent inexpliqués, et chaque question sert à en éclairer un.

| Écart mesuré | Hypothèse à tester |
|--------------|--------------------|
| 81 votes pour 80 participations et 62 films proposés | Les boutons « Voter pour » et « Voter contre » sont-ils vus ? Leur effet est-il compris, sachant que **toutes les soirées tournent en mode aléatoire strict**, où le vote n'influence pas le tirage ? Et comment le groupe décide-t-il réellement ? |
| 3 abonnements aux notifications système sur 17 inscrits | Refus délibéré, ou simple ignorance ? L'activation n'existe que sous forme d'un interrupteur dans « Mon compte », que rien ne signale dans le parcours. |
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

**Titre** : Movie Picker : ton avis en 4 minutes

**Description** :

> Tu as utilisé Movie Picker pour choisir un film à plusieurs. J'aimerais l'améliorer et j'ai besoin de ton avis.
> Douze questions courtes, quatre minutes, réponses anonymes. Les retours négatifs sont les plus utiles : n'hésite pas.

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

### Q5. Décision réelle du groupe

| | |
|---|---|
| **Type** | Choix multiple, une seule réponse |
| **Obligatoire** | Oui |
| **« Autre »** | **Oui**, avec champ libre |

**Comment votre groupe choisit-il finalement le film ?**

1. La roue tranche, on regarde ce qu'elle donne
2. On discute d'abord, la roue ne fait que confirmer un choix déjà fait
3. On relance la roue jusqu'à tomber sur un film qui convient à tout le monde
4. L'hôte décide, la roue est surtout là pour l'ambiance
5. Ça dépend des soirées

*Question la plus révélatrice du formulaire. Elle dit si le tirage sert réellement à décider ou s'il n'est qu'un habillage d'une décision prise autrement. L'option 3 est plausible, l'interface proposant « Relancer la roue » et « Annuler le tirage » : si elle domine, le tirage aléatoire strict est contourné manuellement par les groupes, ce qui confirme que le vote doit peser sur le résultat.*

### Q6. Attente vis-à-vis du vote

| | |
|---|---|
| **Type** | Choix multiple, une seule réponse |
| **Obligatoire** | Oui |
| **« Autre »** | **Oui**, avec champ libre |

**Idéalement, que devrait faire ton vote ?**

1. Augmenter les chances du film dans le tirage
2. Écarter du tirage les films rejetés par le groupe
3. Donner un avis, sans rien changer au tirage
4. Servir de base à la discussion, le tirage restant à part

*Arbitre la forme que doit prendre R2. L'option 1 valide la pondération, l'option 2 appelle un mécanisme d'élimination qui n'existe pas aujourd'hui, l'option 3 conduirait à assumer le vote comme purement indicatif et à le dire clairement dans l'interface.*

### Q7. Connaissance des notifications système

| | |
|---|---|
| **Type** | Choix multiple, une seule réponse |
| **Obligatoire** | Oui |
| **« Autre »** | Non |
| **Aide** | Il s'agit des notifications qui s'affichent sur ton téléphone ou ton ordinateur même quand Movie Picker est fermé, à ne pas confondre avec la cloche à l'intérieur de l'application. |

**Savais-tu que tu peux activer ces notifications depuis la page « Mon compte » ?**

1. Oui, et je les ai activées
2. Oui, mais je ne l'ai pas fait
3. Non, je ne savais pas que c'était possible
4. J'ai essayé, mais ça n'a pas fonctionné

*L'activation n'est proposée nulle part dans le parcours : elle n'existe que sous forme d'un interrupteur dans les réglages du compte, que rien ne signale. Cette question mesure la part des 82 % de non-abonnés qui ignorent simplement l'existence de l'option, par opposition à un refus assumé. C'est elle qui décide du sort de R3.*

### Q8. Condition d'activation

| | |
|---|---|
| **Type** | Cases à cocher, plusieurs réponses possibles |
| **Obligatoire** | Non |
| **« Autre »** | **Oui**, avec champ libre |

**Qu'est-ce qui te ferait activer les notifications ?**

1. Savoir précisément ce que je vais recevoir, et à quelle fréquence
2. Qu'on me le propose au moment utile, par exemple quand je rejoins une soirée
3. Pouvoir n'activer que certaines notifications, comme le rappel de soirée
4. La cloche dans l'application me suffit, je n'en veux pas d'autres
5. Rien, je refuse les notifications système par principe

*L'option 3 mérite attention : le choix par type existe déjà, mais reste invisible tant qu'on n'est pas abonné. Si elle est cochée, la correction est un simple réordonnancement de l'interface, pas un développement.*

### Q9. Fonctionnalités connues

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

### Q10. Ce qui ferait revenir

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

### Q11. Recommandation

| | |
|---|---|
| **Type** | Échelle linéaire, 0 à 10 |
| **Obligatoire** | Oui |
| **Étiquettes** | 0 : Pas du tout, 10 : Sans hésiter |

**Recommanderais-tu Movie Picker à un ami ?**

### Q12. Champ libre

| | |
|---|---|
| **Type** | Paragraphe |
| **Obligatoire** | Non |

**Autre chose à dire ?**

## Exploitation prévue

Les réponses sont synthétisées par thème, sans donnée nominative, puis confrontées aux indicateurs mesurés en production. La synthèse alimente le §6 du dossier, en confirmant, en infirmant ou en réordonnant les recommandations. Une anomalie fonctionnelle révélée par une réponse est consignée en fiche selon [`processus-anomalies.md`](processus-anomalies.md).

| Question | Ce qu'elle arbitre |
|----------|--------------------|
| Q1, Q10 | R5, encourager la récurrence |
| Q2, Q12 | Irritants invisibles pour la supervision, entrées possibles pour de nouvelles fiches |
| Q3, Q4, Q5, Q6 | R2, réconcilier le vote et son effet sur le tirage |
| Q7, Q8 | R3, rendre les notifications atteignables avant de trancher leur sort |
| Q9 | Arbitrage entre mieux exposer l'existant et développer du neuf |
| Q11 | R4, valeur de départ de la boucle de satisfaction |
