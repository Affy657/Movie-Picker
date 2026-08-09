# Système de supervision et d'alerte (C4.1.2)

> Grille : [`../referentiel/bloc-04-maintenir-application-mco.md`](../referentiel/bloc-04-maintenir-application-mco.md) | Suivi : [`../suivi-rncp.md`](../suivi-rncp.md) § 7
>
> **Objectif du critère (C4.1.2)** : déterminer le périmètre de supervision, identifier les indicateurs de suivi pertinents, mettre en place des sondes, configurer la modalité des signalements, et garantir la surveillance de la disponibilité du logiciel.

## 1. Périmètre de supervision

Movie Picker est une application web à trois composants déployés séparément. Chacun peut tomber indépendamment des autres : le périmètre de supervision couvre donc les trois, plus les dépendances externes dont l'indisponibilité dégrade le service.

| Composant | Hébergement | Ce qui est surveillé |
|-----------|-------------|----------------------|
| **Front SPA** | AWS S3 + CloudFront (`web.movie-picker.fr`) | Disponibilité de la page servie, erreurs JavaScript, Web Vitals |
| **API .NET** | GCP Cloud Run `movie-picker-api` (europe-west1) | Disponibilité, readiness, latence, taux d'erreur, exceptions serveur |
| **Base de données** | MongoDB Atlas | Joignabilité depuis l'API (sonde de readiness) |
| **Dépendances tierces** | TMDB (catalogue), Resend (e-mail), Web Push | Indirectement, via les exceptions applicatives remontées à Sentry |

**Hors périmètre assumé** : la supervision de l'infrastructure sous-jacente (machines, réseau) relève des fournisseurs managés (Cloud Run, S3/CloudFront, Atlas) ; le projet ne les instrumente pas.

## 2. Indicateurs de suivi et objectifs de qualité

Les cibles sont calées sur des mesures réelles relevées sur les **30 jours** précédant leur définition (24/07/2026), et non sur des valeurs théoriques.

| Indicateur | Mesure de référence | Cible | Source |
|------------|--------------------|-------|--------|
| Disponibilité API | 100 % depuis la mise en service des sondes (24/07/2026) | **≥ 99,5 %** par mois | Uptime check GCP |
| Disponibilité front | 100 % depuis la mise en service des sondes (24/07/2026) | **≥ 99,5 %** par mois | Uptime check GCP |
| Ping MongoDB (readiness) | **7 ms** en production | < 100 ms | `GET /health/ready` |
| Latence API p50 | **72 ms** | < 200 ms | Cloud Monitoring |
| Latence API p95 | **207 ms** | **< 500 ms** | Cloud Monitoring |
| Latence API p99 | 284 ms | < 1 s | Cloud Monitoring |
| Démarrage à froid | 3,8 s | toléré (scale-to-zero assumé) | Mesure manuelle |
| Taux d'erreur serveur | **0,026 %** (4 réponses 5xx sur 15 161 requêtes) | **< 1 %** | Cloud Monitoring |
| Erreurs applicatives | regroupées par empreinte | 0 issue non triée > 24 h | Sentry |
| Performance front | score Lighthouse ≥ 80 | maintenu à chaque déploiement | CI (médiane de 3 exécutions) |
| Accessibilité front | score Lighthouse 100 | maintenu à chaque déploiement | CI |

Le **scale-to-zero** (aucune instance minimale) est un choix de coût assumé : il implique un démarrage à froid de ~3,8 s après une période d'inactivité. Les seuils de latence en tiennent compte (§ 4) plutôt que de le traiter comme une anomalie.

## 3. Sondes mises en place et leur finalité

### 3.1 Sondes actives de disponibilité (Google Cloud Monitoring)

Ce sont les seules sondes qui prouvent qu'un utilisateur peut réellement atteindre le service : elles interrogent l'application **de l'extérieur**, depuis trois continents, indépendamment de son propre code.

| Sonde | Cible | Fréquence | Finalité | Validation |
|-------|-------|:---------:|----------|------------|
| `API - disponibilite (/health)` | `https://api.movie-picker.fr/health` | 60 s | *Liveness*, le service répond-il ? | Code 2xx **et** `$.status == "ok"` (JSON path) |
| `API - readiness (/health/ready)` | `https://api.movie-picker.fr/health/ready` | 15 min | *Readiness*, le service est-il réellement opérationnel, base comprise ? | Code 2xx **et** dépendance `mongodb` à `ok` |
| `Front - disponibilite` | `https://web.movie-picker.fr/` | 5 min | La SPA est-elle servie par CloudFront ? | Code 2xx **et** présence du titre `Movie Picker` |

Chaque sonde s'exécute depuis **trois régions** (Europe, États-Unis, Asie-Pacifique) avec un délai d'expiration de 10 s. Interroger plusieurs régions évite de confondre une panne réelle avec un incident réseau local.

