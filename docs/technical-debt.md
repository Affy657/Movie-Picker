# Dette technique

Fichier de travail pour agent. Il n'est pas destiné à être lu par un humain : il existe pour qu'une session future puisse reprendre une dette sans contexte préalable.

## Protocole

1. Avant d'agir sur une entrée, exécuter son `verify`. Ce fichier vieillit ; **sauf mention contraire dans l'entrée**, une sortie signifie « encore ouvert » et une sortie vide signifie « déjà réglé, supprimer l'entrée sans rien faire d'autre ». Une entrée qui demande de lire un nombre plutôt qu'une présence le dit dans son `verify`.
2. Une entrée `state: agent` peut être traitée en autonomie. `state: humain` demande un geste que l'agent ne peut pas faire (le champ `bloque` dit lequel). `state: differe` ne se traite pas tant que son `declencheur` n'est pas observé.
3. Fin de traitement : supprimer l'entrée entière. Ne pas la cocher, ne pas la garder en « fait », git porte l'historique.
4. Nouvelle entrée : reprendre exactement le schéma de champs ci-dessous, avec un identifiant `DEBT-NNN` jamais réutilisé. Prochain libre : `DEBT-035`.
5. Ce fichier ne contient que de la dette, c'est-à-dire du code ou de l'infrastructure qui existe et fonctionne moins bien qu'il ne devrait. Une feature à construire va dans `roadmap.md`.
6. **Aucun identifiant d'infrastructure ici** : pas d'adresse de compte de service, pas de nom de bucket, pas d'identifiant de compte. Le dépôt a vocation à devenir public, et une faiblesse décrite avec sa cible se lit comme un mode d'emploi. Nommer le fichier ou la console où l'identifiant se relève, ou employer un espace réservé `<COMME_CECI>` dans les commandes. La table des gabarits, et la commande qui relève chaque valeur, sont dans `infra/README.md`.
7. Deux sections en fin de fichier n'obéissent pas à ce schéma et ne se traitent jamais : **Contraintes** liste ce qui casse en silence si on y touche, **Impasses** liste ce qui a déjà été essayé et mesuré sans gain. Les lire avant d'optimiser quoi que ce soit sur le front ou de toucher au déploiement.

Schéma : `state` / `impact` / `ou` / `verify` / `fix` / `fini-quand` / `piege` / `refs`. Champs absents = sans objet.

---

## DEBT-001 l'API Cloud Scheduler est désactivée, les rappels et les soirées récurrentes ne partent pas

- state: humain
- bloque: écritures `gcloud` refusées par le classifieur d'auto-mode ; l'utilisateur doit lancer la commande
- impact: prod. Les deux routes `POST /api/v1/scheduler/*` répondent 503 faute de planificateur. Aucun rappel J-1, 1 h ni « en suspens » ne part, et le balayage des soirées récurrentes ne tourne pas, celles-ci ne se reconduisent qu'à la clôture ou à l'ouverture de « Mes soirées ». Le 503 est volontaire, préféré à un échec silencieux.
- ou: `.github/workflows/deploy.yml`, l'étape « Rappels de soirée et soirées récurrentes »
- verify: `gcloud services list --enabled --filter="config.name:cloudscheduler.googleapis.com" --format='value(config.name)'` ; encore ouvert tant que la sortie est vide
- fix:
  ```bash
  gcloud services enable cloudscheduler.googleapis.com
  gh workflow run deploy.yml --ref master -f target=api
  ```
- fini-quand: les deux jobs Cloud Scheduler existent, `movie-picker-event-reminders` et `movie-picker-recurring-events`, et les deux endpoints ne répondent plus 503
- piege: **la moitié de l'entrée d'origine était périmée, mesuré le 2026-09-10.** Le secret `SCHEDULER_TOKEN` **existe** depuis le 2026-09-09 17:04, il ne reste que l'activation de l'API. Second piège, payé le 2026-09-10 : l'étape ne gardait que l'existence du secret, donc avec un secret présent et l'API désactivée elle sortait en `SERVICE_DISABLED` et faisait **échouer le déploiement API après que la révision ait pris 100 % du trafic**. Le run affichait rouge alors que l'API était en ligne et servait. Une seconde garde a été posée, une planification absente est désormais un avertissement comme le secret absent. Troisième piège, celui de l'entrée d'origine : aucune IAM à ajouter, le compte de service a déjà `roles/editor` et `roles/secretmanager.secretAccessor` au niveau projet, et une session précédente avait annoncé à tort qu'il fallait `cloudscheduler.admin`.

