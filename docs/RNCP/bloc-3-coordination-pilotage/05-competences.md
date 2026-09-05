# 05 Les besoins en compétences

> **RNCP 39583 Bloc 3, C3.3.2**
>
> **Compétence** : évaluer les besoins en compétences de l'équipe, en transmettant les besoins en recrutement au service RH, en identifiant les besoins de montée en compétences dans le cadre d'un plan de développement des compétences, et en orientant les membres de l'équipe vers des formations adaptées, afin de renforcer l'équipe.
>
> **Livrables attendus** : la présentation de l'évaluation des besoins en compétences réalisée via l'utilisation d'une grille d'évaluation, et la présentation du plan de développement des compétences.
>
> **Critères d'évaluation**
> - Les compétences à mobiliser dans le cadre du projet sont identifiées.
> - Une grille d'évaluation des compétences actuelles et des compétences à acquérir est **commentée**.
> - Un plan de développement des compétences adapté au projet est établi et détaillé. Il permet de monter en compétences le public visé.
> - Des formations sont préconisées en fonction des besoins du projet et du profil des membres de l'équipe.
> - Les modalités de formation sont adaptées pour prendre en considération les spécificités liées au handicap des personnes formées.

Alimente les diapositives 24 à 26.

**Posture de ce chapitre.** La grille et le plan sont construits sur l'**organisation cible** à 4 profils. Mais une colonne de ce chapitre est entièrement réelle : **la montée en compétences que le projet a effectivement exigée**, datée par l'historique du dépôt. C'est elle qui donne à la grille son étalonnage — les niveaux cibles ne sont pas déclaratifs, ils correspondent à ce qu'il a réellement fallu savoir faire pour livrer.

---

## 1. Les compétences à mobiliser

### 1.1 La méthode d'identification

Les compétences ne sont pas listées à partir d'un référentiel métier, mais **déduites des lots du projet**. La question posée pour chaque lot est : *que faut-il savoir faire pour que ce lot soit livrable et exploitable ?*

Cette méthode a une conséquence utile : elle produit des compétences **rattachables à une preuve**. Chacune de celles qui suivent correspond à une technologie réellement présente dans le dépôt, à une date d'introduction vérifiable.

### 1.2 La chronologie d'introduction, mesurée

L'ordre dans lequel les compétences ont dû être mobilisées est lisible dans l'historique. Il n'a rien d'aléatoire : il suit **produire, puis fiabiliser, puis exploiter, puis enrichir**.

| Vague | Période | Compétences mobilisées | Ce qui la déclenche |
|-------|---------|------------------------|---------------------|
| **1. Produire** | 16 au 19 mars 2026 | Chaîne d'intégration continue, C# et ASP.NET Core, architecture hexagonale, driver MongoDB, tests unitaires et d'intégration .NET, contrat OpenAPI, conteneurisation | L'arbitrage du chapitre 3. Le document de décision identifiait explicitement la **courbe d'apprentissage** comme un risque assumé |
| **2. Fiabiliser** | avril à mai 2026 | Mesure de performance et d'accessibilité, analyse statique et portes de qualité, scan de vulnérabilités et de secrets, internationalisation, application installable et service worker, notifications push | La préparation de la V1 : ce qui est livré à des utilisateurs doit être vérifié avant, pas après |
| **3. Exploiter** | juillet 2026 | Supervision applicative, sondes de disponibilité, politiques d'alerte, traçabilité release / incident | La production a des utilisateurs réels : il faut savoir ce qui s'y passe |
| **4. Enrichir** | août 2026 | Identité fédérée, intégration d'un service tiers bidirectionnel | Le périmètre produit hors chiffrage initial (chapitre 2) |

**Le commentaire à porter à l'oral** : la vague 1 est concentrée sur **quatre jours** — du MVP figé le 16 mars à la migration terminée le 19 (chapitre 3, § 2.1). C'est le coût de compétence de l'arbitrage du chapitre 3, et il n'apparaît nulle part dans le chiffrage en jours-homme. Un plan de développement des compétences sert précisément à rendre ce coût visible avant de le payer.

### 1.3 La cartographie