**Distinction liveness / readiness.** `GET /health` répond immédiatement sans dépendance : il détecte un service mort ou une révision qui ne démarre pas. `GET /health/ready` exécute un `ping` MongoDB avec un délai maximal de 3 s et renvoie **503** si la base est injoignable : il détecte le cas, invisible pour la première sonde, où l'API répond mais ne peut servir aucune donnée. La réponse porte aussi la **release déployée** (SHA du commit), ce qui permet de vérifier quelle version est réellement en ligne.

```json
{
  "status": "ready",
  "service": "movie-picker-api",
  "release": "7dab20c…",
  "dependencies": [{ "name": "mongodb", "status": "ok", "durationMs": 7 }]
}
```

La même vérification est rejouée **en fin de déploiement** par le pipeline CI/CD (`ci-cd.yml`, étape *Smoke test API*) : une révision qui ne passerait pas la readiness fait échouer le déploiement.

### 3.2 Sondes passives : métriques d'exécution Cloud Run

Collectées en continu par la plateforme, sans instrumentation applicative : nombre de requêtes par classe de code (2xx/3xx/4xx/5xx), distribution des latences, nombre d'instances de conteneur. Finalité : détecter une **dégradation progressive** (latence qui monte, 5xx qui apparaissent) que des sondes binaires « en ligne / hors ligne » ne verraient pas.

### 3.3 Sonde applicative : Sentry

| Projet Sentry | Composant | SDK |
|---------------|-----------|-----|
| `movie-picker-web` | SPA React (Vite) | `@sentry/react` |
| `movie-picker-api` | API .NET (Cloud Run) | `Sentry.AspNetCore` |

Finalité : nommer la cause d'une anomalie là où les sondes précédentes ne constatent qu'un symptôme. Ce qui est capturé :

- **Exceptions front non gérées**, erreurs JavaScript et rejets de promesses (handlers globaux du SDK), plus les erreurs de rendu React remontées par l'`ErrorBoundary` (`apps/web/src/shared/components/ErrorBoundary.tsx`).
- **Erreurs serveur 5xx**, capturées dans le filtre d'exceptions global (`MoviePickerExceptionFilter`), branche « erreur inattendue » uniquement. Les erreurs métier attendues (4xx : validation, non-trouvé, conflit, non-autorisé) ne sont **pas** envoyées, pour éviter le bruit.
- **Traces de performance**, échantillonnage à 10 % (`tracesSampleRate = 0.1`) côté front et API.
- **Contexte attaché**, `environment = production`, `release = <SHA du commit déployé>`, route, navigateur / runtime.

Les incidents sont regroupés par empreinte, avec compteur d'occurrences, première et dernière apparition, et release d'introduction. Les **source maps** du front sont uploadées pendant le build CI puis retirées de l'artefact publié : les stack traces sont lisibles sans exposer les sources.

La supervision Sentry est **active en production uniquement** : sans DSN en développement et en CI, les SDK restent inertes.

### 3.4 Sondes préventives : avant la mise en production

Elles détectent la régression avant l'utilisateur : tests unitaires et d'intégration, tests E2E Playwright, audit Lighthouse (performance et accessibilité, seuils bloquants), Quality Gate SonarCloud, scan de vulnérabilités Trivy et `dotnet list --vulnerable`, scan de secrets gitleaks, et scan de sécurité hebdomadaire planifié (`security-scan.yml`).

## 4. Seuils d'alerte

Cinq politiques d'alerte sont configurées dans Cloud Monitoring, dont celle des erreurs serveur qui porte deux conditions complémentaires. Les seuils sont volontairement placés **au-dessus du bruit mesuré** pour rester crédibles : une alerte qui se déclenche sans raison finit par être ignorée.

| Politique | Condition | Seuil | Sévérité | Justification |
|-----------|-----------|-------|:--------:|---------------|
| **API indisponible** | Sonde `/health` en échec | ≥ 2 points de contrôle en échec sur 5 min | CRITICAL | Un seul checker en échec = incident réseau local, pas une panne |
| **Base de données injoignable** | Sonde `/health/ready` en échec | ≥ 2 points de contrôle en échec sur 30 min | CRITICAL | L'API répond mais ne peut servir aucune donnée : impact utilisateur total |
| **Front indisponible** | Sonde front en échec | ≥ 2 points de contrôle en échec sur 10 min | CRITICAL | Idem, avec une fréquence de sonde plus lente |
| **Erreurs 5xx anormales** | Part des réponses en 5xx | > 20 % pendant 10 min | ERROR | Le trafic réel est inférieur à 2 requêtes par fenêtre de 5 min : un seuil en nombre absolu ne serait pas franchi par une panne totale |
| **Erreurs 5xx anormales** | Volume de réponses 5xx | > 2 sur 30 min | ERROR | Référence : 4 réponses 5xx en 30 jours |
| **Latence p95 dégradée** | p95 des requêtes | > 800 ms pendant 10 min | WARNING | Référence : p95 = 207 ms ; marge pour les démarrages à froid |

Chaque politique embarque une **documentation opérationnelle** (conduite à tenir) affichée dans la notification : où regarder, dans quel ordre, et quand déclencher un retour arrière. Les alertes se referment automatiquement après 30 minutes sans nouvelle occurrence.

