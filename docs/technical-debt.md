# Dette technique

Fichier de travail pour agent. Il n'est pas destiné à être lu par un humain : il existe pour qu'une session future puisse reprendre une dette sans contexte préalable.

## Protocole

1. Avant d'agir sur une entrée, exécuter son `verify`. Ce fichier vieillit ; **sauf mention contraire dans l'entrée**, une sortie signifie « encore ouvert » et une sortie vide signifie « déjà réglé, supprimer l'entrée sans rien faire d'autre ». Une entrée qui demande de lire un nombre plutôt qu'une présence le dit dans son `verify`.
2. Une entrée `state: agent` peut être traitée en autonomie. `state: humain` demande un geste que l'agent ne peut pas faire (le champ `bloque` dit lequel). `state: differe` ne se traite pas tant que son `declencheur` n'est pas observé.
3. Fin de traitement : supprimer l'entrée entière. Ne pas la cocher, ne pas la garder en « fait », git porte l'historique.
4. Nouvelle entrée : reprendre exactement le schéma de champs ci-dessous, avec un identifiant `DEBT-NNN` jamais réutilisé. Prochain libre : `DEBT-023`.
5. Ce fichier ne contient que de la dette, c'est-à-dire du code ou de l'infrastructure qui existe et fonctionne moins bien qu'il ne devrait. Une feature à construire va dans `roadmap-product.md` ou `roadmap-tech.md`.
6. **Aucun identifiant d'infrastructure ici** : pas d'adresse de compte de service, pas de nom de bucket, pas d'identifiant de compte. Le dépôt a vocation à devenir public, et une faiblesse décrite avec sa cible se lit comme un mode d'emploi. Nommer le fichier ou la console où l'identifiant se relève, ou employer un espace réservé `<COMME_CECI>` dans les commandes. La table des gabarits, et la commande qui relève chaque valeur, sont dans `infra/README.md`.
7. Deux sections en fin de fichier n'obéissent pas à ce schéma et ne se traitent jamais : **Contraintes** liste ce qui casse en silence si on y touche, **Impasses** liste ce qui a déjà été essayé et mesuré sans gain. Les lire avant d'optimiser quoi que ce soit sur le front ou de toucher au déploiement.

Schéma : `state` / `impact` / `ou` / `verify` / `fix` / `fini-quand` / `piege` / `refs`. Champs absents = sans objet.

---

## DEBT-001 rappels de soirée hors service en production

- state: humain
- bloque: écritures `gcloud` refusées par le classifieur d'auto-mode ; l'utilisateur doit lancer les trois commandes
- impact: prod. Les deux routes `POST /api/v1/scheduler/*` répondent 503. Aucun rappel J-1, 1 h ni « en suspens » ne part, et le balayage des soirées récurrentes ne tourne pas — celles-ci ne se reconduisent qu'à la clôture ou à l'ouverture de « Mes soirées ». Le 503 est volontaire, préféré à un échec silencieux.
- ou: `.github/workflows/deploy.yml:288` et `:355` (les deux gardes qui émettent le warning)
- verify: `gcloud secrets describe SCHEDULER_TOKEN --project <PROJET_GCP>` ; encore ouvert si NOT_FOUND
- fix:
  ```bash
  gcloud services enable cloudscheduler.googleapis.com --project <PROJET_GCP>
  python -c "import secrets,sys; sys.stdout.write(secrets.token_urlsafe(48))" | gcloud secrets create SCHEDULER_TOKEN --data-file=- --replication-policy=automatic --project <PROJET_GCP>
  gh workflow run deploy.yml --ref master -f cible=api
  ```
- fini-quand: les deux endpoints ne répondent plus 503 et les deux jobs Cloud Scheduler existent, `movie-picker-event-reminders` et `movie-picker-recurring-events`
- piege: aucune IAM à ajouter, le compte de service a déjà `roles/editor` et `roles/secretmanager.secretAccessor` au niveau projet. Une session précédente a annoncé à tort qu'il fallait `cloudscheduler.admin`.

