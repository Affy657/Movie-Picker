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

L'application est en production depuis mai 2026, à l'adresse **web.movie-picker.fr**, et repose sur trois composants déployés indépendamment :

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

**Intégration et vérification.** Remplacement du paquet, réécriture des imports sur les 51 fichiers, puis contrôle complet : compilation TypeScript et analyse statique sans erreur, **575 tests unitaires au vert**, build de production et génération du service worker conformes, tests de bout en bout et audit de performance validés en intégration continue. L'avis disparaît de l'audit, le pipeline repasse au vert et le déploiement bloqué reprend son cours. Durée totale : moins d'une heure, sans adaptation du code applicatif.

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

1. **Détection** — une sonde franchit un seuil, ou une exception est capturée.
2. **Signalement** — courriel portant le contexte et la conduite à tenir.
3. **Qualification** — lecture de l'incident, ou de l'anomalie regroupée : pile d'appel lisible, version, occurrences, fil d'événements.
4. **Consignation** — l'anomalie confirmée devient une fiche écrite (§3).
5. **Correction et déploiement** — correctif par le pipeline ; en cas d'incident lié à un déploiement, retour arrière vers la révision précédente, la version portée par chaque événement identifiant le déploiement fautif.
6. **Vérification** — contrôle automatique des deux sondes de santé en fin de déploiement, retour de la sonde au vert, puis inscription au journal des versions (§7).

### 2.7 — Tableau de bord

Un tableau de bord d'exploitation regroupe les six vues utilisées au quotidien : disponibilité de l'API, disponibilité du front, latences p50 et p95 avec le seuil d'alerte matérialisé, répartition des requêtes par classe de code, erreurs serveur, et nombre d'instances actives.

![Tableau de bord de supervision — disponibilité, latences, erreurs et instances](captures/01-dashboard-supervision.png)

### 2.8 — Données personnelles

Le suivi des erreurs relève de l'**intérêt légitime** — sécurité et stabilité du service. Il n'utilise aucun cookie et n'est pas conditionné au consentement, contrairement à l'analytique produit, soumise à l'accord préalable de l'utilisateur ; une catégorie informative « Surveillance des erreurs » figure néanmoins dans les préférences, par transparence. La minimisation est appliquée strictement : envoi des données personnelles désactivé sur les deux SDK, effacement supplémentaire de l'adresse IP, du courriel et du nom d'utilisateur avant transmission, nettoyage côté serveur, aucun enregistrement de session ni capture d'écran. Les sondes de disponibilité n'interrogent que des points d'entrée techniques, sans authentification ni donnée utilisateur.

### 2.9 — Coûts et limites

L'ensemble du dispositif fonctionne dans les offres gratuites : les sondes ajoutent environ 276 000 requêtes mensuelles à une API facturée au temps de traitement — environ 14 % du quota offert — et les exécutions de sondes comme les notifications ne sont pas facturées. Effet de bord favorable : les instances restent tièdes, ce qui réduit les démarrages à froid pour les utilisateurs réels.

Trois limites sont assumées : la rétention des erreurs est d'environ trente jours sur l'offre gratuite, ce qui impose d'archiver hors outil les incidents à conserver ; la base de données n'est pas supervisée pour elle-même, seule sa joignabilité depuis l'API l'est ; enfin, les sondes et politiques ont été créées par appels d'interface de programmation et ne sont pas encore décrites en infrastructure-as-code, ce qui en fait un point de fragilité — il est repris comme axe d'amélioration au §6.
