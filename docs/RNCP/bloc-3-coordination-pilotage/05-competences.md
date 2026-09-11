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

Alimente les diapositives 21 à 23.

**Posture de ce chapitre.** Le projet a été mené seul : la grille évalue **la seule personne qui y a travaillé**, avant et après le projet, et le plan de développement est le sien. Tout est étalonné sur l'historique du dépôt : chaque compétence correspond à une technologie introduite à une date vérifiable, et les niveaux exigés sont ceux qu'il a réellement fallu atteindre pour livrer. Le besoin en recrutement, que le référentiel demande de transmettre, est instruit pour le jour où le projet passerait en équipe.

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

### 2.2 La grille : moi, en février et en septembre 2026

**Convention de lecture, à énoncer avant le tableau** : c'est une auto-évaluation, et elle est étalonnée sur des preuves. *Février* est le niveau au démarrage du projet, *septembre* le niveau atteint, *exigé* le niveau que le projet a réellement demandé. Un R de la matrice RACI exige le niveau 3.

| Compétence | Février | Septembre | Exigé | Preuve dans le dépôt |
|------------|:-------:|:---------:|:-----:|----------------------|
| Architecture applicative | 2 | 3 | 4 | Découpage hexagonal de l'API, 111 fichiers ; contrat OpenAPI tenu depuis le MVP |
| **Arbitrage et chiffrage** | 2 | **2** | 4 | Chiffrage formalisé après coup, lot de migration chiffré a posteriori, dix jours d'août sans arbitrage posé |
| **Revue de code et transmission** | 1 | **2** | 4 | 87 lignes de front intégrées sans revue en mars ; gabarit de PR et conventions écrites depuis |
| React et TypeScript | 3 | 3 | 3 | Front du MVP livré en trois semaines, février 2026 |
| Accessibilité | 1 | 3 | 3 | Porte de qualité bloquante, tests automatisés sur 9 vues, avril à juin 2026 |
| Application installable, i18n | 1 | 2 | 2 | v1.1.0, notifications push ; produit bilingue |
| C# et ASP.NET Core | 2 | 3 | 3 | Migration de l'API en quatre jours, 16 au 19 mars 2026 |
| Architecture hexagonale | 1 | 3 | 3 | Même migration, ports et adaptateurs, tests d'intégration |
| Sécurité applicative et identité | 1 | 3 | 3 | Session par cookie, identité fédérée, politique de sécurité du contenu, août 2026 |
| Intégration et déploiement continus, conteneurs | 2 | 3 | 3 | Chaîne à 15 jobs, déploiement par digest, exécution sans serveur |
| Supervision et exploitation | 1 | 3 | 3 | Sondes sur trois continents, politiques d'alerte, juillet 2026 |
| Veille de vulnérabilités | 1 | 3 | 3 | Dependabot regroupé, scans de secrets et d'images, alertes d'analyse statique traitées |

### 2.3 Le commentaire de la grille

Le critère exige que la grille soit **commentée**, pas seulement affichée. Trois lectures.

**1. Neuf écarts ont été comblés par autoformation, en production, sans plan ni budget.** Ce sont des compétences de contexte, pas de langage : hexagonal, accessibilité, sécurité, supervision, veille. La vague 1 du § 1.2 en donne le coût, quatre jours pour absorber un changement de socle complet. C'est faisable une fois, seul, sur un projet dont on est propriétaire ; ce n'est pas une méthode.

**2. Les deux écarts qui restent ne sont pas techniques.** Arbitrage et chiffrage, revue et transmission : ce sont les compétences que le projet a le plus sollicitées et le moins bien exercées. Le chapitre 2 montre un chiffrage formalisé a posteriori, le chapitre 3 montre 87 lignes intégrées sans revue, le chapitre 4 montre dix jours d'août sans arbitrage. **La grille désigne les mêmes faiblesses que les indicateurs, ce qui la rend crédible.**

**3. Le niveau 3 est le seuil de responsabilité.** Sur un projet à une personne, il faut y être partout où l'on porte le R de la matrice, et c'est le cas sur le technique en septembre. Là où le niveau exigé est 4, c'est que le projet demandait de définir le standard, pas seulement de l'appliquer : c'est précisément ce qui manque sur l'arbitrage et la revue.

---

## 3. Le plan de développement des compétences

### 3.1 Le principe d'ordonnancement

Les actions ne sont pas classées par ordre d'importance mais par **coût d'un écart non comblé**. Un écart qui bloque la chaîne de livraison se traite avant un écart qui ralentit une personne.

| Priorité | Critère |
|:--------:|---------|
| **1** | L'écart bloque une porte de qualité ou une mise en production |
| **2** | L'écart crée un point de dépendance unique (facteur de bus) |
| **3** | L'écart ralentit la production sans la bloquer |

### 3.2 Les actions