## DEBT-002 authentification keyless écrite mais jamais fusionnée

- state: humain
- bloque: le merge est faisable par un agent, mais la configuration Workload Identity Federation côté GCP et le rôle côté AWS demandent la console
- impact: les déploiements s'authentifient avec des identifiants statiques de longue durée (`GCP_SA_KEY`, clés AWS)
- ou: branche `chore/ci-keyless-oidc`, commit `eb72fbb`, non fusionnée depuis le 2026-06-12
- verify: `git merge-base --is-ancestor chore/ci-keyless-oidc master && echo REGLE || echo OUVERT`
- fix: configurer WIF et le rôle AWS, puis réécrire le patch. **La branche ne se rebase plus** : ses huit lignes modifiaient les jobs `deploy-api` et `deploy-front` de `ci-cd.yml`, partis dans `deploy.yml` le 2026-09-10. `git merge-tree master chore/ci-keyless-oidc` rend un conflit sur `ci-cd.yml` dont le contexte n'existe plus. Prendre l'intention, pas le diff.
- fini-quand: plus aucun secret d'identifiant statique dans les secrets GitHub du dépôt
- refs: recoupe DEBT-003 et le lot Terraform 5 de `roadmap-tech.md`, qui traite le même sujet au fond

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
- impact: Cloud Run monte jusqu'à `maxScale 20`, donc jusqu'à 20 caches froids indépendants, ce qui annule le bénéfice du cache
- ou: `GetMovieCollectionsHandler.cs`, `GetMovieShowcaseHandler.cs`, `Infrastructure/Tmdb/TmdbMovieSearch.cs`
- verify: `grep -rln IMemoryCache apps/api-dotnet --include=*.cs`
- fix: cache partagé hors processus
- refs: même racine que DEBT-007 et DEBT-008, la contrainte Cloud Run

## DEBT-007 affiches servies en octets depuis Mongo à travers Cloud Run

- state: differe
- declencheur: la ligne de sortie réseau devient visible sur la facture GCP
- impact: chaque affiche traverse Cloud Run au lieu d'un CDN. CloudFront ne couvre que le front, pas `api.movie-picker.fr`.
- ou: `apps/api-dotnet/MoviePicker.Api/Controllers/PostersController.cs`
- verify: `grep -n 'return File(' apps/api-dotnet/MoviePicker.Api/Controllers/PostersController.cs` ; encore ouvert tant que la ligne sort, le binaire part de la base à travers Cloud Run
- fix: stockage objet plus CDN devant
- piege: `Cache-Control: public,max-age=86400,immutable` et l'ETag sont déjà posés, le trafic est donc déjà amorti côté navigateur. Le coût restant est la sortie réseau, pas le nombre de requêtes.

## DEBT-008 le sondage à 3,5 s fixe le plafond de la base

- state: differe
- declencheur: approcher la moitié du plafond d'opérations du palier Atlas, chiffre inconnu aujourd'hui, voir DEBT-009
- impact: environ 15 allers-retours Mongo par cycle et par participant, soit environ 26 opérations par seconde pour une soirée de 6, et environ 260 à 10 soirées simultanées
- verify: `grep -n EVENT_LIVE_POLL_INTERVAL_ACTIVE_MS apps/web/src/features/events/hooks/useEventLive.ts` ; encore ouvert tant que la constante existe, c'est-à-dire tant qu'on sonde
- fix: passer en SSE
- piege: ce n'est pas un défaut. Le sondage reste le bon choix aujourd'hui, zéro infrastructure et Cloud Run n'aime pas les connexions longues. C'est le paramètre qui fixe la limite, à ne changer que sur le déclencheur.

## DEBT-009 palier Atlas jamais vérifié

