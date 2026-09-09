# Dette technique

Fichier de travail pour agent. Il n'est pas destiné à être lu par un humain : il existe pour qu'une session future puisse reprendre une dette sans contexte préalable.

## Protocole

1. Avant d'agir sur une entrée, exécuter son `verify`. Ce fichier vieillit ; **sauf mention contraire dans l'entrée**, une sortie signifie « encore ouvert » et une sortie vide signifie « déjà réglé, supprimer l'entrée sans rien faire d'autre ». Une entrée qui demande de lire un nombre plutôt qu'une présence le dit dans son `verify`.
2. Une entrée `state: agent` peut être traitée en autonomie. `state: humain` demande un geste que l'agent ne peut pas faire (le champ `bloque` dit lequel). `state: differe` ne se traite pas tant que son `declencheur` n'est pas observé.
3. Fin de traitement : supprimer l'entrée entière. Ne pas la cocher, ne pas la garder en « fait », git porte l'historique.
4. Nouvelle entrée : reprendre exactement le schéma de champs ci-dessous, avec un identifiant `DEBT-NNN` jamais réutilisé. Prochain libre : `DEBT-018`.
5. Ce fichier ne contient que de la dette, c'est-à-dire du code ou de l'infrastructure qui existe et fonctionne moins bien qu'il ne devrait. Une feature à construire va dans `roadmap-product.md` ou `roadmap-tech.md`.
6. **Aucun identifiant d'infrastructure ici** : pas d'adresse de compte de service, pas de nom de bucket, pas d'identifiant de compte. Le dépôt a vocation à devenir public, et une faiblesse décrite avec sa cible se lit comme un mode d'emploi. Nommer le fichier ou la console où l'identifiant se relève, ou employer un espace réservé `<COMME_CECI>` dans les commandes.
7. Deux sections en fin de fichier n'obéissent pas à ce schéma et ne se traitent jamais : **Contraintes** liste ce qui casse en silence si on y touche, **Impasses** liste ce qui a déjà été essayé et mesuré sans gain. Les lire avant d'optimiser quoi que ce soit sur le front ou de toucher au déploiement.

Schéma : `state` / `impact` / `ou` / `verify` / `fix` / `fini-quand` / `piege` / `refs`. Champs absents = sans objet.

---

## DEBT-001 rappels de soirée hors service en production

- state: humain
- bloque: écritures `gcloud` refusées par le classifieur d'auto-mode ; l'utilisateur doit lancer les trois commandes
- impact: prod. `POST /api/v1/scheduler/event-reminders` répond 503, aucun rappel J-1, 1 h ni « en suspens » ne part. Le 503 est volontaire, préféré à un échec silencieux.
- ou: `.github/workflows/ci-cd.yml:847` et `:913` (les deux gardes qui émettent le warning)
- verify: `gcloud secrets describe SCHEDULER_TOKEN --project movie-picker-2026` ; encore ouvert si NOT_FOUND
- fix:
  ```bash
  gcloud services enable cloudscheduler.googleapis.com --project movie-picker-2026
  python -c "import secrets,sys; sys.stdout.write(secrets.token_urlsafe(48))" | gcloud secrets create SCHEDULER_TOKEN --data-file=- --replication-policy=automatic --project movie-picker-2026
  gh run rerun 34108220555
  ```
- fini-quand: l'endpoint ne répond plus 503 et le job Cloud Scheduler existe
- piege: aucune IAM à ajouter, le compte de service a déjà `roles/editor` et `roles/secretmanager.secretAccessor` au niveau projet. Une session précédente a annoncé à tort qu'il fallait `cloudscheduler.admin`.

## DEBT-002 authentification keyless écrite mais jamais fusionnée

- state: humain
- bloque: le merge est faisable par un agent, mais la configuration Workload Identity Federation côté GCP et le rôle côté AWS demandent la console
- impact: les déploiements s'authentifient avec des identifiants statiques de longue durée (`GCP_SA_KEY`, clés AWS)
- ou: branche `chore/ci-keyless-oidc`, commit `eb72fbb`, non fusionnée depuis le 2026-06-12
- verify: `git merge-base --is-ancestor chore/ci-keyless-oidc master && echo REGLE || echo OUVERT`
- fix: configurer WIF et le rôle AWS, puis fusionner. Rebaser d'abord, la branche a trois mois de retard.
- fini-quand: plus aucun secret d'identifiant statique dans les secrets GitHub du dépôt
- refs: recoupe DEBT-003 et le lot Terraform 5 de `roadmap-tech.md`, qui traite le même sujet au fond

## DEBT-003 clés AWS de compte root et IAM non scopé

