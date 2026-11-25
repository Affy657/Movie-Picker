# Guide de développement

Ce qui ne tient pas dans le [README](../README.md) : préparer son environnement, comprendre les
données de démonstration, connaître les scripts et savoir où se trouvent les choses. Les règles à
respecter en écrivant du code sont dans [`AGENTS.md`](../AGENTS.md).

## Prérequis

- **Node.js** 20.19+, 22.13+ ou 24+, et **pnpm** 10.
- **SDK .NET 10** pour l'API.
- **Docker**, pour la base MongoDB de l'API, les tests d'intégration et la suite e2e, pour la voie
  docker de `verify:local` (Gitleaks, lint des workflows, Terraform, Trivy) et pour lancer
  Terraform, qui n'est pas installé sur le poste (voir [`infra/README.md`](../infra/README.md)).

MongoDB est un prérequis : l'API refuse de démarrer sans `MONGODB_URI`. Docker suffit à en lancer
une, la section suivante dit comment.

Contrôle rapide : `node scripts/check-prereqs.js` et `dotnet --version`.

## Configuration

### La base

**L'API ne tourne que sur MongoDB.** Sans `MONGODB_URI`, elle s'arrête au démarrage avec un message
qui dit comment lancer la base locale. Les adaptateurs en mémoire ne sont plus que des doublures
de tests, dans le projet `MoviePicker.Api.TestSupport`, et l'API ne les enregistre jamais : une
méthode de port ne s'écrit qu'une fois dans le code de production.

Viser une base **dédiée et jetable**, jamais celle de production : le seed de Development et les
tests E2E écrivent dedans. Un garde-fou refuse d'ailleurs de démarrer en Development sur la base
`moviepicker`, et les suites de tests refusent en plus `moviepicker_dev`.

