# Dette technique

Fichier de travail pour agent : une session future doit pouvoir reprendre une dette sans contexte préalable.

## Protocole

1. Avant d'agir sur une entrée, exécuter son `verify`. Sauf mention contraire dans l'entrée, une sortie signifie « encore ouvert », une sortie vide « déjà réglé, supprimer l'entrée sans rien faire d'autre ».
2. `state: agent` se traite en autonomie ; `state: humain` demande un geste que l'agent ne peut pas faire (`bloque` dit lequel) ; `state: differe` attend son `declencheur`.
3. Fin de traitement : supprimer l'entrée entière, git porte l'historique.
4. Nouvelle entrée : même schéma de champs, identifiant `DEBT-NNN` jamais réutilisé. Prochain libre : `DEBT-066`.
5. Ici uniquement de la dette, du code ou de l'infrastructure qui existe et fonctionne moins bien qu'il ne devrait. Une feature va dans `roadmap.md`.
6. **Aucun identifiant d'infrastructure** (compte de service, bucket, identifiant de compte) : le dépôt est public, une faiblesse décrite avec sa cible se lit comme un mode d'emploi. Nommer le fichier ou la console où l'identifiant se relève, ou un espace réservé `<COMME_CECI>` ; la table des gabarits est dans `infra/README.md`.
7. **Contraintes** (ce qui casse en silence si on y touche) et **Impasses** (essayé, mesuré, sans gain), en fin de fichier, ne se traitent jamais. Les lire avant d'optimiser le front ou de toucher au déploiement.

Schéma : `state` / `bloque` (avec `state: humain`) / `declencheur` (avec `state: differe`) / `impact` / `ou` / `verify` / `fix` / `fini-quand` / `piege` / `refs`. Champs absents = sans objet.

---

## DEBT-005 enrichissement TMDB sur le chemin sondé

- state: differe
- declencheur: une latence p95 de la liste de films qui suit les incidents TMDB
- impact: la liste d'une soirée dépend de TMDB à chaque cycle de sondage, soit toutes les 3,5 s par participant
- ou: `apps/api-dotnet/MoviePicker.Api/Application/UseCases/ListMovies/ListMoviesForEventHandler.cs` (`BuildEnrichmentMapAsync`, appelé depuis le handler)
- verify: `grep -n "BuildEnrichmentMapAsync" apps/api-dotnet/MoviePicker.Api/Application/UseCases/ListMovies/ListMoviesForEventHandler.cs` ; encore ouvert tant que l'appel est dans le chemin de lecture
- fix: figer l'enrichissement sur le document du film au moment de l'ajout, le rafraîchir hors requête
- piege: le timeout de 3 s et le cache négatif **bornent** le pire cas, ils ne l'enlèvent pas. Ne pas conclure que c'est réglé en les voyant.

## DEBT-006 cache en mémoire local à l'instance

- state: differe
- declencheur: la mise à l'échelle devient routinière au lieu d'être exceptionnelle
- impact: jusqu'à 5 instances (`max_instance_count`, C12), donc jusqu'à 5 caches froids indépendants. Les sélections de la home, les collections et l'enrichissement TMDB passent par `ISharedCache` (Mongo, collection `shared_cache`, index TTL) en second niveau, une instance neuve relit ces snapshots au lieu de refaire le fan-out TMDB (6 à 10 s par requête). Depuis le 2026-09-23 le job `movie-picker-warm-catalog` réécrit le catalogue de la home toutes les 5 heures, avant l'expiration de 6 h, et un chargement incomplet (TMDB en 429) n'écrase plus un instantané complet. Les `IMemoryCache` restants (recherche TMDB, détails) sont locaux et plafonnés (`TmdbEntryCache`, `CatalogEntryCache`, 10 000 et 500 entrées).
- ou: `Infrastructure/Tmdb/TmdbMovieSearch.Details.cs` et `TmdbMovieSearch.Search.cs` pour ce qui reste en mémoire seule ; `Application/Caching/SharedCacheReadThrough.cs` pour le modèle à réutiliser
- verify: `grep -rln IMemoryCache apps/api-dotnet --include=*.cs`
- fix: passer les caches restants par `SharedCacheReadThrough`, ou un cache hors processus dédié
- piege: `min-instances` reste à 0, donc le démarrage à froid (3,5 s en prod, 0,7 s en local avec ReadyToRun) subsiste ; le poser à 1 coûte environ 8 à 10 $ par mois, décision de l'utilisateur, jamais de l'agent. Deux règles du cache partagé : seules les clés de catalogue (sections à liste fermée, au plus un genre) s'écrivent dans Mongo, parce que `recommendations`, `collection` et les combinaisons de genres ouvrent un espace de clés illimité à 24 Ko le document sur un palier de 512 Mo ; et chaque famille de clés porte une version (`showcase-v1`, `showcase-collections-v1`, `tmdb-enrich-v2`) à incrémenter quand le DTO sérialisé change, sinon les instances relisent d'anciens documents pendant tout le TTL après un déploiement.
- refs: même racine que DEBT-007 et DEBT-008, la contrainte Cloud Run

## DEBT-007 affiches servies en octets depuis Mongo à travers Cloud Run

- state: differe
- declencheur: la ligne de sortie réseau devient visible sur la facture GCP
- impact: chaque affiche traverse Cloud Run au lieu d'un CDN ; Firebase Hosting ne couvre que le front, pas `api.movie-picker.fr`
- ou: `apps/api-dotnet/MoviePicker.Api/Controllers/PostersController.cs`
- verify: `grep -n 'return File(' apps/api-dotnet/MoviePicker.Api/Controllers/PostersController.cs` ; encore ouvert tant que la ligne sort
- fix: stockage objet plus CDN devant
- piege: `Cache-Control: public,max-age=86400,immutable` et l'ETag sont posés, le trafic est déjà amorti côté navigateur : le coût restant est la sortie réseau, pas le nombre de requêtes. `poster_cache` est la seule courbe de croissance de la base (31,5 Mo sur 32,3 le 2026-09-15, ~56 Ko par affiche) ; l'index TTL `poster_cache_expiresAtUtc_ttl` (30 jours glissants) borne sa taille au nombre d'affiches vues dans le mois. Ce n'est plus qu'un cache depuis le 2026-09-23 : l'adresse d'une affiche porte le chemin TMDB validé (`/api/v1/posters/tmdb/<taille>/<fichier>`), et l'ancienne forme `/api/v1/posters/<sha256>`, qui dépendait d'un document de `poster_cache` et disparaissait avec lui, est réécrite par la migration `RewriteLegacyPosterPathsMigration`. Vider la collection ne coûte qu'un nouveau téléchargement depuis TMDB.

## DEBT-008 le sondage à 3,5 s fixe le plafond de la base

