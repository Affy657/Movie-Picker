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

Alimente les diapositives 11 et 12, thème 9.

**Posture de ce chapitre.** Le projet a été mené seul : la grille évalue **la seule personne qui y a travaillé**, avant et après le projet, et le plan de développement est le sien. Tout est étalonné sur l'historique du dépôt : chaque compétence est une technologie ou une méthode nommée, introduite à une version vérifiable, et ce qui reste à acquérir vient de la feuille de route ou des indicateurs. Le besoin en recrutement, que le référentiel demande de transmettre, est instruit pour le jour où le projet passerait en équipe.

---

## 1. Les compétences à mobiliser

### 1.1 La méthode d'identification

Les compétences ne sont pas listées à partir d'un référentiel métier, mais **déduites des lots du projet**. La question posée pour chaque lot est : *que faut-il savoir faire pour que ce lot soit livrable et exploitable ?*

Cette méthode a une conséquence utile : elle produit des compétences **rattachables à une preuve**. Chacune de celles qui suivent correspond à une technologie réellement présente dans le dépôt, à une date d'introduction vérifiable.

### 1.2 La chronologie d'introduction, mesurée

L'ordre dans lequel les compétences ont dû être mobilisées est lisible dans l'historique. Il n'a rien d'aléatoire : il suit **produire, puis fiabiliser, puis exploiter, puis enrichir**.

| Vague | Période | Compétences mobilisées | Ce qui la déclenche |
|-------|---------|------------------------|---------------------|
| **1. Produire** | 16 au 19 mars 2026 | Chaîne d'intégration continue, C# et ASP.NET Core, architecture hexagonale, driver MongoDB, tests unitaires et d'intégration .NET, contrat OpenAPI, conteneurisation | L'arbitrage du thème 8. Ces compétences étaient déjà acquises en février : c'est ce qui rend une migration en quatre jours possible |
| **2. Fiabiliser** | avril à mai 2026 | Mesure de performance et d'accessibilité, analyse statique et portes de qualité, scan de vulnérabilités et de secrets, internationalisation, application installable et service worker, notifications push | La préparation de la V1 : ce qui est livré à des utilisateurs doit être vérifié avant, pas après |
| **3. Exploiter** | juillet 2026 | Supervision applicative, sondes de disponibilité, politiques d'alerte, traçabilité release / incident | La production a des utilisateurs réels : il faut savoir ce qui s'y passe |
| **4. Enrichir** | août 2026 | Identité fédérée, intégration d'un service tiers bidirectionnel | Le périmètre produit hors chiffrage initial (chapitre 2) |

**Le commentaire à porter à l'oral** : la vague 1 est concentrée sur **quatre jours**, du MVP figé le 16 mars à la migration terminée le 19 (chapitre 3, § 2.1), et elle ne mobilise que des compétences déjà acquises. Le coût d'apprentissage est dans les vagues 2 à 4, tout ce qu'un produit en production impose et que le socle n'apprend pas, et il n'apparaît nulle part dans le chiffrage en jours-homme. Un plan de développement des compétences sert précisément à rendre ce coût visible avant de le payer.

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

### 2.1 Le principe : des choses nommées, pas des notes

Une note de 0 à 4 sur « architecture » ou « sécurité » n'est pas vérifiable : deux évaluateurs ne mettront pas la même, et le jury ne peut pas la contrôler. La grille retenue ne note rien. **Une compétence y est une technologie ou une méthode nommée**, et son état se lit dans le dépôt : une dépendance dans `package.json` ou dans un `.csproj`, un job dans un workflow, une version taguée.

Trois états, un par colonne :

| Colonne | Ce qu'elle contient | Preuve |
|---------|---------------------|--------|
| **Février, déjà acquis** | Ce que je savais au démarrage : un profil back et DevOps, plus la pile du MVP livré le 16 mars 2026 | Déclaratif pour le socle .NET et la chaîne ; `v0.1.0` pour la pile du MVP |
| **Appris sur le projet** | Ce que le projet m'a obligé à apprendre, avec la version qui le prouve | La version où la technologie entre dans `docs/roadmap.md` ou dans le dépôt |
| **Reste à acquérir** | Ce que la suite du projet demande et que je n'ai pas encore | Feuille de route 1.7, 1.8 et backlog technique, ou un indicateur des thèmes 4, 7 et 8 |

