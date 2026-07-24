# Recommandations argumentées d'amélioration (C4.3.1)

> Grille : [`../referentiel/bloc-04-maintenir-application-mco.md`](../referentiel/bloc-04-maintenir-application-mco.md) · Suivi : [`../suivi-rncp.md`](../suivi-rncp.md) § 19
>
> **Objectif du critère (C4.3.1)** : proposer des axes d'amélioration à partir des indicateurs de performance et des retours utilisateurs, argumentés et permettant d'évaluer les gains (coût, délai de mise en œuvre), réalistes au regard du projet et de nature à renforcer l'attractivité du logiciel.

## 1. Méthode et sources

Les recommandations qui suivent partent de mesures, pas d'intuitions. Quatre sources ont été exploitées le 25/07/2026 :

| Source | Ce qu'elle fournit |
|--------|--------------------|
| **Base de production** (agrégats, sans donnée personnelle) | Usage réel : soirées, participations, films, votes, adoption des fonctionnalités |
| **Cloud Monitoring** (30 jours) | Trafic, latence, taux d'erreur, disponibilité |
| **PostHog** (90 jours) | Analytics produit — et surtout ses trous |
| **CI/CD** | Performance et accessibilité mesurées à chaque déploiement (Lighthouse) |

**Limite assumée** : les retours utilisateurs qualitatifs ne sont pas encore collectés — le questionnaire ([`questionnaire-utilisateurs.md`](questionnaire-utilisateurs.md)) et le canal « Signaler un problème », livré en v1.3.2, sont les deux dispositifs mis en place pour cela. Les recommandations ci-dessous s'appuient donc sur le quantitatif ; le qualitatif servira à les confirmer ou à les réordonner, ce que la recommandation R1 rend possible en continu.

## 2. Indicateurs observés

| Indicateur | Mesure | Lecture |
|------------|--------|---------|
| Utilisateurs inscrits | 17 (08/04 → 21/07/2026) | Base réduite, usage entre proches |
| Soirées créées | 18 | Rythme stable : 2 / 6 / 6 / 4 par mois |
| Soirées menées jusqu'au tirage | **14 sur 18 — 78 %** | Le parcours principal aboutit |
| Films proposés | 58 — moyenne 3,6 par soirée | Conforme à l'usage attendu |
| Participations | 76 — moyenne 4,2 par soirée | Le partage de lien fonctionne |
| Votes exprimés | 78, par 34 participants | **≈ 1 vote par participant** pour 3,6 films disponibles |
| Abonnements push actifs | **3 sur 17 — 18 %** | Fonctionnalité V1.1 peu adoptée |
| Relations de suivi | 21 | Fonctionnalité sociale V1.2 utilisée |
| Latence API p95 | 207 ms | Confortable |
| Taux d'erreur serveur | 0,026 % | Aucun problème de fiabilité |
| Événements analytics du parcours cœur | **0** | Création, vote et tirage non instrumentés |

Deux conclusions structurent tout le reste : **la fiabilité n'est pas le sujet** (0,026 % d'erreurs, p95 à 207 ms, 78 % d'aboutissement), et **l'engagement dans la soirée l'est** — le vote, mécanisme censé faire émerger le consensus, est à peine sollicité.

## 3. Recommandations

### R1 — Instrumenter le parcours cœur

**Constat.** Aucun événement produit n'est capturé sur la création d'une soirée, l'ajout d'un film, le vote ou le tirage. Les chiffres du § 2 ont dû être reconstitués depuis la base : ils décrivent des résultats, jamais des abandons. Impossible aujourd'hui de répondre à « combien d'invités ouvrent le lien sans jamais voter ? ».

**Proposition.** Capturer six événements (`event_created`, `link_shared`, `event_joined`, `movie_added`, `vote_cast`, `wheel_spun`) et construire l'entonnoir correspondant dans PostHog. L'infrastructure analytics est déjà en place et soumise au consentement ; il ne manque que les appels.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **0,5 à 1 j** | Immédiat | Mesure des abandons étape par étape ; toutes les décisions suivantes cessent d'être des paris |

**Priorité 1** — prérequis des autres recommandations : sans elle, aucun gain ne sera mesurable.

### R2 — Relancer le vote

**Constat.** 78 votes pour 76 participations et 58 films proposés : chaque participant vote environ une fois, alors qu'il peut se prononcer sur tous les films de sa soirée. Le tirage s'appuie donc sur un signal faible, ce qui affaiblit la promesse produit — « faire émerger un consensus ».

**Proposition.** Rendre visible ce qui reste à faire : un indicateur « il te reste X films à noter » sur la page de soirée, une relance in-app à l'ajout d'un film par un autre participant, et un rappel à l'hôte avant le lancement de la roue si moins de la moitié des participants ont voté.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **2 à 3 j** | Une itération | Objectif : passer de ≈ 1 à ≥ 2,5 votes par participant ; tirage plus représentatif, donc décision mieux acceptée par le groupe |

**Priorité 2.** À mesurer avec l'entonnoir de R1 avant / après.

### R3 — Trancher le sort des notifications push

**Constat.** 3 abonnements actifs pour 17 inscrits (18 %), alors que la V1.1 a investi dans les clés VAPID, cinq déclencheurs et une interface de préférences. Le rapport coût de maintenance / valeur rendue est défavorable en l'état.

