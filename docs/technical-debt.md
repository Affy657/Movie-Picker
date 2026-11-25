# Dette technique

Fichier de travail pour agent : une session future doit pouvoir reprendre une dette sans contexte préalable.

## Protocole

1. Avant d'agir sur une entrée, exécuter son `verify`. Sauf mention contraire dans l'entrée, une sortie signifie « encore ouvert », une sortie vide « déjà réglé, supprimer l'entrée sans rien faire d'autre ».
2. `state: agent` se traite en autonomie ; `state: humain` demande un geste que l'agent ne peut pas faire (`bloque` dit lequel) ; `state: differe` attend son `declencheur`.
3. Fin de traitement : supprimer l'entrée entière et sa ligne du sommaire, git porte l'historique.
4. Nouvelle entrée : même schéma de champs, identifiant `DEBT-NNN` jamais réutilisé. Prochain libre : `DEBT-123`. Elle se range dans la partie de son `state`, avec les entrées de sa zone, et gagne sa ligne au sommaire dans le même commit. Une entrée qui change de `state` change de partie et de tableau.
5. Deux dettes qui se règlent par le même geste n'en font qu'une, sous l'identifiant le plus ancien ; les identifiants absorbés restent cités dans `refs`.
6. Ici uniquement de la dette, du code ou de l'infrastructure qui existe et fonctionne moins bien qu'il ne devrait. Une feature va dans `roadmap.md`.
7. **Aucun identifiant d'infrastructure** (compte de service, bucket, identifiant de compte) : le dépôt est public, une faiblesse décrite avec sa cible se lit comme un mode d'emploi. Nommer le fichier ou la console où l'identifiant se relève, ou un espace réservé `<COMME_CECI>` ; la table des gabarits est dans `infra/README.md`.
8. **Contraintes** (ce qui casse en silence si on y touche), **Impasses** (essayé, mesuré, sans gain) et **Écartées** (arbitré, ne se fait pas à cette échelle), en fin de fichier, ne se traitent jamais. Les lire avant d'optimiser le front ou de toucher au déploiement.

Schéma : `state` / `bloque` (avec `state: humain`) / `declencheur` (avec `state: differe`) / `impact` / `ou` / `verify` / `fix` / `fini-quand` / `piege` / `refs`. Champs absents = sans objet.

Zones, dans l'ordre où elles se rangent dans chaque partie : **Produit** (ce qu'un utilisateur peut voir se comporter mal), **API et données**, **Front**, **Infra et déploiement**, **Sécurité et accès**, **Tests, CI et outillage**.

## Sommaire

### Pour un agent (5)

| Dette | Zone | Sujet |
|---|---|---|
| DEBT-074 | API et données | les documents `/r/<slug>`, `/e/<slug>`, `/film/<slug>` et `/serie/<slug>` échappent au plafond par adresse |
| DEBT-121 | API et données | une inscription partie d'une soirée terminée est comptée sans provenance |
| DEBT-108 | Front | quatre pages publiques restent sous le plancher Lighthouse mobile, hors de la porte |
| DEBT-102 | Tests, CI et outillage | les doublures de l'API dans les tests front restent écrites à la main |
| DEBT-116 | Tests, CI et outillage | la porte Lighthouse mesure un profil que l'API ne renvoie pas |

### Geste humain (9)

| Dette | Zone | Sujet |
|---|---|---|
| DEBT-033 | Produit | le plafond de participants promet plus que le flux et la base n'encaissent, et le front en tient un autre |
| DEBT-096 | API et données | l'adaptateur en mémoire reste dans l'assembly de production |
| DEBT-037 | Infra et déploiement | les jobs Cloud Scheduler décrits en Terraform attendent leur import, et le secret de l'ancien jeton partagé survit |
| DEBT-045 | Infra et déploiement | le secret du porte-clés Data Protection survit à son montage |
| DEBT-054 | Infra et déploiement | l'apex porte deux revendications Hosting, et les quatre domaines servent encore un certificat temporaire |
| DEBT-032 | Sécurité et accès | deux modèles d'autorisation hôte coexistent, le jeton porteur et le compte créateur |
| DEBT-048 | Sécurité et accès | la zone DNS n'a pas de CAA et sa politique DMARC n'observe rien |
| DEBT-052 | Sécurité et accès | le secret `GITHUB_TOKEN` de l'API est le jeton du `gh` CLI du poste |
| DEBT-053 | Sécurité et accès | l'API et la sauvegarde parlent à Atlas en administrateur du cluster, le même que le poste de dev |

### Différées (13)

| Dette | Zone | Sujet |
|---|---|---|
| DEBT-068 | Produit | les photos de profil ne sont ni modérées ni signalables |
| DEBT-109 | Produit | les titres de films restent en français dans l'interface anglaise |
| DEBT-112 | Produit | un participant retiré ne revient que par une invitation qui exige de le suivre |
| DEBT-008 | API et données | le sondage de repli à 3,5 s fixe encore le plafond de la base quand le flux manque |
| DEBT-040 | API et données | le seed de développement est compilé dans l'assembly de production |
| DEBT-064 | API et données | `GetByIdOrSlugAsync` ne résout plus que le slug |
| DEBT-092 | API et données | le rapport de synchronisation Letterboxd garde ses anciens champs à plat à côté de `lists` |
| DEBT-097 | API et données | six migrations terminées et huit méthodes de port attendent la fin de la rétention des sauvegardes |
| DEBT-026 | Front | le flou de fond des barres collantes n'a jamais été mesuré au défilement |
| DEBT-111 | Front | les schémas de `/tech` n'ont pas de variante verticale sur téléphone |
| DEBT-075 | Infra et déploiement | juste après un déploiement du front, `/r/<slug>` et `/e/<slug>` peuvent servir une coquille périmée |
| DEBT-073 | Sécurité et accès | une photo de profil envoyée hors de l'app garde ses métadonnées, et l'ancienne disparaît trop tôt |
| DEBT-114 | Tests, CI et outillage | trois règles SonarJS ne tournent qu'en CI |

---

# Pour un agent

Se traite en autonomie, sans attendre personne.

## DEBT-074 les documents `/r/<slug>`, `/e/<slug>`, `/film/<slug>` et `/serie/<slug>` échappent au plafond par adresse

