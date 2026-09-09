# Guide de développement

Ce qui ne tient pas dans le [README](../README.md) : préparer son environnement, comprendre les
données de démonstration, connaître les scripts et savoir où se trouvent les choses. Les règles à
respecter en écrivant du code sont dans [`AGENTS.md`](../AGENTS.md).

## Prérequis

- **Node.js** 20.19+, 22.13+ ou 24+, et **pnpm** 10.
- **SDK .NET 10** pour l'API.
- **MongoDB**, en conteneur local ou sur Atlas. **Docker** est également requis pour les tests
  d'intégration et pour l'étape d'audit de `verify:local`.

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

Compte gratuit sur [themoviedb.org](https://www.themoviedb.org/), puis Réglages puis API pour
obtenir une **clé v3**, à poser dans `TMDB_API_KEY`. Sans elle, la recherche de films et les pages
d'exploration restent vides, le reste de l'application fonctionne.

### Le fichier `.env`

Copier `.env.example` en `.env` à la racine et renseigner `MONGODB_URI` et `TMDB_API_KEY`. Toutes
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

Chaque compte n'est créé que si son adresse est absente de la base.

- `SeedSampleEvents` ajoute quelques soirées au compte principal.
- `SeedScenarioDemos` ajoute un jeu de soirées couvrant les états intéressants : multi-participants,
  roue tirée puis clôturée, capacité atteinte, retrait d'un participant, tirage gelé, soirée passée,
  soirée à échéance, soirée vide, soirée annulée. Plus un graphe de suivi entre comptes et des
  notifications.

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
| `pnpm format`, `pnpm format:check` | Prettier |
| `pnpm run format:dotnet`, `pnpm run format:dotnet:check` | Style C#, après `dotnet restore` |
| `pnpm test`, `pnpm run test:coverage` | Tests front, Vitest |
| `pnpm run test:api:mongo` | Tests d'intégration API contre une vraie MongoDB |
| `pnpm run test:api:mutation` | Passe Stryker.NET, rapport dans `artifacts/stryker` |
| `pnpm run test:e2e`, `pnpm run test:e2e:ci` | Playwright, la seconde forme construisant le front avec un stub TMDB |
| `pnpm run test:e2e:mongo` | Le seul parcours critique, sur base réelle |
| `pnpm run openapi:export`, `pnpm run openapi:types:check` | Contrat OpenAPI et dérive des types |
| `pnpm run lighthouse` | Lighthouse sur le build, demande Node 22+ et Chrome |
| `pnpm run verify:local` | La chaîne complète, treize étapes |

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
├─ docs/              Roadmaps, dette technique, ce guide
├─ e2e/               Parcours Playwright
├─ infra/             Politiques IAM, CloudFront et rétention de registre
└─ scripts/           verify:local, prérequis, export OpenAPI, seuils de couverture
```

L'API suit un découpage hexagonal : `Domain` porte les entités et les règles sans dépendance au
framework, `Application` les cas d'usage, les ports et les DTOs, `Infrastructure` les
implémentations concrètes (MongoDB, TMDB, e-mail, cookies), `Controllers` la traduction HTTP.
`check:architecture` refuse les `using` qui traversent ces frontières.

## Deux pièges de build

Le paquet `web` enchaîne `tsc`, `vite build`, puis un contrôle qui interdit d'embarquer les
identifiants de démonstration dans `dist/assets/*.js`. Un `vite build` lancé à la main dans
`apps/web` saute ce contrôle.

La racine force par override une version corrigée de plusieurs dépendances transitives, dont
`basic-ftp` tirée par Lighthouse, pour garder l'audit vert. À réévaluer à chaque montée majeure de
ces outils.