- state: humain
- bloque: l'accès MCP Atlas est désactivé pour les deux organisations du compte, un Organization Owner doit activer l'accès client IA
- impact: le chiffre à confronter aux 260 opérations par seconde de DEBT-008 est inconnu, donc son déclencheur est inobservable
- verify: tenter `atlas-list-clusters` via le MCP mongodb ; encore ouvert si l'accès est refusé
- fini-quand: le plafond du palier est connu et reporté dans DEBT-008

## DEBT-010 deux composants trop chargés

- state: differe
- declencheur: une feature repasse dans le fichier concerné. Ne jamais en faire un chantier isolé.
- impact: densité d'état qui rend chaque modification risquée
- ou: `apps/web/src/features/events/pages/event-detail/EventDetailSession.tsx` (924 lignes) et `apps/web/src/features/events/components/HostEventSettingsPanel.tsx` (624 lignes)
- verify: `wc -l apps/web/src/features/events/pages/event-detail/EventDetailSession.tsx apps/web/src/features/events/components/HostEventSettingsPanel.tsx` ; cette commande sort toujours quelque chose, lire les nombres : encore ouvert tant qu'un des deux dépasse 600 lignes
- fix: extraire par responsabilité vers les primitives partagées existantes avant d'écrire du local
- piege: un troisième fichier, `movieCardParts.tsx`, figurait ici sur la foi d'un relevé à 1096 lignes. Il en fait 436 depuis l'extraction des briques de listes. Mesurer avant de croire un relevé de cette liste.

## DEBT-011 endpoint de profil public orphelin