- state: humain
- bloque: console AWS
- impact: compromission d'une clé donne un accès complet au compte
- verify: inspecter les clés d'accès du compte AWS ; encore ouvert tant qu'une clé root existe
- fix: identités scopées au moindre privilège, rotation des secrets exposés
- fini-quand: aucune clé root active, chaque identité limitée à son usage
- refs: DEBT-002 le supprime au fond en retirant AWS de la chaîne

## DEBT-004 en-tête frame-ancestors absent du front

- state: humain
- bloque: aucune infrastructure CloudFront décrite dans le dépôt, la policy se pose en console ou en CLI AWS
- impact: la page peut être embarquée dans une iframe tierce
- ou: distribution CloudFront `E32M2PR26FCH96`, alias `web.movie-picker.fr`
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

- state: agent
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

## DEBT-012 chantier SEO inachevé

- state: agent
- impact: les pages restent servies sans rendu préalable, et le site n'est pas enregistré dans Search Console
- ou: l'on-page (image OG, JSON-LD, hook `usePageSeo`) et le sitemap dynamique sont livrés, le reste ne l'est pas
- verify: encore ouvert tant que la ligne sort, aucun prerendering n'est câblé au build.
  ```bash
  grep -rqE 'prerender|vite-plugin-ssr|react-snap' apps/web/vite.config.ts package.json || echo "OUVERT: aucun prerendering configure"
  ```
- fix: prerendering des routes publiques, puis enregistrement Search Console
- piege: l'enregistrement Search Console demande un geste humain de vérification de propriété du domaine

## DEBT-013 pseudo-ternaire dans le calcul de ce qui se déploie

- state: agent
- impact: aucun aujourd'hui, le bon comportement est obtenu par accident. Le risque est qu'une modification voisine le fasse basculer sans que personne ne comprenne pourquoi le périmètre de déploiement a changé.
- ou: `.github/workflows/ci-cd.yml:78`, `base: ${{ github.ref == 'refs/heads/master' && '' || 'master' }}`
- verify: `grep -n "refs/heads/master' && '' ||" .github/workflows/ci-cd.yml` ; encore ouvert si la ligne sort
- fix: `''` est falsy, donc la branche « vraie » ne gagne jamais et l'expression vaut toujours `'master'`. Écrire l'intention explicitement plutôt que de s'appuyer sur le rattrapage.
- piege: **ne pas corriger à l'aveugle**. Ça marche parce que `dorny/paths-filter` traite spécialement le cas « base égale la branche poussée » et compare alors au commit précédent. Toute correction doit être validée sur un push master réel **et** sur un push de branche, sinon elle change ce qui se déploie.
- refs: préexistait au chantier CI/CD de septembre 2026

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

- state: agent
- impact: ce sont les deux seules pages sous le plancher commun de 85. Leurs seuils ont été **abaissés à 75 et 80** pour que la porte cesse de rougir, ce qui est un pansement : le gate ne détecte plus de régression sur ces deux vues.
- ou: `configs/lighthouse-budgets.json`, clé `perPageMinimumScores`
- verify: `grep -A6 perPageMinimumScores configs/lighthouse-budgets.json` ; encore ouvert tant que les deux pages y figurent
- fix: le même geste que la page d'accueil, qui est passée de 80 à 95 en peignant son titre dans la coquille de démarrage (voir Contraintes, C2). Ces deux vues étant authentifiées et leur plus grand élément dépendant des données, il faut peindre un **squelette**, pas un titre.
- fini-quand: les deux pages tiennent le plancher de 85 et leurs entrées disparaissent de `perPageMinimumScores`
- piege: aucun découpage de bundle ne franchit ce mur, c'est mesuré et documenté en Impasses I3. Le coût est le démarrage de React lui-même, pas le poids téléchargé.

## DEBT-017 les workflows ne sont couverts par aucune vérification locale

- state: agent
- impact: une erreur dans un workflow n'est vue qu'en CI, après le push. `check:architecture` ne lit que `apps/web/src` et `apps/api-dotnet`, et Prettier ignore `.github/`.
- verify: `grep -nE "apps/|\.github" scripts/check-architecture.mjs | head` ; encore ouvert tant que `.github` n'y figure pas
- fix: rejouer en local les portes du job `lint-workflows`, aux versions exactement épinglées dans les workflows, et les brancher sur `verify:local` :
  ```bash
  actionlint                                                                    # 1.7.7, délègue les blocs run: à shellcheck 0.10.0
  zizmor --offline --no-progress --min-severity medium --format plain .github/workflows/
  for f in .github/workflows/*.yml; do python3 -c "import yaml; yaml.safe_load(open('$f'))"; done
  ```
- fini-quand: les trois portes tournent dans `verify:local`
- piege: les trois étaient à 0 constat au 2026-09-06, donc l'ajout ne doit rien casser. Vérifier que `shellcheck` est dans le PATH, `actionlint` échoue silencieusement sur les blocs `run:` sans lui.

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