## DEBT-002 authentification keyless écrite mais jamais fusionnée

- state: humain
- bloque: le merge est faisable par un agent, mais la configuration Workload Identity Federation côté GCP et le rôle côté AWS demandent la console
- impact: les déploiements s'authentifient avec des identifiants statiques de longue durée (`GCP_SA_KEY`, clés AWS)
- ou: branche `chore/ci-keyless-oidc`, commit `eb72fbb`, non fusionnée depuis le 2026-06-12
- verify: `git merge-base --is-ancestor chore/ci-keyless-oidc master && echo REGLE || echo OUVERT`
- fix: configurer WIF et le rôle AWS, puis réécrire le patch. **La branche ne se rebase plus** : ses huit lignes modifiaient les jobs `deploy-api` et `deploy-front` de `ci-cd.yml`, partis dans `deploy.yml` le 2026-09-10. `git merge-tree master chore/ci-keyless-oidc` rend un conflit sur `ci-cd.yml` dont le contexte n'existe plus. Prendre l'intention, pas le diff. Côté GCP, l'authentification n'a plus qu'un seul endroit depuis le 2026-09-15 : `.github/actions/gcloud-auth/action.yml`, appelée par les cinq jobs qui parlent à GCP ; c'est là que `credentials_json` devient `workload_identity_provider`, et nulle part ailleurs.
- fini-quand: plus aucun secret d'identifiant statique dans les secrets GitHub du dépôt
- refs: recoupe DEBT-003 et le lot Terraform 5 de `roadmap.md`, qui traite le même sujet au fond

## DEBT-003 une clé d'accès du compte root AWS existe encore

- state: humain
- bloque: la suppression d'une clé root ne se fait que dans « Security credentials » du compte root, aucune API n'y donne accès
- impact: la clé root n'a aucune limite de périmètre. Sa compromission donne le compte entier, y compris la facturation et la suppression des sauvegardes.
- verify: `aws iam get-account-summary --query 'SummaryMap.AccountAccessKeysPresent'` ; encore ouvert tant que la réponse vaut `1`
- fix: configurer le profil `aws` local sur une identité IAM dédiée aux gestes d'exploitation, vérifier que plus aucun script local ne dépend du profil root, puis supprimer la clé root.
- fini-quand: `AccountAccessKeysPresent` vaut `0` et `aws sts get-caller-identity` ne rend plus un ARN en `:root`
- piege: **la moitié de l'intitulé d'origine était périmée, mesuré le 2026-09-10.** Le volet CI est déjà fait : l'utilisateur `movie-picker-github-actions` existe depuis le 2026-03-16, porte la politique gérée `MoviePickerDeploy` dont les trois déclarations correspondent au caractère près à `infra/iam-github-actions-deploy-policy.json`, et sa clé est active. Le bucket du front est fermé sur les quatre verrous (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`) et sa politique n'est pas publique. Le MFA du compte root est actif. **Ce qui reste tient en un point** : `aws sts get-caller-identity` en local rend un ARN `:root`, donc la clé root est celle du poste de travail, pas celle de la CI. Le risque n'est pas dans le dépôt ni dans la chaîne de déploiement, il est dans le fichier d'identifiants local.
- refs: DEBT-002 le supprime au fond en retirant AWS de la chaîne. Ne pas invoquer C7 comme motif : les identifiants d'infrastructure sont sortis du dépôt le 2026-09-10 et n'ont jamais été le sujet de cette entrée.

## DEBT-004 en-tête frame-ancestors absent du front