- state: agent
- impact: les documents `/r/<slug>` (recap), `/e/<slug>` (invitation), `/film/<slug>` et `/serie/<slug>` (page d'un film), page et aperçu de partage, échappent au plafond par adresse et au limiteur global, parce que derrière Firebase Hosting toutes les requêtes arrivent des adresses de Google. Les routes répondent pourtant aussi en direct sur l'adresse de l'API. Pour `/r/` et `/e/`, seul compte un quota de 120 requêtes par minute et par slug, partagé dans Mongo : un client peut boucler sur des slugs au hasard sans frein (une lecture `events` et un upsert de compteur à chaque fois). Pour `/film/` et `/serie/`, la boucle est bornée depuis le 2026-11-12 : le quota de 120 par minute se compte par identifiant TMDB (`movie:<id>`, changer le titre du slug n'ouvre plus de seau neuf), un plafond de 600 requêtes par minute couvre toute la route (`MovieDocumentCeilingPolicy`, portée `Endpoint`) et un identifiant inconnu de TMDB reste 15 minutes en cache négatif. Reste, sur les quatre routes, qu'un seul client peut épuiser le quota d'une soirée ou d'un film connus, et pour `/film/` et `/serie/` le plafond de toute la route : chaque visiteur sans cache CDN reçoit alors un 429 brut au lieu de la page.
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/RateLimitingExtensions.cs` (`IsProxied`, `RecapDocumentPolicy`, `InvitationDocumentPolicy`, `MovieDocumentPolicy`, `MovieDocumentCeilingPolicy`), `Infrastructure/Web/SharedRateLimitFilter.cs`, `Controllers/EventRecapController.cs`, `Controllers/EventInvitationController.cs`, `Controllers/MovieShareDocumentController.cs`
- verify: `grep -n "Scope: QuotaScope.Slug }" apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/RateLimitingExtensions.cs` ; encore ouvert tant que la ligne sort
- fix: distinguer l'appel relayé par Hosting de l'appel direct (en-tête posé par la réécriture, ou entrée réservée à Hosting) et garder le plafond par adresse pour l'appel direct
- piege: le plafond de route et le cache négatif de `/film/` et `/serie/` bornent le coût TMDB, ils ne règlent pas la dette ; ne pas fermer l'entrée en les voyant, `/r/` et `/e/` n'en ont pas.

## DEBT-121 une inscription partie d'une soirée terminée est comptée sans provenance

- state: agent
- impact: le bouton d'inscription de la scène du gagnant (`EventWinnerStage`) renvoie vers `/new?from=night`, mais le serveur ne connaît que les provenances `event`, `recap`, `list` et `profile` (`EntryOrigin`, `UsageCount`) : ces inscriptions et connexions tombent dans `other` de `pnpm run usage`, alors qu'elles viennent d'une soirée
- ou: `apps/web/src/features/events/pages/event-detail/EventWinnerStage.tsx`, `apps/api-dotnet/MoviePicker.Api/Application/EntryOrigin.cs`, `apps/api-dotnet/MoviePicker.Api/Domain/UsageCount.cs`, `scripts/usage.mjs`
- verify: `grep -n "=night" apps/web/src/features/events/pages/event-detail/EventWinnerStage.tsx` ; encore ouvert tant que la ligne sort et que `UsageCount` ne connaît pas cette provenance
- fix: déclarer la provenance côté serveur (constante, variante rapportée, ligne du rapport d'usage) ou envoyer une provenance que le serveur connaît déjà ; un test d'`EntryOrigin` qui part du `returnTo` réel du bouton
- fini-quand: une inscription depuis la scène du gagnant apparaît sous sa provenance dans `pnpm run usage`

## DEBT-108 quatre pages publiques restent sous le plancher Lighthouse mobile, hors de la porte

- state: agent
- impact: la porte Lighthouse ne mesure ni la fiche film, ni `/films/tendances`, ni un profil rempli, ni `/tech`. Mesurées en local avec le stub réaliste (vraies tailles d'affiches, `scripts/lighthouse-stub.mjs`), elles font 62, 62, 56 et 71 sur mobile (LCP de 5,7 à 6,1 s pour les trois premières, TBT d'environ 690 ms pour `/tech`), sous le plancher de 85. C'est le premier chiffre qu'obtient quelqu'un qui lance Lighthouse sur le site (constats M03 et M08 de `docs/audits/2026-11-23-new-user-and-recruiter.md`). Sur un téléphone de 360 px, le LCP de l'accueil reste aussi la première affiche.
- ou: `scripts/lighthouse-run.mjs` (`URLS`), `scripts/lighthouse-stub.mjs`, `configs/lighthouse-budgets.json`, `apps/web/src/app/pages/tech/`
- verify: `LH_CANDIDATES=1 LH_ONLY=movie,trending,profile-active pnpm run lighthouse` ; encore ouvert tant qu'une de ces pages reste sous 85 ou absente de `URLS`
- fix: pour `/tech`, `content-visibility` par section avec une hauteur estimée par section, ou hydrater le prérendu au lieu de le remplacer ; pour les trois autres, le LCP de l'affiche (préchargement annoncé dès le document, ou première rangée moins haute)
- fini-quand: chaque page atteint 85 en médiane sur le runner et entre dans `URLS`, sans desserrer la porte (I4)
- piege: avec ces quatre pages, sept shards mesurent trois pages chacun : surveiller la durée du job

## DEBT-102 les doublures de l'API dans les tests front restent écrites à la main

- state: agent
- impact: environ 660 `HttpResponse.json(` dans 73 fichiers de test ne passent pas par `apiJson`, donc un champ renommé côté API les laisse verts ; trois stratégies de doublure coexistent (MSW, `vi.mock` d'un module `*Api`, `vi.mock` de `client`)
- ou: `apps/web/src/**/*.test.tsx`, `apps/web/src/mocks/apiJson.ts`
- verify: `grep -rl "HttpResponse.json(" apps/web/src --include=*.test.ts --include=*.test.tsx | wc -l` ; encore ouvert tant que la commande rend plus de `0`
- fix: passer chaque fichier de test touché à `apiJson` au fil de l'eau, puis une règle de `scripts/architecture/` qui refuse `HttpResponse.json(` dans un test
- fini-quand: aucune réponse simulée hors de `apiJson` et `apiErrorJson`

## DEBT-116 la porte Lighthouse mesure un profil que l'API ne renvoie pas

- state: agent
- impact: le stub de `scripts/lighthouse-stub.mjs` renvoie pour `/u/lighthouse` des statistiques sans `publicListCount` ni `proposalsAverageRating` et un profil sans six champs que l'API envoie toujours. `hasNothingToShow` y calcule `NaN` et n'affiche jamais l'état vide qu'un vrai profil vide montre : la porte mesure une page que personne ne reçoit. Une route inconnue du stub rend un 404 muet, car `lighthouse-run.mjs` ne passe pas `onUnknownRequest`. En prod, `/u/*` est servi par Cloud Run (document de partage), alors que le serveur local de Lighthouse sert `index.html`
- ou: `scripts/lighthouse-stub.mjs` (`minimalStats`, profil du stub), `scripts/lighthouse-run.mjs` (démarrage du stub, réécritures locales)
- verify: `node -e` sur le stub, ou lire le rapport `report-profile.json` : l'état vide doit apparaître pour le profil vide
- fix: renvoyer les objets complets de l'API (générés depuis le schéma OpenAPI si possible), faire échouer le run sur une requête inconnue, et documenter ou imiter le rendu `/u/*` de Cloud Run
- piege: l'état vide peut devenir l'élément LCP du profil et faire bouger son score : mesurer sur le runner avant de fusionner (le PC local est environ trois fois plus lent, `benchmarkIndex`)

---

# Geste humain

L'agent prépare, l'utilisateur fait le geste que `bloque` décrit.

## DEBT-033 le plafond de participants promet plus que le flux et la base n'encaissent, et le front en tient un autre

- state: humain
- bloque: décision produit sur le plafond de participants
- impact: `EventConfig.MaxParticipantsCap = 500`. Avec le flux temps réel (1.14.0), la base ne dépend plus du nombre de participants, mais chaque participant connecté occupe une requête Cloud Run : `EventStreamGate` accepte 60 flux par instance (sur 80 requêtes simultanées), 6 par compte et 20 par adresse anonyme, et la production plafonne à 5 instances (C12), soit 300 flux. Au-delà, les participants refusés retombent sur le sondage de DEBT-008, à environ 4,3 opérations Mongo par seconde chacun sur une soirée active : une soirée de 500 participants rouvrirait le problème d'avant sur le palier M0 du cluster. Le front plafonne de son côté à 300 participants et 15 propositions (`MAX_EVENT_PARTICIPANTS`), l'API à 500 et 100 : une valeur plus haute, posée par l'API directe, s'affiche telle quelle et le panneau d'hôte refuse d'enregistrer tant qu'elle n'est pas baissée. Aucun client publié n'écrit une telle valeur.
- ou: `apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs` (`MaxParticipantsCap`), `apps/api-dotnet/MoviePicker.Api/Application/UseCases/EventLive/EventLiveOptions.cs` (plafonds du flux), `apps/web/src/features/events/types.ts` (`MAX_EVENT_PARTICIPANTS`)
- verify: `grep -n "MaxParticipantsCap = \|MAX_EVENT_PARTICIPANTS = " apps/api-dotnet/MoviePicker.Api/Domain/Entities/Event.cs apps/web/src/features/events/types.ts` ; encore ouvert tant que le plafond de l'API dépasse 50 ou que le front garde sa propre constante
- fix: aligner `MaxParticipantsCap` sur ce que le flux tient sans repli massif (50 laisse de la marge à six soirées pleines simultanées), ou monter `max_instance_count` en baissant le pool Mongo par instance (C12) ; puis un seul plafond, rendu par l'API et lu par le front
- fini-quand: le plafond est aligné sur une mesure réelle du flux en production et n'est écrit qu'une fois, côté API
- piege: le flux vit 270 s (`EventLiveOptions.StreamLifetime`) parce que le service Cloud Run coupe toute requête à 300 s ; `EventSource` reconnecte seul après 2 s et la page recharge la soirée sur `ready`. `UseResponseCompression` exclut `text/event-stream`, sinon le flux part en tampon. Un flux ouvert garde l'instance allumée et facturée tant qu'un participant a la page visible : le front ferme le flux dès que l'onglet est masqué ou la soirée finie. Les plafonds d'`EventStreamGate` sont comptés par instance, pas globalement.
- refs: C3 ; absorbe DEBT-083 (2026-11-25)

## DEBT-096 l'adaptateur en mémoire reste dans l'assembly de production

- state: humain
- bloque: décider si l'API sans MongoDB sur le poste sert encore (`docs/development.md`, démarrage sans `MONGODB_URI`)
- impact: depuis l'audit d'architecture du 2026-11-18, la CI et l'e2e ne tournent plus que sur MongoDB, mais chaque méthode de port s'écrit encore deux fois (37 des 47 commits de port touchaient les deux adaptateurs) pour un mode qui ne sert qu'au poste et aux kits de tests unitaires
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/InMemory/`, `Infrastructure/ServiceCollectionExtensions.cs`
- verify: `grep -c "InMemory" apps/api-dotnet/MoviePicker.Api/Infrastructure/ServiceCollectionExtensions.cs` ; encore ouvert tant que la commande rend plus de `0`
- fix: si le mode ne sert plus, déplacer les adaptateurs en mémoire dans le projet de tests comme faux des kits (`MovieListTestKit`, `SavedListTestKit`, `WatchedTestKit`), une méthode qu'aucun kit n'appelle levant `NotSupportedException`, et les retirer de l'enregistrement
- fini-quand: une nouvelle méthode de port ne s'implémente plus qu'une fois dans le code de production

## DEBT-037 les jobs Cloud Scheduler décrits en Terraform attendent leur import, et le secret de l'ancien jeton partagé survit

- state: humain
- bloque: l'import écrit l'état de production et se fait le jour où le code arrive sur master, avant tout `apply` ; l'`apply` attend le relecteur requis de l'environnement `infra-apply` ; `gcloud secrets delete SCHEDULER_TOKEN` est irréversible
- impact: depuis le 2026-11-25, les cinq jobs sont décrits dans `infra/terraform/environments/production/main.tf` (une ressource nommée par job) et `deploy.yml` ne les crée plus, mais tant qu'ils ne sont pas importés, un `apply` tenterait de les créer et échouerait sur des jobs existants. `module.ci` perd `roles/cloudscheduler.admin` et le `serviceAccountUser` sur le planificateur au même `apply`. Le secret `SCHEDULER_TOKEN` existe toujours dans Secret Manager et dans `api_secret_names` (écart autorisé dans `scripts/check-secret-mounts.mjs`)
- ou: `infra/terraform/environments/production/main.tf`, `scripts/check-secret-mounts.mjs` (`ALLOWED_GAPS`)
- verify: `pnpm run terraform -- state list | grep -c google_cloud_scheduler_job` ; encore ouvert tant que la commande rend moins de 5, puis tant que `gcloud secrets describe SCHEDULER_TOKEN` répond
- fix: les cinq `pnpm run terraform -- import 'google_cloud_scheduler_job.<nom>' projects/<PROJET_GCP>/locations/europe-west1/jobs/movie-picker-<job>` (`event_reminders`, `recurring_events`, `finished_events`, `rating_reminders`, `warm_catalog`), un `plan` vide sur les jobs, l'`apply` par `infra.yml` ; puis retirer `SCHEDULER_TOKEN` d'`api_secret_names` et d'`ALLOWED_GAPS`, sortir ses deux ressources de l'état et `gcloud secrets delete SCHEDULER_TOKEN`
- fini-quand: les jobs sont dans l'état Terraform, le `plan` est vide et `SCHEDULER_TOKEN` n'existe plus
- piege: `scripts/terraform.mjs` passe ses arguments par un shell qui retire les guillemets d'une adresse `["clé"]` : un `state rm` sur `...["SCHEDULER_TOKEN"]` se lance directement par `docker run` (voir le script) ou avec des guillemets échappés. Plus aucune révision antérieure au 2026-09-21 ne reste dans le dépôt d'images (30 jours), le secret peut partir.

## DEBT-045 le secret du porte-clés Data Protection survit à son montage

- state: humain
- bloque: la destruction du secret est irréversible et n'a lieu qu'après un déploiement de production qui ne le monte plus
- impact: depuis le 2026-11-25, `deploy.yml` ne monte plus `AUTH_DATAPROTECTION_KEYRING` (la production lit ses clés dans la collection `data_protection_keys`, deux clés relevées ce jour-là). Le secret et sa version restent facturés et nommés dans `api_secret_names` (écart autorisé dans `scripts/check-secret-mounts.mjs`) ; la révision active, antérieure, le monte encore
- ou: `infra/terraform/environments/production/main.tf` (`api_secret_names`), `infra/terraform/modules/secrets/main.tf` (`deletion_protection`), `scripts/check-secret-mounts.mjs`
- verify: `grep -c AUTH_DATAPROTECTION_KEYRING infra/terraform/environments/production/main.tf` ; encore ouvert tant que la commande rend autre chose que 0
- fix: après un déploiement de production sur une version qui ne le monte plus, retirer le nom d'`api_secret_names` et d'`ALLOWED_GAPS`, lever `deletion_protection` pour cet `apply`, qui détruit le secret et sa version
- piege: une révision plus ancienne ramenée par `rollback.yml` monte encore le secret : le détruire seulement quand aucune révision qui le monte ne peut plus servir

## DEBT-054 l'apex porte deux revendications Hosting, et les quatre domaines servent encore un certificat temporaire

- state: humain
- bloque: l'enregistrement TXT vit dans la zone OVH, hors Terraform et sans CLI : sa suppression se fait dans le manager, par Chrome avec la session de l'utilisateur et son accord explicite (`infra/README.md`, section Domaines). La vérification qui suit est agent.
- impact: l'apex `movie-picker.fr` porte deux TXT `hosting-site=` (celui du site `www` et celui du site legacy, posé le 2026-09-21 avant l'`apply` du second site) et Hosting le signale en `CD_CONFLICTING_CLAIMS` (« There must be at most one TXT record with the `hosting-site=` prefix »). Le domaine sert (`HOST_ACTIVE`, `OWNERSHIP_ACTIVE`), mais les quatre domaines du projet gardent un certificat `TEMPORARY` depuis la bascule du 2026-09-20, là où Hosting le remplace par le certificat `GROUPED` du projet en quelques heures d'ordinaire ; le certificat servi a pourtant été renouvelé le 2026-11-22 (Google Trust Services, valable jusqu'au 2027-02-20, relevé par `openssl s_client` le 2026-11-23) : le renouvellement passe malgré le conflit, qui reste signalé et qu'il faut lever avant qu'un renouvellement échoue. Le TXT du site legacy n'a rien prouvé : `web` est passé `OWNERSHIP_ACTIVE` quand son CNAME a visé `movie-picker-web-legacy.web.app`.
- ou: zone DNS `movie-picker.fr` chez OVH (TXT de l'apex) ; `infra/terraform/environments/production/main.tf` (`module "web_legacy"`) ; `infra/README.md` section Domaines
- verify: `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=movie-picker.fr&type=TXT' | grep -o 'hosting-site=[a-z-]*' | sort -u | wc -l` ; encore ouvert tant que la commande rend autre chose que 1
- fix: (humain) supprimer le TXT `hosting-site=movie-picker-web-legacy` de l'apex dans le manager OVH, garder `hosting-site=movie-picker-web`. (agent) une heure plus tard, lire `pnpm run terraform -- output web_dns` : `web.movie-picker.fr` doit rester `OWNERSHIP_ACTIVE` (sinon remettre le TXT et chercher pourquoi le CNAME ne suffit pas), l'apex doit perdre son `issues` (`GET https://firebasehosting.googleapis.com/v1beta1/projects/<PROJET_GCP>/sites/movie-picker-web/customDomains/movie-picker.fr` avec un jeton gcloud et `x-goog-user-project`), puis `cert_type` doit passer `GROUPED` sur les quatre domaines dans les 24 heures ; s'il reste `TEMPORARY` au 2026-10-01, ouvrir un ticket Firebase depuis la console (le certificat temporaire n'est pas renouvelé par le projet).
- piege: ne pas supprimer le TXT `hosting-site=movie-picker-web`, il prouve l'apex lui-même (A `199.36.158.100`). Ne pas sonder `web.movie-picker.fr` en boucle pendant la vérification : l'edge garde les 404 déjà servis, et seule une nouvelle release du site legacy (`gh workflow run web-legacy.yml --ref master`) purge ce cache.

## DEBT-032 deux modèles d'autorisation hôte coexistent, le jeton porteur et le compte créateur

- state: humain
- bloque: décision produit, retirer ou non le jeton d'hôte. Le chantier co-hôte, au backlog de la roadmap, est le moment naturel, il ajouterait sinon un troisième chemin.
- impact: `EventHost.IsHost` accepte le jeton (`X-Host-Token`, ou `?host=` pour les anciens liens, que le front range en `sessionStorage` puis retire de la barre d'adresse) **ou** `CreatorUserId`. Créer une soirée exige un compte depuis la V1.2, donc le jeton est un vestige, et un lien partagé avec le jeton donne les commandes de l'hôte à n'importe qui, sans compte. Dix-sept fichiers front le transportent, l'API le masque dans les logs et Sentry pour compenser. Côté API, tout contrôle d'hôte passe par `HostedEvent` (`IsHost`, `LoadForHostAsync`, `LoadForHostEvenFinishedAsync`), seul appelant d'`EventHost.IsHost` : retirer le jeton ou ajouter des co-hôtes s'y fait en un endroit, plus le retrait d'`IHostTokenAccessor` des treize handlers et de `MovieActionContext` qui le reçoivent.
- ou: `apps/api-dotnet/MoviePicker.Api/Domain/EventHost.cs`, `Application/UseCases/Shared/HostedEvent.cs`, `Infrastructure/Web/HostTokenAccessor.cs`, `SensitiveQueryRedaction.cs` ; côté front `grep -rl hostToken apps/web/src --include=*.ts --include=*.tsx | grep -v test`
- verify: `grep -n "TokenMatches" apps/api-dotnet/MoviePicker.Api/Domain/EventHost.cs` ; encore ouvert tant que le jeton compte dans `IsHost`
- fix: hôte = `CreatorUserId`, co-hôtes = liste d'identifiants sur `Event` posée par le chantier co-hôte, lue par `HostedEvent` ; puis retirer `HostToken` du document, `HostTokenAccessor`, `SensitiveQueryRedaction`, `withHostToken` et le stockage local côté front, et l'en-tête `X-Host-Token` du contrat OpenAPI
- fini-quand: plus aucun `hostToken` hors `archive/`, et `EventHost.IsHost` ne prend qu'un identifiant de compte
- piege: les soirées créées avant le compte obligatoire n'ont pas de `CreatorUserId` (`events_creatorUserId` est `Sparse` pour cette raison), leur hôte perdrait ses commandes. Compter avant de retirer le jeton, par `mongosh` : `db.events.countDocuments({creatorUserId:{$exists:false}, closedAt:null})` ; si le compte n'est pas nul, attendre la clôture de ces soirées ou les rattacher par migration.

## DEBT-048 la zone DNS n'a pas de CAA et sa politique DMARC n'observe rien

- state: humain
- bloque: la zone vit chez OVH, hors Terraform et sans CLI (`infra/README.md`, section Domaines) : chaque enregistrement se pose dans le manager, par Chrome, avec la session OVH de l'utilisateur ouverte et son accord explicite sur l'enregistrement (le mode automatique seul refuse une modification DNS)
- impact: sans CAA, n'importe quelle autorité peut émettre un certificat pour `movie-picker.fr` ; `_dmarc` vaut `v=DMARC1; p=none;` sans `rua=`, donc un courriel usurpant l'expéditeur du domaine arrive en boîte de réception et personne ne le sait. SPF, DKIM et le chemin de retour Resend sont en place, seule la politique manque.
- ou: manager OVH, zone DNS de `movie-picker.fr` (« Ajouter une entrée », sous-domaine vide pour les CAA, `_dmarc` pour le TXT à modifier) ; `SECURITY.md` pour l'adresse de rapport
- verify: `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=movie-picker.fr&type=CAA' | grep -c '"Answer"'` puis `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=_dmarc.movie-picker.fr&type=TXT' | grep -c 'rua='` ; encore ouvert tant que l'une des deux commandes rend 0
- fix: deux CAA sur l'apex, indicateur `0`, étiquette `issue`, cibles `pki.goog` (Google Trust Services, qui émet pour Hosting et Cloud Run) et `letsencrypt.org` (le secours que Hosting sait demander) ; `_dmarc` en `v=DMARC1; p=none; rua=mailto:contact@movie-picker.fr`, puis `p=quarantine` après quelques semaines de rapports sans faux positif ; au passage, supprimer le CNAME `_acme-challenge` de l'apex, qui vise encore la validation de certificat d'AWS et n'a plus rien à valider. Une fois posés, les noter dans `infra/README.md` à côté des enregistrements que Hosting dicte.
- piege: l'adresse de rapport doit être sur la zone elle-même : un `rua=` vers un autre domaine exige un TXT d'autorisation `movie-picker.fr._report._dmarc.<autre domaine>` chez ce domaine, que Gmail ne publie pas, donc Google n'y livrerait aucun rapport. `contact@` est l'adresse publique de `SECURITY.md` et l'apex a des MX. Durcir vers `p=quarantine` puis `p=reject` seulement après avoir lu les rapports : les seuls émetteurs alignés sont Resend (DKIM sur le domaine, chemin de retour `send.`) et les serveurs de messagerie OVH (SPF de l'apex) ; un « envoyer en tant que » depuis Gmail ou tout autre relais passerait en indésirable puis serait rejeté.

## DEBT-052 le secret `GITHUB_TOKEN` de l'API est le jeton du `gh` CLI du poste

- state: humain
- bloque: un jeton fine-grained se crée dans l'interface GitHub, derrière le mode sudo (passkey ou code par courriel), que l'agent n'a pas le droit de franchir (« Confirm access » sur `settings/personal-access-tokens/new`). Le reste est agent.
- impact: la valeur montée dans les révisions de production et de recette (`GITHUB_TOKEN=GITHUB_TOKEN:latest` dans les deux listes `SECRETS` de `deploy.yml`) est un jeton OAuth `gho_` de l'application « GitHub CLI », identique à `gh auth token` sur le poste, scopes `repo, workflow, gist, project, read:org` (en-tête `X-OAuth-Scopes` de `curl -sS -D - -H "Authorization: Bearer $T" https://api.github.com/user`). L'API n'en a besoin que pour créer des issues (`GitHubIssueClient.cs`) : depuis le 2026-11-25 elle ne pousse plus aucune pièce jointe dans le dépôt. Depuis un conteneur compromis, ce jeton pousse sur master, réécrit les workflows et assume donc toutes les identités fédérées, `infra-apply` comprise.
- ou: Secret Manager `GITHUB_TOKEN` (version 1 du 2026-09-02), `.github/workflows/deploy.yml` (les deux `SECRETS`), `apps/api-dotnet/MoviePicker.Api/Infrastructure/GitHub/GitHubIssueClient.cs`, GitHub Settings / Developer settings / Personal access tokens / Fine-grained tokens
- verify: `gcloud secrets versions access latest --secret=GITHUB_TOKEN --project <PROJET_GCP> | cut -c1-4` ; encore ouvert tant que la commande rend `gho_` (réglé quand elle rend `gith`, le préfixe `github_pat_`)
- fix: (humain) un jeton fine-grained nommé `movie-picker-api-feedback`, expiration un an, « Only select repositories » : `Affy657/Movie-Picker`, permissions Issues « Read and write » et Metadata en lecture, rien d'autre ; sa valeur seule dans `Downloads\github-pat.txt`. (agent) prouver le jeton sans l'afficher : `GET repos/Affy657/Movie-Picker` en 200, `GET .../issues?per_page=1` en 200, un `PUT .../contents/_probe.txt` refusé en 403, et `GET user/repos` qui ne rend que ce dépôt ; puis `gcloud secrets versions add GITHUB_TOKEN --data-file=Downloads\github-pat.txt`, écraser et supprimer le fichier, déployer (`stage=staging` puis `stage=production`, `target=api` suffit si `verify-ci` l'accepte, sinon `all`), vérifier `/health/ready` sur les deux étapes, puis `gcloud secrets versions destroy 1 --secret=GITHUB_TOKEN`. (humain, en dernier) révoquer l'autorisation « GitHub CLI » dans Settings / Applications / Authorized OAuth Apps et refaire `gh auth login` : le jeton `gho_` est dans Secret Manager et dans chaque révision depuis le 2026-09-02.
- piege: ne pas révoquer le `gho_` avant le déploiement des deux étapes : les révisions actives le lisent au démarrage de chaque instance, et le `gh` du poste s'arrête aussi. Un jeton fine-grained expire : `pnpm run check:iam` signale une version de secret de plus d'un an, c'est le rappel.

## DEBT-053 l'API et la sauvegarde parlent à Atlas en administrateur du cluster, le même que le poste de dev

- state: humain
- bloque: les utilisateurs Atlas et le second projet se créent dans la console Atlas (l'accès MCP est refusé au niveau de l'organisation ; le poste n'a ni `atlas` CLI ni clé d'API, et la session Chrome est déconnectée d'Atlas). Le reste est agent.
- impact: `MONGODB_URI` (version du 2026-03-19) désigne un utilisateur au rôle `atlasAdmin@admin` (celui de l'URI en place, à lire dans Secret Manager), même utilisateur et même mot de passe que `MONGODB_URI` du `.env` du poste, exposé en transcription de session avant le 2026-09-15 ; la sauvegarde lit la même URI et archive toutes les bases du cluster. La recette (`moviepicker_staging`) et la dev (`moviepicker_dev`) partagent le cluster M0 de la production (100 opérations par seconde) : une charge de recette dégrade la production.
- ou: Secret Manager `MONGODB_URI`, `STAGING_MONGODB_URI`, `MONGODB_BACKUP_URI` (créé vide le 2026-09-21) ; `.github/workflows/backup-mongo.yml` (repli sur `MONGODB_URI` avec avertissement) ; `infra/terraform/environments/production/main.tf` (`module "backup"`, `readable_secrets` porte encore `MONGODB_URI`) ; `C:\dev\movie-picker\.env` (hors dépôt) ; console Atlas, projet de production (cluster0) et le second projet à créer
- verify: `docker run --rm mongo:8 mongosh --quiet "$(gcloud secrets versions access latest --secret=MONGODB_URI --project <PROJET_GCP>)" --eval 'print(db.runCommand({connectionStatus: 1}).authInfo.authenticatedUserRoles.map(r => r.role).join(","))'` ; encore ouvert tant que la commande imprime `atlasAdmin`
- fix: (humain) dans le projet de production, Database Access / Add new database user, mot de passe autogénéré, « Specific Privileges » : `moviepicker_api` `readWrite` sur `moviepicker`, `moviepicker_backup` `read` sur `moviepicker` ; un second projet Atlas « Movie Picker non-prod » avec un cluster M0 (AWS, eu-west-1), Network Access `0.0.0.0/0` (Cloud Run n'a pas d'IP fixe), et deux utilisateurs `moviepicker_staging` `readWrite` sur `moviepicker_staging`, `moviepicker_dev` `readWrite` sur `moviepicker_dev` ; les quatre mots de passe et l'hôte du nouveau cluster dans `Downloads\atlas-users.txt`, une ligne `nom=valeur` chacun, `host=<cluster>.<id>.mongodb.net` pour l'hôte. (agent) construire les URI (`urllib.parse.quote(mot_de_passe, safe='')`) : production `mongodb+srv://moviepicker_api:<mdp>@<HOTE_CLUSTER_PROD>/?appName=Cluster0` (l'hôte est celui de l'URI en place ; pas de base dans le chemin, l'API prend `moviepicker` par défaut), sauvegarde `mongodb+srv://moviepicker_backup:<mdp>@<HOTE_CLUSTER_PROD>/moviepicker?appName=Cluster0` (la base dans le chemin, `mongodump` la prend comme `--db`), recette `mongodb+srv://moviepicker_staging:<mdp>@<hôte>/moviepicker_staging?retryWrites=true&w=majority&appName=Cluster0&maxPoolSize=10`, dev `mongodb+srv://moviepicker_dev:<mdp>@<hôte>/moviepicker_dev?retryWrites=true&w=majority&appName=Cluster0` ; prouver chacune par `mongosh --eval` (`connectionStatus` rend le seul rôle attendu, `ping` sur sa base, un `insertOne` puis `drop` d'une collection `_rotation_probe` pour les `readWrite`, `estimatedDocumentCount` de `users` pour la lecture, et `listDatabases` refusé) ; `gcloud secrets versions add` pour `MONGODB_URI`, `MONGODB_BACKUP_URI`, `STAGING_MONGODB_URI` depuis des fichiers temporaires écrasés puis supprimés ; `MONGODB_URI=` du `.env` réécrit avec l'URI de dev ; écraser et supprimer `atlas-users.txt` ; déployer recette puis production (`target=all`), `gh workflow run backup-mongo.yml --ref master` et lire « Dump taken with MONGODB_BACKUP_URI » dans son journal ; retirer `"MONGODB_URI"` de `readable_secrets` du `module "backup"` et le repli de `backup-mongo.yml` (`infra.yml` applique, un clic) ; `gcloud secrets versions destroy` des anciennes versions de `MONGODB_URI` et `STAGING_MONGODB_URI` ; `pnpm run seed` sur la nouvelle base de dev. (humain, en dernier) supprimer l'ancien administrateur (l'utilisateur de l'URI remplacée) et `moviepicker_staging` du projet de production, et la base `moviepicker_staging` qui y reste.
- piege: une archive de sauvegarde contient aussi des secrets d'authentification, le porte-clés Data Protection (`MongoXmlRepository`, aucun `XmlEncryptor`) et les sessions. Tant que l'utilisateur de la sauvegarde est administrateur, lire une archive ne donne rien de plus que ce qu'il a déjà ; dès qu'il n'aura plus que la lecture, l'archive vaudra plus que son accès. Traiter dans le même chantier : exclure `data_protection_keys` et `auth_sessions` du dump (`--excludeCollection`, au prix d'une déconnexion générale après une restauration), ou chiffrer le porte-clés par un `IXmlEncryptor` adossé à Cloud KMS dont seule l'identité d'exécution de l'API peut déchiffrer. Ne rien supprimer côté Atlas avant que les deux étapes servent des révisions nées après les nouvelles versions : `MONGODB_URI:latest` est lu au démarrage de chaque instance, une instance déjà debout garde l'ancienne valeur jusqu'à sa fin. Un utilisateur limité à une base ne peut pas `serverStatus` ni `listDatabases` : la preuve d'accès est l'`insertOne`, pas un état du serveur. La base de recette repart vide sur le nouveau cluster, l'API y recrée index et migrations au premier démarrage.

---

# Différées

Ne se traitent que quand leur `declencheur` survient.

## DEBT-068 les photos de profil ne sont ni modérées ni signalables

- state: differe
- declencheur: un premier signalement d'une photo choquante, ou l'ouverture de la soirée publique et du fil d'actualité qui montrent les photos à des inconnus
- impact: une photo téléversée s'affiche sans contrôle sur le profil public, dans les participants des soirées, sur le recap public et dans l'image story ; personne ne peut la signaler, et l'administrateur ne peut la retirer qu'à la main en base
- ou: `apps/api-dotnet/MoviePicker.Api/Application/UseCases/AvatarPhotos/`, collection `avatar_photos`
- verify: `grep -rlE "Report|Flag" apps/api-dotnet/MoviePicker.Api/Application/UseCases/AvatarPhotos` ; encore ouvert tant que la commande ne sort rien
- fix: un « Signaler cette photo » sur le profil public qui prévient l'administrateur, et un geste de retrait qui supprime la photo et rend l'avatar généré
- piege: retirer une photo à la main demande d'effacer le document de `avatar_photos` et de remettre `avatarPhoto` à `null` sur l'utilisateur ; sans le second geste, le profil pointe vers une image en 404 et retombe sans bruit sur les initiales
- refs: cadrage du 2026-10-03 de la feature « Photo de profil personnalisée » (modération écartée de la V1.7)

## DEBT-109 les titres de films restent en français dans l'interface anglaise

- state: differe
- declencheur: un usage réel de l'interface anglaise (part des sessions `en` dans PostHog)
- impact: `language=fr-FR` est écrit en dur dans les appels TMDB ; les caches mémoire et partagé ne tiennent pas compte de la langue, et les films d'une soirée gardent le titre français enregistré à la proposition
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Tmdb/TmdbMovieSearch.*.cs`
- verify: `grep -rn "language=fr-FR" apps/api-dotnet/MoviePicker.Api/Infrastructure/Tmdb`
- fix: passer la langue de l'interface jusqu'aux appels TMDB, la mettre dans la clé de chaque cache, et garder le titre enregistré d'une soirée comme repli

## DEBT-112 un participant retiré ne revient que par une invitation qui exige de le suivre

- state: differe
- declencheur: un hôte qui demande comment laisser revenir quelqu'un
- impact: depuis le 2026-11-23, une personne retirée par l'hôte ne peut plus rejoindre par le lien ; seule une nouvelle invitation lève le blocage, et inviter exige que l'hôte suive la personne. La liste des participants n'a pas de bouton pour la laisser revenir, et une soirée de groupe reste proposée à un membre retiré, dont la tentative est refusée avec un message.
- ou: `apps/web/src/features/events/components/EventParticipantsList.tsx`, le cas d'usage `InviteUser`, `Event.RemovedUserIds`
- verify: `grep -rln "LettingBackIn" apps/api-dotnet/MoviePicker.Api --include=*.cs | grep -v InMemory` ; encore ouvert tant que seuls `Event.cs` et l'invitation l'appellent
- fix: une action « Laisser revenir » dans le menu de l'hôte, et les soirées de groupe filtrées pour un membre retiré

## DEBT-008 le sondage de repli à 3,5 s fixe encore le plafond de la base quand le flux manque

- state: differe
- declencheur: le flux temps réel tombe souvent en repli (429 de `GET /events/{slug}/stream` ou reconnexions en rafale dans les journaux), ou la base approche la moitié du plafond d'opérations du palier Atlas, soit 50 opérations par seconde sur le palier M0
- impact: depuis la 1.14.0, la page soirée écoute `GET /api/v1/events/{slug}/stream` et ne sonde plus tant que le flux répond. Le sondage reste le repli quand le flux manque : navigateur sans `EventSource`, onglet de retour au premier plan avant la reconnexion, flux refusé par `EventStreamGate` au-delà de ses plafonds, flux muet plus de 25 s. En repli, le coût est celui d'avant : environ 13 allers-retours Mongo par cycle et par participant quand la soirée a bougé, 2 lectures par cycle sinon (304 de `EventViewTagHandler`). En régime nominal, une soirée coûte 2 lectures par seconde et par instance qui la diffuse (`EventLiveHub` : le document soirée, puis `event_presence`), quel que soit le nombre de participants.
- verify: `grep -n EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS apps/web/src/features/events/hooks/useEventLive.ts` ; encore ouvert tant que la constante existe, c'est-à-dire tant que le repli sonde
- fix: une fois le flux mesuré fiable en production, ralentir le repli (30 s) ou le retirer, la reprise sur `ready` rechargeant déjà la soirée à chaque reconnexion
- piege: le 304 tient à une règle d'`AGENTS.md` : toute mutation de la vue soirée fait bouger `writeSeq` (`UpdateAsync`, `LockForWriteAsync` ou `MarkChangedAsync`). `check:architecture` la vérifie fichier par fichier (`scripts/architecture/apiWriteSeq.mjs`) : un handler qui écrit sans aucun des trois appels est refusé, mais un second chemin d'écriture du même fichier qui oublie l'appel passe, seul le test du handler le voit. Le flux lit le même compteur : une écriture qui l'oublie n'arrive plus en direct non plus, seulement au prochain rechargement complet.
- refs: DEBT-033 pour le plafond de participants

## DEBT-040 le seed de développement est compilé dans l'assembly de production

- state: differe
- declencheur: une feature repasse dans `Infrastructure/Development/` ou dans ses tests. Ne jamais en faire un chantier isolé.
- impact: `DevelopmentScenarioSeed.cs` (2 484 lignes) et `DevelopmentDataSeedHostedService.cs` (329 lignes) sont publiés dans l'image de production, environ 6 % des lignes du projet `MoviePicker.Api` pour du code que seul `environment.IsDevelopment()` enregistre. Aucune surface exposée, du poids d'assembly et du temps de compilation ReadyToRun pour rien.
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Development/`, enregistrement dans `ServiceCollectionExtensions.AddMoviePicker` sous `environment.IsDevelopment()`
- verify: `ls apps/api-dotnet/MoviePicker.Api/Infrastructure/Development/` ; encore ouvert tant que le dossier est dans le projet `MoviePicker.Api`
- fix: sortir le dossier dans un projet `MoviePicker.Api.DevelopmentSeed` que `MoviePicker.Api` référence seulement en `Debug` (`<ProjectReference Condition="'$(Configuration)' == 'Debug'">`), l'enregistrement DI passant par une extension de ce projet appelée derrière `#if DEBUG` ; déplacer `DevelopmentScenarioSeedTests` et la moitié seed de `ServiceCollectionExtensionsBranchTests` dans un projet de tests lui aussi Debug. Mesurer avant et après par `dotnet publish -c Release` et la taille de `MoviePicker.Api.dll`.
- piege: `verify:local` et la CI compilent et testent en **Release**, et `DevelopmentScenarioSeedTests.cs` comme `ServiceCollectionExtensionsBranchTests.cs` référencent le seed : un simple `<Compile Remove>` conditionnel casse la suite. `launchSettings.json`, `playwright.config.ts` et `scripts/verify-local.cjs` lancent l'API en `Development` avec `DevelopmentSeed__Enabled=false` : vérifier qu'un `dotnet run` sans configuration explicite construit bien en Debug, sinon le seed disparaît du poste de travail sans erreur.

## DEBT-064 `GetByIdOrSlugAsync` ne résout plus que le slug

- state: differe
- declencheur: la fusion de `v1.7` dans `master`
- impact: depuis le 2026-09-23, une soirée ne se trouve plus par son `ObjectId` (en partie prévisible, il ouvrait la soirée sans son lien). La méthode du port, l'extension `GetRequiredByIdOrSlugAsync`, les paramètres `idOrSlug` du front et le segment de route `{idOrSlug}` gardent l'ancien nom pour ne pas multiplier les conflits avec `v1.7`, qui ajoute ses propres appels : le nom ment.
- ou: `apps/api-dotnet/MoviePicker.Api/Application/Ports/IEventRepository.cs`, `EventRepositoryExtensions.cs`, `Infrastructure/Persistence/Mongo/MongoEventRepository.cs`, `Infrastructure/Persistence/InMemory/InMemoryEventRepository.cs`, `Controllers/EventsController.cs`, `Controllers/EventMoviesController.cs`, une quarantaine de fichiers de test ; `apps/web/src/features/events/api/eventsApi.ts`
- verify: `grep -rln "ByIdOrSlug" apps/api-dotnet --include=*.cs | grep -v /obj/` ; encore ouvert tant qu'il rend un fichier
- fix: renommer en `GetBySlugAsync` et `GetRequiredBySlugAsync`, `idOrSlug` en `slug` partout, y compris le segment de route, puis `pnpm run openapi:export` et `pnpm run openapi:types`
- piege: renommer le segment de route change les clés de `paths` dans le contrat OpenAPI, donc le schéma généré et `apiContract.test.ts` côté front ; les faire dans le même commit. La fusion de `v1.7` apporte aussi une trentaine de chemins d'API construits sans `apiPath` (dont `setMovieRating` et `deleteMovieRating`, aujourd'hui dans `features/events/api/eventMoviesApi.ts`) : les convertir dans le même geste, `grep -rln '/events/\${' apps/web/src --include=*.ts | grep -v test` ne doit plus rien rendre.

## DEBT-092 le rapport de synchronisation Letterboxd garde ses anciens champs à plat à côté de `lists`

- state: differe
- declencheur: la version qui sert `lists` est en production depuis 30 jours, le temps qu'aucun ancien front ne tourne plus derrière son service worker
- impact: depuis le 2026-11-25, `LetterboxdSyncResponse` rend une entrée par liste dans `lists`, la date et l'erreur de synchronisation sont tenues par liste (`letterboxdListSyncs` du document utilisateur, les anciens champs restant écrits et lus en repli) et le front boucle sur les listes. Le rapport recopie encore ses champs à plat d'avant (`Added`, `WatchedAdded` et les autres) pour l'ancien front, et `check:contract-compat` refuse toute propriété de réponse retirée sans offrir de moyen d'en autoriser une, même une fois l'ancien front disparu. Le préfixe `watched:` reste dans les clés de choix stockées en base, encapsulé dans `LetterboxdPendingChoiceKey.TargetOf`.
- ou: `apps/api-dotnet/MoviePicker.Api/Application/DTOs/LetterboxdImportDtos.cs` (`LetterboxdSyncResponse`), `scripts/check-contract-compat.mjs`, `apps/api-dotnet/MoviePicker.Api/Application/UseCases/LetterboxdImport/LetterboxdPendingChoiceKey.cs`
- verify: `grep -n "public int WatchedAdded" apps/api-dotnet/MoviePicker.Api/Application/DTOs/LetterboxdImportDtos.cs` ; encore ouvert tant qu'une ligne tombe dans `LetterboxdSyncResponse` (celle de `LetterboxdImportConfirmResponse` n'en fait pas partie)
- fix: une liste datée de retraits autorisés dans `check:contract-compat`, avec son test, puis le retrait des champs à plat du rapport et des anciens champs `letterboxdLastSyncAt` et `letterboxdLastSyncError`
- piege: la forme change le contrat OpenAPI, régénérer `openapiSchema.ts`
- fini-quand: plus aucun champ à plat dans `LetterboxdSyncResponse`, et la date de synchronisation n'est plus écrite qu'une fois par liste

## DEBT-097 six migrations terminées et huit méthodes de port attendent la fin de la rétention des sauvegardes

- state: differe
- declencheur: 2027-10-20 pour les premières (identifiant de la migration plus 410 jours : 400 jours de copies mensuelles et 7 jours de suppression réversible, règle de retrait de la section « Migrations de données » d'`AGENTS.md`)
- impact: `ListMissingHandleAsync` (2027-10-20), `ListMissingGenresAsync` films et watchlist (2027-10-20), `ListMissingStartAtAsync` (2027-10-30), `ListMissingFactsAsync` (2027-11-04), `ListWithLegacyPosterPathAsync` films et watchlist (2027-11-07), `ListMissingRecapSlugAsync` (2027-11-28) ne servent qu'à leurs migrations, avec leurs deux implémentations et leurs tests
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Migrations/`, `Application/Ports/`
- verify: `grep -rlE "ListMissing(Handle|Genres|StartAt|Facts|RecapSlug)Async|ListWithLegacyPosterPathAsync" apps/api-dotnet/MoviePicker.Api/Application/Ports`
- fix: à chaque date, supprimer la migration, ses méthodes de port, leurs implémentations, leurs tests et son enregistrement ; lire avant le contenu réel du bucket de sauvegarde, une copie mensuelle plus récente que prévu peut avancer la date
- fini-quand: la commande `verify` ne rend plus rien

## DEBT-026 le flou de fond des barres collantes n'a jamais été mesuré au défilement

- state: differe
- declencheur: un signalement de défilement saccadé sur mobile, ou une mesure de fluidité posée sur un Android milieu de gamme
- impact: `backdrop-filter: blur(12px)` sur la barre de `AppShell` et `blur(10px)` sur `EventDetailHeader` recomposent la zone floutée à chaque image pendant le défilement ; premier suspect connu de saccades sur mobile, sans preuve ici
- ou: `apps/web/src/app/components/AppShell.module.css`, `apps/web/src/features/events/pages/event-detail/EventDetailHeader.module.css` (les deux barres collantes ; les deux autres occurrences, `Modal` et un badge de la démo de la landing, n'en sont pas)
- verify: `grep -rn "backdrop-filter" apps/web/src --include=*.css`
- fix: mesurer d'abord (Performance panel, frames longues au défilement) ; si confirmé, fond opaque légèrement translucide sans flou, ou flou réservé à `(hover: hover)`
- piege: ne pas retirer le flou sur une intuition, c'est un choix visuel de l'utilisateur. Mesure avant geste.

## DEBT-111 les schémas de `/tech` n'ont pas de variante verticale sur téléphone

- state: differe
- declencheur: un retour d'un lecteur sur téléphone
- impact: sous 768 px, chaque schéma garde sa largeur de bureau dans un cadre qui défile ; le fondu et « Faites glisser » le signalent, le texte ne descend plus sous 12 px, mais on n'en voit qu'un tiers à la fois
- ou: `apps/web/src/app/pages/tech/TechDiagrams.tsx`, `TechBlocks.tsx`
- verify: `grep -c "vertical" apps/web/src/app/pages/tech/TechDiagrams.tsx` ; encore ouvert tant que la commande rend `0`
- fix: une disposition verticale des schémas les plus larges sous 768 px, boîtes de texte revérifiées par `getBBox`

## DEBT-075 juste après un déploiement du front, `/r/<slug>` et `/e/<slug>` peuvent servir une coquille périmée

- state: differe
- declencheur: un recap ou une invitation signalés bloqués sur l'écran « recharger », ou des 404 sur `/assets/index-*.js` dans les journaux de Hosting après un déploiement
- impact: l'API garde `index.html` 60 s en mémoire et sert les documents du recap et de l'invitation en `public, max-age=60`. `deploy-front` passe après `deploy-api`, et les anciens `/assets/index-<hash>.js` répondent 404 sur la nouvelle version de Hosting : pendant une à deux minutes après chaque déploiement du front (ou retour arrière), un visiteur qui ouvre un recap ou un lien d'invitation voit le panneau « recharger » de `index.html`, et le rechargement retombe sur la même coquille tant que les deux caches n'ont pas expiré.
- ou: `apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/HttpWebShellSource.cs` (`CacheTtl`), `Controllers/ShareDocumentResults.cs`, `.github/workflows/deploy.yml`
- verify: `grep -n "CacheTtl = TimeSpan.FromSeconds(60)" apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/HttpWebShellSource.cs` ; encore ouvert tant que la ligne sort
- fix: relire la coquille quand elle désigne un fichier absent (un 404 sur ses assets vide le cache), ou garder les assets de la version précédente servis quelques minutes après le déploiement

## DEBT-073 une photo de profil envoyée hors de l'app garde ses métadonnées, et l'ancienne disparaît trop tôt

- state: differe
- declencheur: une photo servie avec ses coordonnées GPS, ou un signalement d'avatars passés aux initiales juste après un changement de photo
- impact: le serveur vérifie le format, l'en-tête et les dimensions, mais stocke les octets reçus. L'app réencode toujours sur canvas, donc l'usage normal n'est pas touché ; un envoi forgé garde EXIF et GPS, et peut glisser jusqu'à 512 Ko de données arbitraires derrière un en-tête valide, servies en `public, immutable`. Au remplacement, l'ancienne image est supprimée aussitôt : les vues qui ont encore l'ancienne clé (participants d'une soirée jusqu'à une minute, listes du propriétaire en cache) affichent les initiales jusqu'au prochain rechargement.
- ou: `apps/api-dotnet/MoviePicker.Api/Application/Avatars/AvatarPhotoImage.cs`, `Application/Avatars/AvatarPhotoWriter.cs`, `Application/UseCases/AvatarPhotos/UploadAvatarPhotoHandler.cs`
- verify: `grep -c "ImageMetadataStripper" apps/api-dotnet/MoviePicker.Api/Application/UseCases/AvatarPhotos/UploadAvatarPhotoHandler.cs` ; encore ouvert tant que la commande rend `0`
- fix: passer les octets par `ImageMetadataStripper` (déjà utilisé pour les pièces jointes des suggestions) ou les réencoder côté serveur ; garder l'ancienne image quelques minutes avant de la supprimer

## DEBT-114 trois règles SonarJS ne tournent qu'en CI

- state: differe
- declencheur: un commit de version rouge sur S6819, S6847 ou S3863
- impact: SonarCloud reprend des règles de jsx-a11y et d'import (S6819, S6847, S3863) que la vérification préalable de `pnpm run release` ne joue pas : un commit de version peut encore passer rouge sur ces règles
- ou: `scripts/release.mjs` (`preflight`), `eslint.config.mjs` (racine)
- verify: `grep -n "jsx-a11y" eslint.config.mjs` ; encore ouvert tant que la commande ne rend rien, puis tant que les trois règles n'y sont pas actives
- fix: activer les règles équivalentes de `eslint-plugin-jsx-a11y` et d'`eslint-plugin-import` dans l'ESLint du front

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

Le titre de la coquille n'a pas de `text-wrap: balance` : équilibré sur deux lignes, il faisait sur téléphone une boîte plus petite que la première affiche, qui redevenait le LCP (`startShell.test.ts` le vérifie).

Les trois préchargements de police portent `fetchpriority="low"` : à priorité haute, 53 Ko partaient dans la première vague devant `react-vendor`. Remesurer `home` après y avoir touché.

## C3 deux duplications volontaires, gardées par un test

La configuration de build ne peut pas importer `src/` : `activeLocalePreloadScript` (`apps/web/vite.config.ts`) et le script de `index.html` (pour `<html lang>`) réécrivent la clé `moviepicker-locale`, la liste des langues et la langue par défaut, et `index.html` duplique le titre de l'accueil et `home.seoTitle`. `apps/web/src/startShell.test.ts` compare ces chaînes aux locales. Si `preferredLocale()` change, changer les deux copies.

Depuis le 2026-11-06, trois autres copies sont gardées de la même façon : `BOOT_FAILURE_COPY` duplique les locales pour le repli d'avant React (`bootFailure.test.ts`), les plafonds du front restent sous ceux de `Event.cs` (`eventLimitValidation.test.ts`, qui lit le fichier C#), et les poids de la roue sont comparés entre `WheelWinnerPicker` et `wheelSliceWeights` par la fixture `wheel-slice-weights.json`, lue par les deux suites.

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
3. Les branches distantes sont visibles : `master`, `feedback-attachments` (où `GitHubIssueClient` publiait jusqu'au 2026-11-25 les captures jointes aux signalements, lisibles via `raw.githubusercontent.com` ; plus rien n'y écrit) et les branches Dependabot de passage. Les branches de worktree restent locales.
4. Les journaux et artefacts des runs Actions sont publics. Aucun `set -x` ni `echo` de secret dans les workflows ; `playwright-traces` (corps de requêtes et cookies) n'existe que sur un run rouge et vit 7 jours, `sbom-api` (`deploy.yml`, étape de recette) 30 jours. Ne pas allonger ces rétentions.

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
for ID in $(gh run list --workflow deploy.yml --limit 30 --json databaseId --jq '.[].databaseId'); do
  for J in $(gh run view "$ID" --json jobs --jq '.jobs[]|select(.name|contains("Lighthouse"))|.databaseId'); do
    gh api "repos/<DEPOT>/actions/jobs/$J/logs" | grep -E " performance:"
  done
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

`scripts/verify-local.cjs` joue toutes les portes sauf Vitest en trois voies concurrentes (node, dotnet, docker), puis la suite front seule ; seule la voie docker peut déborder dessus (téléchargement de la base Trivy, réseau pur). Au calme la suite tient en ≈ 230 s ; sous charge elle est montée à 2 987 s et produit du rouge sans rapport avec le code : `Failed to start forks worker`, `Test timed out in 25000ms` sur `a11y.test.tsx > TechPage` (4 à 5 s au calme, 43 à 85 s sous charge), `Timeout waiting for worker to respond`. D'où le budget axe de 60 s sur la page la plus lourde. Depuis le 2026-11-16 la suite tourne en pool `vmForks` (I11) : 515 s au calme en `forks`, 134 s avec la couverture en `vmForks`, couverture identique à 0,02 point près ; l'ancien `maxForks: 2` n'existait plus depuis Vitest 5, qui l'ignorait et lançait cœurs moins un workers.

1. Ne rien lancer d'autre pendant la suite : ni serveur de dev, ni Browser pane, ni `dotnet build`. Un serveur Vite allumé l'a fait passer de 238 à 332 s et sauter `TechPage`.
2. Ne pas remettre les tests .NET, le lint ou le format en parallèle de Vitest dans `verify-local.cjs`.
3. Ne pas baisser `HEAVIEST_PAGE_AXE_BUDGET` (60 000 ms) : la marge de 14× garde la suite verte sous contention.

Un vrai échec cite un nom de test et une assertion ; une famine cite un nom de fichier. Comparer les durées avec un run de référence (`git checkout --detach HEAD~1`) : si des pages sans rapport ralentissent du même facteur, c'est la machine.

## C12 pool Mongo × instances Cloud Run ≤ connexions du cluster

Pool de 20 connexions par instance (`DefaultMaxConnectionPoolSize`, `ServiceCollectionExtensions.cs`, gardé par `AddMoviePicker_MongoClientPool_FitsEveryCloudRunInstanceUnderTheClusterConnectionCap`), 5 instances de production au plus (`max_instance_count`, `infra/terraform/environments/production/main.tf`, jamais écrit par `deploy.yml`), soit 100 connexions ; la recette partage le cluster avec 2 instances et `maxPoolSize=10` dans son URI (`infra/terraform/environments/staging/main.tf`), jusqu'à ce que DEBT-053 la déplace ; le cluster en accepte 500, dont une centaine à laisser aux opérateurs, à la sauvegarde nocturne et à la dev. Monter l'un sans baisser l'autre casse en silence : les instances au-delà du budget échouent à se connecter, la readiness passe rouge et l'alerte « base injoignable » part alors que la base va bien, le jour de charge.

`MongoUrl.MaxConnectionPoolSize` vaut 100 quand la chaîne ne dit rien, jamais 0 : un `if (url.MaxConnectionPoolSize == 0)` ne s'applique jamais, et la prod a tourné à 100 par instance. Une chaîne qui porte `maxPoolSize=` garde sa valeur.

## C13 `UpdateAsync` écrit les champs connus, il ne remplace pas le document

`MongoEventRepository.UpdateAsync` et `MongoUserRepository.UpdateAsync` passent par `KnownFieldsUpdate.From(doc)`, un pipeline d'agrégation : `$set` des champs sérialisés sous `$literal`, chemins pointés pour les sous-documents mappés (`config`, `avatarPhoto`), `$unset` des champs mappés absents, jamais `ReplaceOneAsync`. Un `$set` classique en chemin pointé échoue en code 28 si le parent vaut `null`, et une valeur hors `$literal` commençant par `$` serait lue comme une expression. Les tableaux (`winners[]`, `favorites[]`) se réécrivent en entier : un champ inconnu dans un élément est perdu (`EventUpdate_ArrayElements_AreRewrittenWhole_TheirUnknownFieldsAreLost`). Tous les documents stockés portent `BsonIgnoreExtraElements` (`MongoDocumentCompatibilityTests` le vérifie pour chaque classe `*Document` du dossier Mongo, les documents imbriqués compris ; jusqu'au 2026-09-24, dix-huit en manquaient, participants, votes, abonnements push compris, et un champ ajouté à l'un d'eux faisait échouer la lecture de la révision précédente) : une révision qui ne connaît pas un champ le lit sans erreur, et avec `ReplaceOne` l'effaçait à sa prochaine écriture (`Winners`, `Recurrence`, `EventTemplates`, `IsWatchlistPublic` perdus à chaque retour de la V1.6 vers la V1.5). Tests : `*_KeepsTheFieldsWrittenByANewerApiVersion` et `*_ClearingAnOptionalField_RemovesItFromTheDocument` de `RepositoryContractTests`. Revenir à `ReplaceOneAsync` rend `rollback.yml` destructif sans qu'aucun test d'API ne le voie ; revenir vers une révision antérieure au 2026-09-15 efface encore.

## C14 une session révoquée reste valable jusqu'à 30 s sur les autres instances

`AuthTicketCache` (`Infrastructure/Web/CachedAuthTicketStore.cs`) garde chaque ticket 30 s en mémoire d'instance, et `MongoAuthSessionInvalidator` n'invalide que l'instance qui traite la révocation. « Déconnecter partout », un changement de mot de passe ou la suppression du compte laissent donc au plus 30 s sur les autres instances : accepté, et hors périmètre dans `SECURITY.md`. Ne pas allonger le TTL (la fenêtre suit) ni le supprimer (retour à une lecture Mongo par requête) ; si la fenêtre devient inacceptable, un compteur de génération par utilisateur dans `ISharedCache`, au prix d'un aller-retour par requête authentifiée.

Les créations de documents d'un compte relisent le compte juste avant d'écrire (`AccountPresence`, depuis le 2026-11-17) : la fenêtre ne recrée plus de liste, de film vu, de film à voir ni de liste enregistrée après une suppression de compte. Restent hors de cette relecture : suivre un compte (`FollowUserHandler` écrit avant de relire), l'abonnement push (`SubscribePushHandler`), rejoindre une soirée et voter.

## C15 le prérendu sert l'indexation et le premier rendu, et deux choses le rendent muet

`apps/web/scripts/prerender.mjs` (règles dans `AGENTS.md`) ne touche jamais le réseau : `fetch` y reste en attente, une page qui interroge l'API (`/films/tendances`, `/films/au-cinema`, `/films/les-plus-proposes`, `/films/collections`) livre son en-tête, son `<h1>` et son état de chargement ; prérendre les données rendrait le build dépendant de l'API de production. Une route `noindex` n'en tire que le premier rendu et le déclare dans `PRERENDERED_FOR_FIRST_PAINT_ONLY` (`/mentions-legales`, `/politique-de-confidentialite`) ; le prérendu renforce leur `noindex`, la coquille SPA ne portant aucune balise `robots`.

1. **Le document prérendu porte les styles de sa route en ligne**, lus dans `dist/route-assets.json` (C4), concaténés de la coquille à la page. Sans eux le contenu peint sans styles, se remet en page à l'arrivée du chunk et Chrome retient ce second rendu comme LCP (`/soutenir`, `elementRenderDelay` de 585 ms sur un document complet). En feuille liée : 1 point perdu sur `donate` et `privacy`.
2. **`scripts/lighthouse-run.mjs` réécrit ces routes vers leur fichier prérendu**, parce que Hosting sert chaque route prérendue comme un fichier à part (`<route>/index.html`, déposé par `scripts/publish-front-firebase.mjs`, la coquille ne répondant aux autres chemins que par les réécritures explicites des routes connues de `infra/firebase-hosting.json`, une adresse inconnue recevant `404.html` en 404) ; sans la réécriture, `serve` rend la coquille et la porte mesure une page que personne ne reçoit. `serve-handler` applique ses réécritures en cascade, donc le repli est écrit en négation (`!/prerendered/**`) et `--single` n'est pas passé, il insère son propre `**` en tête.
3. **Un document prérendu attend sa page avant `render()`** : `mountApp` attend `preloadStartupRoute` quand le document n'a pas de `#splash`, sinon `createRoot` remplace le contenu prérendu par le chargeur puis repeint la page (titre absent 40 à 60 ms sur fibre, environ 0,5 s sur réseau mobile, mesuré en production le 2026-11-17). La coquille ne l'attend pas, sa bannière cookies étant l'élément LCP (`2e3998173`). L'absence de `#splash` est ce qui distingue les deux cas : `prerender.mjs` doit continuer à le retirer.

`prerender.mjs` pose `moviepicker-consent` avec `decided: true` et l'indice de session, pour que ni la bannière ni les actions invité ne soient figées dans le HTML. `/r/` et les routes prérendues restent hors du repli hors ligne du service worker : Hosting sert leur document propre, le repli ne joue que sur un échec réseau.

## C16 Gitleaks lit tout l'arbre pendant que les autres voies y écrivent

Dans `verify:local`, la voie docker commence par `check:secrets` (`scripts/check-secrets.mjs`), qui monte le dépôt en lecture (`-v .:/repo:ro`) : Gitleaks parcourt l'arbre de travail entier, fichiers ignorés par git compris, pendant que la voie dotnet écrit dedans. Sous Windows, chaque fichier lu reste ouvert côté hôte le temps de sa lecture, en partage lecture et écriture : 375 ms mesurés pour `artifacts/openapi-v1.json` (348 Ko) sur un parcours de 23 s. Une écriture ordinaire passe au travers, une ouverture exclusive échoue.

`dotnet swagger tofile` ouvre sa sortie par `File.Create`, donc en exclusif : le 2026-11-09, `verify:local` est tombé sur `IOException: The process cannot access the file ... because it is being used by another process` à l'étape d'export OpenAPI, sans rapport avec le code. D'où `scripts/export-openapi.cjs` : le contrat est généré dans un dossier temporaire hors de l'arbre, puis recopié par `publishContract`, qui écrit en mode partagé et patiente sur `EBUSY` ou `EPERM` (`scripts/export-openapi.test.mjs`).

1. Ne pas rebrancher `--output` sur `artifacts/` directement.
2. Une nouvelle étape qui écrit dans l'arbre par un outil .NET (`File.Create`, `FileShare.None`) pendant la voie docker reproduira la panne, une fois sur quelques dizaines : générer hors de l'arbre, puis recopier.
3. Ne pas sortir `artifacts/` du périmètre de Gitleaks pour régler ça : le prochain lecteur (antivirus, indexeur, éditeur) rouvrirait la même fenêtre.

## C17 la sonde `mongosh` d'un conteneur Mongo écrit dans son répertoire de données

L'image `mongo` a `HOME=/data/db`. `docker exec <conteneur> mongosh` y écrit `.mongodb/mongosh/` pendant que le script de démarrage du conteneur fait son `chown` récursif sur `/data/db` : si un fichier disparaît entre la liste et le `chown`, le script sort en erreur et le conteneur meurt (`chown: cannot access '/data/db/.mongodb/mongosh/...lock'`). Vu le 2026-11-09 sur le job E2E de `ci-cd.yml`, vert une fois rejoué.

Toute sonde `mongosh` lancée par `docker exec` passe donc `-e HOME=/tmp` : `mongosh()` de `scripts/mongo-replica-set.mjs`, qui démarre tous les conteneurs de test (CI, sauvegarde, poste), et l'étape de vérification de `backup-mongo.yml`. Une nouvelle sonde sans ce réglage refait la course, une fois sur quelques dizaines.

## C18 la coquille reste montée d'une page à l'autre

L'`ErrorBoundary` à clé `pathname` et le `Suspense` des pages vivent dans `AppShell`, autour de l'`<Outlet />`. Remonter la clé au-dessus d'`AppShell` démonte toute l'application à chaque navigation : synchronisation Letterboxd relancée à chaque page (des 429 en production le 2026-11-16 et le 17), service worker réenregistré, en-tête effacé derrière le chargeur. Un état tenu par la coquille (dialogues compris) survit donc à une navigation : ce qui doit se fermer au changement de page le fait explicitement.

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
- **I11 accélérer la suite Vitest** : fait le 2026-11-16 par le pool `vmForks`, qui crée jsdom une fois par worker au lieu d'une fois par fichier (53 % du temps mesuré) en gardant l'isolation des modules : 515 s vers 169 s sans couverture, 134 s avec. Il exige `apps/web/vitest.vm-globals.ts` (Web Streams et `crypto`, absents du contexte vm, MSW en a besoin) et interdit de remplacer `location` entier (`PwaAutoUpdate` reçoit son rechargement en prop). Toujours rejetés : `--no-isolate` (casse 147 tests), happy-dom (diverge de la CI). Mesuré sans gain : brider les workers, 6 workers donnent 1 071 s.
- **I12 rapprocher le cluster Atlas (AWS eu-west-1) de Cloud Run (europe-west1)** : 60 sondes `/health/ready` en production, p50 6 ms, p90 9 ms. Un cluster GCP gagnerait au plus 5 ms par opération et ≈ 30 ms par cycle de sondage, contre une migration avec interruption. Le temps va à TMDB (E1) et au nombre d'allers-retours (DEBT-008).
- **I13 vérification de validité du secret scanning** (ex-DEBT-056) : l'API répond 200 et laisse le réglage désactivé, et la page Settings / Advanced Security du dépôt ne le propose plus (relu le 2026-11-25 : Secret Protection n'offre que la protection au push, active). Rien à cocher.

# Écartées

Arbitré le 2026-11-25 : la dette existe, mais le geste coûte plus qu'il ne rapporte à l'échelle mesurée ce jour-là (29 comptes, 45 soirées, 8 participants au plus par soirée). Chaque ligne dit ce qui la rouvrirait ; rouverte, elle repart en entrée `DEBT-NNN` avec un nouvel identifiant.

- **E1 enrichissement TMDB sur le chemin de lecture des films d'une soirée** (ex-DEBT-005) : depuis la 1.14.0 la liste n'est plus sondée en régime nominal (flux temps réel), et l'enrichissement passe par le cache partagé, le cache négatif et un délai de 3 s. Le figer sur le document demanderait une passe de rafraîchissement pour des plateformes qui changent. Rouvrir si la latence p95 de la liste suit les incidents TMDB.
- **E2 caches en mémoire locaux à l'instance** (ex-DEBT-006) : voulu. Seules les familles de clés fermées vont dans Mongo ; la recherche et les détails TMDB ouvrent un espace de clés illimité et restent en mémoire, plafonnés. Rouvrir si `min-instances` passe au-dessus de 1 ou si la mise à l'échelle devient routinière.
- **E3 affiches servies par Cloud Run plutôt que par un CDN** (ex-DEBT-007) : cache navigateur `immutable`, TTL de 30 jours sur `poster_cache`, sortie réseau invisible sur la facture. Rouvrir quand elle y apparaît.
- **E4 diffusion push dans la requête** (ex-DEBT-035) : correcte sous les règles de Cloud Run ; une file `push_outbox` drainée par le planificateur est disproportionnée à ce volume. Rouvrir sur un p95 des `POST` de soirée au-dessus de 500 ms ou un incident Web Push.
- **E5 secrets répliqués hors UE et journaux en `global`** (ex-DEBT-046) : aucune exigence de résidence écrite, aucune donnée personnelle dans les secrets ni dans les journaux ; recréer chaque secret coûte un déploiement par secret. Rouvrir sur une exigence écrite.
- **E6 projet GCP hors organisation** (ex-DEBT-050) : projet personnel à un seul propriétaire ; `pnpm run check:iam` reste le filet. Le durcissement du compte Google (passkeys, options de récupération) relève de son titulaire, pas du dépôt. Rouvrir si un second contributeur ou un client arrive.
- **E7 sauvegardes dans un second projet** (ex-DEBT-062) : le même propriétaire tiendrait les deux projets ; versioning, suppression douce de 7 jours et liaison conditionnelle de l'identité de sauvegarde restent la défense. Une rétention verrouillée est irréversible. Rouvrir avec E6.
- **E8 l'identité de recette peut publier sur le Hosting de production** (ex-DEBT-055) : l'exploiter demande du code exécuté dans un job de recette sur master, donc un accès propriétaire. Rouvrir si Hosting expose une IAM par site, ou avec E6.
- **E9 clé TMDB de production sur le poste** (ex-DEBT-051) : TMDB ne délivre qu'une clé par compte ; elle est gratuite, en lecture seule et révocable. Rouvrir si le quota de production souffre des essais locaux.
- **E10 jeton de lecture TMDB dans Secret Manager** (ex-DEBT-039) : la clé v3 ne voyage qu'en HTTPS vers TMDB et l'API la masque dans ses journaux et dans Sentry. Rouvrir si un intermédiaire journalisant apparaît entre l'API et TMDB.
- **E11 `SENTRY_AUTH_TOKEN` en secret de dépôt** (ex-DEBT-027) : seuls les jobs qui le citent le reçoivent, seul le propriétaire peut pousser un workflow modifié, et ni Dependabot ni une PR de fork ne reçoivent les secrets du dépôt. Rouvrir à la prochaine rotation du jeton, qui se fera directement en secret d'environnement `production` et `staging`.
- **E12 `crossorigin` sur les images pour la story** (ex-DEBT-057) : depuis DEBT-110 la page affiche les affiches en w92 à w342 et la story lit la w500, elles ne partagent plus d'entrée de cache ; le gain se réduit aux avatars, pour le risque qu'une origine sans CORS casse l'image sur la page. Rouvrir sur une ouverture de la fenêtre de partage mesurée lente.
- **E13 recherche de comptes par expression régulière** (ex-DEBT-061) : à 29 comptes, le parcours de `users` coûte quelques millisecondes. Rouvrir à 10 000 comptes ou à un p95 de `GET /api/v1/users/search` au-delà de 300 ms.
- **E14 canal d'alerte SMS** (ex-DEBT-049) : le canal existe dans le module `monitoring` et ne se crée qu'avec un numéro, donnée personnelle que seul son titulaire choisit ; l'adresse d'alerte suffit à ce volume. Rouvrir en posant `ALERT_SMS_NUMBER` (voir le module).
- **E15 classement d'un groupe relu depuis les soirées des membres** (relevé le 2026-11-25 en réglant DEBT-107) : `GetFriendGroupRankingHandler` relit jusqu'à 500 soirées passées par membre ; un seul groupe existe. Rouvrir sur une latence p95 du classement qui monte, avec la même agrégation que les chiffres du groupe (`TallyHeldByGroupIdsAsync`).
- **E16 date et heure d'une soirée en `DateOnly` et `TimeOnly`** (reste de DEBT-041) : depuis le 2026-11-25 chaque écriture refuse une date ou une heure hors format (`Errors.InvalidTimeFormat()`), donc plus aucune soirée ne reste `Upcoming` à vie ; changer le type toucherait environ 240 affectations dans 72 fichiers pour des microsecondes de parsing. Rouvrir si une lecture de ces chaînes apparaît dans un profil de performance.
- **E17 l'inscription révèle qu'une adresse a un compte** (reste de DEBT-065) : `email_taken` le dit, parce qu'une inscription qui connecte tout de suite ne peut pas répondre neutre ; l'inscription reste bornée à 20 essais par heure et par adresse IP. Depuis le 2026-11-25 un compte non confirmé ne bloque plus l'adresse d'un tiers, qui le reprend par Google, GitHub ou « Mot de passe oublié ». Rouvrir si une énumération d'adresses apparaît dans les journaux.
