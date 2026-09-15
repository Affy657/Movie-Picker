# AGENTS.md

Règles pour les agents IA travaillant sur ce repo. **C'est la source unique** : `CLAUDE.md` ne fait que pointer ici, ne rien y dupliquer.

## Langue

**Tout ce qui vit dans le dépôt est en anglais**, sauf trois choses :

1. **les chaînes affichées à l'utilisateur**, qui passent par `apps/web/src/shared/i18n/locales/` : le français y est la langue du produit et l'anglais la seconde ; une chaîne d'interface écrite en dur dans un composant est une erreur, quelle que soit sa langue ;
2. **la documentation** : `docs/`, `README.md`, `CHANGELOG.md`, `AGENTS.md`, `infra/README.md`, les skills de `.claude/skills/`, les gabarits d'issue (ils s'adressent aux utilisateurs du produit) ;
3. les conversations avec l'utilisateur.

Le reste est en anglais sans exception : noms de fichiers et de répertoires, code et identifiants, noms de tests, commentaires là où ils sont admis (workflows, scripts, directives), commentaires des workflows GitHub Actions, messages écrits par les scripts et les workflows (`echo`, `::error::`, `::warning::`, sorties de `verify:local`), messages de journal et d'exception de l'API, noms de workflows, de jobs, d'étapes et d'entrées, gabarit de pull request, **titre et corps des commits, titre et description des pull requests**.

Commits au format Conventional Commits, `type(scope): subject`, sujet à l'impératif présent, sans majuscule initiale ni point final, types `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `chore`, `ci`. Le corps dit pourquoi, pas quoi, et cite les fichiers ou identifiants en jeu (`DEBT-027`, `C10`) plutôt que de les paraphraser.

Règle posée le 2026-09-15 pour le contenu (le 2026-09-09 pour les noms de fichiers). L'historique git antérieur reste tel quel. Le français qui subsiste dans le code (noms de tests, messages de l'API, scripts) se traduit **quand on touche le fichier**, et le reliquat est mesuré et suivi dans `DEBT-028` de `docs/technical-debt.md` ; ne pas lancer de traduction de masse hors de ce chantier. Un message d'exception de l'API qui remonte tel quel jusqu'à l'écran n'est pas à traduire mais à remplacer par un code que le front traduit.

## Style de code

**Ne jamais écrire de commentaires dans le code.**

- Pas de `//`, pas de `/* */`, pas de JSDoc, pas de XML doc C# (`///`).
- Les noms d'identifiants doivent porter l'intention.
- Exception : directives fonctionnelles uniquement (`@ts-expect-error`, `eslint-disable-*`, `prettier-ignore`, `/// <reference ... />`, shebangs `#!`, headers de licence).

Si on ne peut pas exprimer l'intention via le nommage ou la structure, refactoriser le code, pas ajouter un commentaire.

## Design system

**Avant d'écrire du CSS ou un composant d'interface, chercher ce qui existe déjà.** Le réflexe par défaut est de réutiliser une primitive de `apps/web/src/shared/components/`, puis d'ajouter une variante à cette primitive, et seulement en dernier recours d'écrire un composant local.

| Besoin | Composant | Remarques |
|---|---|---|
| Bouton | `Button`, `buttonClass` pour un `<Link>`, `LinkButton` | variantes `primary` / `secondary` / `danger` / `ghost`, tailles `sm` / `md` |
| Bouton à icône seule | `IconButton` | |
| Fenêtre modale | `Modal` | seul endroit du projet où `<dialog>` et `::backdrop` sont autorisés |
| Dialogue déjà câblé | `ConfirmDialog`, `ShareDialog`, `ConsentDialog`, `DialogTitleBar` | bâtis sur `Modal` |
| Feuille mobile | `Sheet` | modale ancrée en bas, glissable |
| Pastille, badge, filtre | `Chip` | centrage optique déjà intégré |
| Surface de contenu | `Card` | `padding` `none`/`sm`/`md`/`lg`, `elevated`, `interactive` |
| Champ de formulaire | `Field`, `NumberInput`, `SearchField`, `Toggle` | `Field` câble `label`, `aria-describedby`, message d'erreur |
| Gabarit de page | `PageLayout` | |
| État de page | `EmptyState`, `ErrorState`, `SignedOutState`, `Skeleton`, `ErrorBoundary` | |
| Menu, onglets, info-bulle | `Menu`, `Dropdown`, `Tabs`, `Tooltip`, `InfoBubble` | |
| Divers | `Avatar`, `QrCode`, `EventLifecyclePill`, `ViewModeToggle` | |