- state: humain
- bloque: aucune infrastructure CloudFront décrite dans le dépôt, la policy se pose en console ou en CLI AWS
- impact: la page peut être embarquée dans une iframe tierce
- ou: distribution CloudFront `<ID_DISTRIBUTION_CLOUDFRONT>`, alias `web.movie-picker.fr`
- verify: `curl -sI https://web.movie-picker.fr | grep -i content-security-policy` ; encore ouvert si la directive `frame-ancestors` est absente
- fix: Response Headers Policy sur la distribution, en repartant de `infra/cloudfront-response-headers-policy.json`
- piege: le report initial était motivé par la remise du dossier RNCP Bloc 2, remis depuis le 2026-07-23. Le motif a expiré, ne pas le réinvoquer.

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
- declencheur: approcher la moitié du plafond d'opérations du palier Atlas, chiffre inconnu aujourd'hui, voir DEBT-009
- impact: environ 15 allers-retours Mongo par cycle et par participant, soit environ 26 opérations par seconde pour une soirée de 6, et environ 260 à 10 soirées simultanées
- verify: `grep -n EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS apps/web/src/features/events/hooks/useEventLive.ts` ; encore ouvert tant que la constante existe, c'est-à-dire tant qu'on sonde
- fix: passer en SSE
- piege: ce n'est pas un défaut. Le sondage reste le bon choix aujourd'hui, zéro infrastructure et Cloud Run n'aime pas les connexions longues. C'est le paramètre qui fixe la limite, à ne changer que sur le déclencheur.
- refs: DEBT-033 porte la conception du remplacement et le plafond produit qui dépend de cette limite

## DEBT-009 palier Atlas jamais vérifié

- state: humain
- bloque: l'accès MCP Atlas est désactivé pour les deux organisations du compte, un Organization Owner doit activer l'accès client IA
- impact: le chiffre à confronter aux 260 opérations par seconde de DEBT-008 est inconnu, donc son déclencheur est inobservable. La moitié est levée le 2026-09-15 : **le cluster accepte 500 connexions** (`serverStatus().connections`, 14 en cours), replica set de 3 nœuds en MongoDB 8.0, dev et prod sur le même cluster, 61 Mo de stockage à eux deux. Restent inconnus la limite d'opérations par seconde et l'espace disque du palier.
- verify: tenter `atlas-list-clusters` via le MCP mongodb ; encore ouvert si l'accès est refusé (refusé le 2026-09-15 encore)
- fini-quand: le plafond d'opérations par seconde et l'espace disque du palier sont connus et reportés dans DEBT-008 et DEBT-033
- piege: sans le MCP, tout ce que le cluster dit de lui-même se lit par `mongosh` sans rien installer : `docker run --rm mongo:7 mongosh --quiet "$MONGODB_URI" --eval 'db.serverStatus().connections'`, et `db.stats()` par base pour les tailles. Le palier lui-même (M0, Flex) ne se lit que dans la console Atlas, onglet du cluster ; c'est là que se trouve la limite d'opérations par seconde.

## DEBT-010 deux composants trop chargés

- state: differe
- declencheur: une feature repasse dans le fichier concerné. Ne jamais en faire un chantier isolé.
- impact: densité d'état qui rend chaque modification risquée
- ou: `apps/web/src/features/events/pages/event-detail/EventDetailSession.tsx` (924 lignes) et `apps/web/src/features/events/components/HostEventSettingsPanel.tsx` (624 lignes)
- verify: `wc -l apps/web/src/features/events/pages/event-detail/EventDetailSession.tsx apps/web/src/features/events/components/HostEventSettingsPanel.tsx` ; cette commande sort toujours quelque chose, lire les nombres : encore ouvert tant qu'un des deux dépasse 600 lignes
- fix: extraire par responsabilité vers les primitives partagées existantes avant d'écrire du local
- piege: un troisième fichier, `movieCardParts.tsx`, figurait ici sur la foi d'un relevé à 1096 lignes. Il en fait 436 depuis l'extraction des briques de listes. Mesurer avant de croire un relevé de cette liste.

## DEBT-025 la fiche film est montée fermée pour chaque carte de liste