- state: humain
- bloque: la décision, pas le geste. Cette route est très probablement le volet API de « **Watchlist d'un autre utilisateur** » du backlog de `roadmap-product.md` : la retirer supprimerait la moitié déjà écrite d'une feature planifiée. Trancher entre construire la feature et abandonner la route.
- impact: surface d'API maintenue et testée sans aucun appelant
- ou: `apps/api-dotnet/MoviePicker.Api/Controllers/UsersController.cs:66`, route `GET users/{handle}/movies`
- verify: la route existe encore côté API et aucun fichier front ne l'appelle.
  ```bash
  grep -q '"{handle}/movies"' apps/api-dotnet/MoviePicker.Api/Controllers/UsersController.cs \
    && ! grep -rqE '`/users/[^`]*/movies`' apps/web/src --include=*.ts --include=*.tsx --exclude-dir=generated \
    && echo "ORPHELIN: la route existe et aucun appelant front"
  ```
- fix: décider entre rebrancher et retirer. Le retrait impose `pnpm run openapi:export && pnpm run openapi:types` et le commit du schéma régénéré.
- piege: `watched-movies` et `following-watched-movies` du même contrôleur sont bien utilisés par `usePersonalRows.ts`, ne pas les emporter.

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
- refs: le lot Terraform 4 de `roadmap-tech.md` fait la même bascule DNS en décommissionnant AWS. Si ce lot est engagé, traiter la dette ici serait du travail jeté.

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
- refs: pendant GCP de DEBT-003 (AWS). Le lot Terraform 5 de `roadmap-tech.md` traite les deux au fond.

## DEBT-016 le LCP de watchlist et my-events attend le montage de React

- state: differe
- declencheur: un levier neuf sur le coût de montage de React lui-même. **Les deux pistes évidentes sont mesurées et mortes**, voir `piege` : ne pas rouvrir sans autre chose que « peindre dans la coquille ».
- impact: ce sont les deux seules pages sous le plancher commun de 85. Leurs seuils sont **abaissés à 80 et 75**, ce qui est un pansement : le gate ne détecte plus de régression fine sur ces deux vues.
- ou: `configs/lighthouse-budgets.json`, clé `perPageMinimumScores`
- verify: `grep -A6 perPageMinimumScores configs/lighthouse-budgets.json` ; encore ouvert tant que les deux pages y figurent
- fix: faire baisser le coût de montage de React. Aucun autre levier connu.
- fini-quand: les deux pages tiennent le plancher de 85 et leurs entrées disparaissent de `perPageMinimumScores`
- piege: **mesuré le 2026-09-10, médiane de 3 passes, les deux pages à 80.** Le diagnostic initial était faux sur deux points, et les deux erreurs mènent à un correctif qui ne peut pas marcher.
  1. **Ce n'est pas une vue de données.** `scripts/lighthouse-run.mjs` ne connecte personne, son stub d'API répond 404 sur `/auth/me` : la porte mesure l'état **déconnecté**. L'élément LCP relevé est le paragraphe de `SignedOutState`, `<p class="_message_…">`, 330 × 50 px sur watchlist et 325 × 74 px sur my-events, et le LCP est presque entièrement du `elementRenderDelay` — 629 ms et 726 ms pour un TTFB de 10 ms.
  2. **« Peindre un squelette » ne peut pas fonctionner.** Un bloc gris n'est pas un candidat LCP : Chrome ne retient que du texte, une image, ou un fond chargé par `url()`. Un dégradé CSS ne compte pas. Peindre un squelette vide dans la coquille ne déplacerait donc pas le LCP d'une milliseconde.

  Et les deux échappatoires ne tiennent pas non plus. **Peindre le titre de page** dans la coquille, le geste de la page d'accueil (C2), échoue sur la condition de taille : le `h1` fait environ 2 900 px² contre 16 500 et 24 050 px² pour le paragraphe, donc Chrome remplacerait le titre par le message et le gain serait nul. **Peindre le message déconnecté** tiendrait le score, mais afficherait « Connectez-vous ou créez un compte » à chaque arrivée d'un utilisateur **déjà connecté** : la coquille ne peut pas connaître l'état de session avant que JavaScript tourne, le cookie étant HttpOnly. Échanger l'expérience du cas principal contre 5 points de score est un mauvais marché.
- refs: Impasses I3 — le mur est le démarrage de `react-vendor`, environ 665 ms, et il ne se contourne pas par du découpage de bundle. C'est le même mur ici. Impasses I4 — ne pas desserrer la porte davantage.

## DEBT-018 GitHub Actions bloqué par la facturation, la production front est figée

- state: humain
- bloque: régulariser la section « Billing & plans » du compte GitHub, aucun geste possible depuis le dépôt
- impact: prod. Aucun runner ne démarre depuis le 2026-09-09 17:02 UTC, sur `master` comme sur les branches de version : les runs échouent en 3 secondes avec un `runner_name` vide. Rien de ce qui a été fusionné depuis n'est déployé, le front servi reste celui du build de 16:56 UTC.
- verify: encore ouvert tant que la commande sort le message de facturation.
  ```bash
  RUN=$(gh run list -b master -L1 --json databaseId --jq '.[0].databaseId')
  JOB=$(gh api repos/Affy657/Movie-Picker/actions/runs/$RUN/jobs --jq '.jobs[0].id')
  gh api repos/Affy657/Movie-Picker/check-runs/$JOB/annotations --jq '.[].message'
  ```
- fix: une fois la facturation régularisée, `gh run rerun $RUN`, puis vérifier la production elle-même et non le verdict du run
- fini-quand: `curl -sI https://web.movie-picker.fr/index.html` rend un `Last-Modified` postérieur au dernier commit de `master`, et le hash du point d'entrée servi est celui du build courant
- piege: **le verdict d'un job ne dit pas ce qui est en production.** Le 2026-09-09, `deploy-front` était rouge alors que la synchronisation S3 et l'invalidation CloudFront étaient passées : seul le smoke test avait échoué, sur une permission `cloudfront:GetDistribution` absente de la politique IAM, corrigée depuis. Vérifier la prod elle-même : `Last-Modified`, hash du point d'entrée, et présence d'une règle distinctive dans le chunk CSS servi. Second piège, **le message réel de la panne n'est pas dans les logs du job**, il n'existe que dans les annotations du check-run, d'où la commande ci-dessus.
- refs: DEBT-019 ne peut pas être vérifiée tant que celle-ci est ouverte

## DEBT-019 le travail Sonar de septembre n'a jamais été analysé

- state: differe
- declencheur: une analyse SonarCloud postérieure au commit `bbdf8b2`, c'est-à-dire le premier run vert après DEBT-018
- impact: cinq commits ont soldé des constats Sonar, dont seize fonctions retravaillées pour repasser sous le seuil de complexité cognitive de 15. Aucun n'a été mesuré : la dernière analyse porte sur `3f99aef`, qui **précède** les cinq. Les 42 constats que SonarCloud affiche encore ouverts sont l'état d'avant le chantier, pas son résultat.
- ou: commits `86d8770`, `8d75d5c`, `ba01a0a`, `56cd7c0`, `bbdf8b2` sur `master`
- verify: lire les deux nombres. Encore ouvert tant que la première commande rend une révision antérieure à `bbdf8b2`, ou que la seconde rend un total non nul. Le jeton se relève dans la configuration MCP locale, serveur `sonarqube`.
  ```bash
  curl -sS -u "<JETON_SONARCLOUD>:" "https://sonarcloud.io/api/project_analyses/search?project=Affy657_Movie-Picker&ps=1"
  curl -sS -u "<JETON_SONARCLOUD>:" "https://sonarcloud.io/api/issues/search?componentKeys=Affy657_Movie-Picker&resolved=false&rules=typescript:S3776&ps=1"
  ```
- fix: pour chaque `S3776` qui survit, extraire une responsabilité de plus. Déplacer du code sans réduire le nombre de branches ne fait pas baisser le compteur.
- fini-quand: plus aucun `S3776` ouvert, ou ceux qui restent portent une justification « won't fix »
- piege: **la complexité cognitive ne se mesure pas en local**, aucun outil du dépôt ne la calcule. Ne pas annoncer un seuil franchi sur la foi d'une lecture du diff, d'autant que cinq des seize fonctions n'étaient qu'à 16. Second piège, à l'inverse du réflexe attendu : ces refactorisations **ajoutent** des lignes, +1357 pour -619 sur les cinq commits, parce qu'extraire un bloc coûte une déclaration de type et une liste de props. Ce n'est pas un échec, mais ça consomme la marge de DEBT-021.

## DEBT-021 du code de production est exclu de Sonar pour tenir sous le plafond de lignes

- state: differe
- declencheur: `ncloc` dépasse 49 000, ou l'analyse échoue à nouveau côté serveur pendant que le Quality Gate reste vert
- impact: `TechPage.tsx` et tout `app/pages/tech/` sont sortis de l'analyse, soit environ 3 000 lignes de code de production que Sonar ne regarde plus. C'est le prix payé le 2026-09-09 pour repasser sous le plafond de 50 000 lignes du plan gratuit, que le dépôt avait franchi.
- ou: `configs/sonar-exclusions.sh:56` et `:57`
- verify: lire le nombre, la marge est 50 000 moins la valeur rendue.
  ```bash
  curl -sS -u "<JETON_SONARCLOUD>:" "https://sonarcloud.io/api/measures/component?component=Affy657_Movie-Picker&metricKeys=ncloc"
  ```
- fix: aucun candidat évident ne reste à exclure, tout ce qui était légitime l'est déjà. Les deux sorties réelles sont de payer un plan, ou de réduire le code analysé.
- fini-quand: la marge redevient confortable sans qu'aucun code de production ne soit exclu
- piege: **le symptôme est trompeur, le dépassement ne rend pas le job rouge.** L'analyse échoue côté serveur pendant que le Quality Gate reste vert sur les données de la veille : ne pas conclure « Sonar va bien » en voyant du vert. Au 2026-09-09, `ncloc` valait 47 864, soit 2 136 lignes de marge.
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
3. **La feuille de style de l'entrée est bloquante dans le `<head>`**, donc Overpass est déclarée quand la coquille est peinte. Sans ça, substitution de police tardive, taille de boîte changée, nouveau candidat LCP.

## C3 deux duplications volontaires, gardées par un test

La configuration de build ne peut pas importer `src/`, donc `apps/web/vite.config.ts` réécrit à la main la clé de stockage `moviepicker-locale`, la liste des langues et la règle de détection dans `activeLocalePreloadScript`. Le titre de l'accueil est dupliqué dans `index.html` pour la même raison. `apps/web/src/startShell.test.ts` compare les chaînes en dur à `fr.home.title` et `en.home.title` et échoue si l'une dérive. Si `preferredLocale()` change, changer aussi `activeLocalePreloadScript`.

## C4 ne pas renommer les chunks que le préchargement cherche

`preloadCriticalAssetsPlugin` cherche `App-[hash].js`, `App-[hash].css` et `i18n-[hash].js` dans le bundle. Tout regroupement qui renomme ou absorbe ces chunks fait disparaître les préchargements **en silence**, et le LCP empire. Et `@sentry`, `posthog-js`, `canvas-confetti`, `react-qr-code` sont chargés à la demande : les placer dans un chunk partagé avec du code eager les rendrait eager.

## C5 le bucket de sauvegarde contient des données personnelles

Le bucket de sauvegarde MongoDB (europe-west1, versioning actif, suppression à 30 jours, nom dans `backup-mongo.yml`) porte des données personnelles. Accès public interdit, accès uniforme au niveau du bucket, et l'archive n'est **jamais** publiée en artefact GitHub. La limite connue est écrite dans l'en-tête de `backup-mongo.yml` : la vérification prouve que l'archive se restaure, pas qu'elle est cohérente entre collections.

## C6 sortir le front d'AWS engage le budget et suit un ordre imposé

Le chantier Terraform de `roadmap-tech.md` sort le front d'AWS (lots 3 et 4). Deux cibles GCP sont possibles et **une des deux fait sortir le projet du « 0 €/mois, tous les services dans leur palier gratuit »**, indicateur suivi au Bloc 3, sans qu'aucune alerte ne le dise avant la facture.

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

1. **Le courriel personnel de l'auteur est l'adresse de 916 commits sur 1 003**, désormais public, moissonnable et miroité. 28 commits utilisaient déjà l'adresse `noreply` GitHub, l'identité était donc déjà incohérente. Le seul recours restant serait de réécrire les 1 003 commits, ce qui change **tous** les SHA et casse les liens de commit des 86 PR fusionnées — pour une adresse déjà publiée, donc sans bénéfice. Ce qui reste utile, et pas fait : poser `user.email` sur l'adresse `noreply` pour les commits **à venir**.
2. **Les livrables RNCP et un support de cours Ynov sont publiés** : `docs/RNCP/` (dossiers PDF, captures, slides du Bloc 3) et `archive/docs/_ynov/`, qui contient une consigne de module, donc du matériel de l'école. Des livrables notés en verbatim sont désormais copiables, et l'oral du Bloc 3 est le 2026-09-16. Un `git rm` maintenant ne retirerait que le head.
3. **Cinq branches distantes sont visibles**, dont trois branches de travail d'agent, et `feedback-attachments` dont l'objet n'est plus identifiable. Rien de secret, mais c'est ce que voit un visiteur en premier. Ne pas les supprimer sans vérifier `git worktree list` : deux d'entre elles sauvegardent le travail en cours d'un worktree.
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

Deux pièges d'énumération, payés une fois : `approval_policy` n'accepte que des valeurs **en minuscules** (`all_external_contributors`), et le ruleset ne demande **aucun contrôle de statut** — en exiger un casserait le workflow de poussée directe, un commit tout juste poussé n'ayant encore aucun run attaché.

**Il reste un geste, sans API : passer le projet SonarCloud en public.** C'est lui qui supprime le plafond de 50 000 lignes, donc la cause de l'exclusion de `TechPage.tsx` et de `app/pages/tech/` posée le 2026-09-09 — ~3 000 lignes rendues à l'analyse — et la contrainte de marge de DEBT-021. Le palier gratuit est annoncé illimité sur un projet public, à relire sur la page de tarification avant d'en dépendre. Contrepartie : les constats deviennent publics.

**Deux limites à connaître, qui ne se règlent pas :**

- **Le fork ne se désactive pas sur un dépôt public.** Seuls les dépôts privés ou internes d'une organisation peuvent le restreindre. Forker pour lire est libre, comme cloner ; la licence ne réserve que l'usage qui suit.
- **Les tickets restent ouverts à tout le monde.** GitHub ne sait pas les limiter aux collaborateurs de façon permanente, seulement les geler temporairement (6 mois au plus) ou les désactiver en bloc, ce qui ferait perdre le backlog. Un ticket est un signalement, pas une contribution : `CONTRIBUTING.md` dit où va chaque chose.

---

# Impasses

Mesuré, sans gain, retiré. Ne pas rejouer sans une raison neuve.

- **I1 regrouper la couche `shared/` en un chunk.** Divise les requêtes par deux (76 vers 43 sur `watchlist`) et ne gagne aucun point. Coûte là où on ne regardait pas : `register` passe de 87 à 84, sous son plancher. Regrouper `shared/` la rend eager, donc une page d'authentification télécharge les 92 Ko de la couche entière. Leçon générale : **mesurer les pages légères autant que les lourdes**, la porte peut rester rouge en changeant simplement de page.
- **I2 précharger le chunk de la route d'accueil sur `/`.** 0 point. L'hypothèse était fausse : le LCP n'attend pas les 9 Ko du chunk, il attend React.
- **I3 découper le bundle pour sauver le LCP.** Les 185 Ko d'i18n retirés du chemin critique n'ont rendu qu'**un** point, parce que ce sont des chaînes de caractères et pas du code : un objet littéral s'analyse bien plus vite que de l'exécutable à poids égal. Le mur est `react-vendor` (220 Ko, 665 ms de bootup) et il ne se contourne pas par le bundling. Le seul levier est de sortir le plus grand élément du rendu React, voir C2.
- **I4 desserrer la porte Lighthouse** (baisser un seuil global, retirer une page, la repasser non bloquante). Le déficit est réel et mesuré ; c'est cette porte qui a détecté que la production ne se déployait plus.
- **I5 `mongodump --oplog`** pour la cohérence transactionnelle : impose un dump de l'instance entière et des droits supplémentaires.
- **I6 factoriser `auth` + `setup-gcloud` (5 copies) et les smoke tests en actions composites.** Juste sur le fond, mais touche 4 workflows dont 2 hors périmètre. À faire dans un lot dédié, jamais en fin de diff.
- **I7 descendre zizmor au seuil `low`** : 9 constats cosmétiques. Le seuil `medium` est vert et n'attrape que du sérieux.
- **I8 espacer les workflows planifiés pour économiser des minutes GitHub Actions.** Mesuré au 2026-09-10 sur l'historique des runs : `security-scan.yml` tourne en 45 à 80 s une fois par semaine (≈ 5 min/mois), `registry-cleanup.yml` une fois par mois (≈ 1 min/mois), `backup-mongo.yml` en ≈ 90 s par nuit (≈ 45 min/mois). Total ≈ 51 min/mois, contre ≈ 450 min pour 20 runs de CI : les crons ne sont pas le poste de coût, et le seul qui pèse est le seul filet en cas de perte de données. Espacer la sauvegarde à deux jours économiserait 22 min/mois en doublant le point de restauration acceptable, ce qui est un mauvais échange sur des données personnelles non reconstituables. Ne pas rejouer sans un changement de cadran : soit le quota redevient contraignant après le passage du dépôt en public, soit la sauvegarde grossit assez pour changer l'ordre de grandeur.