**Proposition.** Une tentative unique de redressement avant décision : déplacer la demande d'autorisation, aujourd'hui présentée trop tôt, vers un moment où son intérêt est évident — juste après la création d'une soirée ou l'ajout d'un premier film, avec une phrase expliquant ce que l'utilisateur recevra. Si l'adoption ne dépasse pas 40 % sous deux mois, geler l'investissement sur cette fonctionnalité plutôt que continuer à la maintenir à perte.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **1 j** | Une itération | Adoption visée > 40 % ; à défaut, décision d'arrêt argumentée par la mesure — un gain lui aussi, en coût de maintenance évité |

**Priorité 3.**

### R4 — Boucle de satisfaction continue

**Constat.** Aucun dispositif ne mesure la satisfaction dans la durée. Le questionnaire en préparation donnera une photographie ponctuelle, pas une tendance.

**Proposition.** Une question unique affichée après le tirage (« cette soirée s'est-elle bien passée ? », trois niveaux), stockée sans donnée nominative, agrégée par mois. Complétée par le canal « Signaler un problème » déjà livré, elle transforme le retour utilisateur en flux plutôt qu'en campagne.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **1 à 2 j** | Une itération | Détection des dégradations d'expérience que la supervision technique ne voit pas — aucune des anomalies fonctionnelles passées n'avait levé d'exception |

**Priorité 3.**

### R5 — Encourager la récurrence

**Constat.** 18 soirées en trois mois et demi pour 17 inscrits : l'application est utilisée par événement, pas par habitude. C'est cohérent avec l'usage, mais la V1.4 prévue (sélection manuelle, flamme de régularité) parie sur la récurrence sans qu'aucune mesure ne l'éclaire.

**Proposition.** Attendre les données de R1 et les réponses à la question « qu'est-ce qui te ferait revenir plus souvent ? » avant d'engager le développement. Si le pari est confirmé, la piste la moins coûteuse est la soirée récurrente (« refaire une soirée avec le même groupe » en un clic, à partir d'une soirée passée) plutôt qu'un mécanisme de gamification complet.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **2 j** (soirée récurrente) contre **5 à 8 j** (gamification) | Après R1 | Évite d'investir une semaine sur une hypothèse non vérifiée ; la reconduction supprime le principal frein à une nouvelle soirée, la reconstitution du groupe |

**Priorité 4** — dépend explicitement des mesures de R1.

### R6 — Décrire la supervision en infrastructure-as-code

**Constat.** Les trois sondes, les cinq politiques d'alerte, le canal de notification et le tableau de bord ont été créés par appels d'API. Ils ne sont pas versionnés : une suppression accidentelle ou une dérive de configuration serait indétectable, et rien ne documente l'état attendu ailleurs que dans la documentation d'exploitation.

**Proposition.** Décrire ces ressources en Terraform, dans le dépôt, et les appliquer depuis la CI. Cette recommandation rejoint la dette technique déjà identifiée sur l'absence d'infrastructure-as-code pour l'hébergement.

| Coût | Délai | Gain attendu |
|------|-------|--------------|
| **1 à 2 j** | Une itération | Configuration de supervision reproductible et relue comme du code ; suppression d'un point de fragilité de l'exploitation |

**Priorité 4.**

## 4. Priorisation

| Rang | Recommandation | Coût | Nature du gain |
|:----:|----------------|:----:|----------------|
| 1 | R1 — Instrumenter le parcours cœur | 0,5 à 1 j | Capacité de décision |
| 2 | R2 — Relancer le vote | 2 à 3 j | Attractivité, qualité de la promesse produit |
| 3 | R3 — Trancher le sort du push | 1 j | Attractivité ou économie de maintenance |
| 3 | R4 — Boucle de satisfaction | 1 à 2 j | Détection des irritants invisibles |
| 4 | R5 — Récurrence | 2 j (option courte) | Fréquence d'usage — sous condition de mesure |
| 4 | R6 — Supervision en IaC | 1 à 2 j | Robustesse de l'exploitation |

**Total : 7,5 à 11 jours**, séquençables en trois itérations. Aucune ne demande de refonte, toutes s'appuient sur l'existant — c'est la condition pour qu'elles soient réalisables sur un projet mené par une seule personne.

L'ordre n'est pas seulement une file d'attente : R1 conditionne l'évaluation de R2, R3 et R5. Engager R5 avant R1 reviendrait à développer une semaine de fonctionnalités sur une hypothèse invérifiable — exactement ce que ces recommandations cherchent à éviter.

## 5. Ce que ces recommandations ne couvrent pas

La fiabilité et la performance ne figurent pas dans cette liste, et c'est un choix : avec 0,026 % d'erreurs serveur, un p95 à 207 ms et une disponibilité sous surveillance active, elles ne sont pas le facteur limitant de l'attractivité. Y investir maintenant serait optimiser ce qui fonctionne déjà.

Les retours qualitatifs, une fois collectés, pourront faire émerger des irritants absents de cette analyse — un parcours mal compris ou une attente non satisfaite ne laissent aucune trace dans les données d'usage. La liste sera alors révisée.