- state: agent
- impact: `movieCardParts.tsx` rend un `MovieDetailsModal` (et son `<dialog>`) par film affiché, fermé, sur la home, les vitrines, la watchlist et le profil : autant de nœuds DOM inutiles tant que personne ne clique, et le chunk de la fiche (6 Ko brotli plus ses styles) est dans la fermeture statique de toutes ces pages
- ou: `apps/web/src/features/movies/components/movieCardParts.tsx:476`, plus les cinq autres appelants (`grep -rln MovieDetailsModal apps/web/src --include=*.tsx`)
- verify: `grep -n "import MovieDetailsModal" apps/web/src/features/movies/components/movieCardParts.tsx` ; encore ouvert tant que l'import est statique
- fix: même recette que la page soirée (2026-09-14) : `lazy()` plus `useEverOpened` pour ne monter la fiche qu'à la première ouverture, `useIdlePrefetch` pour que le premier clic ne paie pas le chargement
- piege: les tests de ces pages ouvrent la fiche avec des `getBy` synchrones après le clic, ils passent en `findBy` avec le chargement paresseux. Compter l'ampleur avant de commencer, il y a six appelants.

## DEBT-026 le flou de fond des barres collantes n'a jamais été mesuré au défilement

- state: differe
- declencheur: un signalement de défilement saccadé sur mobile, ou une mesure de fluidité posée sur un Android milieu de gamme
- impact: `backdrop-filter: blur(12px)` sur la barre de `AppShell` et `blur(10px)` sur `EventDetailHeader` recomposent la zone floutée à chaque image pendant le défilement ; c'est le premier suspect connu de saccades sur mobile, sans preuve ici
- ou: `apps/web/src/app/components/AppShell.module.css:54`, `apps/web/src/features/events/pages/event-detail/EventDetailHeader.module.css:346`
- verify: `grep -rn "backdrop-filter" apps/web/src --include=*.css`
- fix: mesurer d'abord (Performance panel, frames longues au défilement) ; si confirmé, fond opaque légèrement translucide sans flou, ou flou réservé à `(hover: hover)`
- piege: ne pas retirer le flou sur une intuition, c'est un choix visuel de l'utilisateur. Mesure avant geste.

## DEBT-012 le site n'est pas enregistré dans Search Console

- state: humain
- bloque: la vérification de propriété du domaine, qui passe par la console Google et un enregistrement DNS ou un fichier posé à la racine
- impact: aucune remontée d'indexation, de requêtes ni d'erreurs de couverture. Le `sitemap.xml` est généré et servi, mais n'est déclaré nulle part.
- ou: rien dans le dépôt, tout est côté console Google
- verify: ouvrir Search Console sur la propriété `movie-picker.fr` ; encore ouvert si la propriété n'existe pas ou n'est pas vérifiée
- fix: créer la propriété, la vérifier, puis y soumettre `https://web.movie-picker.fr/sitemap.xml`
- fini-quand: la propriété est vérifiée et le sitemap soumis
- piege: le front n'est ni sur l'apex ni sur `www` mais sur `web.movie-picker.fr` (voir DEBT-014). Déclarer la mauvaise propriété donne une console qui ne verra jamais aucun trafic.
- refs: le volet prérendu du chantier SEO est livré depuis le 2026-09-10, `apps/web/scripts/prerender.mjs`. Il ne restait que cette moitié.

## DEBT-014 le domaine www ne répond pas

- state: humain
- bloque: le CNAME se change chez OVH à la main, il n'y a pas de CLI OVH
- impact: un visiteur qui tape `www.movie-picker.fr` n'obtient rien. Le front live est sur `web.movie-picker.fr`, et `www` pointe vers une redirection OVH morte (A `213.186.33.5`).
- ou: `docs/runbook-migration-domaine-www.md`, écrit et jamais exécuté
- verify: encore ouvert si la commande échoue ou ne renvoie pas 200.
  ```bash
  curl -sS -o /dev/null -w '%{http_code}' --max-time 10 https://www.movie-picker.fr
  ```
