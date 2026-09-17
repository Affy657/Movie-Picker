# Dette technique

Fichier de travail pour agent. Il n'est pas destiné à être lu par un humain : il existe pour qu'une session future puisse reprendre une dette sans contexte préalable.

## Protocole

1. Avant d'agir sur une entrée, exécuter son `verify`. Ce fichier vieillit ; **sauf mention contraire dans l'entrée**, une sortie signifie « encore ouvert » et une sortie vide signifie « déjà réglé, supprimer l'entrée sans rien faire d'autre ». Une entrée qui demande de lire un nombre plutôt qu'une présence le dit dans son `verify`.
2. Une entrée `state: agent` peut être traitée en autonomie. `state: humain` demande un geste que l'agent ne peut pas faire (le champ `bloque` dit lequel). `state: differe` ne se traite pas tant que son `declencheur` n'est pas observé.
3. Fin de traitement : supprimer l'entrée entière. Ne pas la cocher, ne pas la garder en « fait », git porte l'historique.
4. Nouvelle entrée : reprendre exactement le schéma de champs ci-dessous, avec un identifiant `DEBT-NNN` jamais réutilisé. Prochain libre : `DEBT-042`.
5. Ce fichier ne contient que de la dette, c'est-à-dire du code ou de l'infrastructure qui existe et fonctionne moins bien qu'il ne devrait. Une feature à construire va dans `roadmap.md`.
6. **Aucun identifiant d'infrastructure ici** : pas d'adresse de compte de service, pas de nom de bucket, pas d'identifiant de compte. Le dépôt a vocation à devenir public, et une faiblesse décrite avec sa cible se lit comme un mode d'emploi. Nommer le fichier ou la console où l'identifiant se relève, ou employer un espace réservé `<COMME_CECI>` dans les commandes. La table des gabarits, et la commande qui relève chaque valeur, sont dans `infra/README.md`.
7. Deux sections en fin de fichier n'obéissent pas à ce schéma et ne se traitent jamais : **Contraintes** liste ce qui casse en silence si on y touche, **Impasses** liste ce qui a déjà été essayé et mesuré sans gain. Les lire avant d'optimiser quoi que ce soit sur le front ou de toucher au déploiement.

Schéma : `state` / `impact` / `ou` / `verify` / `fix` / `fini-quand` / `piege` / `refs`. Champs absents = sans objet.

---

## DEBT-005 enrichissement TMDB sur le chemin sondé

- state: differe
- declencheur: une latence p95 de la liste de films qui suit les incidents TMDB
- impact: la liste d'une soirée dépend de TMDB à chaque cycle de sondage, soit toutes les 3,5 s par participant
- ou: `apps/api-dotnet/MoviePicker.Api/Application/UseCases/ListMovies/ListMoviesForEventHandler.cs:180` (`BuildEnrichmentMapAsync`), appelé depuis `:123`
- verify: `grep -n "BuildEnrichmentMapAsync" apps/api-dotnet/MoviePicker.Api/Application/UseCases/ListMovies/ListMoviesForEventHandler.cs` ; encore ouvert tant que l'appel est dans le chemin de lecture
- fix: figer l'enrichissement sur le document du film au moment de l'ajout, le rafraîchir hors requête
- piege: le timeout de 3 s et le cache négatif déjà en place **bornent** le pire cas, ils ne l'enlèvent pas. Ne pas conclure que c'est réglé en les voyant.

## DEBT-006 cache en mémoire local à l'instance

- state: differe
- declencheur: la mise à l'échelle devient routinière au lieu d'être exceptionnelle
- impact: Cloud Run monte jusqu'à `maxScale 20`, donc jusqu'à 20 caches froids indépendants. Depuis le 2026-09-14, les sélections de la home, les collections et l'enrichissement TMDB passent par `ISharedCache` (Mongo, collection `shared_cache`, index TTL) en second niveau : une instance neuve relit ces snapshots au lieu de refaire le fan-out TMDB, mesuré à 6 à 10 s par requête dans les logs. Le reste des `IMemoryCache` (recherche TMDB, détails) reste local.
- ou: `Infrastructure/Tmdb/TmdbMovieSearch.Details.cs` et `TmdbMovieSearch.Search.cs` pour ce qui reste en mémoire seule ; `Application/Caching/SharedCacheReadThrough.cs` pour le modèle à réutiliser
- verify: `grep -rln IMemoryCache apps/api-dotnet --include=*.cs`
- fix: passer les caches restants par `SharedCacheReadThrough`, ou un cache hors processus dédié
- piege: `min-instances` reste à 0, donc le démarrage à froid de l'API (3,5 s en prod, 0,7 s en local avec ReadyToRun) subsiste. Le poser à 1 coûte environ 8 à 10 $ par mois : décision de l'utilisateur, jamais de l'agent. Deux règles du cache partagé à ne pas casser : seules les clés de catalogue (sections à liste fermée, au plus un genre) sont écrites dans Mongo, parce que `recommendations`, `collection` et les combinaisons de genres ouvrent un espace de clés illimité à 24 Ko le document sur un palier Atlas de 512 Mo ; et chaque famille de clés porte une version (`showcase-v1`, `showcase-collections-v1`, `tmdb-enrich-v2`) à incrémenter quand le DTO sérialisé change, sinon les instances relisent d'anciens documents pendant tout le TTL après un déploiement.
- refs: même racine que DEBT-007 et DEBT-008, la contrainte Cloud Run

## DEBT-007 affiches servies en octets depuis Mongo à travers Cloud Run

- state: differe
- declencheur: la ligne de sortie réseau devient visible sur la facture GCP
- impact: chaque affiche traverse Cloud Run au lieu d'un CDN. CloudFront ne couvre que le front, pas `api.movie-picker.fr`.
- ou: `apps/api-dotnet/MoviePicker.Api/Controllers/PostersController.cs`
- verify: `grep -n 'return File(' apps/api-dotnet/MoviePicker.Api/Controllers/PostersController.cs` ; encore ouvert tant que la ligne sort, le binaire part de la base à travers Cloud Run
- fix: stockage objet plus CDN devant
- piege: `Cache-Control: public,max-age=86400,immutable` et l'ETag sont déjà posés, le trafic est donc déjà amorti côté navigateur. Le coût restant est la sortie réseau, pas le nombre de requêtes. Mesuré le 2026-09-15 : `poster_cache` fait 31,5 Mo sur les 32,3 Mo de données de la prod (564 affiches, ~56 Ko pièce), c'est la seule courbe de croissance de la base. Jusqu'à ce jour la collection ne se purgeait jamais, `expiresAtUtc` n'étant lu qu'à la lecture ; l'index TTL `poster_cache_expiresAtUtc_ttl` (30 jours glissants) borne désormais la taille au nombre d'affiches vues dans le mois.

## DEBT-008 le sondage à 3,5 s fixe le plafond de la base

- state: differe
- declencheur: approcher la moitié du plafond d'opérations du palier Atlas, soit 50 opérations par seconde sur le M0 présumé (DEBT-009) : deux soirées de 6 en sondage actif au même moment y sont
- impact: environ 15 allers-retours Mongo par cycle et par participant **quand la soirée a bougé depuis le cycle précédent**, soit environ 26 opérations par seconde pour une soirée de 6 en pleine activité, et environ 260 à 10 soirées simultanées. Depuis le 2026-09-15, un cycle où rien n'a changé coûte 2 lectures (une par route sondée, `EventViewTagHandler`) et rend 304 : le chiffre ci-dessus est le pire cas, plus la moyenne. Plafond du palier : 100 opérations par seconde sur le M0 présumé (500 sur Flex, DEBT-009), au-delà duquel Atlas met les opérations en file.
- verify: `grep -n EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS apps/web/src/features/events/hooks/useEventLive.ts` ; encore ouvert tant que la constante existe, c'est-à-dire tant qu'on sonde
- fix: passer en SSE
- piege: ce n'est pas un défaut. Le sondage reste le bon choix aujourd'hui, zéro infrastructure et Cloud Run n'aime pas les connexions longues. C'est le paramètre qui fixe la limite, à ne changer que sur le déclencheur. Le 304 tient à une règle non outillée, écrite dans `AGENTS.md` : toute mutation de la vue soirée fait bouger `writeSeq` (`UpdateAsync`, `LockForWriteAsync` ou `MarkChangedAsync`), sinon les clients en sondage gardent l'ancienne réponse jusqu'à la minute suivante.
- refs: DEBT-033 porte la conception du remplacement et le plafond produit qui dépend de cette limite

## DEBT-009 palier Atlas jamais confirmé

