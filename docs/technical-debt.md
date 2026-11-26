# Dette technique

Fichier de travail pour agent : une session future doit pouvoir reprendre une dette sans contexte préalable.

## Protocole

1. Avant d'agir sur une entrée, exécuter son `verify`. Sauf mention contraire dans l'entrée, une sortie signifie « encore ouvert », une sortie vide « déjà réglé, supprimer l'entrée sans rien faire d'autre ».
2. `state: agent` se traite en autonomie ; `state: humain` demande un geste que l'agent ne peut pas faire (`bloque` dit lequel) ; `state: differe` attend son `declencheur`.
3. Fin de traitement : supprimer l'entrée entière et sa ligne du sommaire, git porte l'historique.
4. Nouvelle entrée : même schéma de champs, identifiant `DEBT-NNN` jamais réutilisé. Prochain libre : `DEBT-124`. Elle se range dans la partie de son `state`, avec les entrées de sa zone, et gagne sa ligne au sommaire dans le même commit. Une entrée qui change de `state` change de partie et de tableau.
5. Deux dettes qui se règlent par le même geste n'en font qu'une, sous l'identifiant le plus ancien ; les identifiants absorbés restent cités dans `refs`.
6. Ici uniquement de la dette, du code ou de l'infrastructure qui existe et fonctionne moins bien qu'il ne devrait. Une feature va dans `roadmap.md`. Un retrait qui n'attend qu'une date (rétention des sauvegardes, ancien front encore en circulation) va dans `scripts/removal-schedule.json`, que `pnpm run check:removal-schedule` fait respecter.
7. **Aucun identifiant d'infrastructure** (compte de service, bucket, identifiant de compte) : le dépôt est public, une faiblesse décrite avec sa cible se lit comme un mode d'emploi. Nommer le fichier ou la console où l'identifiant se relève, ou un espace réservé `<COMME_CECI>` ; la table des gabarits est dans `infra/README.md`.
8. **Contraintes** (ce qui casse en silence si on y touche), **Impasses** (essayé, mesuré, sans gain) et **Écartées** (arbitré, ne se fait pas à cette échelle), en fin de fichier, ne se traitent jamais. Les lire avant d'optimiser le front ou de toucher au déploiement.

Schéma : `state` / `bloque` (avec `state: humain`) / `declencheur` (avec `state: differe`) / `impact` / `ou` / `verify` / `fix` / `fini-quand` / `piege` / `refs`. Champs absents = sans objet.

Zones, dans l'ordre où elles se rangent dans chaque partie : **Produit** (ce qu'un utilisateur peut voir se comporter mal), **API et données**, **Front**, **Infra et déploiement**, **Sécurité et accès**, **Tests, CI et outillage**.

## Sommaire

### Pour un agent (0)

| Dette | Zone | Sujet |
|---|---|---|

### Geste humain (0)

| Dette | Zone | Sujet |
|---|---|---|

### Différées (0)

| Dette | Zone | Sujet |
|---|---|---|

---

# Pour un agent

Se traite en autonomie, sans attendre personne.


---

# Geste humain

L'agent prépare, l'utilisateur fait le geste que `bloque` décrit.

---

# Différées

Ne se traitent que quand leur `declencheur` survient.



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

Deux autres copies sont gardées de la même façon : `BOOT_FAILURE_COPY` duplique les locales pour le repli d'avant React (`bootFailure.test.ts`), et les poids de la roue sont comparés entre `WheelWinnerPicker` et `wheelSliceWeights` par la fixture `wheel-slice-weights.json`, lue par les deux suites.

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
3. Les branches distantes sont visibles : `master` et les branches Dependabot de passage. `feedback-attachments`, où `GitHubIssueClient` publiait jusqu'au 2026-11-25 les captures jointes aux signalements, a été supprimée le 2026-11-26 : les anciennes issues qui les affichaient n'ont plus d'image. Les branches de worktree restent locales.
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
3. **`/settings` garde ses sections de membre hors de son chunk** : `AccountPage` ne rend en direct que les préférences de l'appareil, sans attendre la session quand `hasSessionHint()` est faux ; profil, sécurité, intégrations et notifications vivent dans `AccountSettingsRoutes`, chargé à part (`AccountPage.chunks.test.tsx`). Un import statique d'une section dans `AccountPage` remet 23 chunks devant le LCP du visiteur : 85 sur le runner avant le découpage (ex-DEBT-123, deux échecs à 84 le 2026-11-26), 91 après.

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