## 5. Modalité de signalement

- **Canal** : notification par e-mail vers l'adresse d'exploitation du projet, déclarée comme canal de notification Cloud Monitoring et rattachée aux cinq politiques.
- **Contenu** : nom de la politique, condition franchie, valeur observée, horodatage, lien direct vers l'incident et le graphique, et la conduite à tenir rédigée dans la politique.
- **Alertes Sentry** : trois règles par projet (`movie-picker-web` et `movie-picker-api`), issue classée haute priorité, **régression** d'une anomalie précédemment corrigée, et **rafale** de plus de 20 occurrences en une heure. La règle de régression protège contre le scénario classique de la correction qui se défait silencieusement plusieurs déploiements plus tard.
- **Cycle de vie** : un incident ouvert reste visible dans Cloud Monitoring jusqu'à sa résolution ; la fermeture est automatique après 30 minutes de retour à la normale.

Le projet étant exploité par une seule personne, il n'y a pas d'astreinte ni d'escalade multi-niveaux : le signalement va directement à l'exploitant, qui est aussi le développeur. Ce choix est cohérent avec la taille du projet ; une escalade formelle serait une complication sans destinataire.

## 6. De l'alerte à la correction

1. **Détection**, une sonde franchit un seuil, ou une exception est capturée par Sentry.
2. **Signalement**, e-mail avec le contexte et la conduite à tenir.
3. **Qualification**, lecture de l'incident (Cloud Monitoring) ou de l'issue (Sentry : stack trace dé-minifiée, release, occurrences, breadcrumbs).
4. **Consignation**, une anomalie confirmée devient une issue GitHub suivant le gabarit `bug_report.yml` (processus détaillé dans [`processus-anomalies.md`](processus-anomalies.md), C4.2.1).
5. **Correction et déploiement**, correctif via le pipeline CI/CD ; en cas d'incident bloquant lié à un déploiement, retour arrière via `.github/workflows/rollback.yml`, la release Sentry (SHA) identifiant le déploiement fautif.
6. **Vérification**, smoke test `/health` puis `/health/ready` en fin de déploiement, retour de la sonde au vert, et entrée au CHANGELOG.

## 7. Tableau de bord

Un tableau de bord Cloud Monitoring **« Movie Picker - supervision (MCO) »** regroupe les six vues utilisées au quotidien : disponibilité API, disponibilité front, latences p50/p95 (avec le seuil d'alerte matérialisé), répartition des requêtes par classe de code, erreurs 5xx, et nombre d'instances Cloud Run.

## 8. Données personnelles (RGPD)

Le monitoring d'erreurs relève de l'**intérêt légitime** (sécurité et stabilité du service, RGPD considérant 49). Il n'utilise pas de cookie et n'est pas conditionné au consentement, contrairement à l'analytics produit (PostHog), opt-in via le CMP. Une catégorie informative « Surveillance des erreurs » (non désactivable) figure dans le dialogue de préférences, pour la transparence.

Minimisation appliquée (**zéro donnée personnelle**) :

- `SendDefaultPii = false` sur les deux SDK Sentry (ni IP, ni cookies, ni corps de requête, ni identifiant utilisateur).
- `beforeSend` qui efface IP / e-mail / nom d'utilisateur de tout événement, côté front et API.
- Côté serveur Sentry : scrubbing des adresses IP, data scrubber et scrubbers par défaut activés sur les deux projets.
- Pas de session replay, pas de capture d'écran.
- Les sondes de disponibilité n'interrogent que des endpoints techniques, sans authentification ni donnée utilisateur.

## 9. Coûts et quotas

| Poste | Plan | Limite | Coût |
|-------|------|--------|------|
| Uptime checks | Google Cloud Monitoring | 1 M exécutions/mois offertes | 0 € |
| Politiques d'alerte et notifications e-mail | Google Cloud Monitoring | Sans limite pratique | 0 € |
| Sentry | Developer (SaaS, région UE) | 5 000 événements/mois, rétention ~30 jours | 0 € |

Les sondes ajoutent environ 138 000 requêtes par mois sur l'API (130 000 pour `/health` interrogée toutes les minutes depuis trois régions, 8 600 pour `/health/ready`), soit 7 % des 2 M de requêtes offertes par Cloud Run. Cloud Run étant facturé au temps de traitement (≈ 100 ms par appel `/health`), le surcoût reste dans l'offre gratuite ; effet de bord favorable : les instances restent tièdes, ce qui réduit les démarrages à froid pour les utilisateurs.

## 10. Limites connues

- La **rétention Sentry** est de ~30 jours sur le plan gratuit : les incidents à conserver (post-mortem, dossier) sont archivés hors Sentry.
- La sonde front vise `web.movie-picker.fr` ; la migration prévue vers `www.movie-picker.fr` ([`../../runbook-migration-domaine-www.md`](../../runbook-migration-domaine-www.md)) imposera de mettre à jour la cible de la sonde.
- MongoDB Atlas n'est pas supervisé directement (métriques internes du cluster) : seule sa joignabilité depuis l'API l'est.
