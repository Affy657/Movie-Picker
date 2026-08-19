# Recommandations argumentées d'amélioration (C4.3.1)

> Grille : [`../referentiel/bloc-04-maintenir-application-mco.md`](../referentiel/bloc-04-maintenir-application-mco.md) | Suivi : [`../suivi-rncp.md`](../suivi-rncp.md) § 19
>
> **Objectif du critère (C4.3.1)** : proposer des axes d'amélioration à partir des indicateurs de performance et des retours utilisateurs, argumentés et permettant d'évaluer les gains (coût, délai de mise en œuvre), réalistes au regard du projet et de nature à renforcer l'attractivité du logiciel.

## 1. Méthode et sources

Les recommandations qui suivent partent de mesures, pas d'intuitions. Quatre sources ont été exploitées, relevés de fin juillet 2026 :

| Source | Ce qu'elle fournit |
|--------|--------------------|
| **Base de production** (agrégats, sans donnée personnelle) | Usage réel : soirées, participations, films, votes, adoption des fonctionnalités |
| **Cloud Monitoring** (30 jours) | Trafic, latence, taux d'erreur, disponibilité |
| **PostHog** (90 jours) | Analytics produit, et surtout ses trous |
| **CI/CD** | Performance et accessibilité mesurées à chaque déploiement (Lighthouse) |

**Limite assumée** : le volet qualitatif est en cours de constitution. Le questionnaire ([`questionnaire-utilisateurs.md`](questionnaire-utilisateurs.md)) est en ligne depuis le 18 août 2026 ; sept réponses sont arrivées en quarante-huit heures, sur une dizaine espérée au maximum et une cible de 17 comptes. Le canal « Signaler un problème », livré en v1.3.2, complète ce dispositif en continu. Les recommandations ci-dessous restent construites sur le quantitatif, mais intègrent déjà les sept premiers retours reçus, présentés au § 2 bis ; elles seront réexaminées si d'autres réponses arrivent avant la remise du dossier.

## 2. Indicateurs observés

| Indicateur | Mesure | Lecture |
|------------|--------|---------|
| Utilisateurs inscrits | 17 (08/04 → 21/07/2026) | Base réduite, usage entre proches |
| Soirées créées | 19 | Rythme stable : 2 / 6 / 6 / 5 par mois |
| Soirées menées jusqu'au tirage | **14 sur 19, soit 74 %** | Le parcours principal aboutit |
| Soirées tirées en mode pondéré par les votes | **0 sur 19** | Le vote n'a jamais influencé un tirage |
| Films proposés | 62, moyenne 3,3 par soirée | Conforme à l'usage attendu |
| Films dotés d'une note de présentation | **3 sur 62, soit 5 %** | Fonctionnalité quasi ignorée |
| Participations | 80, moyenne 4,2 par soirée | Le partage de lien fonctionne |
| Votes exprimés | 81 (68 pour, 13 contre), par 35 participations sur 80 | **56 % des participations ne votent pas** ; les autres votent 2,3 fois pour 3,3 films |
| Abonnements push actifs | **3 sur 17, 18 %** | Fonctionnalité V1.1 peu adoptée |
| Relations de suivi | 21 | Fonctionnalité sociale V1.2 utilisée |
| Latence API p95 | 207 ms | Confortable |
| Taux d'erreur serveur | 0,026 % | Aucun problème de fiabilité |
| Événements analytics du parcours cœur | **0** | Création, vote et tirage non instrumentés |

Deux conclusions structurent tout le reste : **la fiabilité n'est pas le sujet** (0,026 % d'erreurs, p95 à 207 ms, 74 % d'aboutissement), et **l'engagement dans la soirée l'est**, le vote, mécanisme censé faire émerger le consensus, est à peine sollicité.

## 2 bis. Premiers retours qualitatifs (questionnaire, n = 7)

Sept réponses en quarante-huit heures, sur une dizaine espérée au maximum : l'échantillon est réduit, et vraisemblablement orienté vers les utilisateurs les plus engagés, cinq des sept répondants utilisant l'application « à chaque soirée film ». Les tendances qui suivent sont indicatives, pas représentatives ; elles seront complétées si d'autres réponses arrivent avant la remise du dossier.