| Domaine | Compétences | Lots concernés |
|---------|-------------|----------------|
| **Développement back** | C# et ASP.NET Core, architecture hexagonale, modélisation documentaire et driver MongoDB, conception d'API et contrat OpenAPI, intégration de services tiers | 1, 2, 3 |
| **Développement front** | React et TypeScript, conception mobile-first, gestion d'état et de cache de données distantes, application installable et service worker, internationalisation | 1, 3 |
| **Accessibilité** | Critères d'accessibilité, tests automatisés d'accessibilité, contraste et navigation clavier | 3, 4 |
| **Chaîne de livraison** | Intégration et déploiement continus, conteneurisation, exécution sans serveur, gestion des secrets, infrastructure décrite en code | 1, 2, 3, 4 |
| **Qualité** | Tests unitaires, d'intégration et de bout en bout, analyse statique et portes de qualité, mesure de performance | 3, 4 |
| **Sécurité** | Authentification et gestion de session, identité fédérée, politique de sécurité du contenu, veille de vulnérabilités, scan de secrets | 3, 4 |
| **Exploitation** | Supervision, sondes de disponibilité, politiques d'alerte, traitement d'anomalie, journal de versions | 4 |
| **Conformité** | Protection des données personnelles, accessibilité réglementaire, éco-conception | 3, 4 |
| **Transverses** | Arbitrage technique, chiffrage, rédaction de décision, revue de code, communication écrite asynchrone | Tous |

---

## 2. La grille d'évaluation des compétences

### 2.1 L'échelle, et pourquoi elle est comportementale

Une échelle en pourcentage ou en « débutant / intermédiaire / avancé » n'est pas évaluable : deux évaluateurs ne mettront pas la même note. L'échelle retenue décrit **ce que la personne sait faire**, pas ce qu'elle connaît.

| Niveau | Descripteur |
|:------:|-------------|
| **0** | Non acquis. Ne sait pas lire le code ou la configuration du domaine |
| **1** | Notions. Sait lire et modifier un existant avec accompagnement |
| **2** | Autonome. Sait réaliser seul une tâche courante du domaine |
| **3** | Maîtrise. Sait concevoir, arbitrer, et traiter un cas non nominal |
| **4** | Référent. Sait définir le standard, former, et arbitrer pour les autres |

**Le niveau 2 est le seuil d'autonomie, le niveau 3 le seuil de responsabilité.** Un profil qui porte le rôle *réalise* de la matrice RACI doit être à 3 sur son domaine ; un profil consulté peut être à 2.

### 2.2 La grille, par profil

**Convention de lecture, à énoncer avant le tableau** : le *niveau actuel* est celui attendu d'un profil **au moment du recrutement** — un développeur junior confirmé, deux à trois ans d'expérience. Ce n'est pas l'évaluation d'une personne existante. L'écart mesure donc ce que le projet exige **au-delà du socle de recrutement**, et c'est lui qui détermine ce qui relève du recrutement et ce qui relève de la formation.

| Profil | Compétence | Actuel | Cible | Écart |
|--------|------------|:------:|:-----:|:-----:|
| **Lead, CDP** | Architecture applicative | 3 | 4 | **+1** |
| | Arbitrage et chiffrage | 2 | 4 | **+2** |
| | Communication au commanditaire | 2 | 3 | +1 |
| | Revue de code et transmission | 2 | 4 | **+2** |
| **Front** | React et TypeScript | 3 | 3 | 0 |
| | Conception mobile-first | 2 | 3 | +1 |
| | **Accessibilité** | **1** | **3** | **+2** |
| | Application installable et service worker | 1 | 2 | +1 |
| | Internationalisation | 1 | 2 | +1 |
| **Back** | C# et ASP.NET Core | 3 | 3 | 0 |
| | **Architecture hexagonale** | **1** | **3** | **+2** |
| | Modélisation documentaire | 2 | 3 | +1 |
| | Sécurité applicative et identité | 1 | 3 | **+2** |
| | Intégration de services tiers | 2 | 3 | +1 |
| **DevOps, QA** | Intégration et déploiement continus | 2 | 3 | +1 |
| | Conteneurisation et exécution sans serveur | 2 | 3 | +1 |
| | **Supervision et exploitation** | **1** | **3** | **+2** |
| | Tests de bout en bout | 2 | 3 | +1 |
| | Veille de vulnérabilités | 1 | 3 | **+2** |

### 2.3 Le commentaire de la grille

Le critère exige que la grille soit **commentée**, pas seulement affichée. Quatre lectures.

**1. Les écarts ne sont pas répartis au hasard : ils se concentrent sur ce que le marché ne fournit pas.** Les deux compétences où l'écart est nul — React et TypeScript, C# et ASP.NET Core — sont celles qu'un recrutement apporte naturellement. Les **sept** écarts à +2 portent sur l'architecture hexagonale, l'accessibilité, la sécurité applicative, la supervision, la veille de vulnérabilités, l'arbitrage et la transmission. **Ce sont des compétences de contexte, pas de langage** : elles ne s'achètent pas sur une fiche de poste, elles se construisent sur le projet.

**2. L'accessibilité à +2 sur le profil front est l'écart le plus structurant.** Le produit en fait une exigence de conformité vérifiée automatiquement à chaque livraison, avec une porte bloquante. Un profil front recruté au niveau 1 ferait échouer la chaîne à sa première livraison. C'est le seul écart qui a un effet immédiat et bloquant sur la production.