- fix: suivre le runbook. Élargir `ALLOWED_ORIGINS` aux deux origines, repointer le CNAME, observer les sondes. Puis reprendre les littéraux `web.movie-picker.fr` du dépôt, dont les deux liens du README et le bandeau `apps/web/public/og-image.png` qu'il affiche, l'URL y étant gravée dans l'image : la régénérer avec `node apps/web/scripts/generate-og-image.mjs`.
- fini-quand: `www.movie-picker.fr` sert le front, plus aucun littéral `web.movie-picker.fr` hors `archive/`, et `docs/runbook-migration-domaine-www.md` est supprimé, il n'a plus d'objet
- piege: les smoke tests de la CI ne référencent aucun de ces hôtes en dur, l'API vient de `secrets.VITE_API_URL` et le front de la première entrée de `vars.ALLOWED_ORIGINS` : ils restent justes après la migration sans qu'on y touche. Le certificat ACM est un wildcard `*.movie-picker.fr`, il couvre déjà `www`.
- refs: le lot Terraform 4 de `roadmap.md` fait la même bascule DNS en décommissionnant AWS. Si ce lot est engagé, traiter la dette ici serait du travail jeté.

## DEBT-015 le compte de service GCP de la CI porte roles/editor

- state: humain
- bloque: console ou CLI GCP, hors de portée de l'agent (voir DEBT-001, les écritures `gcloud` sont refusées)
- impact: le projet n'a qu'un seul compte de service et il porte `roles/editor`. Il déploie, lit tous les secrets et écrit dans le bucket de sauvegarde, là où trois rôles distincts suffiraient.
- verify: lister les rôles du compte de service de la CI dans la console IAM du projet, ou en CLI avec son adresse relevée là. Encore ouvert tant que `roles/editor` figure dans la liste.
- fix: rôles au moindre privilège par usage
- piege: **`roles/editor` masque aujourd'hui deux liaisons IAM absentes** qui redeviendront nécessaires au moment de la réduction, sinon la sauvegarde casse sans prévenir :
  ```bash
  gcloud secrets add-iam-policy-binding MONGODB_URI --member="serviceAccount:<SA_CI>" --role=roles/secretmanager.secretAccessor
  gcloud storage buckets add-iam-policy-binding gs://<BUCKET_SAUVEGARDE> --member="serviceAccount:<SA_CI>" --role=roles/storage.objectAdmin
  ```
- refs: pendant GCP de DEBT-003 (AWS). Le lot Terraform 5 de `roadmap.md` traite les deux au fond.

## DEBT-027 `SENTRY_AUTH_TOKEN` est encore un secret de dépôt, et deux clés cloud désactivées attendent leur suppression

- state: humain
- bloque: un jeton d'organisation Sentry ne se crée que dans son interface (Settings → Auth Tokens), l'API MCP ne l'expose pas ; et la valeur d'un secret GitHub ne se relit pas, donc il faut le ressaisir
- impact: c'est le seul secret de déploiement lisible par n'importe quel workflow sur n'importe quelle branche, tout le reste vit dans l'environnement `production` depuis le 2026-09-15 (politique de branche `master`, clés GCP et AWS recréées et vérifiées, anciennes désactivées). Portée du jeton : créer des releases et des deploys Sentry, pas de lecture de données.
- ou: Settings → Secrets and variables → Actions, secret de dépôt `SENTRY_AUTH_TOKEN` ; jobs `deploy-api`, `deploy-front` de `deploy.yml` et `rollback` de `rollback-front.yml`
- verify: `gh secret list --json name --jq '[.[].name] | join(",")'` rend `SENTRY_AUTH_TOKEN,SONAR_TOKEN`. Réglé quand il ne rend plus que `SONAR_TOKEN`.
- fix: créer un nouveau jeton d'organisation Sentry (scopes `project:releases` et `org:read`), puis :
  ```bash
  gh secret set SENTRY_AUTH_TOKEN --env production
  gh secret delete SENTRY_AUTH_TOKEN
  ```
  révoquer l'ancien jeton dans Sentry. Puis, après un déploiement vert avec les nouvelles clés, supprimer les deux anciennes clés désactivées le 2026-09-15 : la clé utilisateur du compte de service de la CI datée du 2026-03-16 (`gcloud iam service-accounts keys list` puis `keys delete`) et la clé d'accès de l'utilisateur IAM `movie-picker-github-actions` datée du même jour (`aws iam list-access-keys` puis `delete-access-key`).