- state: humain
- bloque: l'accès MCP Atlas est désactivé pour les deux organisations du compte (refusé le 2026-09-15 encore), un Organization Owner doit activer l'accès client IA dans les réglages de l'organisation ; et la console Atlas est refusée à l'agent même par l'extension Chrome
- impact: les limites par palier sont connues depuis le 2026-09-15 (documentation Atlas) : **M0** 100 opérations par seconde, 0,5 Go, 500 connexions, 10 Go de transfert par semaine glissante ; **Flex** 500 opérations par seconde, 5 Go, 500 connexions. Tout indique un M0 (cluster `cluster0`, DEBT-006 parle d'un palier de 512 Mo, replica set de 3 nœuds en MongoDB 8.0, 61 Mo occupés par dev et prod ensemble, hébergé chez AWS en eu-west-1, voir I12), sans lecture directe du palier. DEBT-008 et DEBT-033 sont chiffrées sur M0 ; si le cluster est un Flex, leurs seuils sont cinq fois plus larges.
- verify: lire le palier dans la console Atlas, onglet du cluster ; encore ouvert tant que la lecture n'a pas été faite. `atlas-list-clusters` via le MCP mongodb le rend aussi, une fois l'accès IA activé.
- fini-quand: le palier est lu et le mot « présumé » retiré de DEBT-008 et DEBT-033
- piege: sans le MCP, tout ce que le cluster dit de lui-même se lit par `mongosh` sans rien installer : `docker run --rm mongo:7 mongosh --quiet "$MONGODB_URI" --eval 'db.serverStatus().connections'`, et `db.stats()` par base pour les tailles. Le palier lui-même ne se lit que dans la console, `serverStatus` ne le dit pas.

## DEBT-010 deux composants trop chargés

- state: differe
- declencheur: une feature repasse dans le fichier concerné. Ne jamais en faire un chantier isolé.
- impact: densité d'état qui rend chaque modification risquée
- ou: `apps/web/src/features/events/pages/event-detail/EventDetailSession.tsx` (924 lignes) et `apps/web/src/features/events/components/HostEventSettingsPanel.tsx` (624 lignes)
- verify: `wc -l apps/web/src/features/events/pages/event-detail/EventDetailSession.tsx apps/web/src/features/events/components/HostEventSettingsPanel.tsx` ; cette commande sort toujours quelque chose, lire les nombres : encore ouvert tant qu'un des deux dépasse 600 lignes
- fix: extraire par responsabilité vers les primitives partagées existantes avant d'écrire du local
- piege: un troisième fichier, `movieCardParts.tsx`, figurait ici sur la foi d'un relevé à 1096 lignes. Il en fait 436 depuis l'extraction des briques de listes. Mesurer avant de croire un relevé de cette liste.

## DEBT-026 le flou de fond des barres collantes n'a jamais été mesuré au défilement

- state: differe
- declencheur: un signalement de défilement saccadé sur mobile, ou une mesure de fluidité posée sur un Android milieu de gamme
- impact: `backdrop-filter: blur(12px)` sur la barre de `AppShell` et `blur(10px)` sur `EventDetailHeader` recomposent la zone floutée à chaque image pendant le défilement ; c'est le premier suspect connu de saccades sur mobile, sans preuve ici
- ou: `apps/web/src/app/components/AppShell.module.css:54`, `apps/web/src/features/events/pages/event-detail/EventDetailHeader.module.css:346`
- verify: `grep -rn "backdrop-filter" apps/web/src --include=*.css`
- fix: mesurer d'abord (Performance panel, frames longues au défilement) ; si confirmé, fond opaque légèrement translucide sans flou, ou flou réservé à `(hover: hover)`
- piege: ne pas retirer le flou sur une intuition, c'est un choix visuel de l'utilisateur. Mesure avant geste.

## DEBT-014 le domaine www ne répond pas

- state: humain
- bloque: la bascule enchaîne un CNAME chez OVH (manager, pas de CLI ; faisable par l'extension Chrome de l'utilisateur), un déploiement des deux lanes (geste de l'utilisateur) et une décision assumée : les liens `/e/:slug` déjà partagés et les courriels de réinitialisation déjà envoyés vers `web.` meurent, sauf à poser une redirection `web` → `www` chez OVH, non prévue par le runbook
- impact: un visiteur qui tape `www.movie-picker.fr` n'obtient rien. Le front live est sur `web.movie-picker.fr`, et `www` pointe vers une redirection OVH morte (A `213.186.33.5`).
- ou: `docs/runbook-migration-domaine-www.md`, écrit le 2026-07-16, exécuté jusqu'aux étapes sans impact
- verify: encore ouvert si la commande échoue ou ne renvoie pas 200.
  ```bash
  curl -sS -o /dev/null -w '%{http_code}' --max-time 10 https://www.movie-picker.fr
  ```
- fix: suivre le runbook à partir de son étape 1. **Déjà fait le 2026-09-15, ne pas refaire** : étape 2, l'alias `www.movie-picker.fr` est attaché à la distribution CloudFront (le certificat wildcard le couvre) ; étape 4, `ALLOWED_ORIGINS` porte `web`, `www` et le domaine CloudFront, `web` en première position parce que le smoke test du front lit la première entrée ; étape 10 est sans objet, Search Console porte une propriété de domaine `movie-picker.fr` qui couvre tous les sous-domaines, seule l'URL du sitemap soumise (`https://web.movie-picker.fr/sitemap.xml`) sera à remplacer. Ordre restant : littéraux du dépôt (étape 1, dont le README et le bandeau `apps/web/public/og-image.png` à régénérer par `node apps/web/scripts/generate-og-image.mjs`), CNAME `www` chez OVH (étape 3), déploiement `target=all` (étape 5), PostHog (6), vérifications (7), retrait de `web` chez OVH, CloudFront et `ALLOWED_ORIGINS` (8 et 9), puis supprimer le runbook.
- fini-quand: `www.movie-picker.fr` sert le front, plus aucun littéral `web.movie-picker.fr` hors `archive/`, et `docs/runbook-migration-domaine-www.md` est supprimé, il n'a plus d'objet
- piege: les smoke tests de la CI ne référencent aucun de ces hôtes en dur, l'API vient de `secrets.VITE_API_URL` et le front de la première entrée de `vars.ALLOWED_ORIGINS` : ils restent justes après la migration tant que `www` n'est pas mis en première position avant que le DNS ne pointe. Pointer le CNAME avant de déployer donne un `www` à moitié vivant : le front se charge, l'API refuse l'origine (CORS injecté au déploiement, pas à chaud).
- refs: le lot Terraform 4 de `roadmap.md` fait la même bascule DNS en décommissionnant AWS. Si ce lot est engagé, traiter la dette ici serait du travail jeté.

## DEBT-027 `SENTRY_AUTH_TOKEN` est encore un secret de dépôt

- state: humain
- bloque: un jeton d'organisation Sentry ne se crée que dans son interface (Settings → Auth Tokens), l'API MCP ne l'expose pas ; et la valeur d'un secret GitHub ne se relit pas, donc il faut le ressaisir. L'agent ne manipule pas de jeton en clair, le geste entier est humain.
- impact: c'est le seul secret de déploiement lisible par n'importe quel workflow sur n'importe quelle branche, tout le reste vit dans l'environnement `production` depuis le 2026-09-15 (politique de branche `master`). Portée du jeton : créer des releases et des deploys Sentry, pas de lecture de données.
- ou: Settings → Secrets and variables → Actions, secret de dépôt `SENTRY_AUTH_TOKEN` ; jobs `deploy-api`, `deploy-front` de `deploy.yml` et `rollback` de `rollback-front.yml`
- verify: `gh secret list --json name --jq '[.[].name] | join(",")'` rend `SENTRY_AUTH_TOKEN,SONAR_TOKEN`. Réglé quand il ne rend plus que `SONAR_TOKEN`.
- fix: créer un nouveau jeton d'organisation Sentry (scopes `project:releases` et `org:read`), puis :
  ```bash
  gh secret set SENTRY_AUTH_TOKEN --env production
  gh secret delete SENTRY_AUTH_TOKEN
  ```
  révoquer l'ancien jeton dans Sentry.
- piege: `SONAR_TOKEN` reste volontairement au niveau du dépôt, le job `sonar` tourne sur les PR et les branches `v*`, que la politique de branche de `production` exclurait. Tout job qui lit un secret de déploiement porte `environment: production` ; sans cette ligne il lirait une valeur vide. Les deux anciennes clés cloud désactivées le 2026-09-15 sont supprimées depuis le même jour, après un run de sauvegarde et un déploiement verts avec les nouvelles : les listes de clés GCP et AWS ne portent plus que la clé active.

## DEBT-030 les captures des suggestions d'idées sont hébergées sur une branche du dépôt public

- state: humain
- bloque: décision produit, garder ou non les pièces jointes des suggestions
- impact: tout compte connecté peut publier jusqu'à 4 images par heure sur la branche `GITHUB_ATTACHMENTS_BRANCH` du dépôt, public depuis le 2026-09-10. Les octets magiques et le type MIME sont vérifiés, pas le contenu : le dépôt devient un hébergeur d'images sous le nom du projet, et une image retirée reste dans l'historique git.
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/GitHub/GitHubIssueClient.cs`, `UploadAttachmentAsync`
- verify: `grep -n "UploadAttachmentAsync" apps/api-dotnet/MoviePicker.Api/Infrastructure/GitHub/GitHubIssueClient.cs` ; encore ouvert tant que la méthode pousse un blob dans le dépôt
- fix: soit retirer les pièces jointes du formulaire de suggestion, soit les héberger hors dépôt (bucket privé, lien signé dans le ticket)
- fini-quand: aucune écriture du serveur dans le dépôt GitHub ne vient d'un utilisateur

## DEBT-031 le limiteur de débit en mémoire est par instance

- state: differe
- declencheur: la mise à l'échelle devient routinière au lieu d'être exceptionnelle, même déclencheur que DEBT-006
- impact: chaque politique `[EnableRateLimiting]` compte par instance Cloud Run, donc un plafond de 60 par minute vaut jusqu'à 20 fois plus en pic. Seules les politiques d'authentification doublent leur compte dans Mongo par `[SharedRateLimit]`.
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/RateLimitingExtensions.cs` (politiques), `SharedRateLimitFilter.cs` (compteur partagé)
- verify: `grep -c "SharedRateLimit(" apps/api-dotnet/MoviePicker.Api/Controllers/*.cs` ; encore ouvert tant que seul `AuthController` porte l'attribut
- fix: poser `[SharedRateLimit]` sur les politiques qui protègent une ressource partagée (webhooks, scheduler, création de soirée), pas sur le sondage
- piege: le compteur partagé coûte un aller-retour Mongo par requête, ne pas le poser sur les routes sondées toutes les 3,5 s (DEBT-008)

## DEBT-024 les documents de prod portent encore les anciens champs `winnerMovieId`, `winnerPickMethod`, `winnerPickedAt`

- state: differe
- declencheur: la révision Cloud Run active sert un commit qui contient `ToDocument_WritesTheWinnersListOnly_NoLegacyWinnerField` (`git log -1 --format=%h -S ToDocument_WritesTheWinnersListOnly_NoLegacyWinnerField` donne le premier ; `SENTRY_RELEASE` de la révision active, `gcloud run revisions describe`, dit lequel sert)
- impact: aucune fonctionnalité en jeu. Depuis le 2026-09-16 le code ne lit ni n'écrit plus que `winners` : les 22 soirées de prod qui n'avaient qu'un `winnerMovieId` ont reçu leur liste `winners` par reprise (`pickMethod` recopié ou `wheel`, `pickedAt` recopié ou `updatedAt`, exactement ce que le repli de lecture rendait), `EventDocument` n'a plus les trois champs, le compteur de soirées gagnées n'interroge plus que `winners.movieId`. Restent en base les anciens champs sur 28 documents, que la révision active réécrit encore à chaque `ReplaceOne` tant qu'elle sert l'ancien code.
- ou: base `moviepicker`, collection `events`
- verify: la commande sort un nombre, encore ouvert tant qu'il n'est pas 0.
  ```bash
  docker run --rm mongo:7 mongosh --quiet "$(gcloud secrets versions access latest --secret=MONGODB_URI)" --eval 'db.getSiblingDB("moviepicker").events.countDocuments({ $or: [ { winnerMovieId: { $exists: true } }, { winnerPickMethod: { $exists: true } }, { winnerPickedAt: { $exists: true } } ] })'
  ```
- fix: une fois le déclencheur observé, un seul `updateMany` :
  ```bash
  docker run --rm mongo:7 mongosh --quiet "$(gcloud secrets versions access latest --secret=MONGODB_URI)" --eval 'db.getSiblingDB("moviepicker").events.updateMany({}, { $unset: { winnerMovieId: "", winnerPickMethod: "", winnerPickedAt: "" } })'
  ```
- fini-quand: `verify` rend 0
- piege: ne pas retirer les champs avant le déclencheur : la révision active les réécrit (`ReplaceOne`, C13 n'y est pas encore), et un retour arrière vers elle continuerait de les lire en repli si `winners` manquait ; il ne manque plus nulle part, mais l'ordre reste le seul qui ne dépende de rien. L'URI de prod ne se colle jamais dans un fichier ni dans la conversation, seulement dans la substitution de commande.

## DEBT-032 deux modèles d'autorisation hôte coexistent, le jeton porteur et le compte créateur

- state: humain
- bloque: décision produit, retirer ou non le jeton d'hôte. Le chantier co-hôte de V1.7 est le moment naturel : il ajouterait sinon un troisième chemin.
- impact: `EventHost.IsHost` accepte le jeton (`X-Host-Token`, ou `?host=` pour les clients en cache, ou localStorage) **ou** `CreatorUserId`. Créer une soirée exige un compte depuis le retrait du mode invité en V1.2, donc le jeton est un vestige, et un lien partagé avec le jeton donne les commandes de l'hôte à n'importe qui, sans compte. Onze fichiers front le transportent, l'API le masque dans les logs et Sentry pour compenser.
- ou: `apps/api-dotnet/MoviePicker.Api/Domain/EventHost.cs`, `Infrastructure/Web/HostTokenAccessor.cs`, `SensitiveQueryRedaction.cs`, et côté front `grep -rl hostToken apps/web/src --include=*.ts --include=*.tsx | grep -v test`
- verify: `grep -n "TokenMatches" apps/api-dotnet/MoviePicker.Api/Domain/EventHost.cs` ; encore ouvert tant que le jeton compte dans `IsHost`
- fix: hôte = `CreatorUserId`, co-hôtes = liste d'identifiants sur `Event` posée par le chantier co-hôte, puis retirer `HostToken` du document, `HostTokenAccessor`, `SensitiveQueryRedaction`, `withHostToken` et le stockage local côté front, et l'en-tête `X-Host-Token` du contrat OpenAPI.
- fini-quand: plus aucun `hostToken` hors `archive/`, et `EventHost.IsHost` ne prend qu'un identifiant de compte
- piege: les soirées créées avant le compte obligatoire n'ont pas de `CreatorUserId` (`events_creatorUserId` est `Sparse` pour cette raison), leur hôte perdrait ses commandes. Compter avant de retirer le jeton, par `mongosh` : `db.events.countDocuments({creatorUserId:{$exists:false}, closedAt:null})` ; si le compte n'est pas nul, attendre la clôture de ces soirées ou les rattacher par migration.

## DEBT-033 le plafond de participants promet vingt fois ce que la base encaisse

- state: humain
- bloque: décision produit sur le plafond, et le choix du mode de synchronisation temps réel de V1.7
- impact: `EventConfig.MaxParticipantsCap = 500` alors qu'en sondage actif chaque participant coûte environ 4,3 opérations Mongo par seconde (15 allers-retours par cycle de 3,5 s, DEBT-008). Une soirée pleine vaut ~2 150 opérations par seconde et jusqu'à 500 clients, sur un cluster partagé qui accepte 500 connexions et 100 opérations par seconde sur le M0 présumé (DEBT-009). Une seule soirée de 23 participants en sondage actif sature le cluster ; le plafond de 500 est inatteignable, et un hôte qui le vise fait tomber la base pour toutes les soirées en cours.
- ou: `apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs` (`MaxParticipantsCap`), `apps/web/src/features/events/hooks/useEventLive.ts`
- verify: `grep -n "MaxParticipantsCap = " apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs` ; lire le nombre : encore ouvert tant qu'il dépasse 50 et que le front sonde encore
- fix: deux volets, dans cet ordre.
  1. Tant que le sondage reste le mode de synchronisation : plafond à 50 était le chiffre d'avant la lecture des limites ; sur M0, 50 participants font 215 opérations par seconde, le double du plafond. Le chiffre honnête pour une soirée pleine seule est 20, et il faut choisir entre ce plafond et le volet 2.
  2. La synchronisation temps réel de V1.7 (`L`), évaluée le 2026-09-15. **Retenir SSE avec vérification de version côté serveur** : `GET /api/v1/events/{slug}/stream` en `text/event-stream`, où chaque instance relit `writeSeq` de la soirée une fois par seconde par soirée connectée (depuis le 2026-09-15 c'est un compteur exhaustif : `UpdateAsync`, `LockForWriteAsync` et `MarkChangedAsync` l'incrémentent, et `EventViewTagHandler` en fait déjà l'ETag des deux routes sondées) et envoie un événement « changé » à ses clients, qui refont alors leur GET habituel. Coût : 1 opération par seconde et par soirée quel que soit le nombre de participants, zéro dépendance nouvelle, `EventSource` reconnecte seul avec `Last-Event-ID`. Écarter WebSocket (les votes et propositions restent des POST, le flux n'a besoin que d'un sens, et il faudrait l'affinité de session) ; garder un service tiers (Ably, Pusher, Firebase) en repli si SSE échoue à l'usage ; réserver les change streams Mongo à un palier qui les supporte, jamais vérifié. « Présence » se pose sur le même flux avec un battement en base à TTL 30 s, jamais en mémoire d'instance.
- fini-quand: le plafond est aligné sur une mesure réelle du mode de synchronisation en place
- piege: quatre choses cassent SSE sur Cloud Run sans le dire. `timeoutSeconds` est à 300 sur le service, donc chaque flux tombe toutes les 5 minutes et `EventSource` reconnecte, ce qui est acceptable, ou le monter à 3 600. `UseResponseCompression` met en tampon : exclure `text/event-stream` explicitement. Un flux ouvert compte comme une requête en cours, donc l'instance reste vivante et facturée tant qu'un client écoute, environ 0,09 $ par heure au-delà du palier gratuit, à relire sur la grille europe-west1 : c'est le coût du temps réel, à annoncer, pas à découvrir sur la facture. Enfin C12 devient bloquant avant ce chantier, des flux ouverts maintiennent plus d'instances debout que le trafic seul. Garder le sondage en repli après 15 s sans battement.

---

## DEBT-034 cinq briques d'interface vivent encore à côté des primitives

- state: differe
- declencheur: une feature repasse dans le fichier concerné. Ne jamais en faire un chantier isolé.
- impact: reliquat de l'audit du design system du 2026-09-15. Cinq endroits rendent à la main ce qu'une primitive de `shared/components/` sait faire, donc un changement de la primitive ne les suit pas : la classe globale `.icon-btn-outline` posée sur des `<button>` nus là où `IconButton` existe ; le squelette de la page compte (`AccountLoadingSkeleton`) qui dessine son propre miroitement au lieu de composer `Skeleton` ; le spinner du bouton suivre (`ProfileActions`) alors que `Button` et `IconButton` portent `loading` ; la pastille participant (`EventParticipantsList.chip`), un `<li>` avec avatar, lien et retrait, que `Chip` ne sait pas rendre ; le badge sur affiche (`MovieListCard.badge`, capitales, rayon carré) que `Chip` n'a pas en tone.
- ou: `apps/web/src/styles/02-forms-and-content.css` (`.icon-btn-outline`), `apps/web/src/features/auth/pages/account/AccountLoadingSkeleton.tsx`, `apps/web/src/features/profile/components/ProfileActions.module.css` (`.spinner`), `apps/web/src/features/events/components/EventParticipantsList.module.css` (`.chip`), `apps/web/src/features/movies/components/MovieListCard.module.css` (`.badge`)
- verify: chaque commande liste ce qui reste à rapatrier.
  ```bash
  grep -rln "icon-btn-outline" apps/web/src --include=*.tsx
  grep -n "spinner|shimmer" apps/web/src/features/profile/components/ProfileActions.module.css apps/web/src/features/auth/pages/account/AccountLoadingSkeleton.module.css
  ```
- fix: `IconButton` pour les sept boutons nus, puis supprimer la classe globale ; `SkeletonScreen` + `Skeleton` pour la page compte ; `loading` sur le bouton suivre ; pour la pastille participant et le badge sur affiche, ajouter à `Chip` un `as` et un tone `onPoster` seulement si un second consommateur apparaît, sinon les laisser.
- fini-quand: les deux commandes de `verify` ne sortent rien et `docs/design-system.md` ne mentionne plus ces exceptions
- piege: `Chip` enveloppe ses enfants dans un span décalé par `--text-optical-nudge` ; un avatar posé dedans serait décalé aussi, c'est pour ça que la pastille participant n'a pas été migrée.

---

## DEBT-035 la diffusion push se fait dans la requête, sans file ni reprise

- state: differe
- declencheur: un p95 des `POST` de soirée (`join`, `movies`, `vote`, `wheel`) au-dessus de 500 ms dans les logs Cloud Run, ou un premier incident Web Push visible dans Sentry
- impact: `PushFanOut.SendToAllAsync` (8 envois en parallèle) est attendu dans `JoinEventHandler`, `AddMovieHandler` et `WinnerAnnouncer` : la latence d'un vote ou d'un tirage inclut ⌈abonnés / 8⌉ vagues vers le service push, et le plafond de DEBT-033 la multiplie. Un échec autre que 410 / 404 est journalisé puis perdu, sans compteur ni reprise. C'est correct sous les règles Cloud Run (pas de tire-et-oublie), c'est le prix de l'absence de file.
- ou: `apps/api-dotnet/MoviePicker.Api/Application/UseCases/Shared/PushFanOut.cs`, `Infrastructure/Push/WebPushSender.cs` (les `catch`), appelants par `grep -rn "PushFanOut.SendToAllAsync" apps/api-dotnet/MoviePicker.Api --include=*.cs`
- verify: `grep -rln "PushFanOut.SendToAllAsync" apps/api-dotnet/MoviePicker.Api/Application/UseCases --include=*.cs` ; encore ouvert tant qu'un handler de mutation apparaît dans la liste
- fix: une collection `push_outbox` (un document par notification, `status`, `attempts`, index TTL), écrite dans la même transaction que la mutation, puis drainée hors requête : d'abord par le motif scheduler existant (`POST /api/v1/scheduler/push-outbox`, Cloud Scheduler chaque minute), puis par Cloud Tasks (cible HTTP sur Cloud Run, jeton OIDC) quand le lot Terraform 7 décrit les jobs, pour une latence en secondes.
- fini-quand: aucun handler de mutation n'attend le service push, et une panne push d'une heure se rattrape sans perte
- piege: ne pas remplacer l'attente par un `_ = SendAsync(...)`, c'est exactement le tire-et-oublie que Cloud Run ne reprend jamais (règle 2 des contraintes Cloud Run). Le rappel de soirée (`EventReminderPass`) est déjà hors requête, il ne fait pas partie du périmètre.

## DEBT-036 le graphe des features front est une maille, pas des couches

- state: differe
- declencheur: une feature repasse dans un des fichiers concernés, ou une nouvelle feature s'ajoute à `apps/web/src/features/`
- impact: six paires de features s'importent mutuellement, mesuré le 2026-09-15 : `auth ↔ events` (`auth` lit `events/storage`), `auth ↔ letterboxd` et `auth ↔ notifications` (la page compte compose `LetterboxdImportSection` et `NotificationsSection`), `events ↔ watchlist` (`useWatchlist` d'un côté, `eventsApi` et `EventSummaryCard` de l'autre), `movies ↔ watchlist`, `letterboxd ↔ watchlist`. Aucune feature n'est retirable ni chargeable seule, la fermeture statique d'`App` grossit par transitivité (C4), et une modification de `watchlist` peut casser `events` sans qu'un test de `watchlist` le dise. `check:architecture` ne voit que les cycles de **fichiers** et `shared → feature`.
- ou: `scripts/check-architecture.mjs` (règles d'import), `apps/web/src/features/*`
- verify: liste les arêtes sortantes de chaque feature ; encore ouvert tant qu'une paire apparaît dans les deux sens.
  ```bash
  for f in auth events letterboxd movies notifications profile watchlist; do echo "$f -> $(grep -rhoE "from '@/features/[a-z]+" apps/web/src/features/$f --include=*.ts --include=*.tsx | grep -v "features/$f'" | sort -u | sed "s#from '@/features/##" | tr '\n' ' ')"; done
  ```
- fix: d'abord la règle, ensuite le démêlage. Dans `check-architecture.mjs`, une liste d'arêtes autorisées entre features (`auth` en feuille, `movies → auth`, `events → movies, auth`, `watchlist → movies, auth`, `profile → movies, watchlist, auth`, `letterboxd → watchlist, auth`, `notifications → auth`), toute autre arête étant une violation ; la porte reste rouge jusqu'au démêlage, donc poser la règle et le démêlage dans le même commit. Le démêlage : la page compte sort de `auth` vers `app/pages/account/` qui compose les sections des autres features ; `events/storage` (jeton d'hôte) descend dans `shared/` ou disparaît avec DEBT-032 ; la carte de soirée de la watchlist et `useWatchlist` côté soirée se règlent en déplaçant la brique commune dans `movies`, qui est déjà la couche partagée par `events`, `watchlist` et `profile`.
- fini-quand: `verify` ne montre plus aucune paire dans les deux sens, et `check:architecture` refuse une arête hors liste
- piege: déplacer une page renomme son chunk : vérifier `PRERENDERED_ROUTE_CHUNKS` et `route-assets.json` (C4) avant de croire un build vert, et remesurer `login` et `home` après, ce sont les pages que tout regroupement fait reculer (I1, I9).

## DEBT-037 les passes planifiées s'authentifient par un secret statique là où Cloud Scheduler sait signer

- state: differe
- declencheur: le lot Terraform 7 de `roadmap.md` (les jobs Cloud Scheduler décrits en IaC), ou une rotation forcée de `SCHEDULER_TOKEN`
- impact: `X-Scheduler-Token` est un secret partagé de longue durée, le treizième de Secret Manager, tous lus en `:latest`. Le faire tourner demande deux gestes coordonnés (la version du secret, puis les trois jobs Cloud Scheduler qui l'envoient), sans quoi les rappels de soirée cessent en silence, ce qui est déjà arrivé une fois avec un secret absent. Cloud Scheduler sait signer un jeton OIDC avec un compte de service ; l'API n'aurait qu'à vérifier l'émetteur Google et l'audience.
- ou: `apps/api-dotnet/MoviePicker.Api/Controllers/SchedulerController.cs`, `Infrastructure/Security/SchedulerTokenValidator.cs`, `.github/workflows/deploy.yml` (étape qui crée ou met à jour les jobs)
- verify: `grep -n "X-Scheduler-Token" apps/api-dotnet/MoviePicker.Api/Controllers/SchedulerController.cs` ; encore ouvert tant que l'en-tête est lu
- fix: jobs Cloud Scheduler avec `--oidc-service-account-email` et `--oidc-token-audience` sur l'URL du service ; côté API, `JwtBearer` sur les seules routes `/scheduler/*`, autorité `https://accounts.google.com`, audience vérifiée, `email` du jeton comparé au compte de service attendu. Retirer ensuite `SCHEDULER_TOKEN` de Secret Manager et de `deploy.yml`.
- fini-quand: `SCHEDULER_TOKEN` n'existe plus dans Secret Manager ni dans `deploy.yml`, et les trois passes tournent
- piege: le service est en `--allow-unauthenticated`, donc la vérification du jeton se fait dans l'API, pas par IAM Cloud Run ; le webhook Ko-fi reste sur son jeton, Ko-fi ne signe pas. Les jobs ne portent aujourd'hui aucun compte de service (ils appellent une URL publique avec l'en-tête) : en créer un dédié, sans autre rôle que `roles/cloudscheduler.jobRunner` et `roles/iam.serviceAccountTokenCreator` sur lui-même, plutôt que de réutiliser le compte d'exécution de Cloud Run.

## DEBT-038 la synchronisation Letterboxd lit du HTML par expression régulière, sans canari

- state: humain
- bloque: choisir le compte Letterboxd public qui sert de témoin (le compte de l'auteur, ou un compte créé pour ça, avec au moins un film en watchlist) et le poser en variable Actions. Tout le reste est en place depuis le 2026-09-16.
- impact: `LetterboxdWatchlistClient` lit les attributs `data-item-*` de la page watchlist, Letterboxd n'ayant pas d'API publique pour ça. Le garde compteur annoncé / films lus empêche bien une lecture partielle d'effacer une watchlist (`LetterboxdWatchlistIncomplete`), mais un changement de balisage rend 100 % des synchronisations en échec, et le `LogWarning` ne remonte pas dans Sentry : la fonctionnalité meurt jusqu'à ce qu'un utilisateur le dise. Tant que la variable manque, le job du canari n'existe pas et rien ne surveille.
- ou: `apps/api-dotnet/MoviePicker.Api.Tests/Infrastructure/Letterboxd/LetterboxdWatchlistCanaryTests.cs` (`[CanaryFact]`, trait `Category=Canary`, ignoré sans la variable), job `letterboxd-canary` de `.github/workflows/security-scan.yml` (cron du lundi, `if: vars.LETTERBOXD_CANARY_USERNAME != ''`, ouvre ou alimente un ticket `letterboxd-canary` en cas d'échec)
- verify: `gh variable list --json name --jq '.[].name' | grep -x LETTERBOXD_CANARY_USERNAME` ; encore ouvert tant que rien ne sort
- fix: `gh variable set LETTERBOXD_CANARY_USERNAME --body <compte>`, puis `gh workflow run security-scan.yml` et vérifier que le job `letterboxd-canary` apparaît et passe. Le test a été joué en local le 2026-09-16 contre un compte public de 577 films : vert en 5 s, et rouge sur un compte à watchlist vide, ce qui est le comportement voulu.
- fini-quand: la variable est posée, le job a tourné une fois en vert, et l'entrée est supprimée ; ensuite un balisage cassé produit un ticket dans les sept jours sans autre geste
- piege: le compte témoin doit garder au moins un film dans sa watchlist, sinon le canari est rouge pour une mauvaise raison ; le test ne tourne ni dans `verify:local` ni dans `ci-cd.yml`, il s'ignore lui-même sans la variable, il dépend d'un site tiers. Le ticket n'est ouvert qu'une fois : les échecs suivants le commentent tant qu'il reste ouvert.

## DEBT-039 le jeton d'accès en lecture TMDB n'existe pas encore dans Secret Manager

- state: humain
- bloque: créer le secret `TMDB_READ_ACCESS_TOKEN` (le « API Read Access Token » de la page API du compte TMDB) dans Secret Manager et donner `roles/secretmanager.secretAccessor` au compte d'exécution Cloud Run. L'agent ne manipule pas de jeton en clair et les écritures Secret Manager lui sont refusées (`AGENTS.md`, accès outils).
- impact: depuis le 2026-09-17, `TmdbAuthenticationHandler` envoie le jeton v4 en en-tête `Authorization: Bearer` quand il existe et ne retombe sur la clé v3 en `api_key` dans la query string qu'à défaut. Tant que le secret manque, c'est le repli qui tourne en production : la clé traverse encore l'adresse de chaque requête sortante vers TMDB. `SensitiveQueryRedaction` et `SentryBeforeSend.RedactBreadcrumb` la masquent côté API et Sentry, le risque restant est toute trace hors de l'API (proxy, capture réseau, journal d'un intermédiaire).
- ou: `.github/workflows/deploy.yml` (le bloc `gcloud secrets describe TMDB_READ_ACCESS_TOKEN`), `apps/api-dotnet/MoviePicker.Api/Infrastructure/Tmdb/TmdbAuthenticationHandler.cs`
- verify: `gcloud secrets describe TMDB_READ_ACCESS_TOKEN --format='value(name)'` ; encore ouvert tant que la commande échoue
- fix: relever le jeton dans TMDB, puis, sans jamais le coller dans un fichier ni dans la conversation :
  ```bash
  gcloud secrets create TMDB_READ_ACCESS_TOKEN --replication-policy=automatic --data-file=<FICHIER_TEMPORAIRE_SUPPRIME_ENSUITE>
  gcloud secrets add-iam-policy-binding TMDB_READ_ACCESS_TOKEN --member="serviceAccount:movie-picker-api@<PROJET_GCP>.iam.gserviceaccount.com" --role=roles/secretmanager.secretAccessor
  ```
  puis `gh workflow run deploy.yml --ref master -f target=api` (geste de l'utilisateur), vérifier que la révision active porte la variable (`gcloud run services describe <SERVICE> --region <REGION> --format=yaml | grep -A2 TMDB_READ_ACCESS_TOKEN`), enfin révoquer la clé v3 côté TMDB et retirer `TMDB_API_KEY` de `deploy.yml` et de Secret Manager. Le code garde le repli `api_key` pour le poste de travail, `.env.example` documente les deux.
- fini-quand: le secret existe, la révision active le porte, la clé v3 est révoquée et `TMDB_API_KEY` n'apparaît plus dans `deploy.yml`
- piege: le compte d'exécution est `movie-picker-api@<PROJET_GCP>.iam.gserviceaccount.com` (créé le 2026-09-17, `--service-account` dans `deploy.yml`, `secretAccessor` sur chaque secret existant) ; tant que le déploiement qui suit n'a pas eu lieu, `gcloud run services describe <SERVICE> --region <REGION> --format='value(spec.template.spec.serviceAccountName)'` rend encore le compte Compute par défaut, ne pas lui donner le nouveau secret à sa place, ni réutiliser le compte de déploiement. Ne pas révoquer la clé v3 avant que la révision qui porte le jeton serve le trafic : `deploy.yml` ne passe le secret que s'il existe au moment du déploiement, une révision antérieure n'a que la clé. Le jeton v4 est accepté par l'API v3 de TMDB, c'est documenté et c'est ce que `TmdbAuthenticationHandlerTests` suppose, mais seul un appel réel le prouve : après le déploiement, une recherche de film dans l'application est la vérification.

## DEBT-040 le seed de développement est compilé dans l'assembly de production

- state: differe
- declencheur: une feature repasse dans `Infrastructure/Development/` ou dans ses tests. Ne jamais en faire un chantier isolé.
- impact: `DevelopmentScenarioSeed.cs` (2 050 lignes) et `DevelopmentDataSeedHostedService.cs` (329 lignes) sont publiés dans l'image de production, soit environ 12 % des lignes de l'API pour du code que seul `environment.IsDevelopment()` enregistre. Aucune surface exposée, du poids d'assembly et du temps de compilation ReadyToRun pour rien.
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Development/`, enregistrement dans `ServiceCollectionExtensions.AddMoviePicker` sous `environment.IsDevelopment()`
- verify: `ls apps/api-dotnet/MoviePicker.Api/Infrastructure/Development/` ; encore ouvert tant que le dossier est dans le projet `MoviePicker.Api`
- fix: sortir le dossier dans un projet `MoviePicker.Api.DevelopmentSeed` que `MoviePicker.Api` référence seulement en `Debug` (`<ProjectReference Condition="'$(Configuration)' == 'Debug'">`), l'enregistrement DI passant par une extension de ce projet appelée derrière `#if DEBUG` ; déplacer `DevelopmentScenarioSeedTests` et la moitié seed de `ServiceCollectionExtensionsBranchTests` dans un projet de tests lui aussi Debug. Mesurer avant et après par `dotnet publish -c Release` et la taille de `MoviePicker.Api.dll`.
- piege: `verify:local` et la CI compilent et testent en **Release**, et `DevelopmentScenarioSeedTests.cs` comme `ServiceCollectionExtensionsBranchTests.cs` référencent le seed : un simple `<Compile Remove>` conditionnel casse la suite, c'est pour ça que ce n'a pas été fait le 2026-09-17. Le `launchSettings.json`, `playwright.config.ts` et `scripts/verify-local.cjs` lancent l'API en `Development` avec `DevelopmentSeed__Enabled=false` : vérifier qu'un `dotnet run` sans configuration explicite construit bien en Debug, sinon le seed disparaît du poste de travail sans erreur.

## DEBT-041 la date et l'heure d'une soirée sont des chaînes reparsées à chaque lecture

- state: differe
- declencheur: une feature repasse dans `EventSchedule` ou dans la création et la modification d'une soirée
- impact: `Event.Date` et `Event.Time` sont des `string` (`"2026-09-20"`, `"20:30"`) que `EventSchedule.TryGetStartUtc` reparse à chaque appel de `Event.Lifecycle()`, donc pour chaque soirée listée et à chaque cycle de sondage. Un format invalide ne se découvre qu'à la lecture, la soirée reste `Upcoming` pour toujours au lieu d'être refusée à l'écriture. C'est de la lisibilité et de la robustesse, pas une lenteur mesurée : le parsing coûte des microsecondes.
- ou: `apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs`, `Domain/EventSchedule.cs`, `Infrastructure/Persistence/Mongo/EventDocument`, les DTOs et les fichiers qui lisent `.Date` (`grep -rln "\.Date\b" apps/api-dotnet/MoviePicker.Api --include=*.cs`, 14 le 2026-09-17)
- verify: `grep -n "public string Date\|public string Time" apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs` ; encore ouvert tant que les deux lignes sortent
- fix: `DateOnly Date` et `TimeOnly Time` sur l'entité, ou un `StartUtc` calculé et validé à l'écriture, avec conversion aux frontières (document Mongo, DTO) pour ne changer ni le contrat OpenAPI ni les documents existants ; la validation du format remonte alors dans le handler de création et rend une `Errors.<Cas>()` au lieu d'un `Upcoming` silencieux.
- piege: les documents de production portent les chaînes : garder la lecture de l'ancien format ou passer par une `IDataMigration`, jamais les deux à moitié. Le seed (`DevelopmentScenarioSeed`, DEBT-040), les fixtures et les tests écrivent ces chaînes en dur : compter les occurrences avant de changer le type, le chantier est plus large qu'il ne paraît depuis `Event.cs`.

---

# Contraintes

Ce qui casse en silence si on y touche sans savoir. Aucune n'est une tâche, ne jamais les « traiter ».

## C1 le déploiement API promeut, il ne revient pas en arrière

Le schéma est `gcloud run deploy --no-traffic --tag "s-<sha7>"`, puis sondes `/health` et `/health/ready` sur l'URL taguée, puis `update-traffic --to-latest` seulement si vert, puis `--remove-tags` en `if: always()`. **Ne pas y réintroduire un retour arrière automatique**, une première version en avait un et il portait deux défauts capables de casser la production sans aucun signal rouge :

1. `update-traffic --to-revisions REV=100` **épingle** le trafic, il retire `latestRevision: true`, et rien ne le rebranchait. Après un seul retour arrière, chaque déploiement suivant aurait créé une révision à 0 % de trafic pendant que les smoke tests, répondus par l'ancienne révision épinglée, seraient restés **verts**.
2. Il visait `status.latestReadyRevisionName`, la dernière révision *prête* et non celle qui *sert* : un second retour arrière aurait basculé la prod sur la révision déjà jugée mauvaise.

Le schéma actuel supprime aussi la fenêtre d'exposition de 35 à 90 s et le cas du job annulé sur timeout, où `if: failure()` ne s'exécute pas. `--to-latest` désépingle au passage un service figé par un `rollback.yml` manuel. Corollaire : `rollback.yml` n'est plus le filet du déploiement, il sert les régressions constatées après coup.

## C2 les trois conditions de la coquille de démarrage

Le titre de la page d'accueil est écrit dans `apps/web/index.html`, dans l'écran de démarrage, uniquement quand la page ouverte est `/`. Gain mesuré : performance 80 vers 95, LCP 4,2 s vers 2,3 s. Casser l'une des trois conditions annule le gain **sans erreur ni avertissement** :

1. **L'écran de démarrage couvre toute la page** (`position: fixed; inset: 0`, fond opaque) et n'est retiré qu'après `createRoot().render()`. Rien de ce qui est peint dessous ne peut compter comme LCP tant qu'il est là. C'est pour ça que peindre le titre *dans* la coquille fonctionne alors que le précharger n'avait rien donné.
2. **La boîte du titre de la coquille reste au moins aussi grande que celle du `<h1>` réel.** Chrome ne remplace un candidat LCP que par un candidat *plus grand*. Mesuré : même police calculée des deux côtés (`700 32px / 51.2px Overpass`), hauteur identique de 51 px, 520 px de large pour la coquille contre 488 px pour le `<h1>`. Toucher `font-size`, `line-height`, `max-width` ou le texte d'un seul côté fait repasser le LCP après le montage.
3. **Les styles de l'entrée sont dans le document, pas derrière une requête.** Depuis le 2026-09-10 ils y sont **en ligne** (`inlineBlockingStyles`, `apps/web/vite.config.ts`) et non plus dans une feuille liée : Overpass est déclarée dès l'analyse du document, donc la coquille est peinte avec la police définitive. Ce qui compte est que la déclaration précède la peinture, pas la forme de la balise. La faire redevenir une requête, liée ou différée, ramène une substitution de police tardive, une boîte de taille différente et un nouveau candidat LCP après le montage. Mesuré des deux côtés sur le runner : la repasser en feuille liée coûte 1 point à six pages qui rendaient sinon le même chiffre au point près sur deux runs, et n'en rend aucun à `home`.

Les trois préchargements de police portent `fetchpriority="low"` depuis le 2026-09-10, et cette condition est la raison de revérifier `home` après y avoir touché : à priorité haute, 53 Ko de police partaient dans la première vague et prenaient la bande passante de `react-vendor`. Ne pas descendre plus bas sans remesurer `home`, une police arrivée après la première peinture change la taille de la boîte du titre.

## C3 deux duplications volontaires, gardées par un test

La configuration de build ne peut pas importer `src/`, donc `apps/web/vite.config.ts` réécrit à la main la clé de stockage `moviepicker-locale`, la liste des langues et la règle de détection dans `activeLocalePreloadScript`. Le titre de l'accueil est dupliqué dans `index.html` pour la même raison. `apps/web/src/startShell.test.ts` compare les chaînes en dur à `fr.home.title` et `en.home.title` et échoue si l'une dérive. Si `preferredLocale()` change, changer aussi `activeLocalePreloadScript`.

## C4 ne pas renommer les chunks que le préchargement cherche

`preloadCriticalAssetsPlugin` cherche `App-[hash].js`, `App-[hash].css` et `i18n-[hash].js` dans le bundle. Tout regroupement qui renomme ou absorbe ces chunks fait disparaître les préchargements **en silence**, et le LCP empire. Et `@sentry`, `posthog-js`, `canvas-confetti`, `react-qr-code` sont chargés à la demande : les placer dans un chunk partagé avec du code eager les rendrait eager.

Le même plugin fait deux autres choses depuis le 2026-09-10 :

- **Il met la feuille de style de l'entrée en ligne** dans le document, voir C2.
- **Il publie `dist/route-assets.json`**, indexé par **nom de chunk** (`DonatePage`, `LegalNoticePage`, ...), avec la fermeture des imports statiques de chaque page chargée à la demande. `scripts/prerender.mjs` s'en sert, et cette moitié-là est gardée : renommer un composant de page renomme son chunk et **fait échouer le build**, avec le nom cherché dans le message.

Depuis le 2026-09-14, le découpage passe par `output.codeSplitting.groups` (rolldown) et non plus par `manualChunks` : **`experimentalMinChunkSize` n'existe pas sous Vite 8**, il était ignoré sans avertissement, et `manualChunks` est ignoré dès que `codeSplitting` est posé. Deux choses à savoir en y touchant :

- le groupe `App` est alimenté par `appShellClosurePlugin`, qui relève au build la fermeture statique de `src/app/App.tsx` (`moduleParsed` puis parcours dans `buildEnd`). C'est ce qui vide la première vague de ses six petits chunks et fait que `index` importe `App` statiquement. Un module importé par la coquille atterrit donc dans `App-[hash].js`, même s'il est aussi importé par des pages ; c'est voulu, la coquille est toujours chargée avant elles ;
- le groupe `react-vendor` teste `node_modules/…/(react|react-dom|react-router|scheduler)/` **en excluant** `VENDORS_LOADED_ON_DEMAND`, parce que `@sentry/react/` contient `/react/` : sans l'exclusion, le SDK Sentry entier partirait dans le chunk eager de React.

## C5 le bucket de sauvegarde contient des données personnelles

Le bucket de sauvegarde MongoDB (europe-west1, versioning actif, suppression à 30 jours, nom dans `backup-mongo.yml`) porte des données personnelles. Accès public interdit, accès uniforme au niveau du bucket, et l'archive n'est **jamais** publiée en artefact GitHub. La limite connue est écrite dans l'en-tête de `backup-mongo.yml` : la vérification prouve que l'archive se restaure, pas qu'elle est cohérente entre collections.

## C6 sortir le front d'AWS engage le budget et suit un ordre imposé

Le chantier Terraform de `roadmap.md` sort le front d'AWS (lots 3 et 4). Deux cibles GCP sont possibles et **une des deux fait sortir le projet du « 0 €/mois, tous les services dans leur palier gratuit »**, indicateur suivi au Bloc 3, sans qu'aucune alerte ne le dise avant la facture.

- **Cloud Storage + Cloud CDN derrière un load balancer applicatif externe** est l'équivalent direct de S3 + CloudFront, mais sa règle de transfert est facturée à l'heure **sans palier gratuit** : ≈ 18 $/mois avant le moindre octet servi.
- **Firebase Hosting** reste dans le gratuit (10 Go stockés, 360 Mo/jour transférés), porte nativement le repli SPA, les en-têtes personnalisés et le domaine sur mesure avec son certificat, et se décrit en Terraform (`google_firebase_hosting_site`, `google_firebase_hosting_custom_domain`, provider `google-beta`). **C'est la cible recommandée.** Seul point à surveiller, les 360 Mo/jour : le trafic mesuré (≈ 500 requêtes/jour) en est loin, et un dépassement bascule sur la facturation à l'octet, pas sur une coupure.

Deux corollaires sur l'ordre des lots, qui ne se lisent pas dans leur numérotation :

1. **Les lots qui sortent le front d'AWS passent avant ceux d'identités et de CI.** Décrire en Terraform, puis outiller, un hébergement qu'on s'apprête à supprimer est du travail jeté.
2. **Le gain visé est la consolidation, pas l'économie.** Le palier gratuit de CloudFront (1 To/mois) est plus large que celui de la cible GCP. Ce que la migration supprime, c'est un second fournisseur, un second modèle d'identité et un second endroit où regarder pendant un incident. Aucun identifiant statique n'est en jeu depuis le 2026-09-15 : les deux clouds font confiance au jeton OIDC de GitHub (`.github/actions/gcloud-auth/action.yml`, rôle AWS assumé par `deploy-front`), ce que `cloud-auth-check.yml` prouve à la demande.

Deux pièges au décommissionnement d'AWS lui-même (lot 4) :

- **le certificat ACM est un wildcard `*.movie-picker.fr`.** Vérifier qu'aucun autre sous-domaine ne s'en sert avant de le retirer, sinon la suppression casse un hôte qui n'était pas dans le périmètre ;
- **le `CNAME` se repointe à la main chez OVH**, il n'y a pas de CLI. Ce que le dépôt doit perdre au passage, secrets, variables, scripts et mentions d'AWS, se relève par un `grep -rin aws` au moment du lot : ne pas travailler sur une liste écrite à l'avance, elle sera périmée.

## C7 le dépôt est public depuis le 2026-09-10, et son historique entier avec lui

La bascule est **faite**. Ce qu'elle a rendu lisible, c'est **chaque commit jamais poussé**, plus les 86 pull requests et les 7 tickets, pas seulement l'état actuel du dépôt. Ce qui a été exposé une fois est compromis, et un `git rm` postérieur n'y change rien. **La bascule est réversible dans les réglages, pas dans les faits** : un clone ou un fork fait pendant la fenêtre publique survit au retour en privé.

**Audit fait le 2026-09-10 sur les 1 003 commits de toutes les références, plus le corps et les commentaires de toutes les PR et de tous les tickets. Ne pas le rejouer à l'identique, lire ses résultats :**

- **Aucun secret.** `gitleaks` sur l'historique complet rend quatre constats, tous `curl-auth-user` sur des `<JETON_SONARCLOUD>` et `$SONAR_TOKEN` de documentation. Recherches ciblées vides pour `GOCSPX-`, `re_`, `sq[pau]_`, `ghp_`/`github_pat_`, `AKIA`, `AIza`, clé privée PEM, `mongodb+srv` avec mot de passe, JWT. Aucun `.env` versionné à aucun commit : seuls des `.env.example` ont jamais été ajoutés.
- **Aucune donnée personnelle** dans les captures RNCP ni les tickets. `05-compte.png` montre `a***@test.local` et « Alice test », le courriel y est masqué par l'UI. Aucun courriel réel, aucun cookie de session, aucun jeton dans les 2,2 Mo de texte des PR et tickets.
- La porte `gitleaks` de la CI tourne en mode `dir` : elle regarde **l'arbre de travail, jamais l'historique**. Elle n'a donc jamais couvert ce que la bascule expose ; c'est l'audit ci-dessus qui l'a fait, une fois.

**Ce que la bascule a publié, et qui ne se reprend pas. Assumé sciemment, ne pas y revenir comme si c'était un oubli :**

1. **Le courriel personnel de l'auteur est l'adresse de 916 commits sur 1 003**, désormais public, moissonnable et miroité. 28 commits utilisaient déjà l'adresse `noreply` GitHub, l'identité était donc déjà incohérente. Le seul recours restant serait de réécrire les 1 003 commits, ce qui change **tous** les SHA et casse les liens de commit des 86 PR fusionnées, pour une adresse déjà publiée, donc sans bénéfice. Depuis le 2026-09-14, `user.email` est posé en local sur ce dépôt (`git config --local`) sur l'adresse `noreply`, donc les commits **à venir** ne la publient plus ; un clone neuf hérite de la configuration globale, à reposer.
2. **Les livrables RNCP et un support de cours Ynov sont publiés** : `archive/docs/RNCP/` (dossiers PDF, captures, slides du Bloc 3, sous `docs/RNCP/` jusqu'au 2026-09-16) et `archive/docs/_ynov/`, qui contient une consigne de module, donc du matériel de l'école. Des livrables notés en verbatim sont désormais copiables ; l'oral du Bloc 3 a eu lieu le 2026-09-16. Un `git rm` maintenant ne retirerait que le head.
3. **Les branches distantes sont visibles** : depuis le 2026-09-14 il ne reste que `master`, la branche de version en cours et `feedback-attachments`, où `GitHubIssueClient` publie les captures d'écran jointes aux signalements du pied de page, lisibles par quiconque via `raw.githubusercontent.com`. Rien de secret, mais c'est ce que voit un visiteur en premier. Ne pas les supprimer sans vérifier `git worktree list` : deux d'entre elles sauvegardent le travail en cours d'un worktree.
4. **Les journaux et les artefacts des runs Actions sont publics eux aussi**, pas seulement le code. Vérifié : aucun `set -x`, aucun `echo` de secret dans les six workflows, seulement des contrôles de présence, et GitHub masque de lui-même tout secret déclaré. Le résidu est ailleurs, dans deux artefacts : `playwright-traces`, qui embarque corps de requêtes et cookies du run E2E, et `sbom-api`. La rétention est de 90 jours, donc attendre déplace le problème au lieu de le régler.

**Traité le 2026-09-10, ne pas refaire :**

- **Les identifiants d'infrastructure sont sortis des fichiers suivis** : compte AWS, distribution CloudFront, ARN du certificat ACM, nom du bucket, projet GCP et organisation Sentry sont remplacés par des gabarits `<COMME_CECI>`, et `infra/README.md` porte la table qui dit par quelle commande relever chaque valeur. `scripts/apply-cloudfront-headers.sh` n'a plus de valeur par défaut, il sort en 2 si `DISTRIBUTION_ID` manque. Aucun n'était un secret et aucun n'était dans les PR ni les tickets, donc le head suffisait, sans réécriture d'historique. La clé d'accès du compte root AWS, qui n'a jamais été le sujet de cette sortie, est supprimée depuis le 2026-09-15 : le poste de travail utilise un utilisateur IAM dédié.
- **Aucune contribution externe n'est possible sans un geste de l'auteur.** `CONTRIBUTING.md` le dit, la licence l'impose, et les jobs d'entrée de `ci-cd.yml` (`changes`, `gitleaks`, `lint-workflows`, plus `sonar` dont l'`always()` ignorerait un `changes` sauté) portent `github.event.pull_request.head.repo.fork != true`. Une PR de fork ne déclenche donc rien : ni minutes dépensées, ni `sonar` rouge faute de secrets. Cette condition vit dans un fichier que l'auteur du fork contrôle sur l'événement `pull_request` (GitHub exécute le workflow du commit de fusion), donc elle n'est qu'un confort : la vraie barrière est l'approbation `all_external_contributors` ci-dessous, et `rollback-front.yml` ne republie que les archives produites par un run de `deploy.yml` sur `master`, jamais un `front-dist-*` déposé par un autre run (audit du 2026-09-17). `SECURITY.md` détourne les failles vers un canal privé plutôt qu'un ticket public.

**Les réglages posés le 2026-09-10, juste après la bascule.** Ne pas les reposer, les vérifier :

| Réglage | Valeur | Vérification |
|---|---|---|
| approbation des PR de contributeurs externes | `all_external_contributors` | `gh api repos/<DEPOT>/actions/permissions/fork-pr-contributor-approval` |
| secret scanning et push protection | activés | `gh api repos/<DEPOT> --jq .security_and_analysis` |
| signalement privé de vulnérabilité | activé | `gh api repos/<DEPOT>/private-vulnerability-reporting` |
| CodeQL, configuration par défaut | `configured` | `gh api repos/<DEPOT>/code-scanning/default-setup` |
| épinglage des actions par SHA | obligatoire | `gh api repos/<DEPOT>/actions/permissions` |
| `master` : ni force push ni suppression | ruleset actif | `gh api repos/<DEPOT>/rulesets` |

Deux pièges d'énumération, payés une fois : `approval_policy` n'accepte que des valeurs **en minuscules** (`all_external_contributors`), et le ruleset ne demande **aucun contrôle de statut**, en exiger un casserait le workflow de poussée directe, un commit tout juste poussé n'ayant encore aucun run attaché.

**Il reste un geste, sans API : passer le projet SonarCloud en public.** C'est lui qui supprime le plafond de 50 000 lignes, donc la cause de l'exclusion de `TechPage.tsx` et de `app/pages/tech/` posée le 2026-09-09, ~3 000 lignes rendues à l'analyse, et la contrainte de marge de DEBT-021. Le palier gratuit est annoncé illimité sur un projet public, à relire sur la page de tarification avant d'en dépendre. Contrepartie : les constats deviennent publics.

**Deux limites à connaître, qui ne se règlent pas :**

- **Le fork ne se désactive pas sur un dépôt public.** Seuls les dépôts privés ou internes d'une organisation peuvent le restreindre. Forker pour lire est libre, comme cloner ; la licence ne réserve que l'usage qui suit.
- **Les tickets restent ouverts à tout le monde.** GitHub ne sait pas les limiter aux collaborateurs de façon permanente, seulement les geler temporairement (6 mois au plus) ou les désactiver en bloc, ce qui ferait perdre le backlog. Un ticket est un signalement, pas une contribution : `CONTRIBUTING.md` dit où va chaque chose.

## C8 jamais d'`await` de premier niveau dans `main.tsx`

`apps/web/src/main.tsx` termine par `boot().catch(...)`, **pas** par `await boot()`. Le `.catch` existe pour que la promesse ne soit pas flottante, ce que Sonar refuse, et pour retirer la coquille de démarrage si `boot` échoue, sans lui, un échec laisse l'utilisateur sur un écran de démarrage permanent.

**Sonar réclame l'inverse et il a tort ici** : la règle `typescript:S7785` (« prefer top-level await ») cible exactement cette ligne. Le constat est marqué « accepté » sur SonarCloud le 2026-09-12 avec cette contrainte en justification. Ne pas le solder dans le code : ça a été fait une fois le 2026-09-12 en corrigeant les constats ouverts, et repéré avant la fusion. Si l'analyse le rouvre après un déplacement de la ligne, le ré-accepter, pas le corriger.

**Un `await` de premier niveau y a coûté 3 à 5 points Lighthouse sur onze pages sur treize**, posé le 2026-09-09 par `86d8770` en soldant une promesse flottante, mesuré et retiré le 2026-09-10. Il rend l'évaluation du module d'entrée asynchrone et retarde tout le montage de React.

**La signature du diagnostic vaut pour toute régression de ce type** : `home` et `login` n'avaient **pas** bougé, à 95 et 97, pendant que les onze autres perdaient 3 à 5 points. Ce sont exactement les deux pages dont le plus grand élément n'attend pas React, `home` parce que son titre est peint dans la coquille (C2) et `login` parce que son LCP est adossé à une ressource. Quand une régression épargne précisément ces deux pages, elle est dans le chemin de montage, pas dans une page.

**Comment attribuer une régression Lighthouse à son commit**, la porte ne tournant qu'au déploiement : relever le score d'une page sur les runs passés, de part et d'autre du commit suspect.

```bash
for ID in $(gh run list --workflow ci-cd.yml --limit 30 --json databaseId --jq '.[].databaseId'); do
  J=$(gh run view "$ID" --json jobs --jq '.jobs[]|select(.name|startswith("Lighthouse"))|.databaseId')
  [ -n "$J" ] && gh api "repos/<DEPOT>/actions/jobs/$J/logs" | grep -E " performance:"
done
```

Le piège du piège : ce jour-là le blocage de facturation a commencé à 17:02, soit **entre le commit et le run qui l'aurait détecté**. Une porte qui ne tourne pas ne protège de rien, et son silence ressemble à du vert.

## C9 l'état déconnecté d'une route protégée se rend depuis la coquille

`apps/web/src/app/components/SessionGate.tsx` enveloppe `/my-events`, `/watchlist`, `/notifications` et `/new` dans `App.tsx`. Quand `hasSessionHint()` est faux, il rend l'état déconnecté **sans jamais rendre l'élément de page**, donc `React.lazy` ne demande pas le chunk de la route. Les quatre pages n'ont plus de branche `!user` ni de branche `authCheckFailed` : c'est le portail qui les porte, et `SessionGate.test.tsx` vérifie que la page n'est pas montée en comptant ses rendus.

Pourquoi ça paie là où quatre pistes avaient échoué avant : la porte mesure l'état **déconnecté**, et l'élément LCP y est le paragraphe de `SignedOutState`. Il n'attendait pas seulement React, il attendait le chunk de la page **et son évaluation**, soit 40 requêtes et environ 150 Ko sur `watchlist` pour afficher une phrase. Le simulateur de Lighthouse multiplie par 4 le travail du fil principal : c'est là que partaient les points, pas dans les allers-retours réseau, et c'est pourquoi précharger le chunk de la route n'aurait rien rendu (I2 le montrait déjà sur `/`). Gain sur le runner, médiane de 5 passes : `watchlist` 85 vers **95**, `my-events` 88 vers **95**, `notifications` 94 vers **95**, `new` 91 vers **94**, ce qui a permis de supprimer les planchers par page des deux premières.

Les deux pistes de coquille examinées en 2026-09 restent mortes, et pour des raisons qui n'ont pas bougé : **peindre le titre de page** échoue sur la condition de taille de C2, le `h1` faisant environ 2 900 px² contre 16 500 et 24 050 px² pour le paragraphe déconnecté, donc Chrome remplacerait le titre par le message ; et **peindre le message déconnecté** dans la coquille afficherait « Connectez-vous ou créez un compte » à chaque arrivée d'un utilisateur **déjà connecté**, la coquille ne pouvant pas connaître l'état de session avant que JavaScript tourne, le cookie étant HttpOnly. Un squelette gris n'est pas non plus un candidat LCP : Chrome ne retient que du texte, une image ou un fond chargé par `url()`. C9 est la troisième voie : sortir le plus grand élément du rendu de la **page** sans le sortir de React.

Deux choses à ne pas casser :

1. **Le discriminant est `hasSessionHint()`, pas `isLoading`.** Au premier rendu la requête de session est `isLoading` même quand aucune session n'est possible, et rendre les enfants dans ce cas suffit à déclencher l'import du chunk. La première version faisait exactement ça : l'affichage était juste, la mesure identique à l'avant, et rien ne signalait l'erreur. `fetchAuthMeForSession` rend `null` sans requête réseau quand l'indice est absent, donc l'état déconnecté est connu de façon synchrone.
2. **Une page dont l'état déconnecté rend autre chose qu'un `SignedOutState` n'entre pas dans ce portail.** `/settings` rend `GuestPreferencesSection`, une vraie fonctionnalité pour visiteur anonyme : elle reste dehors, et son LCP reste derrière son chunk.

## C10 Sentry se charge à la première interaction ou dix secondes après `load`, et la porte Lighthouse le charge aussi

`apps/web/src/main.tsx` monte React puis appelle `scheduleSentryStart()` : le SDK (475 Ko brut, 154 Ko sur le fil) part à la première interaction (`pointerdown`, `keydown`, `touchstart`, `wheel`) ou dix secondes après l'événement `load`, au premier temps libre du fil principal qui suit, jamais avant `createRoot().render()`. **Pas plus tôt, c'est mesuré le 2026-09-15 sur le premier déploiement où la porte le chargeait** : au premier temps libre après le montage, le SDK partait à 166 ms observés, avant les requêtes de données de la page, et son évaluation retardait le LCP des pages qui attendent l'API (`profile` 97 vers 83, `register` 90 vers 84, sous le plancher de 85, toutes les pages sauf `home` et `login` en baisse, la signature de C8). Décalé à 1,5 s après `load`, le LCP revenait mais le TBT passait de 106 à 712 ms : l'évaluation tombait alors dans la fenêtre FCP vers TTI, où toute tâche longue compte. Le coût du SDK se paie en LCP ou en TBT, il ne se cache nulle part dans la fenêtre de mesure ; la seule sortie est de le placer après elle. Les erreurs d'avant restent en file (point 1), et un utilisateur qui touche l'écran le déclenche aussitôt. Jusqu'au 2026-09-14, `boot()` faisait `await initSentry()` **avant** `import('@/app/App')` : mesuré en production, les dépendances de la coquille ne partaient qu'à 1,29 s au lieu de 0,92 s et le montage attendait l'évaluation du SDK. Deux choses tiennent ce gain :

1. **Les erreurs d'avant le SDK ne sont pas perdues.** `captureException` les met en file et `initSentry` les rejoue ; c'est ce qui autorise à charger tard. Ne pas remplacer la file par un `if (!api) return`.
2. **La porte Lighthouse construit avec un DSN factice** (`SENTRY_STUB_DSN` dans `scripts/lighthouse-run.mjs`, enveloppes acceptées par le stub sur `/api/1/envelope/`). Sans lui, `initSentry` retourne immédiatement et la porte mesure un démarrage que la production ne suit pas : c'est exactement ainsi que le `await` est resté invisible pendant des mois. Retirer le DSN du build de la porte fait remonter les scores pour une mauvaise raison.

L'instrumentation des routes (`wrapReactRouterRouting`) a disparu avec ce changement : elle exigeait que le SDK soit initialisé avant l'évaluation d'`App`. `browserTracingIntegration()` suffit, les transactions portent l'URL brute au lieu du motif de route, ce qui est sans conséquence à 10 % d'échantillonnage sur quelques centaines de requêtes par jour.

## C11 la suite Vitest tourne seule

`scripts/verify-local.cjs` joue toutes les portes sauf Vitest en trois voies concurrentes (node, dotnet, docker), puis la suite front **seule**, et seule la voie docker a le droit de déborder dessus, parce que son étape longue est le téléchargement de la base Trivy, réseau pur. Mesuré le 2026-09-15 : la chaîne séquentielle coûtait 16 min 45 s sous charge, dont 576 s de Vitest ; au calme la suite tient en ≈ 230 s, et elle est montée à 2 987 s sous charge. Ce que la charge produit n'est pas de la lenteur, c'est du **rouge sans rapport avec le code** : `Failed to start forks worker`, `Test timed out in 25000ms` sur `a11y.test.tsx > TechPage` (4 à 5 s au calme, 43 à 85 s sous charge), `Timeout waiting for worker to respond`. C'est la raison du passage à `maxForks: 2` le 2026-09-04 (`711f508`) et du budget axe de 60 s sur la page la plus lourde. Trois règles en découlent :

1. Ne rien lancer d'autre pendant la suite : ni serveur de dev, ni onglet du Browser pane, ni `dotnet build`. Un serveur Vite laissé allumé a fait passer la suite de 238 à 332 s et sauter `TechPage`.
2. Ne pas remettre les tests .NET, le lint ou le format en parallèle de Vitest dans `verify-local.cjs` pour gagner leur minute : c'est exactement le régime qui la rend rouge.
3. Ne pas baisser `HEAVIEST_PAGE_AXE_BUDGET` (60 000 ms) : la marge de 14× est ce qui garde la suite verte sous contention. Un chiffre pris sous charge a déjà ouvert une dette qui n'existait pas, refermée le 2026-09-10.

Avant d'accuser son diff sur un rouge Vitest, un vrai échec cite un **nom de test** et une assertion ; une famine cite un **nom de fichier**. Comparer les durées test par test avec un run de référence (`git checkout --detach HEAD~1`) : si des pages sans rapport ralentissent du même facteur, c'est la machine.

---

## C12 pool Mongo × instances Cloud Run ≤ connexions du cluster

Trois nombres se tiennent et aucun n'est posé au même endroit : le pool est de 20 connexions par instance (`DefaultMaxConnectionPoolSize` dans `ServiceCollectionExtensions.cs`, gardé par `AddMoviePicker_MongoClientPool_FitsEveryCloudRunInstanceUnderTheClusterConnectionCap`), `maxScale` est à 20 sur le service Cloud Run (annotation du service, jamais écrite par `deploy.yml`, elle survit aux déploiements), et le cluster accepte 500 connexions, dont une centaine à laisser aux opérateurs, à la sauvegarde nocturne et à la dev qui partage le cluster. Monter l'un sans baisser l'autre casse en silence : les instances au-delà du budget échouent à se connecter, la readiness passe rouge et l'alerte « base injoignable » part alors que la base va bien, précisément le jour de charge.

Piège découvert en posant le test, le 2026-09-15 : `MongoUrl.MaxConnectionPoolSize` vaut 100 quand la chaîne de connexion ne dit rien, jamais 0, donc le « pool à 50 » de la passe du 2026-09-07 (`if (url.MaxConnectionPoolSize == 0)`) n'a jamais été appliqué. La prod tournait à 100 par instance, soit 2 000 connexions possibles pour 500. Une chaîne qui porte `maxPoolSize=` garde sa valeur, c'est la seule façon de changer le pool sans toucher au code.

## C13 `UpdateAsync` écrit les champs connus, il ne remplace pas le document

`MongoEventRepository.UpdateAsync` et `MongoUserRepository.UpdateAsync` passent par `KnownFieldsUpdate.From(doc)` : un `$set` des champs sérialisés plus un `$unset` des champs mappés absents, jamais `ReplaceOneAsync`. Les documents portent `BsonIgnoreExtraElements`, donc une révision de l'API qui ne connaît pas un champ le lit sans erreur ; avec `ReplaceOne` elle l'effaçait à sa prochaine écriture, ce qui a fait perdre `Winners`, `Recurrence`, `EventTemplates` et `IsWatchlistPublic` à tout retour arrière de la V1.6 vers la V1.5. Depuis le 2026-09-15, un champ inconnu fait l'aller-retour, et un champ connu remis à `null` disparaît bien du document comme avant : les tests `*_KeepsTheFieldsWrittenByANewerApiVersion` et `*_ClearingAnOptionalField_RemovesItFromTheDocument` de `RepositoryContractTests` gardent les deux moitiés. Revenir à `ReplaceOneAsync`, ou écrire un nouveau document en entier sans passer par `KnownFieldsUpdate`, rend `rollback.yml` destructif sans qu'aucun test d'API ne le voie. La protection ne vaut que pour les révisions qui portent le changement : revenir vers une révision antérieure au 2026-09-15 efface encore.

## C14 une session révoquée reste valable jusqu'à 30 s sur les autres instances

`AuthTicketCache` (`Infrastructure/Web/CachedAuthTicketStore.cs`) garde chaque ticket de session 30 s en mémoire d'instance pour ne pas relire `auth_sessions` à chaque requête, et `MongoAuthSessionInvalidator` n'invalide que la génération de l'instance qui traite la révocation. « Déconnecter partout », un changement de mot de passe ou la suppression du compte laissent donc une fenêtre d'au plus 30 s pendant laquelle un cookie déjà présenté à une **autre** instance y passe encore. C'est accepté, et c'est écrit dans `SECURITY.md` comme hors périmètre : la lecture Mongo par requête est exactement ce que le cache évite, et une génération partagée en base coûterait cette lecture. Ne pas « corriger » en allongeant le TTL (la fenêtre suit) ni en le supprimant (retour au coût d'avant le 2026-09-12) ; si la fenêtre devient inacceptable, la seule voie propre est un compteur de génération par utilisateur lu depuis le cache partagé (`ISharedCache`), au prix d'un aller-retour par requête authentifiée.

# Impasses

Mesuré, sans gain, retiré. Ne pas rejouer sans une raison neuve.

- **I1 regrouper la couche `shared/` en un chunk.** Divise les requêtes par deux (76 vers 43 sur `watchlist`) et ne gagne aucun point. Coûte là où on ne regardait pas : `register` passe de 87 à 84, sous son plancher. Regrouper `shared/` la rend eager, donc une page d'authentification télécharge les 92 Ko de la couche entière. Leçon générale : **mesurer les pages légères autant que les lourdes**, la porte peut rester rouge en changeant simplement de page.
- **I2 précharger le chunk de la route d'accueil sur `/`.** 0 point. L'hypothèse était fausse : le LCP n'attend pas les 9 Ko du chunk, il attend React.
- **I3 découper le bundle pour sauver le LCP.** Les 185 Ko d'i18n retirés du chemin critique n'ont rendu qu'**un** point, parce que ce sont des chaînes de caractères et pas du code : un objet littéral s'analyse bien plus vite que de l'exécutable à poids égal. Le mur est `react-vendor` (220 Ko, 665 ms de bootup) et il ne se contourne pas par le bundling. Le seul levier est de sortir le plus grand élément du rendu React, voir C2.
- **I4 desserrer la porte Lighthouse** (baisser un seuil global, retirer une page, la repasser non bloquante). Le déficit est réel et mesuré ; c'est cette porte qui a détecté que la production ne se déployait plus.
- **I9 annoncer d'avance la fermeture des imports statiques de la coquille** (un `modulepreload` sur chaque dépendance statique de l'entrée et de `App`, six chunks de plus que ceux que Vite pose). Retire bien une vague réseau avant le montage de React, et ne gagne que 0,15 s de LCP en local. Sur le runner, l'échange est perdant : les douze pages dont le plus grand élément vient du rendu React gagnent 1 point, et les **deux** dont il n'en vient pas en perdent 2 et 8, `home` parce que son titre est peint depuis le document (C2) et `profile` parce que son LCP est adossé à une image. Six requêtes prioritaires de plus dans la première vague passent devant cet élément-là. Mesuré dans les deux sens : en la retirant, `profile` repasse de 88 à 97 et les douze autres ne perdent rien, elles gagnent même 1 point de plus. Leçon générale : **avant d'ajouter quoi que ce soit à la première vague, regarder les pages dont le LCP n'attend pas React**, ce sont les seules que ça peut faire reculer, et elles sont aussi les seules instables d'un run à l'autre.
- **I5 `mongodump --oplog`** pour la cohérence transactionnelle : impose un dump de l'instance entière et des droits supplémentaires.
- **I7 descendre zizmor au seuil `low`** : 9 constats cosmétiques. Le seuil `medium` est vert et n'attrape que du sérieux.
- **I10 regrouper les petits modules partagés entre pages en chunks « entries-aware » (rolldown `codeSplitting.groups`, `entriesAware: true`).** Mesuré le 2026-09-14 sur le build, en brotli. Avec un seuil de fusion à 12 Ko : `login` passe de 18 fichiers / 111,7 Ko à 14 fichiers / **141,9 Ko**, parce que les sous-groupes trop petits sont fusionnés avec un voisin chargé par d'autres pages, et la première vague de la coquille passe de 5 à 16 fichiers, soit exactement ce qu'I9 a mesuré perdant. À 3 Ko, `login` redescend à 7 fichiers / 107,7 Ko mais `my-events` prend 14 Ko et `home` 8 Ko. À 0, c'est le découpage automatique. Ce qui a été gardé est le seul geste qui gagne partout : la fermeture statique de `App` capturée dans son chunk (`appShellClosurePlugin`), qui retire 6 à 7 fichiers par page et 3 à 4 Ko à chacune sans rien ajouter à la première vague. Leçon : sous rolldown, le seul regroupement sans perdant est celui qui suit le graphe réel des imports, pas un seuil de taille.
- **I11 accélérer la suite Vitest elle-même.** Mesuré le 2026-07-17 : 60 % du temps mural est la recréation de l'environnement jsdom par fichier, et l'isolation est obligatoire parce que 19 fichiers utilisent `vi.mock`. Sans effet : plus de forks (les 12 cœurs saturent, forks/10 et forks/3 plus lents que forks/4), `pool: threads`, déplacer la logique pure vers l'environnement `node`. Efficace mais rejeté : `--no-isolate` (5× plus rapide, casse 147 tests) et happy-dom (-30 %, casse 3 tests, et surtout diverge de la CI qui tourne en jsdom sur un projet a11y-first). Le gain de `verify:local` vient de l'ordonnancement des autres portes (C11), pas de la suite. Reste à mesurer au calme, jamais sous charge : `maxForks` 2 vers 4, remis à 2 le 2026-09-04 pour la stabilité.
- **I12 rapprocher le cluster Atlas de Cloud Run.** Le cluster est chez AWS en eu-west-1 (Irlande), l'API sur GCP en europe-west1 (Belgique). Mesuré le 2026-09-15 sur 60 sondes `/health/ready` de la production, un aller-retour Mongo chacune : p50 6 ms, p90 9 ms, max 175 ms sur pool froid. Un cluster sur GCP dans la même région ramènerait l'aller-retour à 1 ou 2 ms, soit au plus 5 ms par opération et environ 30 ms sur un cycle de sondage complet dont les 15 allers-retours sont en partie parallèles, contre une migration de cluster avec bascule de chaîne de connexion et interruption. Ce n'est pas là que va le temps : la page soirée attend TMDB (DEBT-005) et le nombre d'allers-retours (DEBT-008), pas leur longueur. Ne pas rejouer sans un changement de région de Cloud Run ou un palier Atlas qui n'existe que sur GCP.
- **I8 espacer les workflows planifiés pour économiser des minutes GitHub Actions.** Mesuré au 2026-09-10 sur l'historique des runs : `security-scan.yml` tourne en 45 à 80 s une fois par semaine (≈ 5 min/mois), `registry-cleanup.yml` une fois par mois (≈ 1 min/mois), `backup-mongo.yml` en ≈ 90 s par nuit (≈ 45 min/mois). Total ≈ 51 min/mois, contre ≈ 450 min pour 20 runs de CI : les crons ne sont pas le poste de coût, et le seul qui pèse est le seul filet en cas de perte de données. Espacer la sauvegarde à deux jours économiserait 22 min/mois en doublant le point de restauration acceptable, ce qui est un mauvais échange sur des données personnelles non reconstituables. Ne pas rejouer sans un changement de cadran : soit le quota redevient contraignant après le passage du dépôt en public, soit la sauvegarde grossit assez pour changer l'ordre de grandeur.