**3. Les deux écarts à +2 du lead ne sont pas techniques.** Arbitrage et chiffrage, revue de code et transmission : ce sont les deux compétences que le projet réel a le plus sollicitées et le moins bien exercées. Le chapitre 2 montre un chiffrage formalisé a posteriori ; le chapitre 3 montre 87 lignes intégrées sans revue. **La grille désigne donc les mêmes faiblesses que les indicateurs, ce qui la rend crédible.**

**4. Ce que la colonne réelle apprend.** Sur le projet, ces écarts ont été franchis par autoformation, en production, sans plan et sans budget. La vague 1 du § 1.2 en donne le coût : quatre jours pour absorber un changement de socle complet. **C'est faisable une fois, à une personne, sur un projet dont on est propriétaire. Ce n'est pas un modèle transposable à une équipe** — d'où le plan qui suit.

---

## 3. Le plan de développement des compétences

### 3.1 Le principe d'ordonnancement

Les actions ne sont pas classées par ordre d'importance mais par **coût d'un écart non comblé**. Un écart qui bloque la chaîne de livraison se traite avant un écart qui ralentit une personne.

| Priorité | Critère |
|:--------:|---------|
| **1** | L'écart bloque une porte de qualité ou une mise en production |
| **2** | L'écart crée un point de dépendance unique (facteur de bus) |
| **3** | L'écart ralentit la production sans la bloquer |

### 3.2 Les actions, par profil

| Profil | Action | Modalité | Durée | Coût | Indicateur de réussite | Prio. |
|--------|--------|----------|-------|------|------------------------|:-----:|
| **Front** | Accessibilité : critères, tests automatisés, navigation clavier et lecteur d'écran | Formation certifiante externe **Opquast**, puis mise en pratique encadrée | 3 j + 2 semaines de pratique | ≈ 900 € | Une livraison passe la porte d'accessibilité **sans reprise** | **1** |
| **DevOps, QA** | Supervision et exploitation : sondes, seuils, politiques d'alerte, conduite à tenir | Compagnonnage sur les procédures existantes, puis astreinte simulée | 5 j | interne | Traite seul une alerte de bout en bout, de la détection à la clôture | **1** |
| **Back** | Architecture hexagonale : ports, adaptateurs, inversion de dépendance, testabilité | Lecture guidée du code existant + revue de code systématique pendant 1 mois | 1 mois à temps partiel | interne | Livre un cas d'usage complet sans violation de couche détectée en revue | **2** |
| **Back** | Sécurité applicative et identité fédérée | Autoformation cadrée sur le référentiel **OWASP Top 10**, puis revue croisée sécurité | 4 j | interne | Aucune vulnérabilité de catégorie OWASP introduite sur un trimestre | **2** |
| **DevOps, QA** | Veille de vulnérabilités : qualifier l'exploitabilité réelle d'un avis | Compagnonnage sur le processus existant de traitement des alertes | 2 j | interne | Qualifie seul un avis de sécurité et décide de son traitement | **2** |
| **Lead** | Chiffrage et arbitrage : méthodes d'estimation, écriture d'une décision | Formation courte externe **gestion de projet logiciel** + pratique documentée | 3 j | ≈ 1 200 € | Chaque arbitrage est consigné **au moment où il est pris** | **2** |
| **Lead** | Revue de code et transmission | Pratique encadrée : revue croisée obligatoire sur les changements structurants | continu | interne | Part des changements structurants passés en revue, cible 100 % | **2** |
| **Front** | Application installable, service worker, internationalisation | Autoformation sur la documentation officielle + pratique sur une fonctionnalité dédiée | 3 j | interne | Livre une fonctionnalité hors ligne fonctionnelle et traduite | **3** |

**Charge et budget total** : **20 jours-homme** d'actions de formation identifiées — hors pratique encadrée, qui se déroule sur du travail productif — dont 6 jours en formation externe — 3 sur un parcours certifiant, 3 sur une formation courte — pour un coût direct de **2 100 €**. Rapporté aux 98 J/H du projet, cela représente **20 % de la charge** — un ordre de grandeur assumé, et qui est le prix de la conversion d'un projet à une personne en projet d'équipe.

### 3.3 La logique recruter / former, à transmettre aux ressources humaines

La compétence demande de **transmettre les besoins en recrutement**. La grille du § 2.2 fournit directement l'arbitrage : ce qui est à 0 d'écart relève du recrutement, ce qui est à +2 relève de la formation interne.

| Profil | Exigé **au recrutement**, non négociable | Construit **en interne**, après embauche |
|--------|------------------------------------------|------------------------------------------|
| **Lead, CDP** | Architecture applicative niveau 3, expérience de conduite de projet | Arbitrage, chiffrage, transmission |
| **Front** | React et TypeScript niveau 3, conception d'interface | Accessibilité, service worker, internationalisation |
| **Back** | C# et ASP.NET Core niveau 3 | Architecture hexagonale, sécurité applicative |
| **DevOps, QA** | Intégration continue et conteneurisation niveau 2 | Supervision, exploitation, veille de vulnérabilités |