### 2.2 La grille : moi, en février et en septembre 2026

| Domaine | Février, déjà acquis | Appris sur le projet, et la version qui le prouve | Reste à acquérir |
|---------|----------------------|---------------------------------------------------|------------------|
| **Back** | C#, ASP.NET Core, architecture hexagonale, driver MongoDB et transactions, contrat OpenAPI généré ; Node, Express, Mongoose | Web Push VAPID (1.1) ; OAuth Google et GitHub, synchronisation Letterboxd (1.4) ; passe planifiée Cloud Scheduler (1.6) | Temps réel, SignalR ou WebSocket ; TOTP (1.7) |
| **Front** | React, TypeScript, Vite, React Router | TanStack Query, cache de données distantes ; i18n FR et EN (V1) ; PWA Workbox (1.1) ; design system à jetons, SEO JSON-LD et sitemap (1.5) ; pré-rendu, coquille de démarrage LCP (1.6) | Consultation hors-ligne en lecture seule (1.8) |
| **Tests, qualité** | xUnit, Playwright, SonarCloud | Vitest, Testing Library, MSW ; Moq, WebApplicationFactory ; tests sur MongoDB réel en replica set ; Stryker, tests de mutation ; seuils de couverture bloquants (V1 à 1.6) | Revue de code par un tiers |
| **Accessibilité, performance** | | axe automatisé sur 9 vues, critères RGAA clavier, focus et contraste (1.2) ; Lighthouse bloquant au déploiement (V1) ; mesure et correction du LCP (1.6) | Formation RGAA certifiante |
| **Livraison, infrastructure** | GitHub Actions, Dependabot regroupé, Docker, Git | Artifact Registry et Cloud Run, déploiement par digest, rollback de trafic ; S3 et CloudFront, politique d'en-têtes ; Secret Manager ; sauvegarde Atlas vérifiée par restauration (1.6) | Terraform ; fédération d'identité pour la CI ; environnement de recette |
| **Sécurité, exploitation** | Gitleaks ; cookie de session | Data Protection, CSP ; Trivy, zizmor ; export et suppression RGPD, PostHog sous consentement (1.2) ; Sentry front et API (1.3) ; 3 sondes de disponibilité, 5 politiques d'alerte, journal de versions | Double authentification (1.7) ; OWASP |
| **Méthode** | | Cycle en V par version, feuille de route chiffrée en points, board ; AGENTS.md et conduite d'assistants de code ; document d'aide à la décision, gabarit de PR | Chiffrage avant réalisation, arbitrage consigné ; management d'équipe |

### 2.3 Le commentaire de la grille

Le critère exige que la grille soit **commentée**, pas seulement affichée. Trois lectures.

**1. La colonne de février est un profil back et DevOps.** C#, hexagonal, MongoDB, OpenAPI, xUnit, Playwright, GitHub Actions, SonarCloud, Gitleaks : c'est ce qui a rendu la migration de mars possible en quatre jours (thème 8), on ne migre pas vers une pile qu'on ne connaît pas. Deux cases sont vides, l'accessibilité et la méthode de pilotage.

**2. La colonne du milieu, c'est ce qu'un produit en production impose et que le socle n'apprend pas.** Push, OAuth, PWA, i18n, accessibilité, supervision, RGPD, sauvegarde vérifiée, et la méthode elle-même. Tout a été appris seul, en production, pendant le projet, sans plan ni budget : c'est la justification du plan du § 3, rendre ce coût visible avant de le payer. Chaque case porte la version qui l'a fait entrer dans le dépôt.

