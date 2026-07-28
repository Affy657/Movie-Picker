# Questionnaire de retour utilisateur

> Support de collecte des retours pour les axes d'amélioration ([`axes-amelioration.md`](axes-amelioration.md), C4.3.1) et pour le suivi de la satisfaction.
>
> **Statut : à envoyer.** Cible : les 17 comptes inscrits en production. Durée annoncée : deux minutes.
> **Formulaire** : [Google Forms](https://docs.google.com/forms/d/1u_FlEJPyoUATSZp18kE-Ak3hb6upPQv4mu8Znksd8_o/edit) — peut être généré automatiquement avec [`questionnaire-google-form.gs`](questionnaire-google-form.gs).

## Réglages du formulaire

| Réglage | Valeur | Pourquoi |
|---------|--------|----------|
| Collecte des adresses e-mail | **Non** | Réponses anonymes : sur un panel de 17 personnes qui se connaissent, l'anonymat est la condition d'un retour franc |
| Limiter à une réponse par personne | **Non** | Exigerait une connexion Google et lèverait l'anonymat |
| Barre de progression | Oui | Rassure sur la brièveté annoncée |
| Ordre des questions mélangé | Non | La progression est volontairement du général au particulier |
| Message de confirmation | « Merci, c'est noté. Les retours sont lus un par un. » | |

## Titre et introduction

**Titre** : Movie Picker : ton avis en 2 minutes

**Description** :

> Tu as utilisé Movie Picker pour choisir un film à plusieurs. J'aimerais l'améliorer et j'ai besoin de ton avis.
> Six questions, deux minutes, réponses anonymes. Les retours négatifs sont les plus utiles : n'hésite pas.

## Questions

### Q1. Fréquence d'utilisation

| | |
|---|---|
| **Intitulé** | À quelle fréquence utilises-tu Movie Picker ? |
| **Type** | Choix multiple (une seule réponse) |
| **Obligatoire** | Oui |
| **Option « Autre »** | Non |

Options :
1. À chaque soirée film
2. De temps en temps
3. Une seule fois, pour essayer
4. Jamais vraiment utilisé après l'inscription

*Exploitation : mesure la récurrence réelle, que le nombre de soirées créées ne donne pas. L'option 4 identifie les comptes créés sans usage, invisibles autrement.*

### Q2. Irritant principal

| | |
|---|---|
| **Intitulé** | Qu'est-ce qui t'a le plus manqué ou agacé lors de ta dernière utilisation ? |
| **Type** | Paragraphe (réponse longue) |
| **Obligatoire** | Non |
| **Texte d'aide** | Même une petite gêne compte. Si rien ne t'a dérangé, laisse vide. |

*Exploitation : fait remonter les irritants qui ne lèvent aucune exception et qu'aucune sonde ne détecte. C'est la question qui apporte le plus d'information par caractère écrit.*

### Q3a. Participation au vote

| | |
|---|---|
| **Intitulé** | As-tu voté sur les films proposés ? |
| **Type** | Choix multiple (une seule réponse) |
| **Obligatoire** | Oui |
| **Option « Autre »** | Non |

Options :
1. Oui, sur tous les films de la soirée
2. Oui, sur quelques-uns seulement
3. Non, je n'ai pas voté
4. Je ne savais pas qu'on pouvait voter

*Exploitation : explique la sous-utilisation mesurée du vote (environ 1 vote par participant pour 3,6 films disponibles). L'option 4 teste l'hypothèse d'un défaut de visibilité plutôt que de motivation, ce qui oriente directement la recommandation R2.*

### Q3b. Frein au vote

| | |
|---|---|
| **Intitulé** | Si tu n'as pas voté sur tous les films, qu'est-ce qui t'en a empêché ? |
| **Type** | Cases à cocher (plusieurs réponses possibles) |
| **Obligatoire** | Non |
| **Option « Autre »** | **Oui**, avec champ libre |

Options :
1. Je n'avais pas vu qu'il fallait voter
2. Je ne savais pas sur quoi je votais
3. Ça m'a semblé trop long
4. Les films avaient déjà été ajoutés après mon passage
5. Le résultat me convenait de toute façon

### Q4a. Notifications

| | |
|---|---|
| **Intitulé** | As-tu activé les notifications de Movie Picker ? |
| **Type** | Choix multiple (une seule réponse) |
| **Obligatoire** | Oui |
| **Option « Autre »** | Non |

Options :
1. Oui, elles sont activées
2. Non, j'ai refusé
3. Je ne me souviens pas qu'on me l'ait proposé
4. Je ne savais pas que ça existait

### Q4b. Frein aux notifications

| | |
|---|---|
| **Intitulé** | Si tu ne les as pas activées, pourquoi ? |
| **Type** | Cases à cocher (plusieurs réponses possibles) |
| **Obligatoire** | Non |
| **Option « Autre »** | **Oui**, avec champ libre |

Options :
1. Je refuse les notifications par principe
2. On me l'a demandé trop tôt, avant que je comprenne l'application
3. Je ne voyais pas ce que j'allais recevoir
4. J'en reçois déjà trop ailleurs

*Exploitation Q4a et Q4b : 3 abonnements actifs sur 17 inscrits. L'option 2 de Q4b teste précisément l'hypothèse de la recommandation R3, à savoir que la demande d'autorisation arrive trop tôt dans le parcours.*

### Q5. Ce qui ferait revenir

| | |
|---|---|
| **Intitulé** | Qu'est-ce qui te ferait utiliser Movie Picker plus souvent ? |
| **Type** | Cases à cocher (plusieurs réponses possibles) |
| **Obligatoire** | Non |
| **Option « Autre »** | **Oui**, avec champ libre |

Options :
1. Refaire une soirée avec le même groupe en un clic
2. Des rappels au bon moment (échéance proche, tout le monde a voté)
3. Un catalogue plus large ou de meilleures suggestions
4. Une vraie application mobile
5. Rien de particulier, je l'utilise quand j'en ai besoin

*Exploitation : arbitre la recommandation R5. L'option 1 correspond à la piste courte (2 jours), l'option 4 à un chantier hors de portée à court terme. L'option 5 est délibérément proposée pour éviter de forcer une attente qui n'existe pas.*

### Q6. Recommandation

| | |
|---|---|
| **Intitulé** | Recommanderais-tu Movie Picker à un ami ? |
| **Type** | Échelle linéaire, de 0 à 10 |
| **Obligatoire** | Oui |
| **Étiquette 0** | Pas du tout |
| **Étiquette 10** | Sans hésiter |

*Exploitation : indicateur comparable dans le temps. Sur 17 personnes, la valeur absolue compte moins que son évolution aux prochaines campagnes et que la dispersion des réponses.*

### Q7. Champ libre

| | |
|---|---|
| **Intitulé** | Autre chose à dire ? |
| **Type** | Paragraphe (réponse longue) |
| **Obligatoire** | Non |

*Exploitation : capte ce que les six questions précédentes n'ont pas prévu. Une question de ce type ramène souvent le retour le plus utile de tout le formulaire.*

## Exploitation prévue

Les réponses sont synthétisées par thème, sans donnée nominative, puis confrontées aux indicateurs mesurés en production. La synthèse alimente le §6 du dossier, en confirmant, en infirmant ou en réordonnant les recommandations. Une anomalie fonctionnelle révélée par une réponse est consignée en fiche selon [`processus-anomalies.md`](processus-anomalies.md).

| Question | Recommandation éclairée |
|----------|-------------------------|
| Q1, Q5 | R5, encourager la récurrence |
| Q2, Q7 | Irritants non détectés par la supervision, entrées possibles pour de nouvelles fiches |
| Q3a, Q3b | R2, relancer le vote |
| Q4a, Q4b | R3, trancher le sort des notifications |
| Q6 | R4, boucle de satisfaction continue (valeur de départ) |