| Action | Modalité | Durée | Coût | Indicateur de réussite | Prio. |
|--------|----------|-------|------|------------------------|:-----:|
| **Arbitrage et chiffrage** : méthodes d'estimation, écriture d'une décision | Formation courte externe **gestion de projet logiciel**, puis pratique à chaque version : chiffrer avant, consigner l'arbitrage quand il est pris | 3 j | externe | Chaque version est chiffrée **avant** d'être ouverte ; chaque arbitrage est consigné **au moment où il est pris** | **1** |
| **Revue et transmission** | Revue par un tiers, humain ou outillé, obligatoire sur les changements structurants : migration, contrat d'interface, chaîne | continu | interne | Part des changements structurants passés en revue, cible 100 % | **1** |
| Sécurité applicative | Autoformation cadrée sur le référentiel **OWASP Top 10**, revue croisée sécurité outillée | 4 j | interne | Aucune vulnérabilité de catégorie OWASP introduite sur un trimestre | 2 |
| Accessibilité | Formation certifiante externe **Opquast**, pour formaliser un acquis construit sur le projet | 3 j | ≈ 900 € | Une livraison passe la porte d'accessibilité **sans reprise** | 2 |
| Management d'équipe | Formation courte, utile le jour où le projet passe en équipe | 2 j | interne ou externe | Un contributeur opérationnel en une journée sur le cadre écrit | 3 |

**Charge et budget** : **12 jours**, en autoformation ou en pratique sur du travail productif, sauf les deux formations externes. Les deux priorités 1 passent avant tout le technique parce qu'elles ont déjà coûté au projet, et parce que le technique, lui, a été acquis sur le projet.

### 3.3 Les besoins en recrutement, à transmettre aux ressources humaines

Le référentiel demande de **transmettre les besoins en recrutement**. Le projet n'en a pas aujourd'hui : il tient à une personne, et c'est le premier point de vigilance du chapitre 1. La question est instruite pour le jour où il passerait en équipe, à partir de la grille du § 2.2 et du facteur de bus.

| Profil à recruter | Exigé au recrutement | Construit en interne, sur le cadre écrit |
|-------------------|----------------------|------------------------------------------|
| **Développeur front** | React et TypeScript niveau 3, **accessibilité niveau 3** : la porte de qualité échoue une livraison au niveau 1 | Conventions, procédures, service worker, internationalisation |
| **DevOps, à mi-temps** | Intégration continue et conteneurisation niveau 2 | Supervision, exploitation, veille de vulnérabilités, sur les procédures existantes |

**La note transmise tient en une phrase** : recruter sur le langage et l'expérience, former sur le contexte et la conformité. Ce que ces deux personnes recevraient le premier jour existe déjà : `AGENTS.md`, les procédures exécutables, les gabarits d'issue et de pull request, le journal des versions.

### 3.4 Les modalités adaptées au handicap

Le critère est explicite : les modalités de formation doivent prendre en compte les spécificités liées au handicap des personnes formées. Elles sont posées **par défaut**, sans demande à formuler ni justification à produire, pour moi comme pour quiconque rejoindrait le projet.

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
| 21 | Les compétences que le projet a exigées | 1 |
| 22 | La grille d'évaluation : moi, avant et après le projet | 2 |
| 23 | Le plan de développement : ce qui reste à acquérir | 3 |

---

## 5. Questions probables sur ce chapitre

| Question | Ligne de réponse |
|----------|------------------|
| Une auto-évaluation, est-ce évaluable ? | Elle est étalonnée ligne par ligne sur le dépôt : la date d'introduction de chaque technologie, ce qui a été livré avec, et ce qui a échoué. Elle avoue deux écarts non comblés, sur les compétences que les indicateurs désignent aussi. Une grille flatteuse n'en avouerait aucun |
| Comment avez-vous étalonné les niveaux cibles ? | Sur ce que le projet a réellement exigé, pas sur un référentiel. Chaque compétence de la cartographie correspond à une technologie présente dans le dépôt, avec une date d'introduction vérifiable — la chronologie des quatre vagues |
| Pourquoi une certification d'accessibilité, si le niveau est atteint ? | Parce que l'acquis a été construit sur un seul produit, avec des outils automatisés. Une certification le formalise et le rend transférable. Et parce que c'est le seul domaine où un écart a un effet immédiat et bloquant : la porte de qualité échoue le déploiement |
| Pourquoi si peu de technique dans le plan ? | Parce que le technique a été acquis sur le projet, en production, et que la grille le montre. Ce qui reste et qui a déjà coûté est du pilotage : chiffrer avant, arbitrer quand il le faut, faire relire le structurant |
| Vos deux plus gros écarts sur le lead ne sont pas techniques | Non, et c'est volontaire. Arbitrage, chiffrage et transmission sont les deux compétences que le projet a le plus sollicitées et le moins bien exercées : le chiffrage a été formalisé a posteriori, et 87 lignes ont été intégrées sans revue. La grille désigne les mêmes faiblesses que les indicateurs, sinon elle serait de complaisance |
| Les modalités handicap ne sont-elles pas des clauses de style ? | Trois d'entre elles ont un coût réel et sont donc vérifiables : le tiers-temps accordé de droit, la fourniture systématique d'un support en texte structuré, et l'accessibilité de la plateforme comme critère de sélection du prestataire. Et le compagnonnage interne est déjà asynchrone et écrit — c'est le mode de travail normal du projet, pas un aménagement rapporté |
