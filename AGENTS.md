# AGENTS.md

Règles pour les agents IA travaillant sur ce repo.

## Style de code

**Ne jamais écrire de commentaires dans le code.**

- Pas de `//`, pas de `/* */`, pas de JSDoc, pas de XML doc C# (`///`).
- Les noms d'identifiants doivent porter l'intention.
- Exception : directives fonctionnelles uniquement (`@ts-expect-error`, `eslint-disable-*`, `prettier-ignore`, `/// <reference ... />`, shebangs `#!`, headers de licence).

Si on ne peut pas exprimer l'intention via le nommage ou la structure, refactoriser le code — pas ajouter un commentaire.

## Design system

**Avant d'écrire du CSS ou un composant d'interface, chercher ce qui existe déjà.** Le réflexe par défaut est de réutiliser une primitive de `apps/web/src/shared/components/`, puis d'ajouter une variante à cette primitive, et seulement en dernier recours d'écrire un composant local.

Primitives disponibles :

| Besoin | Composant | Remarques |
|---|---|---|
| Bouton | `Button` (`buttonClass` pour un `<Link>`) | variantes `primary` / `secondary` / `danger` / `ghost`, tailles `sm` / `md` |
| Fenêtre modale | `Modal` | seul endroit du projet où `<dialog>` et `::backdrop` sont autorisés |
| Feuille mobile | `Sheet` | modale ancrée en bas, glissable |
| Pastille, badge, filtre | `Chip` | centrage optique déjà intégré |
| Surface de contenu | `Card` | `padding` `none`/`sm`/`md`/`lg`, `elevated`, `interactive` |
| Champ de formulaire | `Field` | câble `label`, `aria-describedby`, message d'erreur |
| Menu, onglets, info-bulle, état vide, squelette | `Menu`, `Dropdown`, `Tabs`, `Tooltip`, `InfoBubble`, `EmptyState`, `Skeleton` | |

Aucune valeur littérale dans les CSS modules : espacements, tailles de police, `z-index` et couleurs passent par les jetons de `apps/web/src/styles/01-foundation.css`.

- espacement : `var(--space-0-5 … --space-24)`, base 4 px avec demi-pas jusqu'à 14 px ;
- typographie : `var(--font-size-4xs … --font-size-3xl)` ;
- profondeur : `var(--z-below … --z-skip-link)`, jamais un nombre ;
- largeur de page : `var(--container-xs … --container-2xl)` posé sur `--page-max-width` ;
- couleur : `var(--color-*)`, `var(--on-poster-*)` pour ce qui se pose sur une affiche.

Points de rupture, échelle fermée : `24.9375rem`, `29.9375rem`, `39.9375rem`, `47.9375rem`, `63.9375rem` en `max-width` ; `30rem`, `40rem`, `48rem`, `64rem`, `80rem` en `min-width`. Toute autre valeur est refusée.

Deux règles de comportement :

1. tout bloc `:hover` vit dans `@media (hover: hover)`, sinon l'état reste collé après un tap sur mobile ;
2. toute `animation` a son pendant `@media (prefers-reduced-motion: reduce)`.

`pnpm run check:architecture` échoue sur chacun de ces points (valeur littérale, `z-index` nu, point de rupture hors échelle, `<dialog>` ou `::backdrop` écrit hors de `Modal`), et il tourne dans `verify:local`, au pre-push et dans le job `lint-web`.

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

`pnpm run test:e2e:mongo` rejoue le seul parcours critique Playwright contre l'API branchée sur un vrai MongoDB (variable `E2E_MONGODB_URI`, base dédiée `moviepicker_e2e` : le garde-fou Development refuse la base `moviepicker`). La CI le rejoue dans le job `e2e-mongo`, bloquant pour les deux déploiements. C'est le seul endroit où navigateur réel et base réelle tournent ensemble : `e2e` tourne sur la base mémoire, `test-api-mongo` tourne sans navigateur.

`pnpm run openapi:types:check` régénère `apps/web/src/shared/api/generated/openapiSchema.ts` depuis le contrat exporté et échoue s'il a dérivé ; `apps/web/src/shared/api/apiContract.test.ts` vérifie au niveau des types que les champs lus par le front existent bien dans ce contrat, et que chaque route appelée par le front existe encore dans `paths`. Les réponses simulées de `apps/web/src/mocks/handlers.ts` sont typées sur ce même contrat : une dérive casse `tsc`, donc le job `lint-web`.

`pnpm run test:api:mutation` lance une passe Stryker.NET sur `Domain/` et `Application/UseCases/` (rapport HTML dans `artifacts/stryker`). Hors CI : c'est un outil de diagnostic, à lancer quand on veut savoir si les tests d'une zone vérifient vraiment quelque chose, pas seulement si elle est exécutée.

Seuils de couverture, à relever quand ils décrochent du réel : front `statements 84 / lines 86 / functions 81 / branches 77` (`apps/web/vitest.config.ts`), API `lignes 90 / branches 78` (job `test-api`).

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
| Sentry | MCP `sentry` | erreurs front et API ; org `adrien-morand`, projets `movie-picker-web` et `movie-picker-api`, région UE |
| Resend | MCP `resend` | e-mails transactionnels ; domaine `movie-picker.fr` vérifié, `eu-west-1`, envoi seul |