- state: differe
- declencheur: approcher la moitié du plafond d'opérations du palier Atlas, soit 50 opérations par seconde sur le M0 présumé (DEBT-009) : deux soirées de 6 en sondage actif au même moment y sont
- impact: environ 15 allers-retours Mongo par cycle et par participant **quand la soirée a bougé depuis le cycle précédent**, soit environ 26 opérations par seconde pour une soirée de 6 en pleine activité, 260 à 10 soirées simultanées. Un cycle sans changement coûte 2 lectures (une par route sondée, `EventViewTagHandler`) et rend 304 : le chiffre est le pire cas, pas la moyenne. L'ETag change aussi une fois par minute, donc chaque participant refait un cycle complet par minute même sans changement ; depuis le 2026-09-23 cette minute est décalée de 0 à 59 s selon le lecteur, ces cycles s'étalent au lieu de tomber tous dans les mêmes 3,5 s, et le sondage recule sur erreur (`pollIntervalAfterFailures` : délai qui double avec la durée de l'échec, gigue, `Retry-After` respecté, plafond d'une minute, arrêt sur 404). Plafond du palier : 100 opérations par seconde sur le M0 présumé (500 sur Flex), au-delà Atlas met les opérations en file.
- verify: `grep -n EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS apps/web/src/features/events/hooks/useEventLive.ts` ; encore ouvert tant que la constante existe, c'est-à-dire tant qu'on sonde
- fix: passer en SSE
- piege: ce n'est pas un défaut, le sondage reste le bon choix aujourd'hui (zéro infrastructure, Cloud Run n'aime pas les connexions longues) ; c'est le paramètre qui fixe la limite, à ne changer que sur le déclencheur. Le 304 tient à une règle non outillée, écrite dans `AGENTS.md` : toute mutation de la vue soirée fait bouger `writeSeq` (`UpdateAsync`, `LockForWriteAsync` ou `MarkChangedAsync`), sinon les clients en sondage gardent l'ancienne réponse jusqu'à la minute suivante.
- refs: DEBT-033 porte la conception du remplacement et le plafond produit qui dépend de cette limite

## DEBT-009 palier Atlas jamais confirmé

- state: humain
- bloque: l'accès MCP Atlas est désactivé pour les deux organisations du compte, un Organization Owner doit activer l'accès client IA dans les réglages de l'organisation ; la console Atlas est refusée à l'agent même par l'extension Chrome
- impact: limites par palier (documentation Atlas) : **M0** 100 opérations par seconde, 0,5 Go, 500 connexions, 10 Go de transfert par semaine glissante ; **Flex** 500 opérations par seconde, 5 Go, 500 connexions. Tout indique un M0 (cluster `cluster0`, replica set de 3 nœuds en MongoDB 8.0, 61 Mo occupés par dev et prod ensemble, AWS eu-west-1, voir I12), sans lecture directe du palier. DEBT-008 et DEBT-033 sont chiffrées sur M0 ; sur un Flex leurs seuils sont cinq fois plus larges.
- verify: lire le palier dans la console Atlas, onglet du cluster ; encore ouvert tant que la lecture n'a pas été faite. `atlas-list-clusters` via le MCP mongodb le rend aussi, une fois l'accès IA activé.
- fini-quand: le palier est lu et le mot « présumé » retiré de DEBT-008 et DEBT-033
- piege: sans le MCP, tout ce que le cluster dit de lui-même se lit par `mongosh` sans rien installer : `docker run --rm mongo:8 mongosh --quiet "$MONGODB_URI" --eval 'db.serverStatus().connections'`, et `db.stats()` par base pour les tailles. Le palier lui-même ne se lit que dans la console, `serverStatus` ne le dit pas.

## DEBT-026 le flou de fond des barres collantes n'a jamais été mesuré au défilement

- state: differe
- declencheur: un signalement de défilement saccadé sur mobile, ou une mesure de fluidité posée sur un Android milieu de gamme
- impact: `backdrop-filter: blur(12px)` sur la barre de `AppShell` et `blur(10px)` sur `EventDetailHeader` recomposent la zone floutée à chaque image pendant le défilement ; premier suspect connu de saccades sur mobile, sans preuve ici
- ou: `apps/web/src/app/components/AppShell.module.css`, `apps/web/src/features/events/pages/event-detail/EventDetailHeader.module.css` (les deux barres collantes ; les deux autres occurrences, `Modal` et un badge de la démo de la landing, n'en sont pas)
- verify: `grep -rn "backdrop-filter" apps/web/src --include=*.css`
- fix: mesurer d'abord (Performance panel, frames longues au défilement) ; si confirmé, fond opaque légèrement translucide sans flou, ou flou réservé à `(hover: hover)`
- piege: ne pas retirer le flou sur une intuition, c'est un choix visuel de l'utilisateur. Mesure avant geste.

## DEBT-027 `SENTRY_AUTH_TOKEN` est encore un secret de dépôt

- state: humain
- bloque: un jeton d'organisation Sentry ne se crée que dans son interface (`Settings / Auth Tokens`), l'API MCP ne l'expose pas ; la valeur d'un secret GitHub ne se relit pas, donc il faut le ressaisir. L'agent ne manipule pas de jeton en clair, le geste entier est humain.
- impact: le seul secret de déploiement lisible par n'importe quel workflow sur n'importe quelle branche, tout le reste vit dans les environnements `production` et `staging` (politique de branche `master`). Portée annoncée : créer des releases et des deploys Sentry ; si la valeur est encore le jeton personnel posé à la mise en place de Sentry, elle lit aussi les issues et les événements, à confirmer dans `Settings / Auth Tokens` au moment du remplacement.
- ou: `Settings / Secrets and variables / Actions`, secret de dépôt `SENTRY_AUTH_TOKEN` ; jobs `deploy-api`, `deploy-front` de `deploy.yml` et `rollback` de `rollback-front.yml`
- verify: `gh secret list --json name --jq '[.[].name] | join(",")'` rend `SENTRY_AUTH_TOKEN,SONAR_TOKEN` ; réglé quand il ne rend plus que `SONAR_TOKEN`
- fix: créer un nouveau jeton d'organisation Sentry (scopes `project:releases` et `org:read`), puis :
  ```bash
  gh secret set SENTRY_AUTH_TOKEN --env production
  gh secret set SENTRY_AUTH_TOKEN --env staging
  gh secret delete SENTRY_AUTH_TOKEN
  ```
  révoquer l'ancien jeton dans Sentry. Les jobs `build-front`, `deploy-front` et `deploy-api` tournent dans `environment: ${{ inputs.stage }}` : sans le secret dans `staging`, la recette perd ses source maps sans le signaler.
- piege: `SONAR_TOKEN` reste volontairement au niveau du dépôt, le job `sonar` tourne sur les PR et les branches `v*`, que la politique de branche de `production` exclurait. Tout job qui lit un secret de déploiement porte `environment: production` ; sans cette ligne il lirait une valeur vide.

## DEBT-030 les captures des suggestions d'idées sont hébergées sur une branche du dépôt public

- state: humain
- bloque: décision produit, garder ou non les pièces jointes des suggestions
- impact: tout compte connecté peut publier jusqu'à 40 images par heure (10 suggestions de 4 pièces jointes, `IdeaSuggestionPolicy` de `RateLimitingExtensions.cs`) sur la branche `GITHUB_ATTACHMENTS_BRANCH` du dépôt public. Les octets magiques et le type MIME sont vérifiés et les métadonnées JPEG, PNG, WebP et GIF retirées avant l'envoi (`ImageMetadataStripper`, liste blanche des blocs de rendu), pas le contenu : le dépôt devient un hébergeur d'images sous le nom du projet, et une image retirée reste dans l'historique git. Le ticket lui-même ne porte plus ni nom, ni handle, ni identifiant de compte (une référence aléatoire, que l'API journalise avec le compte : `IdeaSuggestion: published reference`), ni identifiant de soirée ou de profil (`Page : /e/:slug`, tout segment inconnu devient `:param`).
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/GitHub/GitHubIssueClient.cs`, `UploadAttachmentAsync`
- verify: `grep -n "UploadAttachmentAsync" apps/api-dotnet/MoviePicker.Api/Infrastructure/GitHub/GitHubIssueClient.cs` ; encore ouvert tant que la méthode pousse un blob dans le dépôt
- fix: soit retirer les pièces jointes du formulaire de suggestion, soit les héberger hors dépôt (bucket privé, lien signé dans le ticket)
- fini-quand: aucune écriture du serveur dans le dépôt GitHub ne vient d'un utilisateur

## DEBT-032 deux modèles d'autorisation hôte coexistent, le jeton porteur et le compte créateur

- state: humain
- bloque: décision produit, retirer ou non le jeton d'hôte. Le chantier co-hôte, au backlog produit, est le moment naturel, il ajouterait sinon un troisième chemin.
- impact: `EventHost.IsHost` accepte le jeton (`X-Host-Token`, ou `?host=` pour les anciens liens, que le front range en `sessionStorage` puis retire de la barre d'adresse) **ou** `CreatorUserId`. Créer une soirée exige un compte depuis la V1.2, donc le jeton est un vestige, et un lien partagé avec le jeton donne les commandes de l'hôte à n'importe qui, sans compte. Onze fichiers front le transportent, l'API le masque dans les logs et Sentry pour compenser.
- ou: `apps/api-dotnet/MoviePicker.Api/Domain/EventHost.cs`, `Infrastructure/Web/HostTokenAccessor.cs`, `SensitiveQueryRedaction.cs` ; côté front `grep -rl hostToken apps/web/src --include=*.ts --include=*.tsx | grep -v test`
- verify: `grep -n "TokenMatches" apps/api-dotnet/MoviePicker.Api/Domain/EventHost.cs` ; encore ouvert tant que le jeton compte dans `IsHost`
- fix: hôte = `CreatorUserId`, co-hôtes = liste d'identifiants sur `Event` posée par le chantier co-hôte ; puis retirer `HostToken` du document, `HostTokenAccessor`, `SensitiveQueryRedaction`, `withHostToken` et le stockage local côté front, et l'en-tête `X-Host-Token` du contrat OpenAPI
- fini-quand: plus aucun `hostToken` hors `archive/`, et `EventHost.IsHost` ne prend qu'un identifiant de compte
- piege: les soirées créées avant le compte obligatoire n'ont pas de `CreatorUserId` (`events_creatorUserId` est `Sparse` pour cette raison), leur hôte perdrait ses commandes. Compter avant de retirer le jeton, par `mongosh` : `db.events.countDocuments({creatorUserId:{$exists:false}, closedAt:null})` ; si le compte n'est pas nul, attendre la clôture de ces soirées ou les rattacher par migration.

## DEBT-033 le plafond de participants promet vingt fois ce que la base encaisse

- state: humain
- bloque: décision produit sur le plafond, et le choix du mode de synchronisation temps réel de V1.9
- impact: `EventConfig.MaxParticipantsCap = 500` alors qu'en sondage actif chaque participant coûte environ 4,3 opérations Mongo par seconde (15 allers-retours par cycle de 3,5 s, DEBT-008). Une soirée pleine vaut ~2 150 opérations par seconde et jusqu'à 500 clients, sur un cluster partagé qui accepte 500 connexions et 100 opérations par seconde sur le M0 présumé (DEBT-009). Une seule soirée de 23 participants en sondage actif sature le cluster ; le plafond de 500 est inatteignable, et un hôte qui le vise fait tomber la base pour toutes les soirées en cours.
- ou: `apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs` (`MaxParticipantsCap`), `apps/web/src/features/events/hooks/useEventLive.ts`
- verify: `grep -n "MaxParticipantsCap = " apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs` ; lire le nombre : encore ouvert tant qu'il dépasse 50 et que le front sonde encore
- fix: deux volets, dans cet ordre.
  1. Tant que le sondage reste le mode de synchronisation : sur M0, 50 participants font 215 opérations par seconde, le double du plafond ; le chiffre honnête pour une soirée pleine seule est 20. Choisir entre ce plafond et le volet 2.
  2. La synchronisation temps réel de V1.9 (`L`). **Retenir SSE avec vérification de version côté serveur** : `GET /api/v1/events/{slug}/stream` en `text/event-stream`, où chaque instance relit `writeSeq` de la soirée une fois par seconde par soirée connectée (compteur exhaustif : `UpdateAsync`, `LockForWriteAsync` et `MarkChangedAsync` l'incrémentent, `EventViewTagHandler` en fait déjà l'ETag des deux routes sondées) et envoie un événement « changé » à ses clients, qui refont alors leur GET habituel. Coût : 1 opération par seconde et par soirée quel que soit le nombre de participants, zéro dépendance nouvelle, `EventSource` reconnecte seul avec `Last-Event-ID`. Écarter WebSocket (les votes et propositions restent des POST, le flux n'a besoin que d'un sens, et il faudrait l'affinité de session) ; garder un service tiers (Ably, Pusher, Firebase) en repli si SSE échoue à l'usage ; réserver les change streams Mongo à un palier qui les supporte, jamais vérifié. « Présence » se pose sur le même flux avec un battement en base à TTL 30 s, jamais en mémoire d'instance.
- fini-quand: le plafond est aligné sur une mesure réelle du mode de synchronisation en place
- piege: quatre choses cassent SSE sur Cloud Run sans le dire. `timeout` est à 300 s sur le service (module `cloud-run-api`), donc chaque flux tombe toutes les 5 minutes et `EventSource` reconnecte, acceptable, ou le monter à 3 600. `UseResponseCompression` met en tampon : exclure `text/event-stream`. Un flux ouvert compte comme une requête en cours, donc l'instance reste vivante et facturée tant qu'un client écoute, environ 0,09 $ par heure au-delà du palier gratuit (grille europe-west1) : le coût du temps réel, à annoncer, pas à découvrir sur la facture. Enfin C12 devient bloquant avant ce chantier, des flux ouverts maintiennent plus d'instances debout que le trafic seul. Garder le sondage en repli après 15 s sans battement.

## DEBT-035 la diffusion push se fait dans la requête, sans file ni reprise

- state: differe
- declencheur: un p95 des `POST` de soirée (`join`, `movies`, `vote`, `wheel`) au-dessus de 500 ms dans les logs Cloud Run, ou un premier incident Web Push visible dans Sentry
- impact: `PushFanOut.SendToAllAsync` (8 envois en parallèle) est attendu dans `AddMovieHandler`, `DeleteEventHandler`, `PatchEventConfigHandler` et `WinnerAnnouncer`, et `JoinEventHandler` attend `IPushNotificationSender.SendAsync` : la latence d'un vote ou d'un tirage inclut ⌈abonnés / 8⌉ vagues vers le service push, que le plafond de DEBT-033 multiplie. Un échec autre que 410 / 404 est journalisé puis perdu, sans compteur ni reprise. Correct sous les règles Cloud Run (pas de tire-et-oublie), c'est le prix de l'absence de file.
- ou: `apps/api-dotnet/MoviePicker.Api/Application/UseCases/Shared/PushFanOut.cs`, `Infrastructure/Push/WebPushSender.cs` (les `catch`), appelants par `grep -rn "PushFanOut.SendToAllAsync" apps/api-dotnet/MoviePicker.Api --include=*.cs`
- verify: `grep -rln "PushFanOut.SendToAllAsync" apps/api-dotnet/MoviePicker.Api/Application/UseCases --include=*.cs` ; encore ouvert tant qu'un handler de mutation apparaît dans la liste
- fix: une collection `push_outbox` (un document par notification, `status`, `attempts`, index TTL), écrite dans la même transaction que la mutation, puis drainée hors requête : d'abord par le motif scheduler existant (`POST /api/v1/scheduler/push-outbox`, Cloud Scheduler chaque minute), puis par Cloud Tasks (cible HTTP sur Cloud Run, jeton OIDC) une fois les jobs Scheduler décrits en Terraform (DEBT-037), pour une latence en secondes
- fini-quand: aucun handler de mutation n'attend le service push, et une panne push d'une heure se rattrape sans perte
- piege: ne pas remplacer l'attente par un `_ = SendAsync(...)`, c'est exactement le tire-et-oublie que Cloud Run ne reprend jamais. Le rappel de soirée (`EventReminderPass`) est déjà hors requête, hors périmètre.

## DEBT-037 les jobs Cloud Scheduler restent décrits par le pipeline, et le secret de l'ancien jeton partagé survit

- state: agent
- impact: l'API n'accepte plus qu'un jeton OIDC signé par le compte du planificateur (`GoogleOidcSchedulerTokenValidator`, `SchedulerCallerAuthenticator`) : le chemin `X-Scheduler-Token` et `SchedulerTokenValidator` ont été retirés le 2026-09-24, après vérification que les trois jobs de production envoient le jeton OIDC sans en-tête partagé. Deux restes : les quatre jobs (rappels, soirées récurrentes, soirées terminées, rechargement du catalogue) sont encore créés par `deploy.yml` et non décrits en Terraform, et le secret `SCHEDULER_TOKEN` existe toujours dans Secret Manager et dans `api_secret_names`.
- ou: `.github/workflows/deploy.yml` (étape « Scheduled passes: Cloud Scheduler »), `infra/terraform/environments/production/main.tf` (`api_secret_names` porte encore `SCHEDULER_TOKEN`, `module.ci` porte encore `roles/cloudscheduler.admin` et `serviceAccountUser` sur le compte du planificateur)
- verify: `grep -c "Scheduled passes: Cloud Scheduler" .github/workflows/deploy.yml` ; encore ouvert tant que la commande rend autre chose que 0
- fix: en un seul lot : décrire les quatre jobs en Terraform (`google_cloud_scheduler_job`, `http_target` avec `oidc_token { service_account_email, audience }`, schedules `*/30 * * * *`, `15 3 * * *`, `45 3 * * *` et `20 */5 * * *`, fuseau `Europe/Paris`, `attempt_deadline` 300 s, `retry_config { retry_count = 3, min_backoff_duration = "30s", max_backoff_duration = "300s" }`, comme `deploy.yml` les pose, URI `<URL run.app du service>/api/v1/scheduler/<passe>`) et les importer (`pnpm run terraform -- import 'google_cloud_scheduler_job.<nom>' projects/<PROJET_GCP>/locations/europe-west1/jobs/<job>`, geste qui écrit l'état : à faire avec l'accord de l'utilisateur, puis `apply` par `infra.yml`) ; retirer l'étape de `deploy.yml`, `roles/cloudscheduler.admin` et le `serviceAccountUser` sur le planificateur de `module.ci`. Le secret se détruit en dernier, à partir du 2026-10-21 (voir `piege`) : `pnpm run terraform -- state rm 'module.api_secrets.google_secret_manager_secret_iam_member.accessor["SCHEDULER_TOKEN"]'`, idem pour `google_secret_manager_secret.this["SCHEDULER_TOKEN"]`, `gcloud secrets delete SCHEDULER_TOKEN`, retrait de `api_secret_names`.
- fini-quand: `SCHEDULER_TOKEN` n'existe plus dans Secret Manager, ni dans `main.tf`, les jobs sont dans l'état Terraform, `deploy.yml` ne les crée plus et `plan` est vide
- piege: une révision antérieure au 2026-09-21 ramenée par `rollback.yml` monte encore `SCHEDULER_TOKEN:latest` et attend l'en-tête : le secret doit survivre tant qu'une telle révision est dans le dépôt d'images (30 jours), et les jobs, qui n'envoient plus l'en-tête, recevraient de toute façon un 401 d'une telle révision. L'audience attendue est `VITE_API_URL` sans barre finale (`SCHEDULER_OIDC_AUDIENCE`), pas l'URL `run.app` que les jobs appellent. Le service est en `--allow-unauthenticated`, la vérification du jeton se fait dans l'API, pas par IAM Cloud Run ; le webhook Ko-fi reste sur son jeton, Ko-fi ne signe pas.

## DEBT-038 la synchronisation Letterboxd lit du HTML par expression régulière, sans canari

- state: humain
- bloque: choisir le compte Letterboxd public qui sert de témoin (celui de l'auteur, ou un compte créé pour ça, avec au moins un film en watchlist) et le poser en variable Actions ; tout le reste est en place
- impact: `LetterboxdWatchlistClient` lit les attributs `data-item-*` de la page watchlist, Letterboxd n'ayant pas d'API publique. Le garde compteur annoncé / films lus empêche une lecture partielle d'effacer une watchlist (`LetterboxdWatchlistIncomplete`), mais un changement de balisage met 100 % des synchronisations en échec et le `LogWarning` ne remonte pas dans Sentry : la fonctionnalité meurt jusqu'à ce qu'un utilisateur le dise. Tant que la variable manque, le job du canari n'existe pas.
- ou: `apps/api-dotnet/MoviePicker.Api.Tests/Infrastructure/Letterboxd/LetterboxdWatchlistCanaryTests.cs` (`[CanaryFact]`, trait `Category=Canary`, ignoré sans la variable), job `letterboxd-canary` de `.github/workflows/security-scan.yml` (cron du lundi, `if: vars.LETTERBOXD_CANARY_USERNAME != ''`, ouvre ou alimente un ticket `letterboxd-canary` en cas d'échec)
- verify: `gh variable list --json name --jq '.[].name' | grep -x LETTERBOXD_CANARY_USERNAME` ; encore ouvert tant que rien ne sort
- fix: `gh variable set LETTERBOXD_CANARY_USERNAME --body <compte>`, puis `gh workflow run security-scan.yml` et vérifier que le job `letterboxd-canary` apparaît et passe (joué en local contre un compte public de 577 films : vert en 5 s, rouge sur une watchlist vide, ce qui est voulu)
- fini-quand: la variable est posée, le job a tourné une fois en vert ; ensuite un balisage cassé produit un ticket dans les sept jours sans autre geste
- piege: le compte témoin doit garder au moins un film dans sa watchlist, sinon le canari est rouge pour une mauvaise raison. Le test ne tourne ni dans `verify:local` ni dans `ci-cd.yml`, il dépend d'un site tiers. Le ticket n'est ouvert qu'une fois, les échecs suivants le commentent tant qu'il reste ouvert.

## DEBT-039 le jeton d'accès en lecture TMDB n'existe pas encore dans Secret Manager

- state: humain
- bloque: créer le secret `TMDB_READ_ACCESS_TOKEN` (le « API Read Access Token » de la page API du compte TMDB) dans Secret Manager ; l'agent ne manipule pas de jeton en clair et les écritures Secret Manager lui sont refusées (`AGENTS.md`, accès outils)
- impact: `TmdbAuthenticationHandler` envoie le jeton v4 en `Authorization: Bearer` quand il existe et retombe sur la clé v3 en `api_key` dans la query string à défaut. Tant que le secret manque, le repli tourne en production : la clé traverse l'adresse de chaque requête sortante vers TMDB. `SensitiveQueryRedaction` et `SentryBeforeSend.RedactBreadcrumb` la masquent côté API et Sentry, le risque restant est toute trace hors de l'API (proxy, capture réseau, journal d'un intermédiaire).
- ou: `.github/workflows/deploy.yml` (le bloc `gcloud secrets describe TMDB_READ_ACCESS_TOKEN`), `apps/api-dotnet/MoviePicker.Api/Infrastructure/Tmdb/TmdbAuthenticationHandler.cs`
- verify: `gcloud secrets describe TMDB_READ_ACCESS_TOKEN --format='value(name)'` ; encore ouvert tant que la commande échoue
- fix: ajouter `TMDB_READ_ACCESS_TOKEN` à `api_secret_names` dans `infra/terraform/environments/production/main.tf`, `pnpm run terraform -- apply` (crée le secret vide et son `secretAccessor` pour l'identité d'exécution), puis relever le jeton dans TMDB et, sans jamais le coller dans un fichier ni dans la conversation :
  ```bash
  gcloud secrets versions add TMDB_READ_ACCESS_TOKEN --data-file=<FICHIER_TEMPORAIRE_SUPPRIME_ENSUITE>
  ```
  puis `gh workflow run deploy.yml --ref master -f target=api` (geste de l'utilisateur), vérifier que la révision active porte la variable (`gcloud run services describe <SERVICE> --region <REGION> --format=yaml | grep -A2 TMDB_READ_ACCESS_TOKEN`), enfin révoquer la clé v3 côté TMDB et retirer `TMDB_API_KEY` de `deploy.yml`, puis de `api_secret_names` (lever d'abord `deletion_protection` dans `modules/secrets/main.tf` pour cet `apply`, qui détruit le secret). Le code garde le repli `api_key` pour le poste de travail, `.env.example` documente les deux.
- fini-quand: le secret existe, la révision active le porte, la clé v3 est révoquée et `TMDB_API_KEY` n'apparaît plus dans `deploy.yml`
- piege: ne pas révoquer la clé v3 avant que la révision qui porte le jeton serve le trafic : `deploy.yml` ne passe le secret que s'il existe au moment du déploiement, une révision antérieure n'a que la clé. Le jeton v4 est accepté par l'API v3 de TMDB, c'est documenté et `TmdbAuthenticationHandlerTests` le suppose, mais seul un appel réel le prouve : après le déploiement, une recherche de film dans l'application est la vérification.

## DEBT-040 le seed de développement est compilé dans l'assembly de production

- state: differe
- declencheur: une feature repasse dans `Infrastructure/Development/` ou dans ses tests. Ne jamais en faire un chantier isolé.
- impact: `DevelopmentScenarioSeed.cs` (2 050 lignes) et `DevelopmentDataSeedHostedService.cs` (329 lignes) sont publiés dans l'image de production, environ 12 % des lignes de l'API pour du code que seul `environment.IsDevelopment()` enregistre. Aucune surface exposée, du poids d'assembly et du temps de compilation ReadyToRun pour rien.
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Development/`, enregistrement dans `ServiceCollectionExtensions.AddMoviePicker` sous `environment.IsDevelopment()`
- verify: `ls apps/api-dotnet/MoviePicker.Api/Infrastructure/Development/` ; encore ouvert tant que le dossier est dans le projet `MoviePicker.Api`
- fix: sortir le dossier dans un projet `MoviePicker.Api.DevelopmentSeed` que `MoviePicker.Api` référence seulement en `Debug` (`<ProjectReference Condition="'$(Configuration)' == 'Debug'">`), l'enregistrement DI passant par une extension de ce projet appelée derrière `#if DEBUG` ; déplacer `DevelopmentScenarioSeedTests` et la moitié seed de `ServiceCollectionExtensionsBranchTests` dans un projet de tests lui aussi Debug. Mesurer avant et après par `dotnet publish -c Release` et la taille de `MoviePicker.Api.dll`.
- piege: `verify:local` et la CI compilent et testent en **Release**, et `DevelopmentScenarioSeedTests.cs` comme `ServiceCollectionExtensionsBranchTests.cs` référencent le seed : un simple `<Compile Remove>` conditionnel casse la suite. `launchSettings.json`, `playwright.config.ts` et `scripts/verify-local.cjs` lancent l'API en `Development` avec `DevelopmentSeed__Enabled=false` : vérifier qu'un `dotnet run` sans configuration explicite construit bien en Debug, sinon le seed disparaît du poste de travail sans erreur.

## DEBT-041 la date et l'heure d'une soirée sont des chaînes reparsées à chaque lecture

- state: differe
- declencheur: une feature repasse dans `EventSchedule` ou dans la création et la modification d'une soirée
- impact: `Event.Date` et `Event.Time` sont des `string` (`"2026-09-20"`, `"20:30"`) que `EventSchedule.TryGetStartUtc` reparse à chaque appel de `Event.Lifecycle()`, donc pour chaque soirée listée et à chaque cycle de sondage. Un format invalide ne se découvre qu'à la lecture, la soirée reste `Upcoming` pour toujours au lieu d'être refusée à l'écriture. Lisibilité et robustesse, pas une lenteur mesurée : le parsing coûte des microsecondes.
- ou: `apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs`, `Domain/EventSchedule.cs`, `Infrastructure/Persistence/Mongo/EventDocument`, les DTOs et les fichiers qui lisent `.Date` (`grep -rln "\.Date\b" apps/api-dotnet/MoviePicker.Api --include=*.cs`)
- verify: `grep -n "public string Date\|public string Time" apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs` ; encore ouvert tant que les deux lignes sortent
- fix: `DateOnly Date` et `TimeOnly Time` sur l'entité, ou un `StartUtc` calculé et validé à l'écriture, avec conversion aux frontières (document Mongo, DTO) pour ne changer ni le contrat OpenAPI ni les documents existants ; la validation du format remonte dans le handler de création et rend une `Errors.<Cas>()` au lieu d'un `Upcoming` silencieux
- piege: les documents de production portent les chaînes : garder la lecture de l'ancien format ou passer par une `IDataMigration`, jamais les deux à moitié. Le seed (`DevelopmentScenarioSeed`, DEBT-040), les fixtures et les tests écrivent ces chaînes en dur : compter les occurrences avant de changer le type, le chantier est plus large qu'il ne paraît depuis `Event.cs`.

## DEBT-042 les aperçus de partage d'une soirée sont génériques, l'option « aperçu riche » n'a plus d'effet

- state: humain
- bloque: une décision sur la route `/e/*` : Firebase Hosting ne route pas selon l'user agent, la réécriture `/e/**` vers Cloud Run enverrait humains et robots à l'API, qui devrait servir la coquille aux premiers ; le code de l'aperçu est déjà là
- impact: le lien partagé est `https://<front>/e/<slug>` et Hosting lui répond la coquille SPA, donc WhatsApp, Messenger, Discord et consorts affichent le titre et l'image génériques du site quelle que soit la soirée. `GET /api/v1/events/slug/{slug}/share-preview`, qui rend le HTML Open Graph de la soirée, n'est plus appelé par personne depuis `9a1ecc87` (le lien de partage est passé de l'URL API à l'URL front, et l'assistant front qui construisait l'URL de l'API a été supprimé le 2026-09-23) : le réglage `richSharePreview` de la soirée ne change rien pour l'utilisateur.
- ou: `apps/api-dotnet/MoviePicker.Api/Application/UseCases/EventSharePreview/GetEventSharePreviewHtmlHandler.cs`, `infra/firebase-hosting.json` (réécritures)
- verify: encore ouvert tant que la commande ne renvoie pas une balise `og:title` propre à la soirée (la coquille rend le titre du site).
  ```bash
  curl -sS -A "facebookexternalhit/1.1" https://www.movie-picker.fr/e/<SLUG_PUBLIC> | grep -o '<meta property="og:title" content="[^"]*"'
  ```
- fix: une réécriture Hosting `{ "glob": "/e/**", "run": { "serviceId": "movie-picker-api", "region": "europe-west1" } }` dans `infra/firebase-hosting.json`, l'API servant l'aperçu aux robots (`facebookexternalhit`, `WhatsApp`, `Discordbot`, `Twitterbot`, `Slackbot`, `LinkedInBot`, `TelegramBot`) et la coquille `index.html` aux humains, lue depuis Hosting ou embarquée ; le 404 des soirées inconnues (DEBT-043) vient avec. À défaut, supprimer l'endpoint et le réglage `richSharePreview` pour ne pas promettre un aperçu qui n'existe pas.
- piege: `robots.txt` interdit `/e/` : seuls les robots d'aperçu (qui ignorent `robots.txt`) sont concernés. Ne pas servir le HTML de l'API aux navigateurs, il n'a ni style ni application.

## DEBT-043 toute adresse inconnue répond 200

- state: differe
- declencheur: la réécriture Hosting `/e/**` vers Cloud Run de DEBT-042, ou une page de la coquille vue indexée dans Search Console
- impact: `/page-inexistante` et `/e/<slug-inconnu>` répondent `200` avec la coquille SPA, le `noindex` de `NotFoundPage` n'est posé qu'en JavaScript : un moteur qui n'exécute pas le rendu peut indexer une page vide (mesuré le 2026-09-18, une `/films/collection/…` indexée avec la coquille brute)
- ou: `infra/firebase-hosting.json` (repli vers `/index.html` en 200, sauf sous `/assets/`)
- verify: `curl -sS -o /dev/null -w '%{http_code}\n' https://www.movie-picker.fr/page-inexistante` ; encore ouvert tant que la commande affiche `200`
- fix: pour les chemins qui ne correspondent à aucune route de `apps/web/src/app/routes.ts`, renvoyer la coquille avec le statut 404 (`X-Robots-Tag: noindex`), ce qu'un hébergement statique ne sait pas faire seul ; une réécriture Hosting `/e/**` vers Cloud Run (DEBT-042) réglerait au moins les soirées inconnues, le reste demande une fonction devant le site
- piege: `/u/<handle>` et `/e/<slug>` sont des gabarits valides même quand la ressource n'existe pas, le 404 côté edge ne peut pas les juger : leur `noindex` reste posé par l'application

## DEBT-044 le conteneur de l'API est décrit à deux endroits, le pipeline et Terraform

- state: differe
- declencheur: un secret ajouté à `api_secret_names` sans l'être à `deploy.yml` (ou l'inverse), pour la production comme pour la recette, qui a sa propre liste des deux côtés
- impact: le module `cloud-run-api` écrit l'image, les variables et les secrets montés à la création d'un service puis les ignore (`lifecycle.ignore_changes`) ; `deploy.yml` fait foi (`SECRETS`, `--set-env-vars`). La liste des secrets montés vit donc deux fois par étape (la recette naît même sans aucun secret monté, ses versions s'ajoutant après l'`apply`), et `SENTRY_RELEASE` (le SHA du déploiement), `ALLOWED_ORIGINS` (variable GitHub) et `SCHEDULER_OIDC_*` (l'audience est `VITE_API_URL`, un secret d'environnement) n'ont pas de place dans Terraform tant que la version est une variable d'environnement plutôt qu'une donnée de l'image.
- ou: `infra/terraform/modules/cloud-run-api/main.tf` (`ignore_changes`), `infra/terraform/environments/production/main.tf` (`api_secret_names`), `infra/terraform/environments/staging/main.tf` (`own_secret_names`, `shared_secret_names`), `.github/workflows/deploy.yml` (`SECRETS` des deux étapes, `--set-env-vars`)
- verify: encore ouvert tant que les listes existent ; la commande montre les écarts de la production, dont ceux qu'une autre dette explique (`SCHEDULER_TOKEN` par DEBT-037, `TMDB_READ_ACCESS_TOKEN` par DEBT-039). Pour la recette, comparer à la main les montages `STAGING_*` et partagés de la branche `else` avec `own_secret_names` et `shared_secret_names`.
  ```bash
  diff <(grep -oE '^\s+"[A-Z_]+",' infra/terraform/environments/production/main.tf | tr -d ' ",' | sort) <(grep -oE '[A-Z_]+=[A-Z_]+:latest' .github/workflows/deploy.yml | cut -d= -f1 | sort -u)
  ```
- fix: faire voyager la version dans l'image (`SENTRY_RELEASE` lu d'un fichier ou d'une étiquette de l'image plutôt que d'une variable), passer `ALLOWED_ORIGINS` en variable Terraform, retirer `env` et `secret_env` de `ignore_changes`, et réduire `deploy.yml` à l'image et au trafic ; le retour arrière et la promotion sans trafic restent au pipeline
- piege: retirer `ignore_changes` sur `env` avant que le pipeline ne cesse d'écrire les variables ferait remettre l'ancien environnement à chaque `apply`, entre deux déploiements

## DEBT-045 la production monte un porte-clés Data Protection qu'elle ne lit jamais

- state: differe
- declencheur: le prochain secret ajouté ou retiré de `deploy.yml`, ou la fermeture de DEBT-044
- impact: `AddSharedDataProtection` ne lit `AUTH_DATAPROTECTION_KEYRING` que si `MONGODB_URI` est vide ; avec une base, les clés vivent dans Mongo (`MongoXmlRepository`). La production a toujours une base : le secret est monté dans chaque révision, compte dans les versions actives facturées, figure dans `api_secret_names` et dans la liste `SECRETS`, et ne sert à rien. La recette ne le monte pas, seule différence de montage qui ne soit pas un secret propre à l'étape.
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/DataProtectionConfiguration.cs` (la branche `return` sous `MONGODB_URI`), `.github/workflows/deploy.yml` (`AUTH_DATAPROTECTION_KEYRING=` dans la liste de production), `infra/terraform/environments/production/main.tf` (`api_secret_names`)
- verify: `grep -c 'AUTH_DATAPROTECTION_KEYRING' .github/workflows/deploy.yml` ; encore ouvert tant que la commande rend autre chose que 0
- fix: retirer le montage de `deploy.yml`, redéployer, puis retirer le nom d'`api_secret_names` (lever `deletion_protection` dans `modules/secrets/main.tf` pour cet `apply`, qui détruit le secret et sa version) ; garder le repli fichier du code, il sert au poste sans base et aux tests
- piege: vérifier d'abord qu'aucune révision de production ne tourne sans `MONGODB_URI` (elle ne démarre pas sans, `ProductionStartupValidation`), et que la collection des clés existe dans la base de production avant de retirer le secret : une session signée par une clé absente serait invalidée pour tout le monde

## DEBT-046 les secrets sont répliqués hors de l'Union européenne et les journaux vivent en `global`

- state: differe
- declencheur: une exigence de résidence des données écrite noir sur blanc (client, école, mention légale), ou la création d'un nouveau secret
- impact: tous les secrets ont la réplication `auto` (module `secrets`), donc des copies dans des régions hors UE, et le bucket de journaux `_Default` de Cloud Logging est en `global`. Aucun secret n'est une donnée personnelle et les journaux de l'API n'en portent pas (identifiants Mongo, jamais d'e-mail) : question de résidence, pas de sécurité.
- ou: `infra/terraform/modules/secrets/main.tf` (`replication { auto {} }`), `gcloud logging buckets list`
- verify: `grep -c "auto {}" infra/terraform/modules/secrets/main.tf` ; encore ouvert tant que la commande rend autre chose que 0
- fix: la réplication d'un secret ne se modifie pas : chaque secret se recrée (`user_managed` avec `replicas { location = "europe-west1" }`), sa version se rajoute à la main, `deploy.yml` bascule dessus, l'ancien se détruit ; pour les journaux, un bucket `europe-west1` et le sink `_Default` réorienté dessus. Secret par secret, un déploiement entre chaque.
- piege: un secret sans version fait échouer la révision qui le monte : créer et remplir le nouveau avant de changer `deploy.yml`

## DEBT-047 le service Cloud Run n'a qu'une sonde de démarrage TCP

- state: differe
- declencheur: un incident où une instance accepte les connexions sans servir (base injoignable au démarrage, dépendance qui bloque), ou la fermeture de DEBT-044
- impact: Cloud Run juge une instance prête dès que le port 8080 accepte une connexion, `/health` n'est pas interrogé. Une instance qui écoute sans pouvoir répondre reçoit du trafic pendant tout son délai de sonde. Le pipeline sonde `/health` et `/health/ready` avant la promotion, le risque ne concerne que les instances lancées à l'échelle ensuite.
- ou: `infra/terraform/modules/cloud-run-api/main.tf` (aucun bloc `startup_probe`)
- verify: `grep -c startup_probe infra/terraform/modules/cloud-run-api/main.tf` ; encore ouvert tant que la commande rend 0
- fix: `startup_probe { http_get { path = "/health" port = 8080 } period_seconds = 5 failure_threshold = 12 }` dans le module, appliqué en recette d'abord
- piege: Terraform ne peut pas modifier le gabarit d'un service que gcloud a déployé : gcloud nomme la révision dans le gabarit (`template.revision`), Terraform renvoie ce nom et Cloud Run répond `409 Revision named '...' with different configuration already exists` (constaté sur `max_instance_count`, `ignore_changes` cache la différence sans empêcher l'envoi). La sonde se pose donc d'abord par `gcloud run services update <service> --startup-probe httpGet.path=/health,httpGet.port=8080,periodSeconds=5,failureThreshold=12`, en recette puis en production, et le module la décrit ensuite pour un `plan` vide. Cette révision prend le trafic sans passer par la validation de `deploy.yml` (`traffic` est ignoré, le service est en `latestRevision`) : la poser juste avant un déploiement, jamais un soir de soirée.

## DEBT-048 la zone DNS n'a pas de CAA et sa politique DMARC n'observe rien

- state: humain
- bloque: la zone vit chez OVH, hors Terraform et sans CLI (`infra/README.md`, section Domaines) : chaque enregistrement se pose dans le manager, par Chrome, avec la session OVH de l'utilisateur ouverte et son accord explicite sur l'enregistrement (le mode automatique seul refuse une modification DNS)
- impact: sans CAA, n'importe quelle autorité peut émettre un certificat pour `movie-picker.fr` ; `_dmarc` vaut `v=DMARC1; p=none;` sans `rua=`, donc un courriel usurpant l'expéditeur du domaine arrive en boîte de réception et personne ne le sait. SPF, DKIM et le chemin de retour Resend sont en place, seule la politique manque.
- ou: manager OVH, zone DNS de `movie-picker.fr` (« Ajouter une entrée », sous-domaine vide pour les CAA, `_dmarc` pour le TXT à modifier) ; `SECURITY.md` pour l'adresse de rapport
- verify: `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=movie-picker.fr&type=CAA' | grep -c '"Answer"'` puis `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=_dmarc.movie-picker.fr&type=TXT' | grep -c 'rua='` ; encore ouvert tant que l'une des deux commandes rend 0
- fix: deux CAA sur l'apex, indicateur `0`, étiquette `issue`, cibles `pki.goog` (Google Trust Services, qui émet pour Hosting et Cloud Run) et `letsencrypt.org` (le secours que Hosting sait demander) ; `_dmarc` en `v=DMARC1; p=none; rua=mailto:contact@movie-picker.fr`, puis `p=quarantine` après quelques semaines de rapports sans faux positif ; au passage, supprimer le CNAME `_acme-challenge` de l'apex, qui vise encore la validation de certificat d'AWS et n'a plus rien à valider. Une fois posés, les noter dans `infra/README.md` à côté des enregistrements que Hosting dicte.
- piege: l'adresse de rapport doit être sur la zone elle-même : un `rua=` vers un autre domaine exige un TXT d'autorisation `movie-picker.fr._report._dmarc.<autre domaine>` chez ce domaine, que Gmail ne publie pas, donc Google n'y livrerait aucun rapport. `contact@` est l'adresse publique de `SECURITY.md` et l'apex a des MX. Durcir vers `p=quarantine` puis `p=reject` seulement après avoir lu les rapports : les seuls émetteurs alignés sont Resend (DKIM sur le domaine, chemin de retour `send.`) et les serveurs de messagerie OVH (SPF de l'apex) ; un « envoyer en tant que » depuis Gmail ou tout autre relais passerait en indésirable puis serait rejeté.

## DEBT-049 les alertes n'ont qu'un canal, une boîte de réception

- state: humain
- bloque: le canal SMS existe dans le module `monitoring` mais n'est créé que si `alert_sms_number` est renseigné, et seul le propriétaire du numéro peut le choisir
- impact: les huit politiques (API, base et front indisponibles, erreurs 5xx, latence, nouveau compte, sauvegarde périmée, échec d'une passe planifiée) n'atteignent qu'une adresse e-mail. Une nuit de soirée sans lecture de la boîte, c'est une panne vue le lendemain.
- ou: `infra/terraform/modules/monitoring/main.tf` (`google_monitoring_notification_channel.sms`, `count` sur la variable vide), `infra/terraform/environments/production/variables.tf` (`alert_sms_number`), `scripts/terraform.mjs` (`ALERT_SMS_NUMBER`), `.github/actions/terraform-plan/action.yml` (`alert-sms-number`)
- verify: `gh secret list --env infra-apply | grep -c ALERT_SMS_NUMBER` ; encore ouvert tant que la commande rend 0
- fix: un numéro en E.164 dans `.env` (`ALERT_SMS_NUMBER`) et dans les secrets des environnements GitHub `infra-apply` et `infra-plan` ainsi que Dependabot, puis `apply` par `infra.yml` : la ressource se crée, les politiques la prennent par `local.channels`
- piege: le numéro est une donnée personnelle : la variable est `sensitive`, il ne va ni dans un `.tf`, ni dans un `tfvars` suivi, ni dans ce fichier. Le canal SMS de Cloud Monitoring demande une vérification du numéro après création (console, Canaux de notification) : tant qu'elle n'est pas faite, le canal existe et ne sonne pas.

## DEBT-050 le projet vit hors organisation, sous un seul compte personnel

- state: humain
- bloque: créer une organisation Cloud Identity gratuite demande de prouver la propriété du domaine et de migrer le projet depuis la console, sous le compte propriétaire ; les réglages du compte lui-même (passkeys, options de récupération) ne se font qu'en session humaine
- impact: sans organisation, ni politique d'organisation (`iam.disableServiceAccountKeyCreation`, `iam.allowedPolicyMemberDomains`) ni deny policy ne sont possibles : `pnpm run check:iam` reste le seul filet contre une clé de compte de service ou une liaison posée à la main, et l'identité Terraform garde le chemin vers les valeurs de secret (`setIamPolicy` sur un secret, ou `projectIamAdmin`, lui donnerait `secretAccessor` en un appel), ce que la description du rôle `secretsOperator` dit. Le projet n'a qu'un propriétaire, un compte Google personnel : sa compromission ou sa perte est celle de toute l'infrastructure, et rien d'autre ne peut la récupérer.
- ou: `gcloud projects describe <PROJECT_ID>`, `scripts/check-iam.mjs`, `infra/README.md` (Identités)
- verify: `gcloud projects describe <PROJECT_ID> --format='value(parent.type)'` ; encore ouvert tant que la commande ne rend rien
- fix: d'abord le compte (passkeys, deux options de récupération vérifiées, revue des sessions et des applications tierces), puis une organisation Cloud Identity Free sur `movie-picker.fr`, la migration du projet sous elle, les deux politiques d'organisation ci-dessus, une deny policy sur le projet qui refuse `secretmanager.googleapis.com/versions.access` aux identités Terraform `apply` et `plan` quels que soient leurs rôles (`roles/iam.denyAdmin` ne se pose que sur une organisation : `gcloud` répond « not supported for this resource », la console donne « Ressource cible : Organisation »), un second propriétaire ou un rôle de récupération sur un compte distinct ; la liaison anti-suppression déjà en place reste
- piege: la migration change le `parent` que Terraform ne décrit pas mais que les rôles personnalisés et la fédération d'identité citent par numéro de projet, inchangé ; rejouer `infra.yml` après la migration pour prouver un plan vide, et `cloud-auth-check.yml` pour les cinq environnements. Une politique `allowedPolicyMemberDomains` bloque `allUsers` sur les deux services Cloud Run tant qu'elle n'est pas assouplie pour le projet.

## DEBT-051 le poste de développement porte la clé TMDB de production

- state: humain
- bloque: une seconde clé TMDB se crée dans le compte TMDB de l'utilisateur (Settings / API), et le `.env` du poste est le sien
- impact: le `.env` du checkout principal porte `TMDB_API_KEY` à sa valeur de production (constaté par l'audit du 2026-09-21, qui a tourné le même jour l'URI Mongo et les clés VAPID que le poste partageait aussi avec la production). Une fuite du poste ou d'une transcription de session est une fuite de production, et les essais locaux consomment le quota de la production.
- ou: `C:\ynov\movie-picker\.env` (hors dépôt), `.env.example` (le nom), Secret Manager (`TMDB_API_KEY`)
- verify: `[ "$(grep -E '^TMDB_API_KEY=' .env | cut -d= -f2- | tr -d '"')" = "$(gcloud secrets versions access latest --secret=TMDB_API_KEY)" ] && echo shared` depuis le checkout principal ; encore ouvert tant que la commande imprime `shared`
- fix: une clé TMDB de développement dans `.env`, rien d'autre : la clé de production reste où elle est
- piege: ne pas tourner la clé de production « au passage » sans redéploiement : la révision active la lit au démarrage de chaque instance (`TMDB_API_KEY:latest`), une clé révoquée avant le déploiement coupe les recherches de films

## DEBT-052 le secret `GITHUB_TOKEN` de l'API est le jeton du `gh` CLI du poste

- state: humain
- bloque: un jeton fine-grained se crée dans l'interface GitHub, derrière le mode sudo (passkey ou code par courriel), que l'agent n'a pas le droit de franchir (« Confirm access » sur `settings/personal-access-tokens/new`). Le reste est agent.
- impact: la valeur montée dans les révisions de production et de recette (`GITHUB_TOKEN=GITHUB_TOKEN:latest` dans les deux listes `SECRETS` de `deploy.yml`) est un jeton OAuth `gho_` de l'application « GitHub CLI », identique à `gh auth token` sur le poste, scopes `repo, workflow, gist, project, read:org` (en-tête `X-OAuth-Scopes` de `curl -sS -D - -H "Authorization: Bearer $T" https://api.github.com/user`). L'API n'en a besoin que pour créer des issues et pousser des pièces jointes sur la branche `feedback-attachments` (`GitHubIssueClient.cs`). Depuis un conteneur compromis, ce jeton pousse sur master, réécrit les workflows et assume donc toutes les identités fédérées, `infra-apply` comprise.
- ou: Secret Manager `GITHUB_TOKEN` (version 1 du 2026-09-02), `.github/workflows/deploy.yml` (les deux `SECRETS`), `apps/api-dotnet/MoviePicker.Api/Infrastructure/GitHub/GitHubIssueClient.cs`, GitHub Settings / Developer settings / Personal access tokens / Fine-grained tokens
- verify: `gcloud secrets versions access latest --secret=GITHUB_TOKEN --project <PROJET_GCP> | cut -c1-4` ; encore ouvert tant que la commande rend `gho_` (réglé quand elle rend `gith`, le préfixe `github_pat_`)
- fix: (humain) un jeton fine-grained nommé `movie-picker-api-feedback`, expiration un an, « Only select repositories » : `Affy657/Movie-Picker`, permissions Issues « Read and write », Contents « Read and write », Metadata en lecture ; sa valeur seule dans `Downloads\github-pat.txt`. (agent) prouver le jeton sans l'afficher : `GET repos/Affy657/Movie-Picker` en 200, `GET .../issues?per_page=1` en 200, un `PUT .../contents/_probe/<horodatage>.txt` sur la branche `feedback-attachments` puis son `DELETE`, et `GET user/repos` qui ne rend que ce dépôt ; puis `gcloud secrets versions add GITHUB_TOKEN --data-file=Downloads\github-pat.txt`, écraser et supprimer le fichier, déployer (`stage=staging` puis `stage=production`, `target=api` suffit si `verify-ci` l'accepte, sinon `all`), vérifier `/health/ready` sur les deux étapes, puis `gcloud secrets versions destroy 1 --secret=GITHUB_TOKEN`. (humain, en dernier) révoquer l'autorisation « GitHub CLI » dans Settings / Applications / Authorized OAuth Apps et refaire `gh auth login` : le jeton `gho_` est dans Secret Manager et dans chaque révision depuis le 2026-09-02.
- piege: ne pas révoquer le `gho_` avant le déploiement des deux étapes : les révisions actives le lisent au démarrage de chaque instance, et le `gh` du poste s'arrête aussi. Un jeton fine-grained expire : `pnpm run check:iam` signale une version de secret de plus d'un an, c'est le rappel.

## DEBT-053 l'API et la sauvegarde parlent à Atlas en administrateur du cluster, le même que le poste de dev

- state: humain
- bloque: les utilisateurs Atlas et le second projet se créent dans la console Atlas (l'accès MCP est refusé au niveau de l'organisation, DEBT-009 ; le poste n'a ni `atlas` CLI ni clé d'API, et la session Chrome est déconnectée d'Atlas). Le reste est agent.
- impact: `MONGODB_URI` (version du 2026-03-19) désigne un utilisateur au rôle `atlasAdmin@admin` (celui de l'URI en place, à lire dans Secret Manager), même utilisateur et même mot de passe que `MONGODB_URI` du `.env` du poste, exposé en transcription de session avant le 2026-09-15 ; la sauvegarde lit la même URI et archive toutes les bases du cluster. La recette (`moviepicker_staging`) et la dev (`moviepicker_dev`) partagent le cluster M0 de la production (100 opérations par seconde) : une charge de recette dégrade la production.
- ou: Secret Manager `MONGODB_URI`, `STAGING_MONGODB_URI`, `MONGODB_BACKUP_URI` (créé vide le 2026-09-21) ; `.github/workflows/backup-mongo.yml` (repli sur `MONGODB_URI` avec avertissement) ; `infra/terraform/environments/production/main.tf` (`module "backup"`, `readable_secrets` porte encore `MONGODB_URI`) ; `C:\ynov\movie-picker\.env` (hors dépôt) ; console Atlas, projet de production (cluster0) et le second projet à créer
- verify: `docker run --rm mongo:8 mongosh --quiet "$(gcloud secrets versions access latest --secret=MONGODB_URI --project <PROJET_GCP>)" --eval 'print(db.runCommand({connectionStatus: 1}).authInfo.authenticatedUserRoles.map(r => r.role).join(","))'` ; encore ouvert tant que la commande imprime `atlasAdmin`
- fix: (humain) dans le projet de production, Database Access / Add new database user, mot de passe autogénéré, « Specific Privileges » : `moviepicker_api` `readWrite` sur `moviepicker`, `moviepicker_backup` `read` sur `moviepicker` ; un second projet Atlas « Movie Picker non-prod » avec un cluster M0 (AWS, eu-west-1), Network Access `0.0.0.0/0` (Cloud Run n'a pas d'IP fixe), et deux utilisateurs `moviepicker_staging` `readWrite` sur `moviepicker_staging`, `moviepicker_dev` `readWrite` sur `moviepicker_dev` ; les quatre mots de passe et l'hôte du nouveau cluster dans `Downloads\atlas-users.txt`, une ligne `nom=valeur` chacun, `host=<cluster>.<id>.mongodb.net` pour l'hôte. (agent) construire les URI (`urllib.parse.quote(mot_de_passe, safe='')`) : production `mongodb+srv://moviepicker_api:<mdp>@<HOTE_CLUSTER_PROD>/?appName=Cluster0` (l'hôte est celui de l'URI en place ; pas de base dans le chemin, l'API prend `moviepicker` par défaut), sauvegarde `mongodb+srv://moviepicker_backup:<mdp>@<HOTE_CLUSTER_PROD>/moviepicker?appName=Cluster0` (la base dans le chemin, `mongodump` la prend comme `--db`), recette `mongodb+srv://moviepicker_staging:<mdp>@<hôte>/moviepicker_staging?retryWrites=true&w=majority&appName=Cluster0&maxPoolSize=10`, dev `mongodb+srv://moviepicker_dev:<mdp>@<hôte>/moviepicker_dev?retryWrites=true&w=majority&appName=Cluster0` ; prouver chacune par `mongosh --eval` (`connectionStatus` rend le seul rôle attendu, `ping` sur sa base, un `insertOne` puis `drop` d'une collection `_rotation_probe` pour les `readWrite`, `estimatedDocumentCount` de `users` pour la lecture, et `listDatabases` refusé) ; `gcloud secrets versions add` pour `MONGODB_URI`, `MONGODB_BACKUP_URI`, `STAGING_MONGODB_URI` depuis des fichiers temporaires écrasés puis supprimés ; `MONGODB_URI=` du `.env` réécrit avec l'URI de dev ; écraser et supprimer `atlas-users.txt` ; déployer recette puis production (`target=all`), `gh workflow run backup-mongo.yml --ref master` et lire « Dump taken with MONGODB_BACKUP_URI » dans son journal ; retirer `"MONGODB_URI"` de `readable_secrets` du `module "backup"` et le repli de `backup-mongo.yml` (`infra.yml` applique, un clic) ; `gcloud secrets versions destroy` des anciennes versions de `MONGODB_URI` et `STAGING_MONGODB_URI` ; `pnpm run seed` sur la nouvelle base de dev. (humain, en dernier) supprimer l'ancien administrateur (l'utilisateur de l'URI remplacée) et `moviepicker_staging` du projet de production, et la base `moviepicker_staging` qui y reste.
- piege: une archive de sauvegarde contient aussi des secrets d'authentification, le porte-clés Data Protection (`MongoXmlRepository`, aucun `XmlEncryptor`) et les sessions. Tant que l'utilisateur de la sauvegarde est administrateur, lire une archive ne donne rien de plus que ce qu'il a déjà ; dès qu'il n'aura plus que la lecture, l'archive vaudra plus que son accès. Traiter dans le même chantier : exclure `data_protection_keys` et `auth_sessions` du dump (`--excludeCollection`, au prix d'une déconnexion générale après une restauration), ou chiffrer le porte-clés par un `IXmlEncryptor` adossé à Cloud KMS dont seule l'identité d'exécution de l'API peut déchiffrer. Ne rien supprimer côté Atlas avant que les deux étapes servent des révisions nées après les nouvelles versions : `MONGODB_URI:latest` est lu au démarrage de chaque instance, une instance déjà debout garde l'ancienne valeur jusqu'à sa fin. Un utilisateur limité à une base ne peut pas `serverStatus` ni `listDatabases` : la preuve d'accès est l'`insertOne`, pas un état du serveur. La base de recette repart vide sur le nouveau cluster, l'API y recrée index et migrations au premier démarrage.

## DEBT-054 l'apex porte deux revendications Hosting, et les quatre domaines servent encore un certificat temporaire

- state: humain
- bloque: l'enregistrement TXT vit dans la zone OVH, hors Terraform et sans CLI : sa suppression se fait dans le manager, par Chrome avec la session de l'utilisateur et son accord explicite (`infra/README.md`, section Domaines). La vérification qui suit est agent.
- impact: l'apex `movie-picker.fr` porte deux TXT `hosting-site=` (celui du site `www` et celui du site legacy, posé le 2026-09-21 avant l'`apply` du second site) et Hosting le signale en `CD_CONFLICTING_CLAIMS` (« There must be at most one TXT record with the `hosting-site=` prefix »). Le domaine sert (`HOST_ACTIVE`, `OWNERSHIP_ACTIVE`), mais les quatre domaines du projet gardent un certificat `TEMPORARY` depuis la bascule du 2026-09-20, là où Hosting le remplace par le certificat `GROUPED` du projet en quelques heures d'ordinaire ; le temporaire expire le 2026-12-19, et rien ne dit qu'il sera renouvelé tant que l'apex est en conflit. Le TXT du site legacy n'a rien prouvé : `web` est passé `OWNERSHIP_ACTIVE` quand son CNAME a visé `movie-picker-web-legacy.web.app`.
- ou: zone DNS `movie-picker.fr` chez OVH (TXT de l'apex) ; `infra/terraform/environments/production/main.tf` (`module "web_legacy"`) ; `infra/README.md` section Domaines
- verify: `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=movie-picker.fr&type=TXT' | grep -o 'hosting-site=[a-z-]*' | sort -u | wc -l` ; encore ouvert tant que la commande rend autre chose que 1
- fix: (humain) supprimer le TXT `hosting-site=movie-picker-web-legacy` de l'apex dans le manager OVH, garder `hosting-site=movie-picker-web`. (agent) une heure plus tard, lire `pnpm run terraform -- output web_dns` : `web.movie-picker.fr` doit rester `OWNERSHIP_ACTIVE` (sinon remettre le TXT et chercher pourquoi le CNAME ne suffit pas), l'apex doit perdre son `issues` (`GET https://firebasehosting.googleapis.com/v1beta1/projects/<PROJET_GCP>/sites/movie-picker-web/customDomains/movie-picker.fr` avec un jeton gcloud et `x-goog-user-project`), puis `cert_type` doit passer `GROUPED` sur les quatre domaines dans les 24 heures ; s'il reste `TEMPORARY` au 2026-10-01, ouvrir un ticket Firebase depuis la console (le certificat temporaire n'est pas renouvelé par le projet).
- piege: ne pas supprimer le TXT `hosting-site=movie-picker-web`, il prouve l'apex lui-même (A `199.36.158.100`). Ne pas sonder `web.movie-picker.fr` en boucle pendant la vérification : l'edge garde les 404 déjà servis, et seule une nouvelle release du site legacy (`gh workflow run web-legacy.yml --ref master`) purge ce cache.

## DEBT-055 l'identité de recette peut publier sur le site web de production

- state: differe
- declencheur: un second projet Firebase (ou GCP) pour la recette, ou une IAM par site chez Firebase Hosting (`roles/firebasehosting.*` ne se pose aujourd'hui que sur le projet)
- impact: l'identité CI de recette porte `roles/firebasehosting.admin` sur le projet (`infra/terraform/environments/staging/main.tf`, `module "ci"`), parce que Hosting n'a pas de rôle par site : l'identité que le job `deploy-front` de la recette assume peut créer une version et une release sur `movie-picker-web` (la production) et sur `movie-picker-web-legacy`, exactement comme l'identité de production. La frontière entre les deux étapes tient pour Cloud Run (rôle sur le seul service de recette), l'image (`writer` sur le dépôt partagé, la production ne redéploie que le digest que la recette sert) et les secrets, pas pour Hosting. Ce qui l'exploiterait : du code exécuté dans un job de l'environnement `staging` sur master, ce que le découpage de `deploy.yml` (build sans `id-token`, publication sans dépendance du lockfile) rend improbable.
- ou: `infra/terraform/environments/staging/main.tf` (`project_roles` de `module "ci"`), `infra/terraform/environments/production/main.tf` (`module "ci"`, même rôle), `.github/workflows/deploy.yml` (`deploy-front`)
- verify: `gcloud projects get-iam-policy <PROJET_GCP> --flatten='bindings[].members' --filter='bindings.role=roles/firebasehosting.admin' --format='value(bindings.members)' | grep -c staging` ; encore ouvert tant que la commande rend autre chose que 0
- fix: un projet Firebase dédié à la recette (site `movie-picker-web-staging` recréé dedans, `firebasehosting.admin` de l'identité de recette sur ce projet seul, `x-goog-user-project` du script de publication sur ce projet) ; ou, si Hosting expose un jour une IAM par site, la liaison sur le seul site de recette
- piege: un site Hosting ne se déplace pas d'un projet à l'autre : le recréer change son adresse `web.app`, donc le CNAME de `staging.movie-picker.fr` et l'URL de `verify-front` dans `deploy.yml`

## DEBT-056 le secret scanning ne vérifie pas la validité des secrets qu'il trouve

- state: humain
- bloque: `PATCH repos/<owner>/<repo>` avec `security_and_analysis.secret_scanning_validity_checks.status = enabled` répond 200 et laisse `disabled` (même comportement que `secret_scanning_non_provider_patterns`) : le réglage ne se coche que dans l'interface, Settings / Code security
- impact: une alerte de secret scanning dit qu'un jeton a été poussé, pas s'il est encore actif : sans vérification de validité, un jeton révoqué et un jeton vivant se lisent pareil, et le tri d'une alerte demande d'aller tester le jeton à la main. Gratuit sur un dépôt public. La détection des motifs hors fournisseurs (`non_provider_patterns`, mots de passe génériques, chaînes de connexion) reste elle aussi désactivée, au même endroit, à activer dans le même geste si l'interface la propose sans abonnement.
- ou: GitHub, Settings / Code security / Secret scanning (« Validity checks », « Non-provider patterns »)
- verify: `gh api repos/Affy657/Movie-Picker --jq '.security_and_analysis.secret_scanning_validity_checks.status'` ; encore ouvert tant que la commande rend `disabled`
- fix: cocher « Validity checks » (et « Non-provider patterns » si elle est proposée) dans Settings / Code security, puis rejouer `verify`
- piege: une alerte marquée « active » par la vérification est à traiter comme une fuite en cours, pas comme un rappel

## DEBT-060 aucun parcours utilisateur n'est vérifié en production

- state: differe
- declencheur: un parcours cassé en production (connexion, création de soirée, vote) découvert par un utilisateur alors que les sondes restaient vertes, ou l'ouverture du produit au-delà du cercle des premiers utilisateurs
- impact: les sondes vérifient `/health`, `/health/ready` et la page d'accueil, pas un parcours : une connexion OAuth cassée, une création de soirée en erreur ou un vote refusé ne se voient que dans Sentry, qui ne dit pas qu'un parcours entier est bloqué, ou par le premier utilisateur qui écrit. La suite Playwright `e2e/critical-flow.spec.ts` couvre ce parcours avant chaque déploiement, jamais après.
- ou: `infra/terraform/modules/monitoring/main.tf` (sondes existantes), `e2e/critical-flow.spec.ts` (le parcours à rejouer)
- verify: `grep -rlnE "synthetic_monitor|critical-flow" infra/terraform .github/workflows` ; encore ouvert tant que la commande ne rend rien (aucun moniteur synthétique décrit, aucun workflow qui rejoue le parcours)
- fix: rejouer le parcours critique contre la production à intervalle fixe, soit par un moniteur synthétique Cloud Monitoring (fonction Cloud Run qui pilote un navigateur, décrite en Terraform, alerte sur l'échec), soit par un workflow planifié Playwright avec un compte de test dédié
- piege: le compte de test écrit de vraies soirées en production : les préfixer, les supprimer en fin de parcours et les exclure des statistiques publiques ; un workflow GitHub planifié part avec plusieurs heures de retard (cron retardé d'environ cinq heures) et n'alerte que par e-mail de la plateforme
- refs: A19 de l'audit de conception du 2026-09-22

## DEBT-061 la recherche de comptes parcourt la collection `users` à chaque frappe

- state: differe
- declencheur: plus de 10 000 comptes, ou un p95 de `GET /api/v1/users/search` au-delà de 300 ms dans les journaux de requêtes
- impact: `SearchPublicAsync` fait deux requêtes par expression régulière insensible à la casse et aux accents sur `handle` et `displayName` (préfixe, puis n'importe où) ; aucune ne peut utiliser d'index, chaque recherche lit toute la collection. Les statistiques de profil, l'autre lecture en parcours complet relevée par l'audit, ont reçu leurs index le 2026-09-23 (`votes_participantId`, `seen_marks_participantId`, `movies_participantId`, `events_winners_movieId`).
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/Mongo/MongoUserRepository.cs` (`SearchPublicAsync`, `FindPublicMatchesAsync`), `apps/api-dotnet/MoviePicker.Api/Application/UseCases/SearchUsers/UserSearchPolicy.cs`
- verify: `grep -n 'new BsonRegularExpression' apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/Mongo/MongoUserRepository.cs` ; encore ouvert tant que la recherche passe par une expression régulière insensible
- fix: un champ de recherche normalisé (minuscules, sans accents) écrit avec le compte, indexé, interrogé par préfixe ancré sensible à la casse, que l'index sert ; la recherche « n'importe où » passe par Atlas Search (un index de recherche est permis sur le palier gratuit) ou disparaît
- piege: le champ s'écrit d'abord dans `AddAsync` et `UpdateAsync`, la migration de remplissage vient ensuite (règle « compatible avec la version d'avant » d'`AGENTS.md`), et la recherche ne le lit qu'une version plus tard
- refs: A18 de l'audit de conception du 2026-09-22

## DEBT-062 les sauvegardes vivent dans le projet de production

- state: humain
- bloque: créer un second projet GCP, avec sa facturation, est un geste du propriétaire du compte
- impact: les archives quotidiennes et mensuelles sont dans un bucket du projet de production : une compromission du projet (propriétaire, identité Terraform) atteint la production et ses sauvegardes d'un même geste. Depuis le 2026-09-23 l'identité de sauvegarde ne supprime plus rien hors `pending/` (liaison conditionnelle), et le versioning plus la suppression douce de 7 jours restent la seule défense contre une suppression par le propriétaire.
- ou: `infra/terraform/environments/production/main.tf` (bucket de sauvegarde, module `backup`), `.github/workflows/backup-mongo.yml`
- verify: `grep -c "google_storage_bucket\" \"backups" infra/terraform/environments/production/main.tf` ; encore ouvert tant que la commande rend 1
- fix: copier chaque archive vérifiée vers un bucket d'un second projet, en écriture seule pour l'identité de sauvegarde, avec une rétention verrouillée (`retention_policy` et `is_locked`) de 30 jours
- piege: une rétention verrouillée ne se raccourcit plus, pas même par le propriétaire, et empêche la suppression du bucket jusqu'à son terme : la poser d'abord sur un bucket d'essai
- refs: A17 de l'audit de conception du 2026-09-22, DEBT-050 (projet hors organisation)

## DEBT-064 `GetByIdOrSlugAsync` ne résout plus que le slug

- state: differe
- declencheur: la fusion de `v1.7` dans `master`
- impact: depuis le 2026-09-23, une soirée ne se trouve plus par son `ObjectId` (en partie prévisible, il ouvrait la soirée sans son lien). La méthode du port, l'extension `GetRequiredByIdOrSlugAsync`, les paramètres `idOrSlug` du front et le segment de route `{idOrSlug}` gardent l'ancien nom pour ne pas multiplier les conflits avec `v1.7`, qui ajoute ses propres appels : le nom ment.
- ou: `apps/api-dotnet/MoviePicker.Api/Application/Ports/IEventRepository.cs`, `EventRepositoryExtensions.cs`, `Infrastructure/Persistence/Mongo/MongoEventRepository.cs`, `Infrastructure/Persistence/InMemory/InMemoryEventRepository.cs`, `Controllers/EventsController.cs`, `Controllers/EventMoviesController.cs`, une quarantaine de fichiers de test ; `apps/web/src/features/events/api/eventsApi.ts`
- verify: `grep -rln "ByIdOrSlug" apps/api-dotnet --include=*.cs | grep -v /obj/` ; encore ouvert tant qu'il rend un fichier
- fix: renommer en `GetBySlugAsync` et `GetRequiredBySlugAsync`, `idOrSlug` en `slug` partout, y compris le segment de route, puis `pnpm run openapi:export` et `pnpm run openapi:types`
- piege: renommer le segment de route change les clés de `paths` dans le contrat OpenAPI, donc le schéma généré et `apiContract.test.ts` côté front ; les faire dans le même commit. La fusion de `v1.7` apporte aussi une trentaine de chemins d'API construits sans `apiPath` (dont `setMovieRating` et `deleteMovieRating` de `moviesApi.ts`) : les convertir dans le même geste, `grep -rln '/events/\${' apps/web/src --include=*.ts | grep -v test` ne doit plus rien rendre.

## DEBT-065 l'inscription ne vérifie pas que l'adresse e-mail appartient à l'inscrit

- state: humain
- bloque: décision produit, une confirmation d'adresse à l'inscription (courriel de confirmation, compte limité tant qu'il n'est pas confirmé)
- impact: n'importe qui peut ouvrir un compte à mot de passe sur l'adresse d'un tiers. Le vrai titulaire ne peut alors ni s'inscrire ni se connecter par Google ou GitHub (`account_exists`) tant qu'il n'a pas repris le compte par « mot de passe oublié », et le badge Ko-fi, attribué par adresse, peut aller au squatteur. Pas de prise de compte : la connexion OAuth ne fusionne jamais un compte à mot de passe, et la réinitialisation coupe sessions, identités liées et abonnements push de l'occupant.
- ou: `apps/api-dotnet/MoviePicker.Api/Application/UseCases/Auth/RegisterUserHandler.cs`, `Application/UseCases/Auth/OAuth/OAuthLoginHandler.cs` (`PasswordAccountRequiresManualLink`), `Application/UseCases/Donations/ProcessKofiWebhookHandler.cs`
- verify: `grep -c "EmailVerified" apps/api-dotnet/MoviePicker.Api/Domain/Entities/User.cs` ; encore ouvert tant que la commande rend `0`
- fix: un `EmailVerifiedAt` sur `User` et un courriel de confirmation (même mécanique de jeton que la réinitialisation) ; côté OAuth, un e-mail vérifié par le fournisseur qui tombe sur un compte non confirmé vaut preuve de possession : purger mot de passe, identités, sessions et abonnements push de l'occupant au lieu de refuser ; ne pas attribuer le badge Ko-fi à une adresse non confirmée
- fini-quand: un compte non confirmé ne peut plus bloquer l'adresse d'un tiers


---

# Contraintes

Ce qui casse en silence si on y touche sans savoir. Aucune n'est une tâche.

## C1 le déploiement API promeut, il ne revient pas en arrière

`deploy.yml` : `gcloud run deploy --no-traffic --tag "s-<sha7>"`, sondes `/health` et `/health/ready` sur l'URL taguée, `update-traffic --to-latest` seulement si vert, `--remove-tags` en `if: always()`. **Ne pas réintroduire de retour arrière automatique** : la première version en avait un, avec deux défauts sans signal rouge. `update-traffic --to-revisions REV=100` épingle le trafic (retire `latestRevision: true`) et rien ne le rebranchait : chaque déploiement suivant aurait créé une révision à 0 % pendant que les smoke tests, servis par l'ancienne révision, restaient verts. Et il visait `status.latestReadyRevisionName`, la dernière révision prête et non celle qui sert : un second retour arrière aurait basculé sur la révision déjà jugée mauvaise. `--to-latest` désépingle aussi un service figé par `rollback.yml`, qui ne sert que les régressions constatées après coup.

## C2 les trois conditions de la coquille de démarrage

Le titre de l'accueil est peint dans `apps/web/index.html`, dans l'écran de démarrage, uniquement sur `/` (performance 80 vers 95, LCP 4,2 s vers 2,3 s). Casser une condition annule le gain sans erreur :

1. **L'écran de démarrage couvre toute la page** (`position: fixed; inset: 0`, fond opaque) et n'est retiré qu'après `createRoot().render()` : rien de ce qui est peint dessous ne compte comme LCP tant qu'il est là.
2. **La boîte du titre de la coquille reste au moins aussi grande que celle du `<h1>` réel** : Chrome ne remplace un candidat LCP que par un plus grand. Même police calculée des deux côtés (`700 32px / 51.2px Overpass`), 51 px de haut, 520 px de large contre 488. Toucher `font-size`, `line-height`, `max-width` ou le texte d'un seul côté fait repasser le LCP après le montage.
3. **Les styles de l'entrée sont en ligne dans le document** (`inlineBlockingStyles`, `apps/web/vite.config.ts`), donc Overpass est déclarée avant la peinture de la coquille. Les repasser en feuille liée ou différée ramène une substitution de police tardive et un nouveau candidat LCP après le montage ; mesuré : 1 point perdu sur six pages, rien gagné sur `home`.

Les trois préchargements de police portent `fetchpriority="low"` : à priorité haute, 53 Ko partaient dans la première vague devant `react-vendor`. Remesurer `home` après y avoir touché.

## C3 deux duplications volontaires, gardées par un test

La configuration de build ne peut pas importer `src/` : `activeLocalePreloadScript` (`apps/web/vite.config.ts`) et le script de `index.html` (pour `<html lang>`) réécrivent la clé `moviepicker-locale`, la liste des langues et la langue par défaut, et `index.html` duplique le titre de l'accueil et `home.seoTitle`. `apps/web/src/startShell.test.ts` compare ces chaînes aux locales. Si `preferredLocale()` change, changer les deux copies.

La langue ne se lit **jamais** dans `navigator.language` : sans choix mémorisé, l'application est en français. Googlebot rend le JavaScript en `en-US`, et la détection faisait indexer l'accueil et les profils en anglais, contre le prérendu, `og:locale` et le sitemap.

## C4 ne pas renommer les chunks que le préchargement cherche

`preloadCriticalAssetsPlugin` (`apps/web/vite.config.ts`) cherche `App-[hash].js`, `App-[hash].css` et `i18n-[hash].js` : un regroupement qui les renomme ou les absorbe fait disparaître les préchargements en silence. `@sentry`, `posthog-js`, `canvas-confetti`, `react-qr-code` sont chargés à la demande : un chunk partagé avec du code eager les rendrait eager. Le même plugin met la feuille de l'entrée en ligne (C2) et publie `dist/route-assets.json`, indexé par nom de chunk (`DonatePage`, ...), lu par `apps/web/scripts/prerender.mjs` ; renommer un composant de page fait échouer le build avec le nom cherché.

Le découpage passe par `output.codeSplitting.groups` (rolldown) : `manualChunks` est ignoré dès que `codeSplitting` est posé, et `experimentalMinChunkSize` n'existe pas sous Vite 8. Le groupe `App` est alimenté par `appShellClosurePlugin` (fermeture statique de `src/app/App.tsx`), ce qui vide la première vague de six petits chunks ; un module importé par la coquille atterrit dans `App-[hash].js` même s'il est aussi importé par des pages, c'est voulu. Le groupe `react-vendor` exclut `VENDORS_LOADED_ON_DEMAND`, parce que `@sentry/react/` contient `/react/`.

## C5 le bucket de sauvegarde contient des données personnelles

Bucket MongoDB (europe-west1, versioning, suppression à 30 jours, nom dans `backup-mongo.yml`) : accès public interdit, accès uniforme, archive jamais publiée en artefact GitHub. La vérification prouve que l'archive se restaure, pas qu'elle est cohérente entre collections (en-tête de `backup-mongo.yml`).

## C6 le front reste sur Firebase Hosting, l'autre cible GCP sort du palier gratuit

Depuis le 2026-09-20 : `www.movie-picker.fr` sur Hosting (`google_firebase_hosting_site`, `google_firebase_hosting_custom_domain`, module `web-hosting`), `web.` et l'apex en `301`, `deploy-front` ne publie que là, compte AWS vide hors un utilisateur IAM dédié à la CLI du poste. L'autre cible, **Cloud Storage + Cloud CDN derrière un load balancer**, facture sa règle de transfert à l'heure sans palier gratuit (≈ 18 $/mois avant le moindre octet) et ferait sortir du « 0 €/mois » suivi au Bloc 3 sans alerte avant la facture. Hosting reste gratuit sous 10 Go stockés et 360 Mo/jour (trafic ≈ 500 requêtes/jour) ; un dépassement facture à l'octet, sans coupure. La migration visait la consolidation, pas l'économie (CloudFront offrait 1 To/mois) : un palier plus large ailleurs n'est pas une raison d'y revenir. La CI s'authentifie par OIDC (`.github/actions/gcloud-auth/action.yml`, prouvé par `cloud-auth-check.yml`), sans identifiant statique.

Pour un domaine déjà servi ailleurs : demander le certificat avant de bouger le DNS (défi ACME servi depuis l'ancien hébergement, `infra/README.md`, section Domaines) ; recréer la sonde d'uptime sur le nouveau domaine (elle n'accepte que du 2xx, un `monitoredResource` ne se modifie pas) ; relever ce que le dépôt doit perdre par `grep -rin aws`, pas sur une liste écrite d'avance.

## C7 le dépôt est public depuis le 2026-09-10, et son historique entier avec lui

Chaque commit jamais poussé, les 86 PR et les 7 tickets sont lisibles ; un `git rm` ou un retour en privé n'y change rien. Audit du 2026-09-10 sur les 1 003 commits, PR et tickets, **à ne pas rejouer** : aucun secret (`gitleaks` sur l'historique complet : quatre `curl-auth-user` de documentation ; recherches vides pour `GOCSPX-`, `re_`, `sq[pau]_`, `ghp_`/`github_pat_`, `AKIA`, `AIza`, PEM, `mongodb+srv` avec mot de passe, JWT ; aucun `.env` versionné), aucune donnée personnelle dans les captures du dossier de titre ni les tickets. La porte `gitleaks` de la CI tourne en mode `dir` et ne couvre jamais l'historique.

Publié sciemment, ne pas y revenir comme si c'était un oubli :

1. Le courriel personnel de l'auteur est l'adresse de 916 commits sur 1 003. Réécrire l'historique changerait tous les SHA et casserait les liens des PR pour une adresse déjà publiée. `user.email` est posé en `noreply` en local sur ce dépôt ; un clone neuf hérite de la configuration globale, à reposer.
2. `archive/docs/_ynov/` (consigne de module) est publié. Le dossier du titre (`archive/docs/RNCP/`, livrables notés et slides) a été retiré de l'arbre le 2026-09-22 et exporté en PDF hors dépôt : il reste lisible dans l'historique, ce qui est sans conséquence, l'audit ci-dessus n'y a trouvé aucune donnée personnelle.
3. Les branches distantes sont visibles : `master`, la branche de version en cours, `feedback-attachments` (où `GitHubIssueClient` publie les captures jointes aux signalements, lisibles via `raw.githubusercontent.com`) et les branches Dependabot de passage. Les branches de worktree restent locales.
4. Les journaux et artefacts des runs Actions sont publics. Aucun `set -x` ni `echo` de secret dans les workflows ; `playwright-traces` et `playwright-traces-mongo` (corps de requêtes et cookies) n'existent que sur un run rouge et vivent 7 jours, `sbom-api` (`deploy.yml`, étape de recette) 30 jours. Ne pas allonger ces rétentions.

Traité le 2026-09-10, ne pas refaire : identifiants d'infrastructure remplacés par des gabarits `<COMME_CECI>` (table dans `infra/README.md`) ; aucune contribution externe sans geste de l'auteur (`CONTRIBUTING.md`, licence, jobs d'entrée de `ci-cd.yml` conditionnés par `head.repo.fork != true`, ce qui n'est qu'un confort : la vraie barrière est l'approbation `all_external_contributors` ci-dessous, et `rollback-front.yml` ne republie que les archives d'un run de `deploy.yml` sur `master`) ; `SECURITY.md` détourne les failles vers un canal privé.

Réglages posés le même jour, à vérifier et non reposer :

| Réglage | Valeur | Vérification |
|---|---|---|
| approbation des PR de contributeurs externes | `all_external_contributors` | `gh api repos/<DEPOT>/actions/permissions/fork-pr-contributor-approval` |
| secret scanning et push protection | activés | `gh api repos/<DEPOT> --jq .security_and_analysis` |
| signalement privé de vulnérabilité | activé | `gh api repos/<DEPOT>/private-vulnerability-reporting` |
| CodeQL, configuration par défaut | `configured` | `gh api repos/<DEPOT>/code-scanning/default-setup` |
| épinglage des actions par SHA | obligatoire | `gh api repos/<DEPOT>/actions/permissions` |
| `master` : ni force push ni suppression | ruleset actif | `gh api repos/<DEPOT>/rulesets` |

`approval_policy` n'accepte que des valeurs en minuscules, et le ruleset n'exige aucun contrôle de statut : en exiger un casserait la poussée directe, un commit tout juste poussé n'ayant encore aucun run. Le projet SonarCloud est public depuis le même jour (fin du plafond de 50 000 lignes, donc de l'exclusion de `app/pages/tech/`), ses constats aussi. Le fork ne se désactive pas sur un dépôt public, et les tickets restent ouverts à tous (GitHub ne sait que les geler 6 mois ou les désactiver en bloc).

## C8 jamais d'`await` de premier niveau dans `main.tsx`

`apps/web/src/main.tsx` termine par `boot()`, une fonction synchrone qui lance le montage et en attrape les erreurs dans sa chaîne de promesse : la coquille tombe et Sentry démarre dans un `finally`, que le montage réussisse ou non. Un `await` de premier niveau rend l'évaluation du module d'entrée asynchrone et retarde tout le montage de React : posé le 2026-09-09, il a coûté 3 à 5 points Lighthouse sur onze pages sur treize. Sonar réclame ce `await` (`typescript:S7785`) pour toute chaîne de promesse et tout appel de fonction `async` écrits au premier niveau du module, `void boot()` compris : la chaîne vit donc dans `boot`, qui n'est pas `async`. Ne remonter ni la chaîne ni un `async` au premier niveau.

Signature du diagnostic pour toute régression de ce type : `home` et `login` ne bougent pas, les onze autres perdent, parce que ce sont les deux pages dont le plus grand élément n'attend pas React (titre peint dans la coquille pour `home`, LCP adossé à une ressource pour `login`). Une régression qui épargne ces deux pages est dans le chemin de montage. Pour l'attribuer à un commit, la porte ne tournant qu'au déploiement, relever le score sur les runs passés :

```bash
for ID in $(gh run list --workflow ci-cd.yml --limit 30 --json databaseId --jq '.[].databaseId'); do
  J=$(gh run view "$ID" --json jobs --jq '.jobs[]|select(.name|startswith("Lighthouse"))|.databaseId')
  [ -n "$J" ] && gh api "repos/<DEPOT>/actions/jobs/$J/logs" | grep -E " performance:"
done
```

Une porte qui ne tourne pas (blocage de facturation ce jour-là) ne protège de rien, et son silence ressemble à du vert.

## C9 l'état déconnecté d'une route protégée se rend depuis la coquille

`apps/web/src/app/components/SessionGate.tsx` enveloppe `/my-events`, `/watchlist`, `/notifications` et `/new` : quand `hasSessionHint()` est faux, il rend `SignedOutState` sans jamais rendre l'élément de page, donc `React.lazy` ne demande pas le chunk de la route. Les pages n'ont plus de branche `!user` ni `authCheckFailed` ; `SessionGate.test.tsx` compte les rendus. Gain sur le runner (médiane de 5 passes) : `watchlist` 85 vers 95, `my-events` 88 vers 95, `notifications` 94 vers 95, `new` 91 vers 94. Le LCP déconnecté attendait le chunk de la page et son évaluation (40 requêtes, 150 Ko sur `watchlist` pour une phrase), et le simulateur multiplie par 4 le travail du fil principal : précharger le chunk n'aurait rien rendu (I2).

Deux pistes de coquille restent mortes : peindre le titre de page échoue sur la taille (C2, `h1` de 2 900 px² contre 16 500 à 24 050 pour le paragraphe déconnecté) ; peindre le message déconnecté l'afficherait à chaque arrivée d'un utilisateur connecté, le cookie étant HttpOnly. Un squelette gris n'est pas un candidat LCP.

1. **Le discriminant est `hasSessionHint()`, pas `isLoading`** : au premier rendu la requête de session est `isLoading` même sans session possible, et rendre les enfants suffit à déclencher l'import du chunk, avec un affichage juste et une mesure inchangée. `fetchAuthMeForSession` rend `null` sans requête quand l'indice est absent.
2. **Une page dont l'état déconnecté rend autre chose qu'un `SignedOutState` n'entre pas dans ce portail** : `/settings` rend `GuestPreferencesSection`, une fonctionnalité pour visiteur anonyme.

## C10 Sentry se charge à la première interaction ou dix secondes après `load`

`apps/web/src/main.tsx` monte React puis `scheduleSentryStart()` : le SDK (475 Ko brut, 154 Ko sur le fil) part à la première interaction (`pointerdown`, `keydown`, `touchstart`, `wheel`) ou dix secondes après `load`, au premier temps libre du fil principal, jamais avant `createRoot().render()`. Mesuré dans les deux autres positions : au premier temps libre après le montage, il partait à 166 ms devant les requêtes de données et retardait le LCP des pages qui attendent l'API (`profile` 97 vers 83, `register` 90 vers 84, sous le plancher de 85, signature de C8) ; à 1,5 s après `load`, le LCP revenait mais le TBT passait de 106 à 712 ms. Le coût du SDK se paie en LCP ou en TBT, la seule sortie est après la fenêtre de mesure. Avant, `boot()` faisait `await initSentry()` avant `import('@/app/App')` : dépendances de la coquille à 1,29 s au lieu de 0,92 s.

1. **Les erreurs d'avant le SDK ne sont pas perdues** : `captureException` les met en file et `initSentry` les rejoue. Ne pas remplacer la file par un `if (!api) return`.
2. **La porte Lighthouse construit avec un DSN factice** (`SENTRY_STUB_DSN` dans `scripts/lighthouse-run.mjs`, enveloppes acceptées sur `/api/1/envelope/`). Sans lui, `initSentry` retourne immédiatement et la porte mesure un démarrage que la production ne suit pas ; c'est ainsi que le `await` est resté invisible pendant des mois.

`wrapReactRouterRouting` a disparu (il exigeait le SDK avant l'évaluation d'`App`) ; `browserTracingIntegration()` suffit, les transactions portent l'URL brute, sans conséquence à 10 % d'échantillonnage.

## C11 la suite Vitest tourne seule

`scripts/verify-local.cjs` joue toutes les portes sauf Vitest en trois voies concurrentes (node, dotnet, docker), puis la suite front seule ; seule la voie docker peut déborder dessus (téléchargement de la base Trivy, réseau pur). Au calme la suite tient en ≈ 230 s ; sous charge elle est montée à 2 987 s et produit du rouge sans rapport avec le code : `Failed to start forks worker`, `Test timed out in 25000ms` sur `a11y.test.tsx > TechPage` (4 à 5 s au calme, 43 à 85 s sous charge), `Timeout waiting for worker to respond`. D'où `maxForks: 2` et le budget axe de 60 s sur la page la plus lourde.

1. Ne rien lancer d'autre pendant la suite : ni serveur de dev, ni Browser pane, ni `dotnet build`. Un serveur Vite allumé l'a fait passer de 238 à 332 s et sauter `TechPage`.
2. Ne pas remettre les tests .NET, le lint ou le format en parallèle de Vitest dans `verify-local.cjs`.
3. Ne pas baisser `HEAVIEST_PAGE_AXE_BUDGET` (60 000 ms) : la marge de 14× garde la suite verte sous contention.

Un vrai échec cite un nom de test et une assertion ; une famine cite un nom de fichier. Comparer les durées avec un run de référence (`git checkout --detach HEAD~1`) : si des pages sans rapport ralentissent du même facteur, c'est la machine.

## C12 pool Mongo × instances Cloud Run ≤ connexions du cluster

Pool de 20 connexions par instance (`DefaultMaxConnectionPoolSize`, `ServiceCollectionExtensions.cs`, gardé par `AddMoviePicker_MongoClientPool_FitsEveryCloudRunInstanceUnderTheClusterConnectionCap`), 5 instances de production au plus (`max_instance_count`, `infra/terraform/environments/production/main.tf`, jamais écrit par `deploy.yml`), soit 100 connexions ; la recette partage le cluster avec 2 instances et `maxPoolSize=10` dans son URI (`infra/terraform/environments/staging/main.tf`), jusqu'à ce que DEBT-053 la déplace ; le cluster en accepte 500, dont une centaine à laisser aux opérateurs, à la sauvegarde nocturne et à la dev. Monter l'un sans baisser l'autre casse en silence : les instances au-delà du budget échouent à se connecter, la readiness passe rouge et l'alerte « base injoignable » part alors que la base va bien, le jour de charge.

`MongoUrl.MaxConnectionPoolSize` vaut 100 quand la chaîne ne dit rien, jamais 0 : un `if (url.MaxConnectionPoolSize == 0)` ne s'applique jamais, et la prod a tourné à 100 par instance. Une chaîne qui porte `maxPoolSize=` garde sa valeur.

## C13 `UpdateAsync` écrit les champs connus, il ne remplace pas le document

`MongoEventRepository.UpdateAsync` et `MongoUserRepository.UpdateAsync` passent par `KnownFieldsUpdate.From(doc)` (`$set` des champs sérialisés, `$unset` des champs mappés absents), jamais `ReplaceOneAsync`. Les documents portent `BsonIgnoreExtraElements` : une révision qui ne connaît pas un champ le lit sans erreur, et avec `ReplaceOne` l'effaçait à sa prochaine écriture (`Winners`, `Recurrence`, `EventTemplates`, `IsWatchlistPublic` perdus à chaque retour de la V1.6 vers la V1.5). Tests : `*_KeepsTheFieldsWrittenByANewerApiVersion` et `*_ClearingAnOptionalField_RemovesItFromTheDocument` de `RepositoryContractTests`. Revenir à `ReplaceOneAsync` rend `rollback.yml` destructif sans qu'aucun test d'API ne le voie ; revenir vers une révision antérieure au 2026-09-15 efface encore.

## C14 une session révoquée reste valable jusqu'à 30 s sur les autres instances

`AuthTicketCache` (`Infrastructure/Web/CachedAuthTicketStore.cs`) garde chaque ticket 30 s en mémoire d'instance, et `MongoAuthSessionInvalidator` n'invalide que l'instance qui traite la révocation. « Déconnecter partout », un changement de mot de passe ou la suppression du compte laissent donc au plus 30 s sur les autres instances : accepté, et hors périmètre dans `SECURITY.md`. Ne pas allonger le TTL (la fenêtre suit) ni le supprimer (retour à une lecture Mongo par requête) ; si la fenêtre devient inacceptable, un compteur de génération par utilisateur dans `ISharedCache`, au prix d'un aller-retour par requête authentifiée.

## C15 le prérendu sert l'indexation et le premier rendu, et deux choses le rendent muet

`apps/web/scripts/prerender.mjs` (règles dans `AGENTS.md`) ne touche jamais le réseau : `fetch` y reste en attente, une page qui interroge l'API (`/films/tendances`, `/films/au-cinema`, `/films/les-plus-proposes`, `/films/collections`) livre son en-tête, son `<h1>` et son état de chargement ; prérendre les données rendrait le build dépendant de l'API de production. Une route `noindex` n'en tire que le premier rendu et le déclare dans `PRERENDERED_FOR_FIRST_PAINT_ONLY` (`/mentions-legales`, `/politique-de-confidentialite`) ; le prérendu renforce leur `noindex`, la coquille SPA ne portant aucune balise `robots`.

1. **Le document prérendu porte les styles de sa route en ligne**, lus dans `dist/route-assets.json` (C4), concaténés de la coquille à la page. Sans eux le contenu peint sans styles, se remet en page à l'arrivée du chunk et Chrome retient ce second rendu comme LCP (`/soutenir`, `elementRenderDelay` de 585 ms sur un document complet). En feuille liée : 1 point perdu sur `donate` et `privacy`.
2. **`scripts/lighthouse-run.mjs` réécrit ces routes vers leur fichier prérendu**, parce que Hosting sert chaque route prérendue comme un fichier à part (`<route>/index.html`, déposé par `scripts/publish-front-firebase.mjs`, la coquille ne répondant aux autres chemins que par le repli `**` de `infra/firebase-hosting.json`) ; sans la réécriture, `serve` rend la coquille et la porte mesure une page que personne ne reçoit. `serve-handler` applique ses réécritures en cascade, donc le repli est écrit en négation (`!/prerendered/**`) et `--single` n'est pas passé, il insère son propre `**` en tête.

---

# Impasses

Mesuré, sans gain, retiré. Ne pas rejouer sans une raison neuve.

- **I1 regrouper `shared/` en un chunk** : divise les requêtes par deux (76 vers 43 sur `watchlist`), 0 point, et `register` passe de 87 à 84 sous son plancher parce que la couche entière (92 Ko) devient eager. Mesurer les pages légères autant que les lourdes.
- **I2 précharger le chunk de la route d'accueil sur `/`** : 0 point, le LCP n'attend pas les 9 Ko du chunk, il attend React.
- **I3 découper le bundle pour sauver le LCP** : les 185 Ko d'i18n sortis du chemin critique rendent 1 point, des chaînes s'analysent vite. Le mur est `react-vendor` (220 Ko, 665 ms de bootup) et ne se contourne pas par le bundling ; le seul levier est de sortir le plus grand élément du rendu React (C2, C9).
- **I4 desserrer la porte Lighthouse** (seuil, page retirée, non bloquante) : le déficit est réel, et c'est cette porte qui a détecté que la production ne se déployait plus.
- **I5 `mongodump --oplog`** pour la cohérence transactionnelle : impose un dump de l'instance entière et des droits supplémentaires.
- **I7 zizmor au seuil `low`** : 9 constats cosmétiques ; `medium` est vert et n'attrape que du sérieux.
- **I8 espacer les workflows planifiés** : les crons coûtent ≈ 51 min/mois (dont ≈ 45 pour la sauvegarde nocturne) contre ≈ 450 pour la CI. Espacer la sauvegarde à deux jours économiserait 22 min/mois en doublant le point de restauration acceptable sur des données non reconstituables.
- **I9 annoncer d'avance la fermeture des imports statiques de la coquille** (`modulepreload` sur six chunks de plus) : les douze pages dont le LCP vient de React gagnent 1 point, `home` et `profile`, dont il n'en vient pas, perdent 2 et 8 (retiré, `profile` repasse de 88 à 97). Avant d'ajouter quoi que ce soit à la première vague, regarder les pages dont le LCP n'attend pas React.
- **I10 regrouper les petits modules partagés en chunks « entries-aware »** (rolldown `codeSplitting.groups`, `entriesAware: true`) : à 12 Ko de seuil, `login` passe de 111,7 à 141,9 Ko brotli et la première vague de 5 à 16 fichiers (I9) ; à 3 Ko, `my-events` prend 14 Ko et `home` 8. Seul gain sans perdant : la fermeture statique de `App` dans son chunk (`appShellClosurePlugin`, 6 à 7 fichiers et 3 à 4 Ko de moins par page).
- **I11 accélérer la suite Vitest** : 60 % du temps est la recréation de jsdom par fichier, et l'isolation est obligatoire (19 fichiers avec `vi.mock`). Sans effet : plus de forks, `pool: threads`, environnement `node` pour la logique pure. Rejeté : `--no-isolate` (5× plus rapide, casse 147 tests), happy-dom (-30 %, casse 3 tests, diverge de la CI). Reste à mesurer au calme : `maxForks` 2 vers 4.
- **I12 rapprocher le cluster Atlas (AWS eu-west-1) de Cloud Run (europe-west1)** : 60 sondes `/health/ready` en production, p50 6 ms, p90 9 ms. Un cluster GCP gagnerait au plus 5 ms par opération et ≈ 30 ms par cycle de sondage, contre une migration avec interruption. Le temps va à TMDB (DEBT-005) et au nombre d'allers-retours (DEBT-008).
