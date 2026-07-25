# Dossier professionnel — Bloc 4

## Maintenir l'application logicielle en condition opérationnelle

|  |  |
|---|---|
| **Certification** | Expert en développement logiciel — **RNCP 39583** |
| **Bloc évalué** | Bloc 4 — Maintenir l'application logicielle en condition opérationnelle |
| **Projet support** | **Movie Picker** — application web pour choisir un film à plusieurs |
| **Candidat** | Adrien MORAND |
| **Modalité** | Projet individuel, commanditaire fictif (Ynov) |
| **Livrable** | Ce dossier (20 pages maximum) |
| **Date** | Juillet 2026 |

> Ce dossier décrit le maintien en condition opérationnelle d'une application **réellement déployée et utilisée** : les mesures, seuils, incidents et indicateurs qui y figurent proviennent de la production, non d'un environnement de démonstration. Les valeurs chiffrées ont été relevées le 25 juillet 2026 ; le déploiement continu implique que la production peut avoir évolué depuis.

---

## Sommaire

| § | Section | Compétence |
|:--:|---|---|
| 1 | Processus de mise à jour des dépendances | C4.1.1 |
| 2 | Système de supervision et d'alerte | **C4.1.2** (élim.) |
| 3 | Processus de collecte et de consignation des anomalies | **C4.2.1** (élim.) |
| 4 | Fiche de consignation d'une anomalie | **C4.2.1** (élim.) |
| 5 | Traitement d'une anomalie détectée en production | C4.2.2 |
| 6 | Recommandations argumentées d'amélioration | C4.3.1 |
| 7 | Journal des versions déployées | **C4.3.2** (élim.) |
| 8 | Problème résolu en collaboration avec le support | C4.3.3 |

---

## Contexte

**Movie Picker** répond à un irritant du quotidien : choisir un film à plusieurs sans négociation interminable. Un hôte crée une **soirée** et invite des participants par un simple lien ; chacun propose des films issus du catalogue TMDB, l'assemblée vote, puis une roue tire au sort parmi les propositions retenues.

L'application sert des utilisateurs réels depuis **avril 2026** — la première version étiquetée `1.0.0` datant du 19 mai — à l'adresse **web.movie-picker.fr**. Elle repose sur trois composants déployés indépendamment :

| Composant | Technologie | Hébergement |
|-----------|-------------|-------------|
| Front (SPA installable en PWA) | React 19 · TypeScript · Vite | AWS S3 + CloudFront |
| API REST | ASP.NET Core (.NET 10) | GCP Cloud Run (europe-west1) |
| Base de données | MongoDB | MongoDB Atlas |

L'échelle réelle du service conditionne toutes les décisions d'exploitation présentées ici : **17 comptes inscrits**, **18 soirées créées** entre avril et juillet 2026, **15 161 requêtes** servies sur les trente derniers jours. Un projet de cette taille ne justifie ni astreinte ni redondance multi-région ; il justifie en revanche que la moindre indisponibilité soit détectée sans dépendre du signalement d'un utilisateur, et que chaque anomalie laisse une trace écrite. C'est le parti pris de ce dossier : un dispositif **proportionné**, mais complet sur la chaîne détection → consignation → correction → traçabilité.

---

## §1 — Processus de mise à jour des dépendances

> **Compétence C4.1.1** — *Gérer les mises à jour des dépendances et des bibliothèques tierces, en surveillant régulièrement les nouvelles versions, en évaluant les impacts, et en les intégrant de manière sécurisée.*

### 1.1 — Périmètre logiciel

Le dépôt est un monorepo réunissant deux applications et leur outillage. Quatre écosystèmes de dépendances y coexistent, tous placés sous surveillance automatisée :

| Écosystème | Manifeste | Contenu surveillé |
|------------|-----------|-------------------|
| **npm / pnpm** | `pnpm-lock.yaml` (racine + workspace `apps/*`) | Front React/TypeScript, outillage de build et de test |
| **NuGet** | `apps/api-dotnet/**/*.csproj` | API .NET, dépendances transitives incluses |
| **GitHub Actions** | `.github/workflows/*.yml` | Actions du pipeline, épinglées par **SHA de commit** |
| **Images Docker** | `apps/api-dotnet/MoviePicker.Api/Dockerfile` | Images de base de l'API, épinglées par **digest `sha256`** |

L'épinglage par SHA et par digest est une protection contre les attaques de chaîne d'approvisionnement : une action ou une image ne peut pas changer de contenu sous une même étiquette. En contrepartie, ces références n'évoluent que si on les met à jour explicitement — d'où leur intégration au périmètre automatisé.

Une exclusion est assumée : les supports de présentation archivés (`archive/docs/…/slides`) constituent un manifeste figé, hors production, où la mise à jour automatique est neutralisée. Sans cela, les correctifs de sécurité échouent en boucle sur les dépendances transitives d'un projet qui n'est plus maintenu ni déployé.

### 1.2 — Fréquence

Trois rythmes se complètent, du plus lent au plus réactif :

| Rythme | Mécanisme | Rôle |
|--------|-----------|------|
| **Mensuel** | Dependabot — une pull request **groupée par écosystème** | Maintenir le socle à jour sans noyer le projet sous les demandes de fusion |
| **Hebdomadaire** | Analyse planifiée Trivy du dépôt entier (lundi, 04 h 17 UTC), sévérités **HIGH et CRITICAL bloquantes** | Capter les vulnérabilités divulguées entre deux cycles mensuels |
| **À chaque commit** | Audit intégré au pipeline : Trivy sur `pnpm-lock.yaml` et `dotnet list package --vulnerable --include-transitive` | Interdire l'introduction d'une dépendance vulnérable et bloquer le déploiement si une faille est publiée entretemps |

La cadence mensuelle groupée, plutôt qu'hebdomadaire et unitaire, est un choix délibéré : sur un projet mené par une seule personne, une pluie de demandes de fusion produit de la fatigue puis des fusions non relues. Le filet de sécurité réel n'est pas la fréquence de l'outil de proposition, mais l'analyse hebdomadaire et l'audit à chaque commit, tous deux **bloquants**.

### 1.3 — Type de mise à jour : automatique ou manuel

| Étape | Automatique | Manuel |
|-------|:-----------:|:------:|
| Surveillance des nouvelles versions | ✅ | |
| Détection des vulnérabilités | ✅ | |
| Ouverture de la demande de fusion | ✅ | |
| Exécution des tests et portes de qualité | ✅ | |
| **Évaluation d'impact et décision de fusion** | | ✅ |
| **Montée de version majeure** | | ✅ |
| Déploiement après fusion | ✅ | |

**Aucune fusion n'est automatique.** La proposition est automatisée, la décision ne l'est pas : une montée de version peut franchir toutes les portes tout en modifiant un comportement non couvert par les tests. Les demandes ouvertes par Dependabot s'exécutent d'ailleurs sans accès aux secrets du dépôt, ce qui désactive l'analyse de qualité externe et impose une relecture humaine.

### 1.4 — Évaluation de l'impact

Chaque montée de version est jugée sur quatre points : la **nature du changement** (correctif, mineure, majeure — une majeure impose la lecture des notes de version), l'**exploitabilité réelle** de la vulnérabilité dans cette application, la **surface d'impact** (fichiers concernés, couverture de tests sur ces chemins), et la **vérification** (compilation, tests unitaires et de bout en bout, build de production, audit de performance). Ces contrôles étant bloquants, une régression détectable ne peut pas atteindre la production.

### 1.5 — Cas d'application : une montée majeure sous contrainte de sécurité

Le 25 juillet 2026, l'audit du pipeline échoue sur l'avis **`GHSA-qwww-vcr4-c8h2`** (sévérité haute) : la bibliothèque de routage `react-router` 7.18.1 est vulnérable, le correctif se trouve en version **8.3.0**. Le déploiement est automatiquement bloqué — la porte joue son rôle.