- fini-quand: `verify` vide, et les listes de clés GCP et AWS ne portent plus que la clé active de 2026-09-15
- piege: `SONAR_TOKEN` reste volontairement au niveau du dépôt, le job `sonar` tourne sur les PR et les branches `v*`, que la politique de branche de `production` exclurait. Tout job qui lit un secret de déploiement porte `environment: production` ; sans cette ligne il lirait une valeur vide.
- refs: DEBT-002 et le lot Terraform 5 remplacent ces clés par une fédération d'identité

## DEBT-028 du français subsiste dans le code, les tests et les messages de l'API

- state: agent
- impact: la règle « Langue » d'AGENTS.md (2026-09-15) veut tout le dépôt en anglais hors i18n et documentation. Mesuré ce jour-là, hors `.github/`, `scripts/`, `apps/web/scripts/`, `configs/` et `playwright.config.ts` déjà traduits : 154 fichiers de tests web et 23 fichiers de code web (2 670 lignes accentuées, surtout des noms de tests), 89 fichiers de tests API et 91 fichiers de code API (810 lignes : messages `throw new`, `LogInformation`, `LogWarning`, données de seed), 6 fichiers `e2e/` (26 lignes).
- ou: `grep -rlE "[éèêàçù]" apps/web/src --include=*.ts --include=*.tsx | grep -v i18n/locales`, même chose sur `apps/api-dotnet --include=*.cs` et `e2e/`
- verify: les deux `grep` ci-dessus rendent des fichiers. Réglé quand ils ne rendent plus que des fichiers de `i18n/locales/`.
- fix: par lots, un par catégorie, chacun avec `verify:local` vert : (1) noms de tests web et e2e, (2) noms de tests API, (3) messages de journal de l'API et commentaires résiduels, (4) messages d'exception. Le lot 4 n'est pas une traduction : `apps/web/src/shared/api/apiError.ts:23` affiche `e.message` tel quel, donc `throw new NotFoundException("Soirée introuvable")` est une chaîne d'interface en français. Remplacer chaque message par un code stable (`event.not_found`), le front le traduit par les locales, et l'API garde un message anglais de secours pour les clients qui ne sont pas le front.
- fini-quand: `verify` vide et aucune chaîne française nouvelle dans un fichier touché depuis
- piege: les données de seed (`Léa Moreau`, `Soirée horreur`) sont du contenu produit, pas du code : elles restent en français. Les noms de tests décrivent un comportement, les traduire ne doit pas en changer le sens ; relire chaque `it(...)` plutôt que passer un outil.

## DEBT-029 `GET /events/mine` écrit en base

- state: differe
- declencheur: DEBT-001 réglé, c'est-à-dire Cloud Scheduler qui appelle `POST /api/v1/scheduler/recurring-events` en production
- impact: une lecture qui écrit. `ListMyEventsHandler` crée les occurrences suivantes des soirées récurrentes et nettoie les watchlists des soirées terminées à chaque affichage de la liste, parce que rien d'autre ne le fait en production tant que le scheduler est coupé. Le coût est payé par l'utilisateur qui ouvre la page, et un GET n'est pas idempotent.
- ou: `apps/api-dotnet/MoviePicker.Api/Application/UseCases/ListMyEvents/ListMyEventsHandler.cs`, appels à `RunForCreatorAsync` et `RunForEventsAsync` en tête de `HandleAsync`
- verify: `grep -n "RunForCreatorAsync\|RunForEventsAsync" apps/api-dotnet/MoviePicker.Api/Application/UseCases/ListMyEvents/ListMyEventsHandler.cs` ; encore ouvert tant que les deux appels sont dans le chemin de lecture
- fix: retirer les deux appels une fois le scheduler en service, `RecurringEventPass` et `FinishedEventWatchlistPass` restant joués par `SchedulerController`
- piege: ne pas retirer les appels avant DEBT-001, les soirées récurrentes cesseraient de se renouveler en production sans que rien ne le signale. Depuis le 2026-09-15, le champ `version` du document soirée empêche au moins deux passes concurrentes (lecture et scheduler) de créer deux occurrences.

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

