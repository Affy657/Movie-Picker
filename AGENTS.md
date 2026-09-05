# AGENTS.md

Règles pour les agents IA travaillant sur ce repo.

## Style de code

**Ne jamais écrire de commentaires dans le code.**

- Pas de `//`, pas de `/* */`, pas de JSDoc, pas de XML doc C# (`///`).
- Les noms d'identifiants doivent porter l'intention.
- Exception : directives fonctionnelles uniquement (`@ts-expect-error`, `eslint-disable-*`, `prettier-ignore`, `/// <reference ... />`, shebangs `#!`, headers de licence).

Si on ne peut pas exprimer l'intention via le nommage ou la structure, refactoriser le code — pas ajouter un commentaire.

## Centrage vertical du texte

Un texte centré dans un petit élément (pastille, badge, puce, chip) n'est **pas** optiquement centré par `align-items: center` seul : le centre des glyphes se situe au-dessus du centre de la boîte de ligne, donc le texte paraît trop haut et le vide s'accumule sous lui.

Pour tout élément compact contenant du texte centré :
1. poser `line-height: 1` pour que la boîte de ligne colle à la taille de police ;
2. compenser avec les jetons `--text-optical-nudge` (texte mixte) ou `--text-optical-nudge-caps` (petites capitales), soit en padding vertical asymétrique (`padding-top` + nudge, `padding-bottom` - nudge), soit en `transform: translateY(nudge)` sur le seul span de texte quand l'élément contient aussi des éléments graphiques (avatar, icône) qu'il ne faut pas décaler.

Vérifier le résultat, pas seulement l'écrire : mesurer l'écart entre le centre des glyphes (`measureText` sur canvas, `actualBoundingBoxAscent` / `actualBoundingBoxDescent`) et le centre de l'élément, et viser moins d'un demi-pixel.

## Barre collante et scroll anchoring

Une barre `position: sticky` qui change de hauteur entre son état déplié et son état replié (un bloc masqué en `display: none`, par exemple) déclenche le scroll anchoring de Chrome : le navigateur recale `scrollTop` du delta de hauteur, ce qui fait osciller la barre en boucle au scroll lent.

Pour toute nouvelle barre sticky dont le contenu change de hauteur :
1. garder la hauteur de la barre constante entre les deux états (sortir le contenu variable de la barre elle-même) ;
2. poser `overflow-anchor: none` sur le conteneur de page concerné en filet de sécurité.

## Workflow

**Avant tout push sur master, toujours exécuter `pnpm run verify:local` et corriger toute erreur avant de push.** Cette vérification couvre les règles d'architecture, lint, format, tests front et tests API — elle est obligatoire quelle que soit la conversation ou la feature.

`pnpm run check:architecture` (premier pas de `verify:local`, rejoué au pre-push et dans le job `lint-web`) échoue sur : un commentaire hors directive fonctionnelle, un `using` interdit dans `Domain/`, `Application/` ou `Controllers/`, un import de `shared/` vers une feature, un cycle d'imports côté front.

`pnpm run test:api:mongo` rejoue la suite d'intégration API contre une vraie MongoDB en replica set (conteneur Docker créé à la volée, base jetable par classe de test) : c'est le seul chemin qui exécute les adaptateurs Mongo et les transactions. La CI le rejoue dans le job `test-api-mongo`, dont dépend le déploiement API.

`pnpm run openapi:types:check` régénère `apps/web/src/shared/api/generated/openapiSchema.ts` depuis le contrat exporté et échoue s'il a dérivé ; `apps/web/src/shared/api/apiContract.test.ts` vérifie au niveau des types que les champs lus par le front existent bien dans ce contrat.

## Migrations de données

Une correction de données en base est une migration, pas un service de démarrage : ajouter une classe `IDataMigration` dans `Infrastructure/Migrations/` (identifiant daté, `ExecuteAsync` idempotent), l'enregistrer dans `DataMigrationServiceCollectionExtensions`, et c'est tout. `DataMigrationRunner` l'applique une fois, consigne le passage dans la collection `migrations` et la rejoue au démarrage suivant si elle a échoué.

## Écritures multi-documents

Toute suite d'écritures qui doit être tout-ou-rien passe par `IUnitOfWork.ExecuteAsync` (transaction MongoDB côté Mongo, verrou côté InMemory). Les repositories participent automatiquement via `TransactionalCollection` : ne jamais injecter `IMongoDatabase` directement dans un repository, prendre `MongoCollectionFactory`.

- Ne jamais skip les hooks pre-push.
- Préférer éditer les fichiers existants à en créer de nouveaux.

## Mémoire inter-sessions

Quand un problème systématique est rencontré et résolu — erreur de config récurrente, comportement inattendu d'un outil, contrainte non documentée du projet — le sauvegarder en mémoire (`C:\Users\adrie\.claude\projects\C--ynov-movie-picker\memory\`) sous forme d'entrée `feedback` ou `project` selon le cas, pour que la prochaine session ne repart pas de zéro.

## Stack

Monorepo pnpm + Turbo :
- `apps/web` — Vite + React + TypeScript
- `apps/mobile` — Expo + React Native
- `apps/api-dotnet` — .NET + MongoDB

## Documentation clé

- **Roadmap produit** (features par version, statuts) → [`docs/roadmap-product.md`](docs/roadmap-product.md)
- **Roadmap tech** (infra, CI/CD, qualité, sécurité) → [`docs/roadmap-tech.md`](docs/roadmap-tech.md)

## Accès outils externes (autonomie agent)

Outils configurés pour qu'un agent IA travaille sur le projet sans intervention manuelle. Les tokens et secrets sont en scope **local** (`~/.claude.json`), jamais versionnés.

| Outil | Accès | Usage |
|-------|-------|-------|
| GitHub | CLI `gh` | PR, issues, runs CI, releases |
| GCP | CLI `gcloud` | Cloud Run, Artifact Registry, Secret Manager, logs |
| AWS | CLI `aws` | S3, CloudFront (déploiement front) |
| SonarCloud | MCP `sonarqube` (Docker — requiert Docker Desktop lancé + image `mcp/sonarqube`) | consulter qualité / issues / hotspots ; l'analyse tourne en CI (job `sonar`, SonarScanner for .NET) |
| PostHog | MCP `posthog` (HTTP) | analytics, events produit |
| MongoDB | MCP `mongodb` | base dev `moviepicker_dev` |
| Resend | non configuré | envoi mail = à la demande |