**3. La colonne de droite a deux natures.** Les lignes techniques viennent de la feuille de route, 1.7, 1.8 et les huit lots Terraform du backlog : ce sont des besoins datés. La ligne méthode vient des indicateurs : chiffrage formalisé après coup (thème 4), migration chiffrée a posteriori et 87 lignes intégrées sans revue (thème 8), facteur de bus (thème 7). **La grille désigne les mêmes faiblesses que les indicateurs, c'est ce qui la rend crédible.** Une grille flatteuse n'aurait pas de colonne de droite.

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

Le plan, c'est la colonne « reste à acquérir » de la grille, ligne par ligne, avec trois choses par ligne : d'où vient le besoin, comment on l'acquiert, et à quoi on verra que c'est acquis.

| D'où vient le besoin | Compétence à acquérir | Moyen | Preuve attendue | Prio. |
|----------------------|-----------------------|-------|-----------------|:-----:|
| Chiffrage formalisé après coup (thème 4) ; migration chiffrée a posteriori (thème 8) | **Chiffrage avant réalisation, arbitrage consigné quand il est pris** | Pratique à chaque version, dès la 1.7 | La 1.7 est chiffrée avant le premier commit, et l'écart mesuré à la livraison | **1** |
| Facteur de bus 1 (thème 7) ; 87 lignes intégrées sans revue (thème 8) | **Revue de code par un tiers** | Un pair humain sur le structurant, revue outillée ailleurs | 100 % des pull requests structurantes relues avant fusion | **1** |
| 1.7 : temps réel, double authentification ; 1.8 : hors-ligne | SignalR sur ASP.NET Core, TOTP RFC 6238, stratégies hors-ligne Workbox | Documentation Microsoft et Google, prototype hors produit avant le lot | Une soirée qui se met à jour sans polling ; le code à six chiffres activable dans les paramètres | 2 |
| Backlog technique : 8 lots Terraform | Terraform, fédération d'identité pour la CI | Tutoriels HashiCorp, lot 1 puis import de la prod existante | `terraform plan` vide sur la prod en service ; plus de clé JSON longue durée | 2 |
| Porte d'accessibilité : reprises avant chaque livraison | RGAA, au-delà des tests automatisés | Formation certifiante, seul poste payant | Une livraison passe la porte sans reprise | 2 |
| Si le projet passe en équipe | Management d'équipe, transmission | Formation courte ; le cadre écrit existe déjà, RACI et AGENTS.md | Un contributeur opérationnel en une journée | 3 |

**Le moyen est l'autoformation sur la documentation éditeur, avec un prototype hors produit avant le lot**, parce que c'est ainsi que le C# a été absorbé en mars. Un seul poste est une formation payante, le RGAA, parce que les tests automatisés ne couvrent qu'une partie des critères. Les deux priorités 1 passent avant tout le technique parce qu'elles ont déjà coûté au projet, et parce que le technique, lui, s'apprend sur le projet.

### 3.3 Les besoins en recrutement, à transmettre aux ressources humaines

Le référentiel demande de **transmettre les besoins en recrutement**. Le projet n'en a pas aujourd'hui : il tient à une personne, et c'est le premier point de vigilance du chapitre 1. La question est instruite pour le jour où il passerait en équipe, à partir de la grille du § 2.2 et du facteur de bus.

Le point de départ est mon profil, back et DevOps : ce qui manque est en face.

| Profil à recruter | Ce qu'il apporte que le profil actuel n'a pas | Construit en interne, sur le cadre écrit |
|-------------------|-----------------------------------------------|------------------------------------------|
| **Développeur front, designer** | L'interface et le design, l'accessibilité au-delà des tests automatisés | Conventions, procédures, service worker, internationalisation |
| **Product owner, chargé de marketing** | Le cadrage produit et l'acquisition : 21 comptes en sept mois disent qu'elle n'a pas été faite | La feuille de route, le board, le journal des versions |

**La note transmise tient en une phrase** : recruter ce qui complète le profil, former sur le contexte. Ce que ces deux personnes recevraient le premier jour existe déjà : les conventions du dépôt, les procédures exécutables, les gabarits d'issue et de pull request, le journal des versions.

### 3.4 Les modalités adaptées au handicap

