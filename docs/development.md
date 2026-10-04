# Guide de développement

Ce qui ne tient pas dans le [README](../README.md) : préparer son environnement, comprendre les
données de démonstration, connaître les scripts et savoir où se trouvent les choses. Les règles à
respecter en écrivant du code sont dans [`AGENTS.md`](../AGENTS.md).

## Prérequis

- **Node.js** 20.19+, 22.13+ ou 24+, et **pnpm** 10.
- **SDK .NET 10** pour l'API.
- **Docker**, pour les tests d'intégration contre MongoDB, pour la voie docker de `verify:local`
  (lint des workflows, Terraform, Gitleaks, Trivy) et pour lancer Terraform, qui n'est pas installé
  sur le poste (voir [`infra/README.md`](../infra/README.md)).

MongoDB n'est pas un prérequis : sans configuration l'API tourne en mémoire, la section suivante dit
quand et comment brancher une vraie base.

Contrôle rapide : `node scripts/check-prereqs.js` et `dotnet --version`.

## Configuration

### La base

**Sans `MONGODB_URI`, l'API tourne entièrement en mémoire**, seed compris. C'est le mode par défaut
d'un dépôt fraîchement cloné : rien à installer, rien à configurer, et tout disparaît à l'arrêt du
processus. Passer à une vraie base sert à garder ses données entre deux sessions et à exercer les
adaptateurs Mongo.

Dans ce cas, viser une base **dédiée et jetable**, jamais celle de production : le seed de
Development et les tests E2E écrivent dedans. Un garde-fou refuse d'ailleurs de démarrer en
Development sur la base `moviepicker`, et les suites de tests refusent en plus `moviepicker_dev`.

En conteneur :

```bash
docker run -d --name moviepicker-mongo -p 27017:27017 mongo:7
```

Ce qui donne `MONGODB_URI=mongodb://localhost:27017/moviepicker_dev`. Sur Atlas, un cluster gratuit
M0 suffit, la chaîne de connexion se récupère dans la console.

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
| `pnpm lint`, `pnpm run lint:eslint` | Types et règles côté front |
| `pnpm run check:architecture` | Règles d'architecture, aussi jouées au pre-push |
| `pnpm run check:workflows` | actionlint (+ shellcheck) et zizmor sur `.github/workflows/`, par Docker |
| `pnpm run check:terraform` | `terraform fmt -check` puis `validate` sur chaque module racine de `infra/terraform/`, par Docker |
| `pnpm run terraform -- <commande>` | Terraform depuis son image épinglée, bucket d'état et jeton GCP fournis par l'enveloppe, voir `infra/README.md` |
| `pnpm format`, `pnpm format:check` | Prettier |
| `pnpm run format:dotnet`, `pnpm run format:dotnet:check` | Style C#, après `dotnet restore` |
| `pnpm test`, `pnpm run test:coverage` | Tests front, Vitest |
| `pnpm run test:api:mongo` | Tests d'intégration API contre une vraie MongoDB |
| `pnpm run test:api:mutation` | Passe Stryker.NET, rapport dans `artifacts/stryker` |
| `pnpm run test:e2e`, `pnpm run test:e2e:ci` | Playwright, la seconde forme construisant le front avec un stub TMDB |
| `pnpm run test:e2e:mongo` | Le seul parcours critique, sur base réelle |
| `pnpm run openapi:export`, `pnpm run openapi:types:check` | Contrat OpenAPI et dérive des types |
| `pnpm --filter web prerender` | Prérendu des routes publiques indexables, à lancer après un build |
| `pnpm run lighthouse` | Lighthouse sur le build, demande Node 22+ et Chrome |
| `pnpm run capture:screenshots` | Captures du README, sur l'application lancée en local |
| `pnpm run verify:local` | La chaîne complète, dix-sept étapes en trois voies concurrentes puis la suite front seule, durées affichées en fin de run |

## Captures du README

`pnpm run capture:screenshots` refait les quatre images de `docs/screenshots/` sur l'application
lancée en local. Le script se connecte au compte de démonstration, renomme le profil, crée une
soirée propre (six films, quatre participants, des votes), retire de la liste les films sans
affiche, puis photographie l'accueil, la soirée, le tirage et la liste en 1280 x 800, thème sombre.

L'API doit tourner **sans base**, sinon la soirée de démonstration est écrite dans MongoDB, et
**avec une clé TMDB**, sinon les affiches manquent. Depuis un worktree, `MOVIEPICKER_TEST_CONTEXT`
est nécessaire : sans lui l'API remonte les dossiers parents et charge le `.env` du dépôt
principal, donc sa base.

```bash
MOVIEPICKER_TEST_CONTEXT=1 TMDB_API_KEY=<clé> pnpm run dev:api-dotnet
pnpm run dev:web
pnpm run capture:screenshots
```

Les états qui gâchent une capture sont déjà traités : bandeau de consentement et fenêtre « Quoi de
neuf » fermés, images paresseuses chargées par un défilement complet, animations coupées.

## Tests

```bash
dotnet test apps/api-dotnet/MoviePicker.Api.Tests/MoviePicker.Api.Tests.csproj
dotnet test apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePicker.Api.IntegrationTests.csproj

pnpm exec playwright install chromium   # une seule fois
pnpm run test:e2e:ci
```

`pnpm run test:api:mongo` crée son conteneur MongoDB à la volée et une base jetable par classe de
test. Au tout premier lancement, l'initialisation du replica set part parfois avant que mongod soit
prêt, ce qui laisse un conteneur debout sans replica set et fait échouer toutes les relances. Le
réparer une fois puis relancer :

```bash
docker exec movie-picker-mongo-test mongosh --quiet \
  --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
```

## Structure du dépôt

```
movie-picker/
├─ apps/
│  ├─ web/            Front React, Vite, TypeScript, PWA
│  └─ api-dotnet/     API ASP.NET Core, solution MoviePicker.slnx
├─ archive/           Application Expo du cursus et documents gelés, plus construits
├─ artifacts/         Contrat OpenAPI, rapports Lighthouse et Stryker
├─ configs/           tsconfig et Prettier partagés, exclusions Sonar
├─ docs/              Roadmap, dette technique, ce guide, captures du README
├─ e2e/               Parcours Playwright
├─ infra/             Terraform (infra/terraform/) et la configuration du site Firebase Hosting
└─ scripts/           verify:local, lint des workflows, Terraform, publication Firebase Hosting, prérequis, export OpenAPI, seuils de couverture, captures
```

L'API suit un découpage hexagonal : `Domain` porte les entités et les règles sans dépendance au
framework, `Application` les cas d'usage, les ports et les DTOs, `Infrastructure` les
implémentations concrètes (MongoDB, TMDB, e-mail, cookies), `Controllers` la traduction HTTP.
`check:architecture` refuse les `using` qui traversent ces frontières.

## Deux pièges de build

Le paquet `web` enchaîne `tsc`, `vite build`, un contrôle qui interdit d'embarquer les
identifiants de démonstration dans `dist/assets/*.js`, puis le prérendu des routes publiques
indexables dans `dist/prerendered/`. Un `vite build` lancé à la main dans
`apps/web` saute ce contrôle.

La racine force par override une version corrigée de plusieurs dépendances transitives, dont
`basic-ftp` tirée par Lighthouse, pour garder l'audit vert. À réévaluer à chaque montée majeure de
ces outils.