**Évaluation.** L'avis concerne le mode « composants serveur » du routeur. L'application est une SPA sans rendu serveur : le code vulnérable n'y est pas atteignable. L'impact est donc nul en exploitation, mais le correctif impose une **montée majeure** (7.x → 8.x), avec un risque de rupture d'interface. L'analyse du code montre que 51 fichiers importent le routeur, tous limités à son cœur stable. Elle révèle surtout un point structurant : le paquet `react-router-dom` n'est plus publié au-delà de la 7.18.1, la ligne 8.x étant distribuée sous le paquet unifié `react-router` — la montée impose donc un changement de paquet, pas seulement de version.

**Décision.** Bien que la faille ne soit pas exploitable dans ce contexte, la montée est effectuée plutôt que neutralisée par une exception : l'interface utilisée est stable, la couverture de tests est forte, et supprimer la cause vaut mieux qu'entretenir une dérogation à réexaminer indéfiniment.

**Intégration et vérification.** Remplacement du paquet, réécriture des imports sur les 51 fichiers, puis contrôle complet : compilation TypeScript et analyse statique sans erreur, **intégralité de la suite unitaire au vert** (575 tests à cette date), build de production et génération du service worker conformes, tests de bout en bout et audit de performance validés en intégration continue. L'avis disparaît de l'audit, le pipeline repasse au vert et le déploiement bloqué reprend son cours. Durée totale : moins d'une heure, sans adaptation du code applicatif.

### 1.6 — Limites connues

L'audit npm s'appuie sur Trivy et non sur l'outil natif du gestionnaire de paquets, dont le service d'audit a été retiré le 15 juillet 2026 ; Trivy lit directement le fichier de verrouillage et couvre le même besoin. Côté .NET, une exception délibérée passerait par une suppression déclarée et justifiée dans la configuration du projet — aucune n'est active à ce jour. Enfin, les montées majeures restent des décisions humaines : aucune automatisation ne peut juger de l'acceptabilité d'une rupture d'interface.

---

## §2 — Système de supervision et d'alerte

> **Compétence C4.1.2 (éliminatoire)** — *Concevoir un système de supervision et d'alerte en déterminant le périmètre de supervision, en identifiant les indicateurs de suivi pertinents, en mettant en place des sondes et en configurant la modalité des signalements, afin de garantir une disponibilité permanente du logiciel.*

### 2.1 — Périmètre de supervision

Les trois composants de l'application sont déployés séparément et peuvent tomber indépendamment les uns des autres : le périmètre les couvre tous les trois, ainsi que les dépendances externes dont l'indisponibilité dégrade le service.

| Composant | Ce qui est surveillé |
|-----------|----------------------|
| **Front SPA** (S3 + CloudFront) | Disponibilité de la page servie, erreurs JavaScript, Web Vitals |
| **API .NET** (Cloud Run) | Disponibilité, aptitude à servir, latence, taux d'erreur, exceptions serveur |
| **Base MongoDB** (Atlas) | Joignabilité depuis l'API |
| **Services tiers** (TMDB, e-mail, notifications) | Indirectement, via les exceptions applicatives |

La supervision de l'infrastructure sous-jacente — machines, réseau, réplication — relève des fournisseurs managés et n'est pas instrumentée par le projet : c'est une limite assumée, cohérente avec le choix d'un hébergement entièrement managé.

### 2.2 — Indicateurs de suivi et critères de qualité

Les cibles ne sont pas des valeurs théoriques : elles ont été calées sur trente jours de mesures réelles relevées avant leur définition.

| Indicateur | Mesure de référence | Cible |
|------------|--------------------|-------|
| Disponibilité de l'API | 100 % depuis la mise en service des sondes | **≥ 99,5 %** par mois |
| Disponibilité du front | 100 % depuis la mise en service des sondes | **≥ 99,5 %** par mois |
| Latence p50 | **72 ms** | < 200 ms |
| Latence p95 | **207 ms** | **< 500 ms** |
| Latence p99 | 284 ms | < 1 s |
| Démarrage à froid | 3,8 s | toléré (choix de coût assumé) |
| Ping de la base depuis l'API | **7 ms** | < 100 ms |
| Taux d'erreur serveur | **0,026 %** (4 réponses 5xx sur 15 161 requêtes) | **< 1 %** |
| Erreurs applicatives | regroupées par empreinte | 0 anomalie non triée au-delà de 24 h |
| Performance du front | score ≥ 80 | maintenu à chaque déploiement |
| Accessibilité du front | score 100 | maintenu à chaque déploiement |

L'API est configurée sans instance minimale : après une période d'inactivité, le premier appel subit un **démarrage à froid de 3,8 secondes**. C'est un arbitrage de coût explicite, et les seuils d'alerte en tiennent compte plutôt que de le traiter comme une anomalie.

### 2.3 — Sondes mises en place et finalité de chacune

Quatre familles de sondes se complètent, de la vérification externe la plus factuelle à la prévention en amont du déploiement.

**a. Sondes actives de disponibilité.** Ce sont les seules qui prouvent qu'un utilisateur peut réellement atteindre le service : elles interrogent l'application **de l'extérieur**, depuis trois continents, indépendamment de son propre code.

| Sonde | Cible | Fréquence | Finalité | Validation |
|-------|-------|:---------:|----------|------------|
| Disponibilité API | `api.movie-picker.fr/health` | 60 s | Le service répond-il ? | Code 2xx **et** `status = ok` |
| Aptitude à servir | `api.movie-picker.fr/health/ready` | 15 min | Le service est-il réellement opérationnel, base comprise ? | Code 2xx **et** dépendance `mongodb` à `ok` |
| Disponibilité front | `web.movie-picker.fr/` | 5 min | La SPA est-elle servie par le CDN ? | Code 2xx **et** présence du titre attendu |

Chaque sonde s'exécute depuis l'Europe, les États-Unis et l'Asie-Pacifique, avec un délai d'expiration de dix secondes. Interroger plusieurs régions évite de confondre une panne réelle avec un incident réseau local.

La distinction entre les deux sondes de l'API est le point central du dispositif. `GET /health` répond sans solliciter aucune dépendance : il détecte un service mort ou une révision qui ne démarre pas. `GET /health/ready` exécute un ping de la base avec un délai maximal de trois secondes et renvoie **503** si elle est injoignable : il détecte le cas — invisible pour la première sonde — où l'API répond parfaitement mais ne peut servir aucune donnée. La réponse porte également la **version déployée**, ce qui permet de vérifier à tout instant ce qui tourne réellement en production :

```json
{
  "status": "ready",
  "service": "movie-picker-api",
  "release": "df44971f…",
  "dependencies": [{ "name": "mongodb", "status": "ok", "durationMs": 7 }]
}
```

Cette même vérification est rejouée **en fin de déploiement** par le pipeline : une révision dont la base est injoignable fait échouer sa propre mise en production, avant d'avoir servi le moindre utilisateur.

**b. Sondes passives — métriques d'exécution.** Collectées en continu par la plateforme d'hébergement, sans instrumentation applicative : requêtes par classe de code (2xx/3xx/4xx/5xx), distribution des latences, nombre d'instances actives. Leur finalité est de détecter une **dégradation progressive** — une latence qui monte, des erreurs qui apparaissent — que des sondes binaires « en ligne / hors ligne » ne verraient jamais.

**c. Sonde applicative — suivi des erreurs.** Deux projets Sentry, un par composant, en production uniquement. Sont capturées les exceptions front non gérées (y compris les erreurs de rendu remontées par la barrière d'erreur de l'application) et les erreurs serveur 5xx, à l'exclusion délibérée des erreurs métier attendues — validation, ressource non trouvée, conflit, non autorisé — pour éviter le bruit. Les traces de performance sont échantillonnées à 10 %. Chaque événement porte l'environnement, la **version déployée**, la route et le contexte d'exécution ; les incidents sont regroupés par empreinte, avec compteur d'occurrences et version d'introduction. Les fichiers de correspondance du front sont transmis pendant la construction puis retirés de l'artefact publié : les piles d'appel sont lisibles sans exposer le code source. Sa finalité est de **nommer la cause** là où les sondes précédentes ne constatent qu'un symptôme.