Le critère est explicite : les modalités de formation doivent prendre en compte les spécificités liées au handicap des personnes formées. Elles sont posées **par défaut**, sans demande à formuler ni justification à produire, pour moi comme pour quiconque rejoindrait le projet.

| Modalité | Mise en œuvre |
|----------|---------------|
| **Temps supplémentaire** | Un tiers-temps est accordé de droit sur toute action de formation et sur ses évaluations, sans démarche préalable |
| **Supports accessibles** | Tout support est fourni en **texte structuré** en complément du format d'origine. Une vidéo n'est retenue que si elle est sous-titrée et accompagnée d'une transcription |
| **Aménagement matériel** | Poste, périphériques et outillage adaptés, compatibles lecteur d'écran et navigation exclusivement au clavier, disponibles **pendant** la formation et pas seulement au poste de travail |
| **Format et rythme** | Distanciel possible sur toute action, découpage en séquences courtes, enregistrement des sessions pour révision asynchrone |
| **Choix du prestataire** | L'accessibilité de la plateforme de formation est un **critère de sélection** du prestataire, au même titre que le contenu |
| **Compagnonnage** | Les actions internes se font par écrit et en asynchrone, sur les procédures du dépôt, ce qui n'impose ni la simultanéité ni l'oral |

**Le point à dire** : la dernière ligne n'est pas un aménagement particulier, c'est le mode de travail normal du projet décrit au chapitre 4. **Une organisation dont le fonctionnement courant est déjà accessible n'a pas à produire d'aménagement exceptionnel**, c'est ce qui distingue une inclusion conçue d'une inclusion rapportée.

---

## 4. Rattachement aux diapositives

| Diapo | Titre | Section source |
|:-----:|-------|----------------|
| 11 | 9. Les compétences : ce qu'il a fallu apprendre | 1, 2 |
| 12 | Le plan de développement : ce qui reste à acquérir | 3 |

---

## 5. Questions probables sur ce chapitre

| Question | Ligne de réponse |
|----------|------------------|
| Une auto-évaluation, est-ce évaluable ? | Elle ne note rien : chaque case est une technologie ou une méthode nommée, vérifiable dans le dépôt, une dépendance, un job de workflow, une version taguée. Et elle a une colonne « reste à acquérir » qui désigne les mêmes faiblesses que les indicateurs. Une grille flatteuse n'en aurait pas |
| D'où viennent les compétences « à acquérir » ? | De la suite du projet, pas d'un référentiel : la 1.7 demande du temps réel et une double authentification, la 1.8 du hors-ligne, le backlog technique huit lots Terraform. Et des indicateurs pour la méthode : chiffrage après coup, revue absente |
| Pourquoi une formation d'accessibilité, si les tests passent ? | Parce que l'acquis a été construit sur un seul produit, avec des outils automatisés. Une certification le formalise et le rend transférable. Et parce que c'est le seul domaine où un écart a un effet immédiat et bloquant : la porte de qualité échoue le déploiement |
| Pourquoi si peu de technique dans le plan ? | Parce que le technique a été acquis sur le projet, en production, et que la grille le montre. Ce qui reste et qui a déjà coûté est du pilotage : chiffrer avant, arbitrer quand il le faut, faire relire le structurant |
| Vos deux plus gros écarts ne sont pas techniques | Non, et c'est volontaire. Arbitrage, chiffrage et transmission sont les deux compétences que le projet a le plus sollicitées et le moins bien exercées : le chiffrage a été formalisé a posteriori, et 87 lignes ont été intégrées sans revue. La grille désigne les mêmes faiblesses que les indicateurs, sinon elle serait de complaisance |
| Les modalités handicap ne sont-elles pas des clauses de style ? | Trois d'entre elles ont un coût réel et sont donc vérifiables : le tiers-temps accordé de droit, la fourniture systématique d'un support en texte structuré, et l'accessibilité de la plateforme comme critère de sélection du prestataire. Et le compagnonnage interne est déjà asynchrone et écrit, c'est le mode de travail normal du projet, pas un aménagement rapporté |