Aucune valeur littérale dans les CSS modules, tout passe par les jetons de `apps/web/src/styles/01-foundation.css` :

- espacement : `var(--space-0 … --space-24)`, base 4 px avec demi-pas jusqu'à `--space-3-5` (14 px) ;
- typographie : `var(--font-size-4xs … --font-size-6xl)`, échelle nommée sans variante « plus » ;
- profondeur : `var(--z-below … --z-skip-link)`, jamais un nombre ;
- largeur de page : `var(--container-xs … --container-3xl)` posé sur `--page-max-width` (défaut `--layout-max`) ;
- couleur : `var(--color-*)`, `var(--on-poster-*)` pour ce qui se pose sur une affiche ;
- cible tactile : `var(--tap-target-min)`, 44 px, minimum sur tout élément cliquable.

Les couleurs ont deux niveaux. Les **primitives** (`--blue-600`, `--orange-400`, `--amber-100`…) ne sortent pas de `01-foundation.css` et de `landingPalette.css` : un module CSS ne les référence jamais. Les **rôles** sont ce que les modules consomment, et chaque rôle porte sa déclinaison :

| Rôle | Surface | Texte | Fond léger | Bordure |
|---|---|---|---|---|
| primaire (accent choisi par l'utilisateur) | `--color-primary`, `-hover` | `--color-primary-text`, `-text-hover` | `--color-primary-tint`, `-soft`, `-soft-hover` | `--color-primary-border`, `-border-soft` |
| erreur, succès, avertissement, info | `--color-error`, `--color-success`, `--color-warning`, `--color-info` | idem | `--color-<rôle>-bg` | `--color-<rôle>-border` |

Deux règles, vérifiées par `check:architecture` :

1. **`color: var(--color-primary)` est interdit.** Le primaire colore des surfaces (bouton, fond, bordure, icône pleine) ; du texte ou un lien prend `--color-primary-text`, dont chaque accent garantit 4,5:1 sur fond clair, ce que le vert, l'orange et le cyan de `--color-primary` ne tiennent pas.
2. **Pas de `color-mix()` maison sur un rôle** (`background: color-mix(in srgb, var(--color-error) 12%, transparent)`) : le jeton `-bg` ou `-border` existe déjà, en clair, en sombre et sous `.on-dark`.

Un `var(--jeton)` sans repli doit être déclaré quelque part (fondation, module, ou posé en `style={{ '--jeton': … }}` côté TypeScript) : la même porte refuse les jetons fantômes, qui rendent la propriété invalide sans erreur. Les surfaces flottantes (menus, feuilles, modales, infobulles, cartes `elevation="md"|"lg"`) posent `--color-surface-raised` : en sombre l'élévation se lit par un ton plus clair, pas par une ombre.

Points de rupture, échelle fermée : `24.9375rem`, `29.9375rem`, `39.9375rem`, `47.9375rem`, `63.9375rem` en `max-width` ; `30rem`, `40rem`, `48rem`, `64rem`, `80rem` en `min-width`. Toute autre valeur est refusée. `(hover: hover)`, `(hover: none)` et `(prefers-reduced-motion: reduce)` sont les seules autres requêtes média admises.

Deux règles de comportement, non outillées, à tenir à la main :

1. tout bloc `:hover` vit dans `@media (hover: hover)`, sinon l'état reste collé après un tap sur mobile ;
2. toute `animation` a son pendant `@media (prefers-reduced-motion: reduce)`.

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

**Le test est écrit avant le code.** Pour une fonctionnalité comme pour un correctif : d'abord un test qui échoue et qui décrit le comportement attendu, ensuite l'implémentation qui le fait passer. Sur un bug, le test doit reproduire le symptôme avant toute correction, sinon rien ne prouve que la cause a été traitée.

**Avant tout push sur master, toujours exécuter `pnpm run verify:local` et corriger toute erreur avant de push.** Obligatoire quelle que soit la conversation ou la feature. Quinze étapes en trois voies concurrentes, puis la suite front seule (`docs/technical-debt.md`, C11) : voie node (règles d'architecture, `pnpm lint`, ESLint, Prettier), voie dotnet (`dotnet restore`, build Release avec `-warnaserror`, puis en parallèle `dotnet format --verify-no-changes`, tests API unitaires et d'intégration sur ce build, export OpenAPI et dérive des types), voie docker (workflows actionlint + shellcheck + zizmor, Gitleaks sur l'arbre de travail, audit Trivy), enfin les tests front avec seuils de couverture. Le premier échec arrête tout ; une table des durées ferme le run.

**Aucune contribution externe.** Projet solo : `CONTRIBUTING.md` refuse les PR de fork et la licence les rend infusionnables. Les jobs d'entrée de `ci-cd.yml` portent `github.event.pull_request.head.repo.fork != true`, donc une PR de fork ne déclenche aucun run. Ne pas retirer cette condition ni l'oublier sur un job d'entrée ajouté plus tard : un job sans `needs: changes` ne l'hérite pas.

**Pousser sur master ne déploie rien.** La mise en production est un geste manuel, `gh workflow run deploy.yml --ref master -f target=all` (cibles : `all`, `front`, `api`), et elle refuse de partir si le run `ci-cd.yml` du commit visé n'est pas vert. Ne jamais la déclencher sans demande explicite de l'utilisateur : le découpage existe pour qu'il groupe plusieurs livraisons dans un seul déploiement, héritage du temps où le dépôt était privé et ses minutes GitHub Actions facturées. Corollaire à annoncer en fin de tâche : **la production est en retard sur master par défaut**, et rien ne le signale.

**Un run master joue toutes les lanes.** Le filtre par chemin de `ci-cd.yml` ne s'applique qu'aux PR et aux branches `v*` ; sur master, un commit qui ne touche que la documentation rejoue quand même lint, tests, E2E et Sonar, parce que `deploy.yml` ne lit que la conclusion du run et qu'un run vert par vacuité posé sur un commit rouge autorisait un déploiement jamais validé. Ne pas remettre le filtre sur master pour gagner sept minutes : les minutes sont gratuites, le trou ne l'était pas.

**Retour arrière** : `gh workflow run rollback.yml --ref master` (API, révision Cloud Run précédente ou `-f revision=<nom>`), `gh workflow run rollback-front.yml --ref master` (front, artefact `front-dist-<sha>` précédent ou `-f commit=<sha>`). Les passes S3, les sondes de santé et l'authentification GCP sont des actions composites de `.github/actions/`, partagées entre déploiement et retour arrière : les modifier là, jamais en ligne dans un workflow.

- Ne jamais skip les hooks pre-push.
- Préférer éditer les fichiers existants à en créer de nouveaux.

Trois procédures sont rappelées par leur nom plutôt que réexpliquées à chaque fois. Ce sont des skills du dépôt, dans `.claude/skills/` :

| Procédure | Quand |
|---|---|
| `/dev-feature <feature>` | cycle complet d'une feature de roadmap, du scope au déploiement |
| `/verify` | lancer web + API pour vérifier un changement à l'exécution |
| `/weekly-maintenance` | passe hebdomadaire : Dependabot, SonarCloud, Sentry, alertes sécurité, métriques. À lancer depuis le checkout principal, pas depuis un worktree |

## Portes de qualité

`pnpm run check:architecture` est le premier pas de `verify:local`, rejoué au pre-push et dans le job `lint-web`. Il échoue sur :

- un commentaire hors directive fonctionnelle ;
- un `using` interdit dans `Domain/`, `Application/` ou `Controllers/` ;
- un import de `shared/` vers une feature, ou un cycle d'imports côté front ;
- en CSS module : espacement, `font-size`, `z-index` ou couleur en valeur littérale ; point de rupture hors échelle ; `<dialog>` ou `::backdrop` écrit hors de `Modal` ;
- une classe `btn`/`btn-*` écrite à la main hors de `Button` ;
- un élément cliquable dont la `min-height` plafonne sous 44 px ;
- une classe déclarée dans un `*.module.css` et utilisée nulle part. La règle résout le nom local de l'import fichier par fichier, suit les ré-exports (`export { styles as xStyles }`), et compte comme usage un `composes:`, un `:global(...)` et une position descendante (`.footer .btn`). Les modules accédés par crochets (`styles[variable]`) sont inanalysables : ils sont exclus et **listés dans la sortie**, jamais passés en silence.

`node apps/web/scripts/prerender.mjs`, dernière étape du build web, prérend les routes de `PRERENDERED_ROUTES` (`apps/web/src/app/prerenderRoutes.ts`) dans `dist/prerendered/`. Il échoue s'il ne trouve plus `#splash` ou `#root` dans `dist/index.html`, si une page ne rend aucun `<h1>`, si une route n'a pas d'entrée dans `PRERENDERED_ROUTE_CHUNKS`, ou si ce nom de chunk est absent de `dist/route-assets.json`. La page d'accueil en est volontairement absente, son titre peint dans la coquille de démarrage étant son élément LCP (Contrainte C2 de `docs/technical-debt.md`).

Le prérendu sert deux choses distinctes : l'indexation, et le premier rendu. Une route en `noindex` n'en tire que la seconde, et doit alors le déclarer dans `PRERENDERED_FOR_FIRST_PAINT_ONLY` ; sans cette déclaration le build échoue, pour qu'un `noindex` posé plus tard sur une page prérendue pour son référencement reste une erreur visible. `/mentions-legales` et `/politique-de-confidentialite` sont dans ce cas depuis le 2026-09-10. Le prérendu **renforce** d'ailleurs leur `noindex` : sans lui, un robot qui n'exécute pas le JavaScript reçoit la coquille SPA, qui ne porte aucune balise `robots`.

**Le document prérendu porte les styles de sa route, en ligne**, lus dans `dist/route-assets.json` (publié par le plugin de build, voir C4). Sans eux le contenu prérendu peint sans styles, se remet en page quand le chunk de la route arrive, et Chrome retient ce **second** rendu comme LCP : le prérendu ne rapporte alors rien, ce qui s'est mesuré le 2026-09-10 (`/soutenir`, `elementRenderDelay` de 585 ms sur un document déjà complet). En ligne et non liés : la version liée a été mesurée sur le runner et coûte 1 point à `donate` comme à `privacy`. Les feuilles sont concaténées de la plus profonde à la plus superficielle, la coquille avant la page, comme le fait le chargement par JavaScript.

`scripts/lighthouse-run.mjs` réécrit ces routes vers leur fichier prérendu, parce que la production les sert comme des clés S3 exactes : sans la réécriture, `serve` rend la coquille SPA et la porte mesure une page que personne ne reçoit. Attention en y touchant, `serve-handler` applique ses réécritures **en cascade**, donc un repli `**` final rattrape la destination déjà réécrite et la renvoie sur `index.html` ; le repli est écrit en négation, et `--single` n'est pas passé parce qu'il insère son propre `**` en tête de liste.

`pnpm run check:workflows` rejoue les portes de `lint-workflows` en local, dans `verify:local`. actionlint lit les workflows ; zizmor lit `.github/` en entier, donc aussi les actions composites et `dependabot.yml`, dont il exige un `cooldown`. Les deux outils passent par Docker épinglé au digest parce qu'`actionlint` **saute silencieusement** sa moitié shellcheck quand shellcheck n'est pas dans le PATH : l'image embarque shellcheck 0.10.0, la version de la CI. Changer une version d'un côté sans l'autre rend une porte locale verte sur ce que la CI refuse.

La porte `gitleaks` de `verify:local` rejoue le job `gitleaks` de la CI, même image épinglée et même mode `dir` : elle scanne **l'arbre de travail, jamais l'historique**. Elle existe parce que sans elle cette classe d'échec ne se découvrait qu'en CI, et la règle `curl-auth-user` est un piège à elle seule : elle déclenche sur `curl -u "$TOKEN:"` **même quand la valeur est un nom de variable**. Pour appeler une API avec un jeton dans une commande documentée, écrire `curl -H "Authorization: Bearer $TOKEN"`.

`pnpm run test:api:mongo` rejoue la suite d'intégration API contre une vraie MongoDB en replica set (conteneur Docker créé à la volée, base jetable par classe de test) : c'est le seul chemin qui exécute les adaptateurs Mongo et les transactions. La CI le rejoue dans le job `test-api-mongo`, dont dépend le déploiement API. Il collecte sa propre couverture (`apps/api-dotnet/coverlet.integration.runsettings`) et `scripts/check-mongo-coverage.mjs` la contrôle sur le seul espace de noms `Infrastructure.Persistence.Mongo` : ces classes sont exclues du rapport du job `test-api`, donc sans cette porte la couche qui ne tourne qu'en production ne serait mesurée nulle part.

`MongoIndexInventoryTests` compare les index réellement créés à la liste attendue (nom, unicité, TTL). Trois garanties n'existent que dans ces index : l'expiration des compteurs de rate limiting, celle des sessions et celle des jetons de réinitialisation. Ajouter un index dans `MongoIndexInitializer` sans l'ajouter à cette liste fait échouer le test, c'est voulu. `MongoDuplicateKeyMappingTests` couvre l'autre moitié : `MongoUserRepository` distingue les conflits en cherchant le nom de l'index dans le message d'erreur Mongo, donc un renommage change le code d'erreur rendu au front.

`pnpm run test:e2e:mongo` rejoue le seul parcours critique Playwright contre l'API branchée sur un vrai MongoDB (variable `E2E_MONGODB_URI`, base dédiée `moviepicker_e2e` : le garde-fou Development refuse la base `moviepicker`). La CI le rejoue dans le job `e2e-mongo`, bloquant pour les deux déploiements. C'est le seul endroit où navigateur réel et base réelle tournent ensemble : `e2e` tourne sur la base mémoire, `test-api-mongo` tourne sans navigateur.

`pnpm run openapi:types:check` régénère `apps/web/src/shared/api/generated/openapiSchema.ts` depuis le contrat exporté et échoue s'il a dérivé ; `apps/web/src/shared/api/apiContract.test.ts` vérifie au niveau des types que les champs lus par le front existent bien dans ce contrat, et que chaque route appelée par le front existe encore dans `paths`. Les réponses simulées de `apps/web/src/mocks/handlers.ts` sont typées sur ce même contrat : une dérive casse `tsc`, donc le job `lint-web`.

`pnpm run test:api:mutation` lance une passe Stryker.NET sur `Domain/` et `Application/UseCases/` (rapport HTML dans `artifacts/stryker`). Hors CI : c'est un outil de diagnostic, à lancer quand on veut savoir si les tests d'une zone vérifient vraiment quelque chose, pas seulement si elle est exécutée.

Seuils de couverture, à relever quand ils décrochent du réel : front `statements 84 / lines 86 / functions 81 / branches 77` (`apps/web/vitest.config.ts`), API `lignes 90 / branches 78` (job `test-api`), adaptateurs Mongo `lignes 86 / branches 58` (`scripts/check-mongo-coverage.mjs`, job `test-api-mongo`).

## Migrations de données

Une correction de données en base est une migration, pas un service de démarrage : ajouter une classe `IDataMigration` dans `Infrastructure/Migrations/` (identifiant daté, `ExecuteAsync` idempotent), l'enregistrer dans `DataMigrationServiceCollectionExtensions`, et c'est tout. `DataMigrationRunner` l'applique une fois, consigne le passage dans la collection `migrations` et la rejoue au démarrage suivant si elle a échoué.

## Écritures multi-documents

Toute suite d'écritures qui doit être tout-ou-rien passe par `IUnitOfWork.ExecuteAsync` (transaction MongoDB côté Mongo, verrou côté InMemory). Les repositories participent automatiquement via `TransactionalCollection` : ne jamais injecter `IMongoDatabase` directement dans un repository, prendre `MongoCollectionFactory`.

## Stack

Monorepo pnpm + Turbo :
- `apps/web` : Vite + React + TypeScript
- `apps/api-dotnet` : .NET + MongoDB

L'application mobile Expo est archivée dans `archive/mobile` depuis mai 2026, il n'y a plus de `apps/mobile`. Le projet d'une vraie app mobile est porté par `docs/roadmap.md`.

## Documentation clé

- **Guide de développement** (installation, seed, scripts, tests, structure) → [`docs/development.md`](docs/development.md) : destiné à un humain qui arrive sur le dépôt, il porte aussi les pièges d'environnement local.
- **Roadmap** (features par version et statuts, puis une section Tech par version pour l'infra, la CI/CD, la qualité et la sécurité) → [`docs/roadmap.md`](docs/roadmap.md)
- **Dette technique** → [`docs/technical-debt.md`](docs/technical-debt.md) : fichier de travail pour agent, pas de lecture humaine. Une entrée par dette, chacune avec sa commande `verify` de fraîcheur et son critère de fin, plus deux sections « Contraintes » et « Impasses » à lire avant toute optimisation front ou tout geste de déploiement. C'est là qu'atterrit toute dette constatée, jamais dans une roadmap ni en mémoire agent.

**Dossier technique publié dans l'application** (`/tech`) → `apps/web/src/app/pages/tech/`. Deux dates s'affichent dans son en-tête et elles ne se maintiennent pas de la même façon :

- **`TECH_METRICS_BUILD_DATE`** est générée à chaque build par `apps/web/scripts/generate-tech-metrics.mjs`, avec les chiffres. Ne jamais l'éditer.
- **`TECH_PAGE_LAST_UPDATE`** (`apps/web/src/app/pages/tech/lastUpdate.ts`) est **tenue à la main** : c'est la date de la dernière relecture du contenu, pas celle du build. La mettre à jour **uniquement** quand le contenu du dossier a effectivement été relu et actualisé, jamais « au passage » : c'est sa fiabilité qui fait sa seule utilité. Pour savoir ce qu'il y a à actualiser, lire la date dans le fichier puis `git log --since=<date> --oneline`. Un test de `TechPage.test.tsx` garde le format ISO et refuse une date future.

## Accès outils externes (autonomie agent)

Outils configurés pour qu'un agent travaille sur le projet sans intervention manuelle. Les tokens et secrets sont en scope **local** (`~/.claude.json`), jamais versionnés.

| Outil | Accès | Usage |
|-------|-------|-------|
| GitHub | CLI `gh` | PR, issues, runs CI, releases |
| GCP | CLI `gcloud` | Cloud Run, Artifact Registry, Secret Manager, logs. Les écritures (`services enable`, `secrets create`) sont refusées à l'agent : les demander à l'utilisateur |
| AWS | CLI `aws` | S3, CloudFront (déploiement front) |
| SonarCloud | MCP `sonarqube` (Docker, requiert Docker Desktop lancé et l'image `mcp/sonarqube`) | consulter qualité / issues / hotspots ; l'analyse tourne en CI (job `sonar`, SonarScanner for .NET). La complexité cognitive (`S3776`) se mesure en local sans attendre la CI : `eslint-plugin-sonarjs` (règle `sonarjs/cognitive-complexity`, seuil 15) installé hors du dépôt avec ESLint et TypeScript 6, lancé depuis la racine avec `--no-config-lookup`, donne les mêmes chiffres que SonarCloud |
| MongoDB | MCP `mongodb` | base dev `moviepicker_dev` |
| PostHog | MCP `posthog` (HTTP, scope global) | analytics, events produit |
| Sentry | connecteur applicatif | erreurs front et API ; org et projets se relèvent dans la console Sentry ou dans les variables Actions `SENTRY_ORG` et `SENTRY_PROJECT`, région UE |
| Resend | connecteur applicatif | e-mails transactionnels ; domaine `movie-picker.fr` vérifié, `eu-west-1`, envoi seul |

`sonarqube` et `mongodb` sont déclarés sur le projet `C:\ynov\movie-picker` : **ils ne sont pas montés dans un worktree**, qui a sa propre entrée de configuration. Y basculer depuis le checkout principal, ou passer par les CLI.

## Mémoire inter-sessions

Spécifique à Claude Code. Quand un problème systématique est rencontré et résolu (erreur de config récurrente, comportement inattendu d'un outil, contrainte non documentée du projet), le sauvegarder en mémoire (`C:\Users\adrie\.claude\projects\C--ynov-movie-picker\memory\`) sous forme d'entrée `feedback` ou `project` selon le cas, pour que la prochaine session ne reparte pas de zéro. La dette constatée ne va pas là, elle va dans `docs/technical-debt.md`.