| Question | Réponses (n = 7) | Lecture |
|---|---|---|
| Usage des boutons de vote | 6/7 ont voté au moins une fois ; 1/7 jamais | Le vote est pratiqué, malgré un faible taux de participation mesuré en production |
| Effet du vote sur le tirage | 4/7 pensent que ça dépend d'un réglage de l'hôte ; 1/7 croit les films les plus votés toujours favorisés ; 1/7 identifie la réalité (toujours aléatoire) ; 1/7 ne s'est jamais posé la question | La majorité sait le mécanisme configurable, mais quasi personne ne sait qu'il n'est jamais activé |
| Décision réelle du groupe | 5/7 « ça dépend des soirées » ; 1/7 relance la roue jusqu'à un résultat qui convient à tous ; 1/7 fait confiance au tirage | Une réponse confirme le contournement manuel du tirage aléatoire, hypothèse posée avant l'envoi du questionnaire |
| Attente vis-à-vis du vote | 3/7 veulent écarter du tirage les films rejetés ; 2/7 le veulent purement indicatif ; 1/7 veut le pondérer ; 1/7 sans avis | La préférence la plus citée est un mécanisme d'élimination, qui n'existe pas aujourd'hui, davantage qu'une simple pondération |
| Connaissance des notifications | 4/7 ignoraient que l'activation était possible ; 3/7 les ont activées | Même dans un échantillon orienté utilisateurs assidus, plus de la moitié ignore le réglage |
| Connaissance du réglage de la roue | 5/7 connaissaient le réglage aléatoire/pondéré | Le réglage est repéré, mais jamais actionné : 0 soirée sur 19 ne l'a utilisé malgré cette connaissance |
| Ce qui ferait revenir plus souvent | 5/7 « rien de particulier, je l'utilise quand j'en ai besoin » | Confirme un usage par événement plutôt que par habitude |
| Recommandation (échelle 0 à 10) | 10, 10, 10, 8, 9, 10, 10, moyenne ≈ 9,6 | Aucun détracteur ; à lire avec prudence, un échantillon volontaire favorise les utilisateurs satisfaits |

Deux réponses en texte libre apportent une information absente des mesures de production :

- Un répondant qui n'a jamais activé les notifications demande explicitement à être averti quand un film est ajouté à une soirée qu'il a rejointe. Cette notification **existe déjà** (`AddMovieHandler`, déclencheur `MovieAdded`, envoyée en push aux participants ayant activé le réglage), mais reste invisible tant que l'activation n'a jamais été proposée : confirmation directe, sur un cas concret, du diagnostic de R3.
- Un autre signale devoir se reconnecter à chaque fois qu'il rouvre le lien de soirée depuis le navigateur intégré de Snapchat. Distinct de l'anomalie #67 (cause serveur, déjà corrigée), le symptôme évoque le stockage cloisonné propre à certains navigateurs intégrés. Consigné en fiche [#71](https://github.com/Affy657/Movie-Picker/issues/71) selon le processus du § 3, sévérité *medium*.