**d. Sondes préventives — avant la mise en production.** Tests unitaires et d'intégration, tests de bout en bout, audit de performance et d'accessibilité, porte de qualité du code, analyses de vulnérabilités et de secrets, plus une analyse de sécurité hebdomadaire planifiée. Leur finalité est de faire échouer le déploiement plutôt que l'utilisateur.

### 2.4 — Seuils d'alerte

Cinq politiques sont configurées. Leurs seuils sont volontairement placés **au-dessus du bruit mesuré** : une alerte qui se déclenche sans raison finit par être ignorée, et un système de supervision qu'on ignore ne supervise plus rien.

| Politique | Condition | Seuil | Sévérité | Justification du seuil |
|-----------|-----------|-------|:--------:|------------------------|
| **API indisponible** | Sonde `/health` en échec | ≥ 2 points de contrôle sur 5 min | Critique | Un seul point en échec traduit un incident réseau local, pas une panne |
| **Base injoignable** | Sonde `/health/ready` en échec | ≥ 2 points de contrôle sur 30 min | Critique | L'API répond mais ne peut servir aucune donnée : impact utilisateur total |
| **Front indisponible** | Sonde front en échec | ≥ 2 points de contrôle sur 10 min | Critique | Même logique, avec une fréquence de sonde plus lente |
| **Erreurs serveur anormales** | Réponses 5xx | > 5 sur 5 min | Erreur | Référence mesurée : 4 réponses 5xx en 30 jours |
| **Latence dégradée** | p95 des requêtes | > 800 ms pendant 10 min | Avertissement | Référence mesurée : 207 ms ; marge laissée aux démarrages à froid |

Chaque politique embarque sa **conduite à tenir**, affichée dans la notification : où regarder, dans quel ordre, et quand déclencher un retour arrière. Les alertes se referment automatiquement après trente minutes sans nouvelle occurrence.

### 2.5 — Modalité de signalement

Le signalement se fait par **courriel** vers l'adresse d'exploitation, déclarée comme canal de notification et rattachée aux cinq politiques. Le message porte la politique déclenchée, la condition franchie, la valeur observée, l'horodatage, un lien vers l'incident et le graphique correspondant, ainsi que la conduite à tenir. Trois règles complémentaires par projet Sentry couvrent les erreurs applicatives : anomalie classée prioritaire, **régression** d'une anomalie précédemment corrigée, et **rafale** de plus de vingt occurrences en une heure. La règle de régression protège contre un scénario classique : une correction qui se défait silencieusement plusieurs déploiements plus tard.

La chaîne complète a été **vérifiée de bout en bout** : une sonde temporaire pointant vers une adresse inexistante a été mise en service, l'alerte s'est déclenchée après deux points de contrôle en échec, et le courriel est parvenu à l'exploitant avec sa conduite à tenir. La sonde et la politique de test ont ensuite été supprimées. Le dispositif n'est donc pas seulement configuré : il est prouvé.

Le projet étant exploité par une seule personne, il n'y a ni astreinte ni escalade à plusieurs niveaux : le signalement va directement à l'exploitant, qui est aussi le développeur. Une escalade formelle serait ici une complication sans destinataire.

### 2.6 — De l'alerte à la correction