**La note transmise aux ressources humaines tient en une phrase** : recruter sur le langage et l'expérience de conduite, former sur le contexte et la conformité. Exiger l'accessibilité et l'architecture hexagonale dès le recrutement restreindrait le vivier sans nécessité, puisque ces deux compétences se construisent en un mois de pratique encadrée.

### 3.4 Les modalités adaptées au handicap

Le critère est explicite : les modalités de formation doivent prendre en compte les spécificités liées au handicap des personnes formées. Elles sont posées **par défaut**, sans demande à formuler ni justification à produire.

| Modalité | Mise en œuvre |
|----------|---------------|
| **Temps supplémentaire** | Un tiers-temps est accordé de droit sur toute action de formation et sur ses évaluations, sans démarche préalable |
| **Supports accessibles** | Tout support est fourni en **texte structuré** en complément du format d'origine. Une vidéo n'est retenue que si elle est sous-titrée et accompagnée d'une transcription |
| **Aménagement matériel** | Poste, périphériques et outillage adaptés, compatibles lecteur d'écran et navigation exclusivement au clavier, disponibles **pendant** la formation et pas seulement au poste de travail |
| **Format et rythme** | Distanciel possible sur toute action, découpage en séquences courtes, enregistrement des sessions pour révision asynchrone |
| **Choix du prestataire** | L'accessibilité de la plateforme de formation est un **critère de sélection** du prestataire, au même titre que le contenu |
| **Compagnonnage** | Les actions internes se font en binôme écrit et asynchrone, ce qui n'impose ni la simultanéité ni l'oral |

**Le point à dire** : la dernière ligne n'est pas un aménagement particulier, c'est le mode de travail normal du projet décrit au chapitre 4. **Une organisation dont le fonctionnement courant est déjà accessible n'a pas à produire d'aménagement exceptionnel** — c'est ce qui distingue une inclusion conçue d'une inclusion rapportée.

---

## 4. Rattachement aux diapositives

| Diapo | Titre | Section source |
|:-----:|-------|----------------|
| 24 | Les compétences à mobiliser | 1 |
| 25 | La grille d'évaluation des compétences | 2 |
| 26 | Le plan de développement des compétences | 3 |

---

## 5. Questions probables sur ce chapitre

| Question | Ligne de réponse |
|----------|------------------|
| Vous évaluez des compétences de personnes qui n'existent pas | Le *niveau actuel* de la grille n'est l'évaluation de personne : c'est le socle attendu d'un profil **au recrutement**, un junior confirmé de deux à trois ans. L'écart mesure ce que le projet exige au-delà de ce socle, et c'est lui qui sépare ce qui relève du recrutement de ce qui relève de la formation |
| Comment avez-vous étalonné les niveaux cibles ? | Sur ce que le projet a réellement exigé, pas sur un référentiel. Chaque compétence de la cartographie correspond à une technologie présente dans le dépôt, avec une date d'introduction vérifiable — la chronologie des quatre vagues |
| Pourquoi l'accessibilité est-elle l'écart le plus important ? | Parce que c'est le seul dont l'effet est immédiat et bloquant : le produit en fait une exigence vérifiée automatiquement, avec une porte qui échoue le déploiement. Un profil front recruté au niveau 1 ferait échouer la chaîne à sa première livraison |
| 20 % de la charge en formation, n'est-ce pas beaucoup ? | C'est le prix de la conversion d'un projet à une personne en projet d'équipe, et il est payé une fois. Sur le projet réel, ces mêmes écarts ont été franchis sans plan ni budget, en autoformation et en production. C'est faisable une fois, à une personne, sur un projet dont on est propriétaire — ce n'est pas un modèle |
| Vos deux plus gros écarts sur le lead ne sont pas techniques | Non, et c'est volontaire. Arbitrage, chiffrage et transmission sont les deux compétences que le projet a le plus sollicitées et le moins bien exercées : le chiffrage a été formalisé a posteriori, et 87 lignes ont été intégrées sans revue. La grille désigne les mêmes faiblesses que les indicateurs, sinon elle serait de complaisance |
| Les modalités handicap ne sont-elles pas des clauses de style ? | Trois d'entre elles ont un coût réel et sont donc vérifiables : le tiers-temps accordé de droit, la fourniture systématique d'un support en texte structuré, et l'accessibilité de la plateforme comme critère de sélection du prestataire. Et le compagnonnage interne est déjà asynchrone et écrit — c'est le mode de travail normal du projet, pas un aménagement rapporté |