Deux dernières remarques, sans effet sur les priorités ci-dessous : un répondant souhaiterait voir, sur le profil d'un utilisateur, les films qu'il a proposés plutôt que leur seul nombre (`UserStatsResponse.MoviesProposed` est aujourd'hui un entier, sans détail) ; un autre suggère une watchlist personnelle avec recommandations, déjà backloguée pour la V1.4.

## 3. Recommandations

### R1 : Instrumenter le parcours cœur

**Constat.** Aucun événement produit n'est capturé sur la création d'une soirée, l'ajout d'un film, le vote ou le tirage. Les chiffres du § 2 ont dû être reconstitués depuis la base : ils décrivent des résultats, jamais des abandons. Impossible aujourd'hui de répondre à « combien d'invités ouvrent le lien sans jamais voter ? ».

**Proposition.** Capturer six événements (`event_created`, `link_shared`, `event_joined`, `movie_added`, `vote_cast`, `wheel_spun`) et construire l'entonnoir correspondant dans PostHog. L'infrastructure analytics est déjà en place et soumise au consentement ; il ne manque que les appels.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **0,5 à 1 j** | Immédiat | Mesure des abandons étape par étape ; toutes les décisions suivantes cessent d'être des paris |

**Priorité 1**, prérequis des autres recommandations : sans elle, aucun gain ne sera mesurable.

### R2 : Réconcilier le vote et son effet sur le tirage

**Constat.** Chaque film porte deux boutons, « Voter pour » et « Voter contre ». Le problème n'est pas l'intensité du vote mais son audience : les participants qui votent le font sur 2,3 films en moyenne, mais 56 % des participations n'ont produit aucun vote. Surtout, la roue accepte deux modes (aléatoire strict, valeur par défaut, et pondéré par les votes) et **aucune des 19 soirées n'a activé le second** : aucun vote n'a jamais influencé un tirage. Le produit demande un effort dont il n'utilise pas le résultat.

**Confirmation qualitative (§ 2 bis).** Une réponse décrit explicitement le contournement manuel du tirage aléatoire (« on relance la roue jusqu'à tomber sur un film qui convient à tout le monde »). Le réglage aléatoire/pondéré est pourtant connu de 5 répondants sur 7 : la barrière n'est donc pas sa découvrabilité, mais son statut par défaut, ce qui va dans le sens de la proposition ci-dessous. Point plus inattendu : interrogés sur ce que le vote devrait idéalement faire, 3 répondants sur 7 souhaitent qu'il élimine les films rejetés du tirage, contre 1 seul qui souhaite une simple pondération. Cette préférence pour un mécanisme d'élimination, absent aujourd'hui, dépasse le périmètre de la proposition immédiate ; elle est notée comme piste d'itération suivante plutôt qu'ajoutée au chiffrage ci-dessous, l'échantillon (n = 7) restant trop réduit pour trancher entre pondération et élimination.

**Proposition.** Trois volets : faire du mode pondéré la valeur par défaut à la création (l'hôte reste libre de revenir à l'aléatoire strict) ; afficher sur la roue la part réelle de chaque film ; signaler à l'hôte, avant le lancement, la proportion de participants n'ayant pas voté.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **2 à 3 j** | Une itération | Le vote retrouve sa fonction. Objectifs : au moins la moitié des soirées tirées en mode pondéré, et part des participations sans vote ramenée sous 25 % |

**Priorité 2.** À mesurer avec l'entonnoir de R1 avant / après.

### R3 : Rendre les notifications atteignables avant de trancher leur sort

**Constat.** 3 abonnements actifs pour 17 inscrits (18 %), alors que la V1.1 a investi dans les clés VAPID, cinq déclencheurs et une interface de préférences. Le code explique le chiffre : `Notification.requestPermission()` n'est appelé que par le toggle de `NotificationsSection`, monté dans la seule page « Mon compte ». **Aucune sollicitation n'existe dans le parcours**, et les six préférences par type ne s'affichent qu'une fois abonné. Le taux ne mesure pas un refus mais une absence d'occasion.

**Confirmation qualitative (§ 2 bis).** Sur les 7 réponses reçues, 4 ignoraient que l'activation était possible, y compris parmi des répondants qui utilisent l'application à chaque soirée. L'un d'eux demande spontanément, en texte libre, à être notifié quand un film est ajouté à une soirée qu'il a rejointe : cette notification existe déjà, mais elle ne peut pas être reçue par quelqu'un qui n'a jamais eu l'occasion de s'abonner. Confirmation concrète que le taux d'adoption mesure une absence d'occasion, pas un désintérêt.

**Proposition.** Proposer l'activation une fois, au moment utile (après création ou participation à une soirée), en énonçant ce qui sera reçu, et remonter le choix par type avant l'abonnement plutôt qu'après. Si l'adoption ne dépasse pas 40 % sous deux mois, le gel devient défendable, mais il ne l'est pas tant que personne n'a eu l'occasion d'accepter.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **1 j** | Une itération | Adoption visée > 40 % ; à défaut, décision d'arrêt fondée sur une fonctionnalité réellement exposée, et non jamais proposée |

**Priorité 3.**

### R4 : Boucle de satisfaction continue

**Constat.** Aucun dispositif ne mesure la satisfaction dans la durée. Le questionnaire (§ 2 bis) donne une photographie ponctuelle, pas une tendance.

**Proposition.** Une question unique affichée après le tirage (« cette soirée s'est-elle bien passée ? », trois niveaux), stockée sans donnée nominative, agrégée par mois. Complétée par le canal « Signaler un problème » déjà livré, elle transforme le retour utilisateur en flux plutôt qu'en campagne.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **1 à 2 j** | Une itération | Détection des dégradations d'expérience que la supervision technique ne voit pas, aucune des anomalies fonctionnelles passées n'avait levé d'exception |

**Priorité 3.**

### R5 : Encourager la récurrence

**Constat.** 19 soirées en trois mois et demi pour 17 inscrits : l'application est utilisée par événement, pas par habitude. C'est cohérent avec l'usage, mais la V1.4 prévue (sélection manuelle, flamme de régularité) parie sur la récurrence sans qu'aucune mesure ne l'éclaire.

**Confirmation qualitative (§ 2 bis).** 5 des 7 réponses reçues répondent « rien de particulier, je l'utilise quand j'en ai besoin » à cette même question. Cela ne condamne pas la piste, mais confirme la prudence de la proposition : ne pas investir avant d'avoir mesuré autre chose qu'une satisfaction déclarée.

**Proposition.** Attendre les données de R1 et les réponses à la question « qu'est-ce qui te ferait revenir plus souvent ? » avant d'engager le développement. Si le pari est confirmé, la piste la moins coûteuse est la soirée récurrente (« refaire une soirée avec le même groupe » en un clic, à partir d'une soirée passée) plutôt qu'un mécanisme de gamification complet.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **2 j** (soirée récurrente) contre **5 à 8 j** (gamification) | Après R1 | Évite d'investir une semaine sur une hypothèse non vérifiée ; la reconduction supprime le principal frein à une nouvelle soirée, la reconstitution du groupe |

**Priorité 4**, dépend explicitement des mesures de R1.

### R6 : Décrire la supervision en infrastructure-as-code

**Constat.** Les trois sondes, les cinq politiques d'alerte, le canal de notification et le tableau de bord ont été créés par appels d'API. Ils ne sont pas versionnés : une suppression accidentelle ou une dérive de configuration serait indétectable, et rien ne documente l'état attendu ailleurs que dans la documentation d'exploitation.

**Proposition.** Décrire ces ressources en Terraform, dans le dépôt, et les appliquer depuis la CI. Cette recommandation rejoint la dette technique déjà identifiée sur l'absence d'infrastructure-as-code pour l'hébergement.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **1 à 2 j** | Une itération | Configuration de supervision reproductible et relue comme du code ; suppression d'un point de fragilité de l'exploitation |

**Priorité 4.**

### R7 : Corriger deux irritants remontés par le questionnaire

**Constat.** Le texte libre du questionnaire a fait remonter deux frictions absentes des mesures quantitatives, détaillées au § 2 bis. D'abord, un répondant doit se reconnecter à chaque ouverture du lien de soirée depuis le navigateur intégré de Snapchat, symptôme distinct de l'anomalie #67 et consigné en fiche #71. Ensuite, un autre signale que le profil public affiche le nombre de films proposés par un utilisateur, jamais lesquels, ce que confirme le code (`UserStatsResponse.MoviesProposed` est un entier, sans détail).

**Proposition.** Détecter les navigateurs intégrés connus par leur user-agent et afficher un bandeau invitant à ouvrir le lien dans le navigateur système. Lister les films proposés sur le profil public, à la place ou en complément du simple total.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **1 j** (0,5 j par irritant) | Une itération | Deux frictions concrètes levées, remontées indépendamment par deux répondants différents |

**Priorité 4.** Indépendante des autres recommandations, à traiter quand une itération a de la place libre.

## 4. Priorisation

| Rang | Recommandation | Coût | Nature du gain |
|:----:|----------------|:----:|----------------|
| 1 | R1, Instrumenter le parcours cœur | 0,5 à 1 j | Capacité de décision |
| 2 | R2, Réconcilier le vote et son effet | 2 à 3 j | Attractivité, qualité de la promesse produit |
| 3 | R3, Rendre les notifications atteignables | 1 j | Adoption réelle, ou décision d'arrêt fondée |
| 3 | R4, Boucle de satisfaction | 1 à 2 j | Détection des irritants invisibles |
| 4 | R5, Récurrence | 2 j (option courte) | Fréquence d'usage, sous condition de mesure |
| 4 | R6, Supervision en IaC | 1 à 2 j | Robustesse de l'exploitation |
| 4 | R7, Deux irritants du questionnaire | 1 j | Frictions concrètes levées |

**Total : 8,5 à 12 jours**, séquençables en trois itérations, R7 rejoignant le même dernier lot que R5 et R6. Aucune ne demande de refonte, toutes s'appuient sur l'existant, c'est la condition pour qu'elles soient réalisables sur un projet mené par une seule personne.

L'ordre n'est pas seulement une file d'attente : R1 conditionne l'évaluation de R2, R3 et R5. Engager R5 avant R1 reviendrait à développer une semaine de fonctionnalités sur une hypothèse invérifiable, exactement ce que ces recommandations cherchent à éviter.

## 5. Ce que ces recommandations ne couvrent pas

La fiabilité et la performance ne figurent pas dans cette liste, et c'est un choix : avec 0,026 % d'erreurs serveur, un p95 à 207 ms et une disponibilité sous surveillance active, elles ne sont pas le facteur limitant de l'attractivité. Y investir maintenant serait optimiser ce qui fonctionne déjà.

Les retours qualitatifs, encore partiels (§ 2 bis), ont déjà fait émerger deux irritants absents des données d'usage (R7) et une nuance sur R2 qu'aucune mesure de production n'aurait révélée : un parcours mal compris ou une attente non satisfaite ne laisse aucune trace dans les indicateurs quantitatifs. La liste sera réexaminée si d'autres réponses arrivent avant la remise du dossier.