Le plus simple est le conteneur des tests, un MongoDB en replica set (la seule topologie où les
transactions d'`IUnitOfWork` tournent) que `scripts/mongo-replica-set.mjs` démarre avec l'image
épinglée, recrée s'il tourne sur une autre image, puis attend jusqu'à ce qu'il accepte les écritures :

```bash
node scripts/mongo-replica-set.mjs --container movie-picker-mongo-test --port 27018
```

Ce qui donne `MONGODB_URI=mongodb://127.0.0.1:27018/moviepicker_local?directConnection=true`. Le même
conteneur sert à `pnpm run test:api:mongo` et à `pnpm run test:e2e:local`, chacun dans ses propres
bases (`moviepicker_it_*`, `moviepicker_e2e`) : la base locale y survit, mais disparaît avec le
conteneur quand l'image épinglée change. Sur Atlas, un cluster gratuit M0 suffit, la chaîne de
connexion se récupère dans la console.

### La clé TMDB

Compte gratuit sur [themoviedb.org](https://www.themoviedb.org/), puis Réglages puis API. La page
donne deux identifiants, l'API accepte l'un ou l'autre : le **jeton d'accès en lecture** (v4), à
poser dans `TMDB_READ_ACCESS_TOKEN`, est préféré parce qu'il voyage dans un en-tête `Authorization`
et n'apparaît donc jamais dans l'adresse des requêtes sortantes ; la **clé v3**, dans `TMDB_API_KEY`,
reste acceptée et l'API la pose elle-même en `api_key` dans la query string quand aucun jeton n'est
configuré. Sans l'un des deux, la recherche de films et les pages d'exploration restent vides, le
reste de l'application fonctionne.

### Le fichier `.env`

Copier `.env.example` en `.env` à la racine et renseigner `MONGODB_URI` et `TMDB_READ_ACCESS_TOKEN`
(ou `TMDB_API_KEY`). Toutes
les autres variables ont un défaut utilisable en local, `.env.example` documente chacune.

Attention au chargement, il a déjà coûté une séance de débogage. L'API ne lit pas un fichier mais
les **fusionne en remontant** depuis le répertoire courant, jusqu'à huit niveaux au-dessus. Pour une
clé donnée, le fichier le plus proche gagne et les parents ne remplissent que ce qui manque. Un
`.env` local ne contenant qu'une seule variable suffit donc à masquer les autres du fichier racine.
Conséquence directe : vider une variable ne la neutralise pas, elle redevient éligible au
remplissage par un parent.

Optionnel : `apps/web/.env` pour pointer le front vers une autre API que `http://localhost:4000`,
via `VITE_API_URL` (voir `apps/web/.env.example`).

En Development, `localhost` et `127.0.0.1` sont autorisés sans configuration CORS. En Production et
dans l'image Docker, l'API exige `ALLOWED_ORIGINS`, les origines du front séparées par des virgules
et sans slash final.

### Lancer

```bash
pnpm dev:full          # les deux ensemble
pnpm dev:api-dotnet    # API seule, http://localhost:4000, /health et /swagger
pnpm dev:web           # front seul, http://localhost:5173
```

Les variantes `dev:web:log` et `dev:api-dotnet:log` écrivent dans `logs/` au lieu du terminal.

Les variantes `dev:full:b`, `dev:web:b` et `dev:api-dotnet:b` lancent une seconde paire sur
`http://localhost:5273` et `http://localhost:4100`, pour faire tourner deux agents ou deux worktrees
côte à côte sans se marcher sur les ports. Elles partagent la même base `moviepicker_dev` que la
première paire ; les configurations `full-b`, `web-b` et `api-b` de `.claude/launch.json` les reprennent.

En Development, la page de connexion affiche un bouton qui ouvre directement la session du compte
de démonstration, sans saisir d'identifiants.

## Comptes de démonstration

En Development, l'API crée des comptes et des données de démonstration au démarrage. La
configuration est dans `apps/api-dotnet/MoviePicker.Api/appsettings.Development.json`, section
`DevelopmentSeed`, surchargeable par variables `DevelopmentSeed__*`.

| Compte | E-mail | Mot de passe | Particularité |
| --- | --- | --- | --- |
| Principal | `dev@test.local` | `DevTest123!` | Hôte de plusieurs soirées |
| Alice | `alice@test.local` | `AliceTest123!` | Profil public |
| Bob | `bob@test.local` | `BobTest12345!` | Profil public |
| Carla | `carla@test.local` | `CarlaTest123!` | Profil privé, sert à vérifier le 404 |
| David | `david@test.local` | `DavidTest123!` | Profil public |
| Zoé | `zoe@test.local` | `ZoeTest1234!` | Profil public que personne ne suit, sert à la recherche de comptes sans accent (`zoe`, `lefevre`) |

Chaque compte n'est créé que si son adresse est absente de la base.

- `SeedSampleEvents` ajoute quelques soirées au compte principal.
- `SeedScenarioDemos` ajoute un jeu de soirées couvrant les états intéressants : multi-participants,
  roue tirée puis clôturée, capacité atteinte, retrait d'un participant, tirage gelé, soirée passée,
  soirée à échéance, soirée vide, soirée annulée. Côté V1.6 : une limite d'un vote par participant
  avec le compte principal à quota, un marathon à trois gagnants dont deux déjà tirés et annoncés,
  une trilogie terminée à trois gagnants (deux à la roue, un désigné) et une série hebdomadaire dont
  l'occurrence précédente est close et la suivante créée par la vraie passe de récurrence. Plus
  quatre modèles de soirée (trois sur le compte principal, un chez Alice), des watchlists (Alice
  publique, Bob masquée, Zoé publique, trois films sur le compte principal), un graphe de suivi
  entre comptes et des notifications. `DevelopmentScenarioSeedTests` rejoue toute la seed en mémoire
  et refuse une étape qui journalise un avertissement.

Pour couper : `DevelopmentSeed__Enabled=false`, ou finement `DevelopmentSeed__SeedSampleEvents=false`
et `DevelopmentSeed__SeedScenarioDemos=false`.

## Scripts

Tous se lancent à la racine du dépôt.

| Script | Rôle |
| --- | --- |
| `pnpm dev:full`, `pnpm dev:web`, `pnpm dev:api-dotnet` | Démarrage local |
| `pnpm build` | Build du front par Turbo |
| `pnpm lint`, `pnpm run lint:eslint` | Types puis règles ESLint côté front ; la seconde forme ne joue que les règles |
| `pnpm run check:static` | Toutes les portes statiques : architecture, tests des scripts, compatibilité du contrat avec la version publiée, `pnpm lint`, Prettier, knip ; c'est le hook pre-push, le job `lint-web` et la voie node de `verify:local` |
| `pnpm run check:architecture` | Règles d'architecture |
| `pnpm run check:unused` | Fichiers, exports et dépendances inutilisés (knip) |
| `pnpm run check:workflows` | actionlint (+ shellcheck) et zizmor sur `.github/`, par Docker, joué tel quel par le job `lint-workflows` |
| `pnpm run check:terraform` | `terraform fmt -check` puis `validate` sur chaque module racine de `infra/terraform/`, par Docker, joué tel quel par le job `lint-terraform` |
| `pnpm run check:secrets` | Gitleaks sur l'arbre de travail, par Docker, joué tel quel par le job `gitleaks` |
| `pnpm run check:audit` | Trivy sur `pnpm-lock.yaml` (HIGH avec correctif, puis tout CRITICAL), par Docker, joué tel quel par le job `audit` |
| `pnpm run terraform -- <commande>` | Terraform depuis son image épinglée, bucket d'état et jeton GCP fournis par l'enveloppe, voir `infra/README.md` |
| `pnpm format`, `pnpm format:check` | Prettier |
| `pnpm run format:dotnet`, `pnpm run format:dotnet:check` | Style C#, après `dotnet restore` ; la vérification joue les passes `whitespace` et `style`, les analyseurs étant ceux du build |
| `pnpm test`, `pnpm run test:coverage` | Tests front, Vitest |
| `pnpm run test:changed` | Tests front touchés par le diff depuis `origin/master`, la boucle d'avant push |
| `pnpm run test:api:mongo` | Tests d'intégration API contre une vraie MongoDB, avec la porte de couverture des adaptateurs Mongo, puis les tests des scripts qui interrogent MongoDB (`scripts/mongo-tests/`, la requête de `pnpm run usage` sur des documents semés) ; joué tel quel par le job `test-api` |
| `pnpm run test:api:mutation` | Passe Stryker.NET, rapport dans `artifacts/stryker` |
| `pnpm run test:e2e`, `pnpm run test:e2e:ci` | Playwright, la seconde forme construisant le front avec un stub TMDB ; l'API tourne sur la base de `E2E_MONGODB_URI`, que le job `e2e` pose et sans laquelle elle refuse de démarrer |
| `pnpm run test:e2e:local` | La suite Playwright depuis le poste, serveurs de dev allumés : API de test en Release sur 5010, sur MongoDB (le conteneur de test sur 27018, base `moviepicker_e2e` vidée à chaque run, ou `E2E_MONGODB_URI`), front construit contre elle |
| `pnpm run openapi:sync` | Régénère le contrat OpenAPI (`openapi:export`) puis les types du front (`openapi:types`), à committer avec le changement d'API qui les a fait bouger |
| `pnpm run openapi:types:check` | Dérive des types générés par rapport au contrat exporté |
| `pnpm run check:contract-compat [<ref>]` | Compare le contrat de la dernière version publiée (dernier tag `v*` d'`origin`, ou `<ref>`) à l'arbre courant : échoue si une route, une méthode ou une propriété de réponse lue par le front N-1 a disparu ou est devenue optionnelle |
| `pnpm --filter web prerender` | Prérendu des routes publiques indexables, à lancer après un build |
| `pnpm run lighthouse` | Lighthouse sur le build, demande Node 22+ et Chrome |
| `pnpm run capture:screenshots` | Captures du README, sur l'application lancée en local |
| `pnpm run usage [-- --days 30 \| --since AAAA-MM-JJ] [--db <base>] [--json]` | Ce qui sert sur une période de jours de Paris : l'entonnoir du lien d'une soirée, lu dans les totaux anonymes que l'API tient par jour (`usage_counts`), et l'usage des fonctionnalités, lu dans la base (notes, recaps, pioches, « À voir », Letterboxd). Lecture seule, par l'image MongoDB épinglée dans Docker ; l'URI vient de `MONGODB_URI` ou du secret du même nom par gcloud. La requête est testée par `scripts/mongo-tests/usage.test.mjs`, que joue `pnpm run test:api:mongo`, et ce test refuse un champ semé que les documents de l'API ne déclarent plus. Le tableau de bord PostHog « Ce qui sert » montre le détail des visiteurs qui acceptent la mesure |
| `pnpm run verify:local` | La chaîne complète, quatorze étapes en trois voies concurrentes puis la suite front seule, durées affichées en fin de run ; chaque porte qu'elle partage avec la CI y passe par le même `pnpm run` |

## Captures du README

`pnpm run capture:screenshots` refait les quatre images de `docs/screenshots/` sur l'application
lancée en local. Le script se connecte au compte de démonstration, renomme le profil, crée une
soirée propre (six films, quatre participants, des votes, roue selon les votes), retire de la liste les films sans
affiche, puis photographie l'accueil, la soirée, la roue avec les chances de chaque film et le tirage en
1280 x 800, thème clair. Les films sont proposés par les quatre participants à tour de rôle.

L'API doit tourner **sur une base jetable**, puisque le script y écrit sa soirée de démonstration,
et **avec une clé TMDB**, sinon les affiches manquent. Le conteneur de test s'y prête, avec une
base à part que le seed de Development remplit au démarrage des comptes dont le script se sert.
`MOVIEPICKER_TEST_CONTEXT` empêche l'API de remonter les dossiers parents jusqu'au `.env` du dépôt
principal, ce qui compte depuis un worktree. La dernière commande vide la base une fois les
captures faites.

```bash
node scripts/mongo-replica-set.mjs --container movie-picker-mongo-test --port 27018
MOVIEPICKER_TEST_CONTEXT=1 MONGODB_URI="mongodb://127.0.0.1:27018/moviepicker_captures?directConnection=true" TMDB_API_KEY=<clé> pnpm run dev:api-dotnet
pnpm run dev:web
pnpm run capture:screenshots
docker exec -e HOME=/tmp movie-picker-mongo-test mongosh --quiet --eval 'db.getSiblingDB("moviepicker_captures").dropDatabase()'
```

Les états qui gâchent une capture sont déjà traités : bandeau de consentement et fenêtre « Quoi de
neuf » fermés, images paresseuses chargées par un défilement complet, animations coupées.

## Tests

```bash
dotnet test apps/api-dotnet/MoviePicker.Api.Tests/MoviePicker.Api.Tests.csproj
pnpm run test:api:mongo

pnpm exec playwright install chromium   # une seule fois
pnpm run test:e2e:local
```

Les tests unitaires tournent sans base, sur les doublures en mémoire de
`MoviePicker.Api.TestSupport`. **La suite d'intégration exige MongoDB** : sans `MONGODB_TEST_URI`,
chaque test qui démarre l'application échoue sur un message qui renvoie à `pnpm run test:api:mongo`.
C'est un choix : la CI ne la jouait déjà plus que sur MongoDB (job `test-api`), et la garder aussi
sur les doublures aurait demandé à la fabrique de tests de remplacer tout l'enregistrement Mongo
de l'API (dépôts, sessions, clés de chiffrement, index, migrations) pour une exécution que rien ne
vérifie. Les tests d'intégration ne prennent dans `MoviePicker.Api.TestSupport` que de quoi
remplacer un service précis (le cache partagé, le magasin de sessions). Pour en lancer une seule
classe, démarrer le conteneur comme plus haut, puis
`MONGODB_TEST_URI=mongodb://127.0.0.1:27018/?directConnection=true dotnet test
apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj --filter
<Classe>` : chaque classe y prend sa base jetable. De même, l'API des e2e refuse de démarrer sans
`E2E_MONGODB_URI`, que `pnpm run test:e2e:local` fournit et que le job `e2e` pose.

`pnpm run test:api:mongo` et `pnpm run test:e2e:local` partagent le conteneur
`movie-picker-mongo-test` (port 27018, `MONGO_TEST_PORT` pour un autre) : `scripts/mongo-replica-set.mjs`
le démarre au besoin avec l'image épinglée, le recrée s'il est arrêté ou tourne sur une autre image,
initialise le replica set s'il ne l'est pas et attend qu'il accepte les écritures. Chaque classe de
test d'intégration y prend une base jetable.

## Structure du dépôt

```
movie-picker/
├─ .github/           Workflows (CI, déploiement, retours arrière, infrastructure, sauvegarde,
│                     analyse de sécurité) et actions/, les actions composites qu'ils partagent
├─ apps/
│  ├─ web/            Front React, Vite, TypeScript, PWA
│  └─ api-dotnet/     API ASP.NET Core, solution MoviePicker.slnx : MoviePicker.Api, ses tests
│                     unitaires (MoviePicker.Api.Tests) et d'intégration (MoviePicker.Api.IntegrationTests),
│                     les doublures en mémoire qu'ils partagent (MoviePicker.Api.TestSupport)
├─ archive/           Application Expo du cursus et documents gelés, plus construits
├─ artifacts/         Contrat OpenAPI, rapports Lighthouse et Stryker, généré et ignoré par git
├─ configs/           tsconfig et Prettier partagés, budgets Lighthouse, exclusions Sonar
├─ design/            Maquettes de l'application (design/mockups/), publiées dans un canvas Design
├─ docs/              Roadmap, dette technique, design system, runbook de restauration, ce guide,
│                     captures du README
├─ e2e/               Parcours Playwright
├─ infra/             Terraform (infra/terraform/), configuration du site Firebase Hosting et
│                     ancienne adresse du site (infra/web-legacy/)
└─ scripts/           Portes de qualité (check-*.mjs, règles d'architecture dans architecture/),
                      verify:local, MongoDB de test, contrat OpenAPI, Terraform, publication et
                      retour arrière du front, release, Lighthouse, prérequis, captures
```

Le front est découpé par usage, pas par type de fichier. `apps/web/src/features/` porte sept
domaines : `auth` (session, connexion, comptes), `movies` (catalogue, recherche, vitrines, liste « À
voir »), `events` (les soirées, et les films qui y sont proposés), `letterboxd` (import),
`library` (Mes listes, films vus, listes enregistrées et publiques), `profile` (profils publics,
suivis) et `notifications` (boîte de réception, push), chacun avec ses `api/`, `components/`,
`hooks/` et `pages/`. `shared/` est le socle qui n'en connaît aucun : primitives du design system,
client HTTP et contrat généré, i18n, hooks transverses. `app/` est la composition au-dessus des
deux : table des routes, coquille, pages qui assemblent plusieurs domaines (`app/pages/`). Qui peut
importer qui se lit dans `FEATURE_EDGES` (`scripts/architecture/featureEdges.mjs`), seule
description du graphe des features.

L'API suit un découpage hexagonal : `Domain` porte les entités et les règles sans dépendance au
framework, `Application` les cas d'usage (`UseCases/`, un dossier par cas, `UseCases/Shared/` pour
ce que plusieurs partagent), les ports et les DTOs, `Infrastructure` les implémentations concrètes
(MongoDB, TMDB, Letterboxd, push, e-mail, cookies), `Controllers` la
traduction HTTP.

`check:architecture` fait respecter ces deux découpages. `scripts/check-architecture.mjs` n'en est
que le point d'entrée : les règles vivent dans `scripts/architecture/`, un module par famille
(couches de l'API, `writeSeq`, imports du front, valeurs CSS, primitives, CSS mort), chacun avec
son `*.test.mjs` joué par `pnpm run test:scripts`. La liste des règles est dans `AGENTS.md`.

## Deux pièges de build

Le paquet `web` enchaîne la génération des chiffres du dossier technique, `tsc`, `vite build`, un
contrôle qui interdit d'embarquer les identifiants de démonstration dans `dist/assets/*.js`, puis
le prérendu des routes publiques indexables dans `dist/prerendered/`. Un `vite build` lancé à la
main dans `apps/web` saute ce contrôle. La première étape réécrit
`apps/web/src/app/pages/tech/generated/techMetrics.ts`, un fichier suivi par git : ne le committer
qu'avec une mise à jour du dossier technique.

La racine force par override une version corrigée de plusieurs dépendances transitives, dont
`basic-ftp` tirée par Lighthouse, pour garder l'audit vert. À réévaluer à chaque montée majeure de
ces outils.