## DEBT-024 le premier gagnant s'écrit encore dans l'ancien champ `winnerMovieId`

- state: differe
- declencheur: la V1.6 est en prod depuis au moins un cycle de retour arrière possible (`rollback.yml` ne peut plus viser une révision antérieure à la liste `winners`)
- impact: aucune fonctionnalité en jeu, deux vérités en base. `EventDocumentMapper.ToDocument` recopie `Winners[0]` dans `winnerMovieId` pour qu'une révision antérieure lise encore un gagnant, alors que `winnerPickMethod` et `winnerPickedAt` ne sont plus écrits. Le compteur de soirées gagnées par film doit interroger les deux formes, et tout lecteur futur du document a deux champs à réconcilier.
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/Mongo/EventDocumentMapper.cs` (`ToDocument`, `ToWinners`), `MongoEventRepository.CountByWinnerMovieIdsAsync`
- verify: la double écriture est toujours là.
  ```bash
  grep -n "WinnerMovieId" apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/Mongo/EventDocumentMapper.cs
  ```
- fix: un script de reprise qui copie `winnerMovieId` + `winnerPickMethod` + `winnerPickedAt` dans `winners` sur les documents qui n'ont pas encore la liste, puis retirer la ligne de `ToDocument`, le repli de lecture de `ToWinners`, les trois champs de `EventDocument` et le `Or` du compteur. Le test `ToDocument_KeepsTheFirstWinnerInTheLegacyField` se retourne à ce moment.
- fini-quand: `EventDocument` ne porte plus que `winners`, et un document de prod pris au hasard n'a plus de champ `winnerMovieId`
- piege: ne pas retirer la lecture de repli avant la reprise, les soirées terminées avant la V1.6 perdraient leur gagnant dans l'historique. Depuis le 2026-09-15, `UpdateAsync` n'écrit que les champs connus (voir C13) : un retour arrière vers une révision postérieure à cette date n'efface plus `winners`, le déclencheur ne vaut que pour les révisions antérieures.

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
- impact: `EventConfig.MaxParticipantsCap = 500` alors qu'en sondage actif chaque participant coûte environ 4,3 opérations Mongo par seconde (15 allers-retours par cycle de 3,5 s, DEBT-008). Une soirée pleine vaut ~2 150 opérations par seconde et jusqu'à 500 clients, sur un cluster partagé qui accepte 500 connexions et dont la limite d'opérations est inconnue (DEBT-009). Le plafond est inatteignable, et un hôte qui le vise fait tomber la base pour toutes les soirées en cours.
- ou: `apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs` (`MaxParticipantsCap`), `apps/web/src/features/events/hooks/useEventLive.ts`
- verify: `grep -n "MaxParticipantsCap = " apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs` ; lire le nombre : encore ouvert tant qu'il dépasse 50 et que le front sonde encore
- fix: deux volets, dans cet ordre.
  1. Tant que le sondage reste le mode de synchronisation : plafond à 50, ce que le cluster tient avec plusieurs soirées simultanées.
  2. La synchronisation temps réel de V1.7 (`L`), évaluée le 2026-09-15. **Retenir SSE avec vérification de version côté serveur** : `GET /api/v1/events/{slug}/stream` en `text/event-stream`, où chaque instance relit `{version}` de la soirée une fois par seconde par soirée connectée (`Event.Version` existe déjà, et `writeSeq` bouge à chaque écriture sous verrou) et envoie un événement « changé » à ses clients, qui refont alors leur GET habituel. Coût : 1 opération par seconde et par soirée quel que soit le nombre de participants, zéro dépendance nouvelle, `EventSource` reconnecte seul avec `Last-Event-ID`. Écarter WebSocket (les votes et propositions restent des POST, le flux n'a besoin que d'un sens, et il faudrait l'affinité de session) ; garder un service tiers (Ably, Pusher, Firebase) en repli si SSE échoue à l'usage ; réserver les change streams Mongo à un palier qui les supporte, jamais vérifié. « Présence » se pose sur le même flux avec un battement en base à TTL 30 s, jamais en mémoire d'instance.
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
2. **Le gain visé est la consolidation, pas l'économie.** Le palier gratuit de CloudFront (1 To/mois) est plus large que celui de la cible GCP. Ce que la migration supprime, c'est un second fournisseur, un second modèle d'identité, un second endroit où regarder pendant un incident, et les deux identifiants statiques du volet AWS. `GCP_SA_KEY` reste, c'est le lot 5 qui la retire.

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
2. **Les livrables RNCP et un support de cours Ynov sont publiés** : `docs/RNCP/` (dossiers PDF, captures, slides du Bloc 3) et `archive/docs/_ynov/`, qui contient une consigne de module, donc du matériel de l'école. Des livrables notés en verbatim sont désormais copiables, et l'oral du Bloc 3 est le 2026-09-16. Un `git rm` maintenant ne retirerait que le head.
3. **Les branches distantes sont visibles** : depuis le 2026-09-14 il ne reste que `master`, la branche de version en cours et `feedback-attachments`, où `GitHubIssueClient` publie les captures d'écran jointes aux signalements du pied de page, lisibles par quiconque via `raw.githubusercontent.com`. Rien de secret, mais c'est ce que voit un visiteur en premier. Ne pas les supprimer sans vérifier `git worktree list` : deux d'entre elles sauvegardent le travail en cours d'un worktree.
4. **Les journaux et les artefacts des runs Actions sont publics eux aussi**, pas seulement le code. Vérifié : aucun `set -x`, aucun `echo` de secret dans les six workflows, seulement des contrôles de présence, et GitHub masque de lui-même tout secret déclaré. Le résidu est ailleurs, dans deux artefacts : `playwright-traces`, qui embarque corps de requêtes et cookies du run E2E, et `sbom-api`. La rétention est de 90 jours, donc attendre déplace le problème au lieu de le régler.

**Traité le 2026-09-10, ne pas refaire :**

- **Les identifiants d'infrastructure sont sortis des fichiers suivis** : compte AWS, distribution CloudFront, ARN du certificat ACM, nom du bucket, projet GCP et organisation Sentry sont remplacés par des gabarits `<COMME_CECI>`, et `infra/README.md` porte la table qui dit par quelle commande relever chaque valeur. `scripts/apply-cloudfront-headers.sh` n'a plus de valeur par défaut, il sort en 2 si `DISTRIBUTION_ID` manque. Aucun n'était un secret et aucun n'était dans les PR ni les tickets, donc le head suffisait, sans réécriture d'historique. **Ce qui reste de DEBT-003 n'en est pas dispensé pour autant** : des clés root AWS actives, même derrière une cible qui n'est plus nommée, restent le vrai sujet.
- **Aucune contribution externe n'est possible sans un geste de l'auteur.** `CONTRIBUTING.md` le dit, la licence l'impose, et les jobs d'entrée de `ci-cd.yml` (`changes`, `gitleaks`, `lint-workflows`, plus `sonar` dont l'`always()` ignorerait un `changes` sauté) portent `github.event.pull_request.head.repo.fork != true`. Une PR de fork ne déclenche donc rien : ni minutes dépensées, ni `sonar` rouge faute de secrets. `SECURITY.md` détourne les failles vers un canal privé plutôt qu'un ticket public.

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
- **I8 espacer les workflows planifiés pour économiser des minutes GitHub Actions.** Mesuré au 2026-09-10 sur l'historique des runs : `security-scan.yml` tourne en 45 à 80 s une fois par semaine (≈ 5 min/mois), `registry-cleanup.yml` une fois par mois (≈ 1 min/mois), `backup-mongo.yml` en ≈ 90 s par nuit (≈ 45 min/mois). Total ≈ 51 min/mois, contre ≈ 450 min pour 20 runs de CI : les crons ne sont pas le poste de coût, et le seul qui pèse est le seul filet en cas de perte de données. Espacer la sauvegarde à deux jours économiserait 22 min/mois en doublant le point de restauration acceptable, ce qui est un mauvais échange sur des données personnelles non reconstituables. Ne pas rejouer sans un changement de cadran : soit le quota redevient contraignant après le passage du dépôt en public, soit la sauvegarde grossit assez pour changer l'ordre de grandeur.