Pool de 20 connexions par instance (`DefaultMaxConnectionPoolSize`, `ServiceCollectionExtensions.cs`, gardé par `AddMoviePicker_MongoClientPool_FitsEveryCloudRunInstanceUnderTheClusterConnectionCap`), 5 instances de production au plus (`max_instance_count`, `infra/terraform/environments/production/main.tf`, jamais écrit par `deploy.yml`), soit 100 connexions ; la recette partage le cluster avec 2 instances et `maxPoolSize=10` dans son URI (`infra/terraform/environments/staging/main.tf`, écartée E20) ; le cluster en accepte 500, dont une centaine à laisser aux opérateurs, à la sauvegarde nocturne et à la dev. Monter l'un sans baisser l'autre casse en silence : les instances au-delà du budget échouent à se connecter, la readiness passe rouge et l'alerte « base injoignable » part alors que la base va bien, le jour de charge.

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
- **I14 retirer le flou des barres collantes pour fluidifier le défilement** (ex-DEBT-026) : mesuré le 2026-11-26 sur `/films/tendances`, Pixel 5 émulé, CPU ralenti 4 et 6 fois, cinq passages alternés, flou réellement actif dans Chromium : aucune pénalité (CPU 6x, p95 33,4 ms avec flou contre 66,7 ms sans, LoAF 865 contre 1 149 ms). Limite : Chromium sans écran compose en logiciel. Rouvrir sur une mesure faite sur un vrai téléphone Android.

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
- **E18 `Retry-After` du limiteur sur le flux temps réel** (reste de DEBT-008) : `EventSource` ne donne ni le statut ni les en-têtes d'un refus ; le refus de `EventStreamGate` impose déjà 30 s, et le repli sonde toutes les 15 s depuis le 2026-11-25. Seul le limiteur de débit (jusqu'à 60 s) n'est pas lu, et le lire demanderait un transport par `fetch` en flux, risqué sur Safari. Rouvrir sur des rafales de 429 du flux dans les journaux.
- **E19 fiche film, `/films/tendances`, profil rempli et `/tech` hors de la porte Lighthouse** (ex-DEBT-108) : le 2026-11-26, `/tech` gagne par un rendu du prérendu en transition (blocage du fil principal de 409 à 59 ms, score local de 69 à 81) et la fiche film précharge son affiche (LCP local de 6,1 à 5,8 s), mais aucune des quatre pages n'atteint 85 sur le poste, environ dix points sous le runner. Le profil rempli attend la section des films, dont l'avance a déjà coûté 5 points au profil vide (`acece7ea4`). Mesurées sans effet : `content-visibility` par section de `/tech` et le préchargement des feuilles de la page depuis les documents prérendus. Rouvrir avec une mesure sur le runner (`LH_CANDIDATES=1`, aujourd'hui seulement dans `deploy.yml`) ou une piste neuve pour le LCP d'une affiche.
- **E20 recette et poste de développement sur le cluster de production** (reste de DEBT-053) : depuis le 2026-11-26 chaque usage a son utilisateur Atlas limité à sa base (`moviepicker_api` et `moviepicker_backup` sur `moviepicker`, `moviepicker_staging`, `moviepicker_dev`), aucun ne voit la base d'un autre (`listDatabases` et lecture croisée vérifiés), et l'administrateur partagé avec le poste est supprimé. Reste le partage du M0 (100 opérations par seconde) : un second projet Atlas isolerait la charge de recette, au prix d'une base de recette à reconstruire, d'un second cluster à surveiller et de deux URI de plus. Rouvrir sur une alerte de charge Atlas pendant un déploiement en recette, ou avant un test de charge.