La supervision n'a d'intérêt que si elle débouche sur une action. Une alerte suit toujours le même enchaînement : **détection** par une sonde ou une exception capturée → **signalement** par courriel avec la conduite à tenir → **qualification** à partir de l'incident ou de l'anomalie regroupée (pile d'appel, version, occurrences) → **consignation** en fiche écrite, dont le processus fait l'objet du §3 → **correction** par le pipeline, ou retour arrière immédiat si l'incident suit un déploiement → **vérification** par les sondes de santé et inscription au journal des versions (§7).

### 2.7 — Tableau de bord

Un tableau de bord d'exploitation regroupe les six vues utilisées au quotidien : disponibilité de l'API, disponibilité du front, latences p50 et p95 avec le seuil d'alerte matérialisé, répartition des requêtes par classe de code, erreurs serveur, et nombre d'instances actives.

![Tableau de bord de supervision — disponibilité, latences, erreurs et instances](captures/01-dashboard-supervision.png)

### 2.8 — Données personnelles

Le suivi des erreurs relève de l'**intérêt légitime** — sécurité et stabilité du service. Il n'utilise aucun cookie et n'est pas conditionné au consentement, contrairement à l'analytique produit, soumise à l'accord préalable de l'utilisateur ; une catégorie informative « Surveillance des erreurs » figure néanmoins dans les préférences, par transparence. La minimisation est appliquée strictement : envoi des données personnelles désactivé sur les deux SDK, effacement supplémentaire de l'adresse IP, du courriel et du nom d'utilisateur avant transmission, nettoyage côté serveur, aucun enregistrement de session ni capture d'écran. Les sondes de disponibilité n'interrogent que des points d'entrée techniques, sans authentification ni donnée utilisateur.

### 2.9 — Coûts et limites

L'ensemble du dispositif fonctionne dans les offres gratuites : les sondes ajoutent environ 276 000 requêtes mensuelles à une API facturée au temps de traitement — environ 14 % du quota offert — et les exécutions de sondes comme les notifications ne sont pas facturées. Effet de bord favorable : les instances restent tièdes, ce qui réduit les démarrages à froid pour les utilisateurs réels.

Trois limites sont assumées : la rétention des erreurs est d'environ trente jours sur l'offre gratuite, ce qui impose d'archiver hors outil les incidents à conserver ; la base de données n'est pas supervisée pour elle-même, seule sa joignabilité depuis l'API l'est ; enfin, les sondes et politiques ont été créées par appels d'interface de programmation et ne sont pas encore décrites en infrastructure-as-code, ce qui en fait un point de fragilité — il est repris comme axe d'amélioration au §6.

---

## §3 — Processus de collecte et de consignation des anomalies

> **Compétence C4.2.1 (éliminatoire)** — *Consigner les anomalies détectées en élaborant un processus de collecte et de consignation, en utilisant des outils de collecte et en y intégrant toutes les informations pertinentes, afin de déterminer le correctif à mettre en place.*

### 3.1 — Principe

**Une anomalie confirmée donne lieu à une fiche écrite.** Le gestionnaire d'incidents du dépôt — GitHub Issues — est la source unique de vérité : aucune correction n'est déployée sans une trace expliquant ce qui ne va pas, comment le reproduire et ce qui a été décidé.

Cette règle vaut particulièrement sur un projet mené par une seule personne. C'est là qu'elle est la plus fragile — la mémoire du développeur remplace volontiers l'écrit — et là qu'elle rend le plus service : trois semaines après, la cause racine d'une anomalie n'est plus reconstituable de tête, et un correctif dont on a oublié le motif se défait au premier remaniement.

Le processus est dimensionné pour la typologie du logiciel : une application web grand public, en déploiement continu, sans astreinte, dont les anomalies proviennent presque toutes de trois origines — une régression introduite par un déploiement, une dépendance externe défaillante, ou un cas d'usage non prévu.

### 3.2 — Canaux de collecte

Une anomalie n'arrive jamais par un seul chemin. Cinq canaux alimentent le processus, du plus automatique au plus humain.

| # | Canal | Ce qu'il détecte | Délai de détection |
|:-:|-------|------------------|--------------------|
| 1 | **Supervision** — 3 sondes actives, 5 politiques d'alerte (§2) | Indisponibilité, base injoignable, erreurs serveur anormales, latence dégradée | 2 à 30 min selon la sonde |
| 2 | **Suivi des erreurs** — 2 projets, 3 règles d'alerte chacun (§2) | Exception front ou serveur, régression d'une anomalie corrigée, rafale d'occurrences | Immédiat |
| 3 | **Retours utilisateurs** — lien « Signaler un problème » en pied de page | Anomalie fonctionnelle qui ne lève aucune exception : comportement inattendu, donnée incohérente, parcours bloqué | Variable |
| 4 | **Portes du pipeline** — tests unitaires, intégration, bout en bout, performance, accessibilité, qualité du code, vulnérabilités, secrets, analyse hebdomadaire | Régression, vulnérabilité, dégradation — **avant** la mise en production | À chaque commit, plus une analyse hebdomadaire |
| 5 | **Recette manuelle** | Écart avec le cahier de recettes | À chaque évolution fonctionnelle |

Les canaux 1, 2 et 4 sont automatiques et notifient par courriel. Le canal 3 est le seul qui dépende d'une démarche humaine — et c'est celui qui remonte les anomalies les plus coûteuses, puisqu'elles ont déjà atteint l'utilisateur sans déclencher la moindre alerte technique. L'anomalie présentée au §4 en est l'illustration exacte : l'application répondait normalement et ne levait aucune exception pendant que les utilisateurs perdaient leur session.

C'est précisément pour réduire la dépendance à ce canal que la supervision a été renforcée, et pour le rendre plus efficace que le lien de signalement a été ajouté : il ouvre un message pré-rempli embarquant la page concernée, la version de l'application et le navigateur — trois informations qu'il fallait auparavant réclamer.

### 3.3 — Outil et gabarit de consignation

Les fiches vierges sont **désactivées** dans le dépôt : tout signalement passe obligatoirement par un formulaire structuré. Cette contrainte garantit que les informations nécessaires à la reproduction sont présentes dès la création, plutôt que réclamées ensuite par allers-retours.

| Champ | Obligatoire | Pourquoi il est nécessaire |
|-------|:-----------:|----------------------------|
| **Contexte** | oui | URL, navigateur, système, version : sans eux, on corrige à l'aveugle une anomalie qui peut être propre à un environnement |
| **Étapes pour reproduire** | oui | Une anomalie non reproductible ne peut être ni corrigée avec certitude, ni vérifiée après correction |
| **Comportement attendu** | oui | Distingue le défaut réel du malentendu fonctionnel |
| **Comportement observé** | oui | Décrit le symptôme tel qu'il se manifeste, indépendamment de son interprétation |
| **Captures ou journaux** | non | Capture, erreur de console ou lien vers l'événement capturé — raccourcit fortement le diagnostic |
| **Sévérité** | oui | Détermine le délai de prise en charge |

Les fiches portent des étiquettes normalisées : `bug`, `triage` (posée automatiquement à la création), `severite:critical|high|medium|low`, `production` lorsque l'anomalie est constatée en production, et `regression` lorsqu'il s'agit de la réapparition d'une anomalie déjà corrigée.

### 3.4 — Qualification et délais de prise en charge

La sévérité est déclarée par le signalant, puis confirmée au triage. Elle mesure l'**impact utilisateur**, jamais la difficulté technique : une anomalie triviale à corriger peut bloquer tout le monde, et une correction complexe n'affecter personne.

| Sévérité | Définition | Prise en charge | Correction visée |
|----------|-----------|-----------------|------------------|
| **critical** | Service inutilisable ou perte de données | Immédiate, tout autre travail suspendu | Sous 24 h, ou retour arrière immédiat |
| **high** | Fonctionnalité principale bloquée, sans contournement | Sous 24 h | Sous 72 h |
| **medium** | Gêne réelle mais contournement possible | Au prochain lot de travail | Prochaine version mineure |
| **low** | Cosmétique ou marginal | Mise en file | Sans engagement de date |

Une anomalie critique en production ouvre un arbitrage immédiat : **corriger** ou **revenir en arrière**. Le retour arrière est privilégié lorsque l'anomalie suit un déploiement, car il rétablit le service en quelques minutes sans exiger d'avoir compris la cause — comprendre vient ensuite, sans les utilisateurs en otage.

### 3.5 — Cycle de vie d'une anomalie

1. **Signalement** — création de la fiche via le gabarit, quel que soit le canal d'origine. Une alerte de supervision ou une erreur capturée est recopiée en fiche, avec le lien vers l'événement d'origine.
2. **Triage** — confirmation de la sévérité, retrait de l'étiquette `triage`, ajout de `production` ou `regression` le cas échéant.
3. **Reproduction** — rejeu des étapes déclarées. Une anomalie non reproductible n'est pas refermée pour autant : elle est documentée avec ce qui a été tenté, et reste ouverte tant que le signalement persiste.
4. **Analyse** — identification de la cause racine, consignée dans la fiche. Symptôme et cause sont distingués explicitement : une même déconnexion peut venir d'un cookie, d'une clé de chiffrement ou d'une configuration inopérante.
5. **Correction** — branche dédiée, correctif accompagné d'un **test de non-régression** lorsque la nature du défaut le permet (§5).
6. **Vérification** — le correctif est validé en production, pas seulement en local : contrôle automatique en fin de déploiement, puis vérification du comportement d'origine.
7. **Clôture** — la fiche est refermée en référençant le commit correctif et la date de déploiement.

**Définition de « corrigé »** : le correctif est déployé en production, le comportement d'origine est vérifié sur l'environnement réel, un test automatisé couvre le cas lorsque c'est possible, et l'évolution est inscrite au journal des versions. Tant que ces quatre conditions ne sont pas réunies, l'anomalie reste ouverte — un correctif fusionné mais non déployé ne corrige rien pour l'utilisateur.

### 3.6 — Traçabilité

Chaque anomalie laisse une chaîne complète et vérifiable :

**Fiche** (symptôme, reproduction, analyse) → **branche** dédiée → **commit** expliquant la cause racine → **exécution du pipeline** (portes franchies) → **déploiement** (révision et version identifiées) → **entrée au journal des versions** → **étiquette et publication de version** → **clôture de la fiche** référençant le commit.

Cette chaîne se parcourt dans les deux sens : depuis une anomalie, on retrouve la version qui la corrige ; depuis une version, on retrouve les anomalies qu'elle traite. La version portée par chaque événement d'erreur, égale à l'identifiant du commit déployé, fait le lien entre une exception observée en production et le déploiement qui l'a introduite.

---

## §4 — Fiche de consignation d'une anomalie

> **Compétence C4.2.1 (éliminatoire)** — *La fiche de consignation contient les informations permettant de reproduire le bogue ; l'analyse du bogue et les préconisations de correction sont explicitées et permettent de corriger l'anomalie.*

### 4.1 — L'anomalie retenue

L'anomalie présentée ci-dessous est **réelle et survenue en production**. Elle a été retenue parce qu'elle illustre le cas le plus difficile pour un dispositif de maintien en condition opérationnelle : une anomalie **invisible pour la supervision technique**. L'API répondait, ne levait aucune exception, et renvoyait des codes d'erreur parfaitement conformes à son propre code. Seuls les utilisateurs pouvaient la signaler.

Elle est consignée dans le gestionnaire d'incidents du dépôt sous la référence **#67**.

![Fiche de consignation de l'anomalie #67 dans le gestionnaire d'incidents](captures/02-issue-67.png)

### 4.2 — Identification

| | |
|---|---|
| **Référence** | #67 |
| **Titre** | Déconnexion à la fermeture du navigateur en production (session non persistée) |
| **Détectée le** | 17/07/2026 |
| **Canal de détection** | Retour utilisateur direct (plusieurs utilisateurs), confirmé par reproduction |
| **Environnement** | Production — front et API |
| **Supports concernés** | Tous : ordinateur, mobile, application installée en PWA |
| **Version** | 1.3.1 |
| **Sévérité** | **high** — fonctionnalité principale bloquée, sans contournement |
| **Étiquettes** | `bug` · `production` · `severite:high` |

### 4.3 — Reproduction

**Étapes**

1. Se connecter à l'application avec un compte existant.
2. Vérifier que la session est active (l'utilisateur est bien identifié).
3. Fermer complètement l'onglet ou le navigateur.
4. Attendre une période d'inactivité suffisante pour que le service redescende à zéro instance (quelques dizaines de minutes).
5. Rouvrir l'application.

**Comportement attendu** — la session persiste : l'utilisateur reste connecté, le cookie d'authentification étant émis avec une durée de vie longue.

**Comportement observé** — l'utilisateur est déconnecté et renvoyé vers l'écran de connexion ; l'API répond **401** sur les appels authentifiés.

**Élément déterminant** — le phénomène est apparu **sans aucun changement de code**. Les utilisateurs le formulent ainsi : « avant, ça marchait ».

L'étape 4 est celle qui rend la fiche exploitable : sans elle, la reproduction échoue une fois sur deux et l'anomalie passe pour intermittente. C'est la conjonction *fermeture du navigateur* + *inactivité prolongée du service* qui déclenche le défaut.

### 4.4 — Analyse

Le diagnostic a mis au jour **deux causes cumulées**, l'une expliquant le déclenchement, l'autre aggravant silencieusement la situation depuis l'origine.

**Cause racine 1 — clé de chiffrement expirée.** Le cookie d'authentification est chiffré par le mécanisme de protection des données du framework. La clé provenait d'un secret généré **sans durée explicite**, donc avec la valeur par défaut de **90 jours**. Créée lors d'un déploiement d'avril 2026, elle a expiré à la mi-juillet. Le trousseau ne contenant qu'une seule clé, chaque instance s'est mise à en régénérer une **éphémère**, stockée dans un dossier temporaire effacé au démarrage. Le service étant configuré sans instance minimale, le démarrage à froid suivant rendait le cookie émis par l'instance précédente indéchiffrable : 401, puis déconnexion.

Cette cause explique les trois observations : le lien avec la fermeture du navigateur (le temps d'inactivité laisse le service redescendre à zéro), l'atteinte de tous les supports (le défaut est côté serveur), et l'apparition sans déploiement (c'est le temps qui déclenche, pas le code).

**Cause racine 2 — configurateur jamais exécuté.** Le composant chargé de configurer le cookie était enregistré sur une interface que la fabrique d'options **ne consomme pas**. Il ne s'exécutait donc jamais : le cookie portait le nom par défaut du framework au lieu du nom applicatif, le magasin de sessions était inactif, et les réglages de sécurité étaient inopérants. Un 401 renvoyait même une redirection vers une route de connexion inexistante dans cette API.

Ce défaut était présent depuis l'origine sans jamais se manifester : il n'a été révélé que par l'investigation de la première cause. Vérification apportée au diagnostic : un test isolé de l'injection de dépendances échoue avec l'ancien enregistrement, le cookie produit portant le nom par défaut.

### 4.5 — Préconisations de correction

| # | Préconisation | Effet attendu |
|:-:|---------------|---------------|
| 1 | **Persister les clés de chiffrement en base** plutôt que dans un stockage éphémère, de sorte qu'elles soient partagées entre instances et révisions | Supprime la cause racine 1 : plus de perte de clé au redémarrage, rotation automatique sans rupture |
| 2 | **Corriger l'enregistrement du configurateur** sur l'interface effectivement consommée par la fabrique d'options | Supprime la cause racine 2 : nom du cookie, magasin de sessions et réglages de sécurité redeviennent effectifs |
| 3 | **Porter la durée de session à 30 jours glissants**, valeur partagée par le configurateur, le contrôleur d'authentification et le magasin de tickets | Aligne la durée réelle sur la promesse faite à l'utilisateur, en une seule source de vérité |
| 4 | **Allonger la durée de la clé de secours** générée hors base | Évite que le repli reproduise l'expiration à 90 jours |
| 5 | **Ajouter un test de non-régression** vérifiant que le configurateur s'applique réellement | Interdit la réapparition silencieuse de la cause racine 2 |

**Effet de bord à anticiper** : le changement de clé de chiffrement et l'activation du magasin de sessions invalident les cookies existants. Une **reconnexion unique** de tous les utilisateurs au déploiement est donc inévitable — un inconvénient sans commune mesure avec le défaut corrigé, mais qui doit être assumé et annoncé plutôt que subi.

Le traitement effectif de ces préconisations, de la branche de correction à la vérification en production, fait l'objet du §5.

### 4.6 — Portée de la fiche

Cette fiche a été consignée **a posteriori** : l'anomalie date du 17 juillet 2026, antérieure à la formalisation du processus décrit au §3. Elle a été reconstituée à partir du diagnostic d'origine et du correctif déployé, avec les dates réelles de chaque étape. Depuis, le processus s'applique en amont — le canal de signalement, les étiquettes de triage et le gabarit obligatoire sont en place — et l'anomalie suivante, détectée le 25 juillet par les portes du pipeline, a bien été consignée au moment de sa constatation (fiche #68, §5.4).

---

## §5 — Traitement d'une anomalie détectée en production

> **Compétence C4.2.2** — *Créer et déployer un correctif en respectant le processus d'intégration et de déploiement continu afin de résoudre l'anomalie. Le traitement tire profit du processus d'intégration et de déploiement continu ; le correctif mis en place est décrit et permet la résolution de l'anomalie.*

### 5.1 — Le pipeline mobilisé

Un correctif emprunte exactement le même chemin qu'une évolution : **aucune voie rapide, aucun accès direct à la production**. C'est ce qui permet de corriger vite sans corriger mal — l'urgence d'une anomalie est précisément le moment où l'on est tenté de sauter les vérifications.

| Étape | Contrôles | Bloquant |
|-------|-----------|:--------:|
| **Poussée sur une branche** | Analyse statique, formatage, compilation ; recherche de secrets | ✅ |
| **Tests** | Tests unitaires front (578) et API, tests d'intégration, **6 parcours de bout en bout** | ✅ |
| **Qualité et sécurité** | Porte de qualité du code sur le code nouveau, analyse de vulnérabilités des dépendances et de l'image, audit de performance et d'accessibilité | ✅ |
| **Fusion sur la branche principale** | Revue du correctif | — |
| **Construction et publication** | Image conteneur analysée puis publiée, référencée par empreinte | ✅ |
| **Déploiement** | Mise en ligne de la révision (API) ; synchronisation et invalidation du cache (front) | — |
| **Contrôle post-déploiement** | Appel des deux sondes de santé : le service répond-il, et peut-il servir ? | ✅ |

Le déploiement n'est donc pas un acte manuel, mais la conséquence d'une fusion ayant franchi l'ensemble des portes. En cas d'incident malgré tout, un retour arrière bascule la totalité du trafic vers la révision précédente **sans reconstruction**, en quelques minutes.

### 5.2 — Chronologie du traitement de l'anomalie #67

| Étape | Contenu |
|-------|---------|
| **Signalement** (17/07) | Plusieurs utilisateurs rapportent des déconnexions ; qualification et reproduction |
| **Analyse** | Identification des deux causes racines (§4.4) |
| **Branche dédiée** | `fix/auth-session-persistence`, isolée de la branche principale |
| **Correctif** | Commit `ec7ce77`, accompagné d'un test de non-régression |
| **Portes du pipeline** | Analyse statique, tests unitaires et d'intégration, parcours de bout en bout, qualité, sécurité — toutes franchies |
| **Revue** | Ajustements issus de la relecture du correctif (`f80c95b`) |
| **Fusion** | `21335d2` sur la branche principale |
| **Déploiement** | Automatique : construction, publication de l'image, mise en ligne de la révision |
| **Contrôle post-déploiement** | Sonde de santé appelée par le pipeline, réponse conforme |
| **Vérification fonctionnelle** | Session testée après déploiement, **puis après un démarrage à froid** — la condition exacte qui déclenchait le défaut |
| **Clôture** | Fiche refermée en référençant le commit correctif et la date de déploiement |

### 5.3 — Le correctif mis en place

Les cinq préconisations du §4.5 ont été traitées :

| Préconisation | Réalisation |
|---------------|-------------|
| 1 — Persister les clés de chiffrement | Nouveau dépôt de clés adossé à la base de données, activé dès qu'une connexion est configurée. Les clés deviennent durables et partagées entre instances et révisions ; la rotation automatique se poursuit sans rupture. Le repli sur fichier est conservé en développement |
| 2 — Corriger l'enregistrement du configurateur | Enregistrement basculé sur l'interface effectivement consommée par la fabrique d'options : nom du cookie applicatif, magasin de sessions, réglages de sécurité et réponse 401 en JSON redeviennent effectifs |
| 3 — Durée de session unifiée | Portée à 30 jours glissants, via une constante partagée par le configurateur, le contrôleur d'authentification et le magasin de tickets — une seule source de vérité |
| 4 — Clé de secours | Durée de vie portée à dix ans pour l'outil de génération de la clé statique de repli |
| 5 — Test de non-régression | Test vérifiant que le configurateur s'applique réellement : il échoue avec l'ancien enregistrement, ce qui interdit la réapparition silencieuse de la cause racine 2 |

**Pourquoi le correctif résout l'anomalie.** La cause racine 1 disparaît parce que la clé n'est plus stockée dans un espace éphémère : un redémarrage, un passage à zéro instance ou un nouveau déploiement ne lui font plus perdre sa clé, et le cookie reste déchiffrable. La cause racine 2 disparaît parce que la configuration s'applique enfin, ce qu'un test garantit désormais à chaque exécution du pipeline. L'effet de bord annoncé — une reconnexion unique pour tous — s'est produit comme prévu au déploiement, puis les sessions sont restées stables. **Aucune réapparition depuis le 17 juillet 2026.**

### 5.4 — Un second cas : la porte qui bloque avant l'utilisateur

Le 25 juillet 2026, l'ajout du lien « Signaler un problème » en pied de page fait échouer **cinq parcours de bout en bout** sur six. Le motif est instructif : le libellé d'accessibilité du nouveau lien contient le mot « e-mail », si bien que le sélecteur `getByLabel('E-mail')` des tests, jusque-là sans ambiguïté, désigne désormais deux éléments — le champ du formulaire d'inscription et le lien du pied de page.

Conséquence immédiate : la porte étant bloquante, la construction de l'image et le déploiement sont annulés. **Le défaut n'a jamais atteint la production.**

Le processus décrit au §3 s'applique de la même manière qu'à une anomalie signalée par un utilisateur : le défaut est consigné en fiche **#68**, avec ses étapes de reproduction, son analyse et les options de correction envisagées. Deux étaient possibles — dégrader le libellé d'accessibilité du lien pour lever l'ambiguïté, ou rendre le sélecteur de test exact. La seconde a été retenue : l'accessibilité prime, et un futur libellé mentionnant l'e-mail ne recassera pas les tests. Le défaut se situait d'ailleurs dans le test, non dans l'application — le sélecteur, écrit en correspondance partielle, était fragile avant même l'ajout du lien, qui n'a fait que le révéler. Après correction, les six parcours repassent au vert en local, puis en intégration continue ; le déploiement bloqué reprend et met en ligne le canal de signalement.

Ces deux cas se complètent : le premier montre le pipeline **corrigeant** une anomalie parvenue jusqu'aux utilisateurs, le second le montre **empêchant** un défaut de les atteindre. C'est la même chaîne, mobilisée à deux moments différents du cycle de vie.

### 5.5 — Ce que le déploiement continu apporte au traitement d'une anomalie

| Apport | Effet concret observé |
|--------|----------------------|
| **Délai réduit** | Le correctif atteint la production dès la fusion, sans fenêtre de livraison à attendre |
| **Non-régression garantie** | Un correctif ne peut pas en introduire un autre : 578 tests unitaires, 6 parcours de bout en bout et les audits de qualité s'exécutent sur chaque correctif, y compris urgent |
| **Vérification automatique** | Les sondes de santé sont appelées en fin de déploiement : une révision incapable de joindre la base échoue à se mettre en ligne |
| **Réversibilité** | Un retour arrière rétablit la révision précédente en quelques minutes, sans reconstruction — l'arbitrage « corriger ou revenir en arrière » du §3.4 est réellement praticable |
| **Traçabilité** | Chaque déploiement porte l'identifiant du commit, repris par le suivi des erreurs : une exception observée en production désigne le déploiement qui l'a introduite |

![Exécution du pipeline sur le correctif : portes franchies et déploiement](captures/03-pipeline-correctif.png)

---

## §6 — Recommandations argumentées d'amélioration

> **Compétence C4.3.1** — *Proposer des axes d'amélioration en prenant en compte les indicateurs de performance et en analysant les retours utilisateurs, afin de maintenir et renforcer l'attractivité du logiciel.*

### 6.1 — Méthode

Les recommandations qui suivent partent de mesures, non d'intuitions. Quatre sources ont été exploitées : la **base de production** (agrégats sans donnée personnelle), les **métriques d'exploitation** sur trente jours, l'**analytique produit** sur quatre-vingt-dix jours, et les **audits automatisés** exécutés à chaque déploiement.

Le volet qualitatif est en cours de constitution : le canal « Signaler un problème » est en service depuis la version 1.3.2, et un questionnaire de six questions est adressé aux utilisateurs inscrits. Les recommandations ci-dessous s'appuient donc sur le quantitatif ; le qualitatif servira à les confirmer ou à les réordonner — ce que la recommandation R1 rend possible en continu plutôt que par campagnes ponctuelles.

### 6.2 — Indicateurs observés

| Indicateur | Mesure | Lecture |
|------------|--------|---------|
| Utilisateurs inscrits | 17 (avril → juillet 2026) | Base réduite, usage entre proches |
| Soirées créées | 18 — rythme mensuel 2 / 6 / 6 / 4 | Activité stable |
| Soirées menées jusqu'au tirage | **14 sur 18 — 78 %** | Le parcours principal aboutit |
| Films proposés | 58 — moyenne 3,6 par soirée | Conforme à l'usage attendu |
| Participations | 76 — moyenne 4,2 par soirée | Le partage par lien fonctionne |
| Votes exprimés | 78, par 34 participants | **≈ 1 vote par participant** pour 3,6 films disponibles |
| Abonnements aux notifications | **3 sur 17 — 18 %** | Fonctionnalité peu adoptée |
| Relations de suivi | 21 | Fonctionnalité sociale utilisée |
| Latence p95 · taux d'erreur | 207 ms · 0,026 % | Aucun problème de fiabilité |
| Événements du parcours cœur | **0** | Création, vote et tirage non instrumentés |

Deux conclusions structurent le reste : **la fiabilité n'est pas le facteur limitant**, et **l'engagement dans la soirée l'est** — le vote, mécanisme censé faire émerger le consensus, est à peine sollicité.

### 6.3 — Recommandations

**R1 — Instrumenter le parcours cœur.** Aucun événement n'est capturé sur la création d'une soirée, l'ajout d'un film, le vote ou le tirage : les chiffres ci-dessus ont dû être reconstitués depuis la base et décrivent des résultats, jamais des abandons. Impossible aujourd'hui de répondre à « combien d'invités ouvrent le lien sans jamais voter ? ». La proposition consiste à capturer six événements et à construire l'entonnoir correspondant ; l'infrastructure analytique existe déjà et reste soumise au consentement, seuls les appels manquent.
*Coût **0,5 à 1 jour**, effet immédiat. Gain : mesure des abandons étape par étape — les décisions suivantes cessent d'être des paris.* **Priorité 1**, prérequis des autres.

**R2 — Relancer le vote.** 78 votes pour 76 participations et 58 films : chaque participant se prononce environ une fois alors qu'il peut voter sur tous les films de sa soirée. Le tirage s'appuie donc sur un signal faible, ce qui affaiblit la promesse du produit. La proposition rend visible ce qui reste à faire : indicateur « il te reste X films à noter », relance dans l'application lorsqu'un autre participant ajoute un film, et avertissement à l'hôte avant le lancement de la roue si moins de la moitié des participants ont voté.
*Coût **2 à 3 jours**, une itération. Gain visé : passer de ≈ 1 à ≥ 2,5 votes par participant, pour un tirage représentatif et une décision mieux acceptée par le groupe.* **Priorité 2.**

**R3 — Trancher le sort des notifications.** Trois abonnements actifs pour dix-sept inscrits, alors que la version 1.1 a investi dans les clés de signature, cinq déclencheurs et une interface de préférences : le rapport entre coût de maintenance et valeur rendue est défavorable. La proposition tient en une tentative de redressement avant décision — déplacer la demande d'autorisation, aujourd'hui présentée trop tôt, vers un moment où son intérêt est évident (juste après la création d'une soirée), avec une phrase expliquant ce que l'utilisateur recevra. Si l'adoption ne dépasse pas 40 % sous deux mois, geler l'investissement plutôt que continuer à maintenir à perte.
*Coût **1 jour**, une itération. Gain : adoption visée > 40 % ; à défaut, une décision d'arrêt argumentée par la mesure — un gain lui aussi, en coût de maintenance évité.* **Priorité 3.**

**R4 — Installer une boucle de satisfaction continue.** Aucun dispositif ne mesure la satisfaction dans la durée ; le questionnaire en cours donnera une photographie, pas une tendance. La proposition ajoute une question unique après le tirage — « cette soirée s'est-elle bien passée ? », trois niveaux — stockée sans donnée nominative et agrégée par mois, en complément du canal de signalement déjà livré.
*Coût **1 à 2 jours**, une itération. Gain : détection des dégradations d'expérience invisibles pour la supervision technique — aucune des anomalies fonctionnelles rencontrées n'avait levé d'exception.* **Priorité 3.**

**R5 — Encourager la récurrence, mais après mesure.** Dix-huit soirées en trois mois et demi pour dix-sept inscrits : l'application est utilisée par événement, pas par habitude. La version 1.4 envisagée (sélection manuelle, flamme de régularité) parie sur la récurrence sans qu'aucune mesure ne l'éclaire. La proposition consiste à attendre les données de R1 et les réponses à la question « qu'est-ce qui te ferait revenir plus souvent ? » ; si le pari se confirme, la piste la moins coûteuse est la reconduction d'une soirée avec le même groupe en un clic, plutôt qu'un mécanisme de gamification complet.
*Coût **2 jours** pour la reconduction contre **5 à 8 jours** pour la gamification. Gain : évite d'engager une semaine sur une hypothèse non vérifiée, et supprime le principal frein à une nouvelle soirée — reconstituer le groupe.* **Priorité 4**, conditionnée à R1.

**R6 — Décrire la supervision en infrastructure-as-code.** Les trois sondes, les cinq politiques d'alerte, le canal de notification et le tableau de bord ont été créés par appels d'interface de programmation : ils ne sont pas versionnés, une suppression accidentelle ou une dérive de configuration passerait inaperçue. La proposition consiste à les décrire dans le dépôt et à les appliquer depuis le pipeline.
*Coût **1 à 2 jours**, une itération. Gain : configuration de supervision reproductible et relue comme du code ; suppression d'un point de fragilité de l'exploitation.* **Priorité 4.**

### 6.4 — Priorisation et séquencement

| Rang | Recommandation | Coût | Nature du gain |
|:----:|----------------|:----:|----------------|
| 1 | R1 — Instrumenter le parcours cœur | 0,5 à 1 j | Capacité de décision |
| 2 | R2 — Relancer le vote | 2 à 3 j | Attractivité, tenue de la promesse produit |
| 3 | R3 — Trancher le sort des notifications | 1 j | Attractivité, ou économie de maintenance |
| 3 | R4 — Boucle de satisfaction | 1 à 2 j | Détection des irritants invisibles |
| 4 | R5 — Récurrence | 2 j (option courte) | Fréquence d'usage, sous condition de mesure |
| 4 | R6 — Supervision en infrastructure-as-code | 1 à 2 j | Robustesse de l'exploitation |

**Total : 7,5 à 11 jours**, séquençables en trois itérations. Aucune recommandation n'exige de refonte : toutes s'appuient sur l'existant, condition de leur faisabilité sur un projet mené par une seule personne.

L'ordre n'est pas une simple file d'attente. R1 conditionne l'évaluation de R2, R3 et R5 : engager R5 avant R1 reviendrait à développer une semaine de fonctionnalités sur une hypothèse invérifiable — exactement ce que ces recommandations cherchent à éviter.

### 6.5 — Ce qui n'est délibérément pas recommandé

La fiabilité et la performance ne figurent pas dans cette liste. Avec 0,026 % d'erreurs serveur, une latence p95 de 207 ms et une disponibilité sous surveillance active, elles ne limitent pas l'attractivité du produit : y investir maintenant reviendrait à optimiser ce qui fonctionne déjà, au détriment de ce qui bloque réellement. Le démarrage à froid de 3,8 secondes relève du même raisonnement — il a d'ailleurs été atténué sans développement, les sondes de disponibilité maintenant les instances tièdes.

Les retours qualitatifs, une fois collectés, pourront faire émerger des irritants absents de cette analyse : un parcours mal compris ou une attente déçue ne laissent aucune trace dans les données d'usage. La liste sera alors révisée — c'est précisément la fonction de la boucle de satisfaction proposée en R4.

---

## §7 — Journal des versions déployées

> **Compétence C4.3.2 (éliminatoire)** — *Établir un journal des versions déployées en y intégrant la documentation des correctifs réalisés, pour suivre les différentes évolutions du logiciel. Le journal contient les améliorations apportées par la version ; les correctifs déployés sont documentés.*

### 7.1 — Dispositif

Le journal repose sur trois supports complémentaires, tous versionnés ou publiés :

| Support | Rôle |
|---------|------|
| **`CHANGELOG.md`**, à la racine du dépôt | Journal de référence — format *Keep a Changelog 1.1.0*, rédigé en français |
| **Étiquettes Git** | Une étiquette annotée `vX.Y.Z` par version publiée, posée sur le commit exact déployé |
| **Publications GitHub** | Notes de version lisibles, adossées à l'étiquette correspondante |

La version est également **lisible depuis l'application elle-même** : affichée en pied de page, et exposée par la sonde d'aptitude à servir sous forme de l'identifiant du commit déployé. Un utilisateur qui signale une anomalie transmet donc sa version sans avoir à la chercher — le message pré-rempli du canal de signalement l'embarque automatiquement — et l'exploitant peut vérifier à tout instant ce qui tourne réellement en production.

### 7.2 — Politique de versionnage

Versionnage sémantique, interprété comme suit pour une application web :

| Incrément | Déclencheur | Exemple |
|-----------|-------------|---------|
| **Majeur** | Rupture du parcours utilisateur ou du contrat de l'API | Aucun à ce jour |
| **Mineur** | Nouvelle fonctionnalité visible par l'utilisateur | `1.2.0` — profil public, notifications, conformité RGPD |
| **Correctif** | Correction d'anomalie, sécurité, exploitation, qualité interne | `1.3.2` — supervision, canal de signalement, correctif de sécurité |

Les entrées sont classées par catégories — *ajouté*, *modifié*, *corrigé*, *sécurité* — et rédigées pour être comprises sans lire le code : ce sont les évolutions du produit qui sont décrites, jamais les commits.

### 7.3 — Versions publiées

| Version | Date | Contenu principal |
|---------|------|-------------------|
| **1.3.2** | 25/07/2026 | Supervision de production, sonde d'aptitude à servir, canal de signalement, correctif de sécurité du routeur |
| 1.3.1 | 08/07/2026 | Filtre de durée, échelle de notes, politique de sécurité du contenu, refonte du pipeline |
| 1.3.0 | 19/06/2026 | États vides, export calendrier, infobulles, refonte de la navigation |
| 1.2.0 | 11/06/2026 | Profil public, notifications dans l'application, accessibilité étendue, RGPD, analytique |
| 1.1.0 | 25/05/2026 | Application installable, notifications push, séries télévisées |
| 1.0.0 | 19/05/2026 | Première version de production |
| 0.1.0 | 27/02/2026 | Prototype initial |

![Publications du dépôt — sept versions étiquetées](captures/04-releases.png)

### 7.4 — Exemplaire : version 1.3.2

**Ajouté**
- Lien « Signaler un problème » en pied de page, ouvrant un message pré-rempli avec la page concernée, la version et le navigateur.
- Sonde `GET /health/ready` vérifiant la joignabilité de la base et exposant la version déployée.
- Supervision de production : trois sondes de disponibilité, cinq politiques d'alerte notifiées par courriel, tableau de bord d'exploitation, règles d'alerte sur les régressions et les rafales d'erreurs.
- Contrôle de l'aptitude à servir dans le test de fumée de déploiement.

**Modifié**
- Portes de qualité du pipeline rendues bloquantes (qualité du code, performance, parcours de bout en bout).
- Réduction de la duplication de code : actions sur un film, fermeture des fenêtres modales, pied de carte partagé.

**Corrigé**
- Sept signalements de qualité du code résolus.
- Sécurité : les points d'entrée de lancement et de clôture de la roue exigent désormais un corps de requête JSON, alignés sur le reste de l'API.
- Accessibilité : l'animation de la roue respecte la préférence système de réduction des animations.

**Sécurité**
- Montée du routeur de 7.18.1 vers 8.3.0, corrigeant l'avis `GHSA-qwww-vcr4-c8h2`.
- Résolution des huit alertes de dépendances ouvertes (six hautes, deux basses).

Cette entrée illustre les deux exigences du critère : les **améliorations apportées** par la version — quatre ajouts, deux évolutions — et les **correctifs déployés**, documentés un par un avec leur nature, y compris les correctifs de sécurité assortis de l'identifiant public de l'avis.

### 7.5 — Traçabilité des correctifs

Chaque correctif se relie à sa version dans les deux sens :

- **De l'anomalie vers la version** — la fiche référence le commit correctif, le commit appartient à une étiquette, l'étiquette correspond à une entrée du journal. L'anomalie #67 se retrouve ainsi dans la version qui la corrige.
- **De la version vers les anomalies** — la rubrique *corrigé* énumère les correctifs embarqués, la rubrique *sécurité* les vulnérabilités traitées avec leur identifiant d'avis.
- **De la production vers le code** — la version portée par chaque événement d'erreur, égale à l'identifiant du commit déployé, rattache une exception observée en production au déploiement exact qui l'a introduite.

---

## §8 — Problème résolu en collaboration avec le support

> **Compétence C4.3.3** — *Collaborer avec les équipes de support en fournissant une expertise technique, en répondant aux retours clients et en résolvant des problèmes complexes afin d'améliorer le logiciel.*

### 8.1 — Dispositif de support

L'application est développée et exploitée par une seule personne : les rôles de support de premier niveau — réception et qualification du retour — et de second niveau — diagnostic et correction — sont tenus par le même intervenant. Le dispositif est donc conçu pour que **le retour utilisateur ne dépende pas d'un canal informel**.

| Fonction | Qui l'assure | Support |
|----------|--------------|---------|
| Réception du signalement | Développeur-mainteneur | Lien **« Signaler un problème »** en pied de page, message pré-rempli avec page, version et navigateur |
| Qualification et reproduction | Développeur-mainteneur | Gabarit obligatoire, grille de sévérité (§3) |
| Diagnostic et correction | Développeur-mainteneur | Suivi des erreurs, métriques d'exploitation, journaux du service |
| Validation du retour à la normale | Développeur-mainteneur **et utilisateurs signalants** | Vérification en production, confirmation d'usage |
| Fournisseurs de service | Hébergeur de l'API, base managée, suivi des erreurs | Documentation, comportements de plateforme, télémétrie |

![Canal de signalement dans le pied de page de l'application](captures/05-lien-support.png)

La faiblesse structurelle de ce dispositif est connue : signalant et correcteur ne se contrôlent pas mutuellement. Elle est compensée par la formalisation écrite de chaque anomalie, y compris lorsqu'une seule personne la lit.

### 8.2 — Contexte du retour utilisateur

**17 juillet 2026.** Plusieurs utilisateurs signalent le même symptôme, exprimé en langage courant : *« je dois me reconnecter à chaque fois »*. Les échanges de qualification apportent trois précisions décisives, qu'aucun outil technique n'aurait fournies :

1. La déconnexion survient **à la fermeture de l'onglet ou du navigateur**, pas pendant l'utilisation.
2. Elle touche **tous les supports** : ordinateur, mobile, application installée.
3. **« Avant, ça marchait »** — le comportement s'est dégradé sans qu'aucune version n'ait été publiée.

Ces retours sont d'autant plus précieux qu'**aucune alerte technique ne s'est déclenchée**. L'application répondait, ne levait aucune exception, et renvoyait des codes 401 parfaitement conformes à son propre code : pour la supervision de l'époque, tout allait bien. Seuls les utilisateurs pouvaient signaler l'anomalie.

**Le problème à résoudre**, une fois traduit du langage utilisateur au langage technique : pourquoi un cookie d'authentification, émis avec une durée de vie longue, cesse-t-il d'être reconnu après la fermeture du navigateur, sans modification du code ?

### 8.3 — Résolution apportée

La troisième précision — « avant, ça marchait » — a orienté le diagnostic vers un élément **dépendant du temps** plutôt que vers une régression de code, écartant d'emblée la piste la plus naturelle. L'investigation a mis au jour deux causes cumulées : une clé de chiffrement arrivée à expiration, combinée à un stockage éphémère et au passage à zéro instance du service ; et un composant de configuration enregistré sur une interface jamais consommée, inopérant depuis l'origine. L'analyse détaillée figure au §4.4, le correctif et son déploiement au §5.3.

Du point de vue de la relation avec les utilisateurs, la résolution comportait un élément à annoncer : le changement de clé de chiffrement imposait une **reconnexion unique pour tous**. Elle a été assumée et signalée plutôt que subie — un utilisateur prévenu d'une reconnexion la vit comme une opération de maintenance, un utilisateur surpris la vit comme une seconde anomalie.

### 8.4 — Contribution des parties prenantes

| Partie prenante | Contribution | Sans elle |
|-----------------|--------------|-----------|
| **Utilisateurs signalants** | Détection, description du symptôme, et surtout les trois précisions de contexte : fermeture du navigateur, tous supports, dégradation sans déploiement | L'anomalie restait invisible : aucune alerte, aucune exception, aucun code d'erreur anormal |
| **Développeur-mainteneur** | Qualification, reproduction, diagnostic des deux causes racines, correctif, test de non-régression, déploiement, vérification | — |
| **Hébergeur de l'API** | Le comportement documenté du passage à zéro instance et du stockage éphémère a fourni le chaînon entre l'expiration d'une clé et le symptôme perçu | Le lien entre une clé expirée et une déconnexion à la fermeture du navigateur restait incompréhensible |
| **Base de données managée** | Support de persistance durable des clés, partagé entre instances et révisions | La correction se serait limitée à repousser l'expiration, sans traiter la cause |
| **Pipeline d'intégration et de déploiement** | Portes de qualité, déploiement, contrôle post-déploiement | Correctif livré sans garantie de non-régression |

La contribution la plus déterminante n'est pas technique : c'est le **« avant, ça marchait »** des utilisateurs. Cette phrase a exclu l'hypothèse d'une régression de code et orienté vers un mécanisme temporel — l'expiration d'une clé. Un signalement limité à « je suis déconnecté » aurait coûté plusieurs heures de recherche supplémentaires, très probablement engagées dans la mauvaise direction.

### 8.5 — Ce que l'épisode a changé

Trois évolutions en ont été tirées, toutes livrées depuis :

1. **Un canal de signalement explicite** — le lien en pied de page évite de dépendre du fait qu'un utilisateur pense à écrire spontanément, et son message pré-rempli embarque page, version et navigateur : trois des précisions qu'il avait fallu réclamer.
2. **Une supervision capable de voir ce type de dégradation** — la sonde d'aptitude à servir, les alertes sur les erreurs serveur et la règle de détection des régressions réduisent la dépendance au signalement humain pour les défauts de cette nature.
3. **Une consignation systématique** — le processus formalisé garantit qu'une anomalie signalée oralement laisse désormais une trace écrite et reproductible.

### 8.6 — Limite assumée

Sur un projet à intervenant unique, la collaboration avec le support se joue entre le développeur et ses utilisateurs, non entre deux équipes constituées. Le cas présenté est réel et non simulé : les utilisateurs ont tenu le rôle de détection et de qualification qu'assurerait un support de premier niveau, et leurs précisions ont directement orienté le diagnostic. Dans une organisation plus grande, la différence porterait sur la traçabilité du ticket et la passation entre niveaux — deux points que le processus écrit du §3 couvre déjà, précisément parce qu'il a été conçu pour ne pas reposer sur la mémoire d'une seule personne.
