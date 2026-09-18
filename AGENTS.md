# AGENTS.md

Règles pour les agents IA travaillant sur ce repo. **C'est la source unique** : `CLAUDE.md` ne fait que pointer ici, ne rien y dupliquer.

## Langue

**Tout ce qui vit dans le dépôt est en anglais**, sauf trois choses :

1. **les chaînes affichées à l'utilisateur**, qui passent par `apps/web/src/shared/i18n/locales/` : le français y est la langue du produit et l'anglais la seconde ; une chaîne d'interface écrite en dur dans un composant est une erreur, quelle que soit sa langue ;
2. **la documentation** : `docs/`, `README.md`, `CHANGELOG.md`, `AGENTS.md`, `infra/README.md`, les skills de `.claude/skills/`, les gabarits d'issue (ils s'adressent aux utilisateurs du produit) ;
3. les conversations avec l'utilisateur.

Le reste est en anglais sans exception : noms de fichiers et de répertoires, code et identifiants, noms de tests, commentaires là où ils sont admis (workflows, scripts, directives), commentaires des workflows GitHub Actions, messages écrits par les scripts et les workflows (`echo`, `::error::`, `::warning::`, sorties de `verify:local`), messages de journal et d'exception de l'API, noms de workflows, de jobs, d'étapes et d'entrées, gabarit de pull request, **titre et corps des commits, titre et description des pull requests**.

Commits au format Conventional Commits, `type(scope): subject`, sujet à l'impératif présent, sans majuscule initiale ni point final, types `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `chore`, `ci`. Le corps dit pourquoi, pas quoi, et cite les fichiers ou identifiants en jeu (`DEBT-027`, `C10`) plutôt que de les paraphraser.

**Typographie**, en documentation comme dans l'interface : pas de tiret cadratin `—` ni de tiret demi-cadratin `–` en ponctuation, pas de point médian `·`, pas de flèche `→` pour dire « vers » ou « puis ». Deux-points, virgule, parenthèses et guillemets « » suffisent ; un chemin dans une interface s'écrit `Settings / Environments`. La flèche reste admise pour noter une arête de graphe (`events → movies`).

L'historique git antérieur au 2026-09-15 reste tel quel. Ce qui reste en français dans le code est du **contenu produit**, pas du code, et ne se traduit pas : données de seed et de fixtures (`Léa Moreau`, `Soirée horreur`), tables `fr`/`en` (`tmdbGenres.ts`, `movieSearchFilterOptions.ts`), notifications push et e-mail de réinitialisation générés côté serveur, et les libellés d'interface que les tests vérifient (`getByText('Créer une soirée')`) ou que les e2e ciblent. Un message d'exception de l'API ne remonte jamais tel quel jusqu'à l'écran : toute erreur métier se lève par `Errors.<Cas>()` (`Domain/Exceptions/Errors.cs`), qui porte un code stable de `ErrorCodes`, un message anglais de secours et ses paramètres ; le front traduit le code par `apiErrors.<code>` des locales (`shared/api/client.ts`), avec le message du serveur en repli. Ajouter un cas, c'est ajouter la factory, le code, et l'entrée dans `fr.ts` et `en.ts` ; un test d'API vérifie `ex.Reason`, jamais `ex.Message`.

## Style de code

**Ne jamais écrire de commentaires dans le code.**

- Pas de `//`, pas de `/* */`, pas de JSDoc, pas de XML doc C# (`///`).
- Les noms d'identifiants doivent porter l'intention.
- Exception : directives fonctionnelles uniquement (`@ts-expect-error`, `eslint-disable-*`, `prettier-ignore`, `/// <reference ... />`, shebangs `#!`, headers de licence).

Si on ne peut pas exprimer l'intention via le nommage ou la structure, refactoriser le code, pas ajouter un commentaire.

## Design system

**Avant d'écrire du CSS ou un composant d'interface, chercher ce qui existe déjà.** Le réflexe par défaut est de réutiliser une primitive de `apps/web/src/shared/components/`, puis d'ajouter une variante à cette primitive, et seulement en dernier recours d'écrire un composant local. Les props, états et garanties d'accessibilité de chaque primitive, et la liste des jetons avec leurs valeurs, sont dans `docs/design-system.md`, à tenir à jour dans le même commit qu'un changement de composant ou de jeton.

| Besoin | Composant | Remarques |
|---|---|---|
| Bouton | `Button`, `buttonClass` pour un `<Link>`, `LinkButton` | `variant` `primary` / `secondary` / `ghost`, `tone` `default` / `danger`, `size` `sm` / `md` / `lg`, `loading` ; un état actif se dit par la variante (`variant={active ? 'primary' : 'secondary'}`), pas par une classe qui redessine le bouton |
| Attente hors d'un bouton | `Spinner` | `1em`, couleur courante, immobile en `reduced-motion` |
| Bouton à icône seule | `IconButton` | `tone` `default` / `danger` / `onPoster`, `loading` |
| Fenêtre modale | `Modal` | seul endroit du projet où `<dialog>` et `::backdrop` sont autorisés |
| Dialogue déjà câblé | `ConfirmDialog`, `ShareDialog`, `ConsentDialog`, `DialogTitleBar` | bâtis sur `Modal` |
| Feuille mobile | `Sheet` | modale ancrée en bas, glissable |
| Pastille, badge, filtre | `Chip` | tones `neutral` / `primary` / `success` / `warning` / `pending` / `danger` / `muted`, centrage optique déjà intégré |
| Surface de contenu | `Card` | `padding` `none`/`sm`/`md`/`lg`, `radius` `md`/`lg`, `elevation` `none`/`sm`/`md`/`lg`, `interactive` |
| Champ de formulaire | `Field`, `NumberInput`, `SearchField`, `Toggle` | tout `<label>` + champ passe par `Field`, qui câble `label`, `hint`, `error` et `aria-describedby` ; un `<label className="label">` écrit à la main est une erreur ; un groupe (radiogroup, interrupteur) prend un `<span className="label" id>` et `ariaLabelledBy` |
| Choix exclusif entre deux à cinq options | `SegmentedRadioGroup` | `role="radiogroup"`, `size` `md` / `sm`, `iconOnly`, `disabled` |
| Choix exclusif entre des cartes (titre, description, vignette, emoji, pastille de couleur) | `ChoiceGroup` + `ChoiceCard` | `indicator`, `layout` `row` / `tile`, `dashed`, `disabled` ; flèches et roving tabindex fournis ; c'est aussi le sélecteur d'emoji et celui de la couleur d'accent |
| Ligne de réglage avec interrupteur | `ToggleRow` | `title`, `description`, `checked`, `onChange`, `disabled` |
| Page de réglages (compte, notifications, import Letterboxd) | `SettingsSection.module.css` | feuille partagée sans composant : `panelHead`, `card` (sur `<Card>`), `field`, `row` + `rowMain` / `rowLabel` / `rowSub`, `attention`, `dangerZone` ; les boutons y gardent les tailles et tons de `Button` |
| Avatars chevauchés | `AvatarStack` | `people`, `max`, `hidden`, `size`, `ariaLabel` |
| Gabarit de page | `PageLayout` | |
| État de page | `EmptyState`, `ErrorState`, `SignedOutState`, `Skeleton`, `ErrorBoundary` | |
| Menu, onglets, info-bulle | `Menu`, `Dropdown`, `Tabs`, `Tooltip`, `InfoBubble` | un déclencheur sur mesure prend `useMenuState()` + `MenuPanel` + `MenuItem` (`to`, `href` + `external`) ; un menu porté par un portail ou positionné en `fixed` garde son état local et compose `MenuPanel anchored={false}` + `MenuItem`, jamais un `role="menu"` à la main ; toute liste d'onglets, même deux dans une modale, est un `Tabs`, et chaque panneau un `TabPanel` |
| Divers | `Avatar`, `QrCode`, `EventLifecyclePill`, `ViewModeToggle` | |

**Aucune valeur littérale dans les CSS modules**, tout passe par les jetons de `apps/web/src/styles/01-foundation.css` : espacement, tailles sous 96 px, icônes, typographie, rayons, bordures, mouvement, opacité, focus, profondeur, gabarit, largeur de page, couleur, cible tactile. Les familles, leurs valeurs et les exceptions de chacune sont dans le tableau des jetons de `docs/design-system.md`. Trois règles qui ne se lisent pas dans ce tableau :

- 1 px et 2 px restent des traits, et au-delà de 96 px (affiche, colonne) une valeur est une dimension de contenu, pas un jeton ;
- un `var(--jeton, repli)` sur un jeton de la fondation est refusé, le repli est mort ou ment ; un `var(--jeton)` sans repli doit être déclaré quelque part (fondation, module, ou posé en `style={{ '--jeton': … }}` côté TypeScript), la porte refuse les jetons fantômes, qui rendent la propriété invalide sans erreur ;
- toute cible tactile fait au moins 44 px (`--tap-target-min`) ; un dessin plus petit (icône de 32 px, pastille, lien dans une phrase) garde sa taille et étend sa zone par `composes: expanded from '@/shared/components/tapTarget.module.css'`, jamais par un `::after` maison.

Les couleurs ont deux niveaux. Les **primitives** (`--blue-600`, `--orange-400`, `--amber-100`…) ne sortent pas de `01-foundation.css` et de `landingPalette.css` : un module CSS ne les référence jamais. Les **rôles** (`--color-primary`, `--color-error`, `--color-surface-hover`…) sont ce que les modules consomment, chacun décliné en surface, texte, fond léger et bordure, tableau dans `docs/design-system.md`.

Deux règles, vérifiées par `check:architecture` :

1. **`color: var(--color-primary)` est interdit.** Le primaire colore des surfaces (bouton, fond, bordure, icône pleine) ; du texte ou un lien prend `--color-primary-text`, dont chaque accent garantit 4,5:1 sur fond clair, ce que le vert, l'orange et le cyan de `--color-primary` ne tiennent pas.
2. **Pas de `color-mix()` maison sur un rôle ni sur le texte, le fond ou la surface** (`background: color-mix(in srgb, var(--color-text) 8%, transparent)`) : le jeton `-bg`, `-border`, `-hover`, `-active`, `-sunken` ou `-translucent` existe déjà, en clair, en sombre et sous `.on-dark`.

Les surfaces flottantes (menus, feuilles, modales, infobulles, cartes `elevation="md"|"lg"`) posent `--color-surface-raised` : en sombre l'élévation se lit par un ton plus clair, pas par une ombre.

Points de rupture, échelle fermée : `24.9375rem`, `29.9375rem`, `39.9375rem`, `47.9375rem`, `63.9375rem` en `max-width` ; `30rem`, `40rem`, `48rem`, `64rem`, `80rem` en `min-width`. Toute autre valeur est refusée. `(hover: hover)`, `(hover: none)`, `(pointer: fine)`, `(pointer: coarse)` et `(prefers-reduced-motion: reduce)` sont les seules autres requêtes média admises.

Les props d'accessibilité portent le préfixe `aria` en camelCase sur toutes les primitives : `ariaLabel`, `ariaLabelledBy`, `ariaDescribedBy`. `label` désigne toujours un texte visible (`Field`, `Tabs`, `Dropdown`, `InfoBubble`, `Tooltip`). Un composant qui étale les attributs natifs prend `data-testid` ; `Chip` et `Modal` l'acceptent aussi ; `ConfirmDialog` garde `testId` parce qu'il en dérive trois identifiants. Un `onChange` remonte toujours la valeur, `Toggle` et `ToggleRow` compris (`onChange(checked)`).

Deux règles de comportement, non outillées, à tenir à la main :

1. tout bloc `:hover` vit dans `@media (hover: hover)`, sinon l'état reste collé après un tap sur mobile ;
2. toute `animation` a son pendant `@media (prefers-reduced-motion: reduce)`, et une `transition` qui déplace (`transform`) aussi.

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

## Compatibilité iPhone et iPad

Toute feature qui touche l'interface se vérifie dans WebKit avant d'être rendue à l'utilisateur, en plus de Chromium : Safari est le seul moteur sur iPhone et iPad, quel que soit le navigateur installé, et ni le Browser pane ni `resize_window` n'en montrent quoi que ce soit. Le passage se fait avec Playwright (`pnpm exec playwright install webkit` une fois), dans un script jetable `scripts/_<nom>_tmp.mjs` supprimé après coup, contexte `devices['iPhone 13']`, connexion par `POST /api/v1/auth/login` avec le compte de démonstration, puis `localStorage` `mp.session-hint` à `1` et `moviepicker_whats_new_seen_<userId>` à la version courante pour ne pas buter sur « Quoi de neuf ». Une capture WebKit de chaque écran mobile touché fait partie du compte rendu, et ce que WebKit de bureau ne reproduit pas (défilement de la page derrière une feuille, clavier, partage natif, retour dans l'app installée après une connexion Google) se signale comme « à confirmer sur un téléphone », jamais comme vérifié.

Pièges déjà rencontrés, à passer en revue sur tout code nouveau :

- **Corps défilant d'une modale en colonne** (`Modal` `column`, feuilles mobiles) : `flex: 1 1 auto; min-height: 0`, jamais `flex: 1`. La hauteur du conteneur étant indéfinie (`max-height`), Safari résout la base `0%` à zéro et le corps disparaît : la feuille n'affiche plus que son en-tête et son pied.
- **Champ de saisie sous 16 px** : Safari iOS zoome la page au focus. Tout `input`, `textarea` ou `select` dont la taille est réduite reprend `var(--font-size-md)` sous `@media (pointer: coarse)` ; la classe globale `input` est déjà à 16 px.
- **Détection par user agent** : l'app installée sur l'écran d'accueil porte l'user agent d'un WKWebView nu, sans `Safari`. Toute heuristique (navigateur intégré, guide d'installation) interroge d'abord `isStandaloneRuntime()` et `isIosRuntime()` de `shared/hooks/usePwaInstall.ts`.
- **Notifications push** : `PushManager` n'existe que dans l'app installée (iOS 16.4 et plus). Un écran qui dépend du push propose l'ajout à l'écran d'accueil (`usePwaInstallClick`) plutôt qu'un simple « non disponible ».
- **Téléchargement d'un blob** : passer par `shared/utils/downloadBlob.ts`, qui révoque l'URL une minute après le clic ; révoquée tout de suite, Safari n'a pas encore lu le blob.
- **Gestes tactiles** : la fondation pose `touch-action: manipulation` sur les éléments interactifs, sinon un double tap rapide zoome la page ; une surface glissable pose `touch-action: none` (poignée de `SheetDrag`) ; une image sous un geste de glisser prend `pointer-events: none` et `-webkit-user-drag: none`.
- **Préfixes `-webkit-`** : le build n'autopréfixe pas. `backdrop-filter`, `user-select` et `user-drag` s'écrivent en double, la version préfixée après la version standard.
- **Barres fixes et feuilles** : hauteurs en `dvh`, marges de sécurité en `env(safe-area-inset-*)` (`--mobile-nav-height` inclut déjà celle du bas), sur le pied des feuilles et l'attribution compris.
- **API navigateur** : `requestIdleCallback`, `navigator.share`, `navigator.clipboard` et `Notification` ont chacun un repli ; `share` et `writeText` s'appellent dans le geste utilisateur, sans `await` avant eux, sinon Safari les refuse.
- **Champ de recherche** : `type="search"` avec `enterKeyHint="search"` et `autoCorrect="off"`, pour la touche Rechercher du clavier iOS et des titres que l'autocorrection ne réécrit pas.

## Workflow

**Le test est écrit avant le code.** Pour une fonctionnalité comme pour un correctif : d'abord un test qui échoue et qui décrit le comportement attendu, ensuite l'implémentation qui le fait passer. Sur un bug, le test doit reproduire le symptôme avant toute correction, sinon rien ne prouve que la cause a été traitée.

**Avant tout push sur master, toujours exécuter `pnpm run verify:local` et corriger toute erreur avant de push.** Obligatoire quelle que soit la conversation ou la feature. Quinze étapes en trois voies concurrentes, puis la suite front seule (`docs/technical-debt.md`, C11) : voie node (règles d'architecture, `pnpm lint`, ESLint, Prettier), voie dotnet (`dotnet restore`, build Release avec `-warnaserror`, puis en parallèle `dotnet format --verify-no-changes`, tests API unitaires et d'intégration sur ce build, export OpenAPI et dérive des types), voie docker (workflows actionlint + shellcheck + zizmor, Gitleaks sur l'arbre de travail, audit Trivy), enfin les tests front avec seuils de couverture. Le premier échec arrête tout ; une table des durées ferme le run.

**Aucune contribution externe.** Projet solo : `CONTRIBUTING.md` refuse les PR de fork et la licence les rend infusionnables. Les jobs d'entrée de `ci-cd.yml` portent `github.event.pull_request.head.repo.fork != true`, donc une PR de fork ne déclenche aucun run. Ne pas retirer cette condition ni l'oublier sur un job d'entrée ajouté plus tard : un job sans `needs: changes` ne l'hérite pas. Elle n'est qu'un confort : sur `pull_request`, GitHub exécute le workflow du commit de fusion, donc une PR qui modifie `ci-cd.yml` la contourne. Les vrais verrous sont l'approbation manuelle de tout run externe (réglage GitHub, table de `docs/technical-debt.md`) et le filtre de provenance de `rollback-front.yml`, qui ne republie que les archives d'un run de `deploy.yml` sur `master`.

**Pousser sur master ne déploie rien.** La mise en production est un geste manuel, `gh workflow run deploy.yml --ref master -f target=all` (cibles : `all`, `front`, `api`), et elle refuse de partir si le run `ci-cd.yml` du commit visé n'est pas vert. Ne jamais la déclencher sans demande explicite de l'utilisateur : le découpage existe pour qu'il groupe plusieurs livraisons dans un seul déploiement, héritage du temps où le dépôt était privé et ses minutes GitHub Actions facturées. Corollaire à annoncer en fin de tâche : **la production est en retard sur master par défaut**, et rien ne le signale.

**Un run master joue toutes les lanes.** Le filtre par chemin de `ci-cd.yml` ne s'applique qu'aux PR et aux branches `v*` ; sur master, un commit qui ne touche que la documentation rejoue quand même lint, tests, E2E et Sonar, parce que `deploy.yml` ne lit que la conclusion du run et qu'un run vert par vacuité posé sur un commit rouge autorisait un déploiement jamais validé. Ne pas remettre le filtre sur master pour gagner sept minutes : les minutes sont gratuites, le trou ne l'était pas.

**Retour arrière** : `gh workflow run rollback.yml --ref master` (API, révision Cloud Run antérieure à celle qui sert, ou `-f revision=<nom>`), `gh workflow run rollback-front.yml --ref master` (front, artefact `front-dist-<sha>` précédent ou `-f commit=<sha>`). Les passes S3, les sondes de santé et l'authentification GCP sont des actions composites de `.github/actions/`, partagées entre déploiement et retour arrière : les modifier là, jamais en ligne dans un workflow. Les données ne reviennent pas en arrière avec le code : `docs/runbook-mongodb-restore.md` dit comment remettre une sauvegarde dans le cluster.

**Deux identités GCP.** Les workflows impersonnent le compte de service CI (`gcloud-auth`) ; la révision Cloud Run tourne sous `movie-picker-api@<projet>`, qui ne peut que lire les secrets qu'elle monte (`--service-account` dans `deploy.yml`). Un nouveau secret dans `deploy.yml` demande aussi son `secretmanager.secretAccessor` sur ce compte, sinon la révision ne démarre pas et le déploiement s'arrête avant promotion.

**Outils épinglés à la main** (gitleaks, actionlint, zizmor, SonarScanner, sentry-cli, mongo tools, images MongoDB et Trivy) : aucun écosystème Dependabot ne les suit, `pnpm run check:tools` compare chaque épinglage à la dernière version publiée, joué dans la passe hebdomadaire.

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
- une arête entre features hors de `FEATURE_EDGES` (`scripts/check-architecture.mjs`), tests compris : `auth` ne dépend d'aucune feature, `movies` de `auth`, `events` et `letterboxd` de `movies`, `watchlist` de `letterboxd` et `events`, `profile` de `watchlist` et `events`, `notifications` de `auth` ; une feature nouvelle se déclare dans la table avant son premier import. Ce qui sert plusieurs features vit dans la plus basse qui en a besoin (`useWatchlist` et `watchlistApi` dans `movies`, `ProposeToEventModal` dans `events`) ou dans `shared/` ; les pages qui composent plusieurs features vivent dans `app/pages/` (`app/pages/account/`) ;
- en CSS : espacement (`px` comme `rem`, même mêlé à un jeton), `font-size`, `font-weight`, `line-height`, `letter-spacing`, `font-family`, `border-radius`, `z-index`, `opacity` hors `@keyframes`, durée ou courbe de `transition` / `animation`, largeur de bordure hors 1 px / 2 px, en valeur littérale ; couleur littérale ou `color-mix()` maison en module ; `outline: 2px solid var(--color-primary)` écrit à la main ; un `:focus-visible` qui retire le contour sans poser `--ring-focus` ; point de rupture hors échelle ; `<dialog>` ou `::backdrop` écrit hors de `Modal` ;
- en CSS toujours : une taille (`width`, `height`, `min-*`, `max-*`, `top`, `right`, `bottom`, `left`, `inset`) ou un `translate` littéral sous 96 px hors 1 px / 2 px ; un espacement littéral à l'intérieur d'un `calc()` ou d'un `clamp()` ; un `var(--jeton, repli)` sur un jeton de la fondation ; un jeton de la fondation que rien ne consomme ;
- en TypeScript : un `zIndex` numérique, même conditionnel, ou un `color-mix()` sur un rôle dans un objet `style`, le jeton se pose dans le module CSS ; un `size={16}`, `iconSize={16}`, `width={16} height={16}` ou `size = 16` par défaut sur un composant, l'icône prend `ICON_SIZE.<pas>` ; un `ICON_SIZE` qui ne coïncide pas avec les `--icon-*` de la fondation ;
- une classe `btn`, `btn-*`, `btn-link` ou `icon-btn-*` écrite à la main hors de `Button`, `IconButton` et `LinkButton` ;
- un `role="menu"`, `menuitem`, `listbox`, `option`, `radiogroup`, `radio`, `tab`, `tablist`, `tabpanel`, `switch`, `dialog` ou `tooltip` écrit hors de `shared/components/` : la primitive existe et porte déjà le clavier ;
- une étape de `transition` qui pose `var(--duration-*)` sans `var(--ease-*)` ;
- un élément cliquable (bloc avec `cursor: pointer`, ou classe posée sur un `<button>`, `<a>`, `<Link>`, `Button`, `IconButton`, `LinkButton` en TSX) dont `width`, `height`, `min-width` ou `min-height` plafonne sous 44 px, jeton `--space-*` résolu ; un module qui compose `expanded` de `tapTarget.module.css` est réputé avoir traité sa zone tactile ; une classe posée sur un `<input>` natif est exemptée, son `<label>` est la cible ;
- une classe déclarée dans un `*.module.css` et utilisée nulle part, ou dans `styles/*.css` et absente de tout fichier TypeScript et de `index.html`. La règle résout le nom local de l'import fichier par fichier, suit les ré-exports (`export { styles as xStyles }`), et compte comme usage un `composes:`, un `:global(...)` et une position descendante (`.footer .btn`). Les modules accédés par crochets (`styles[variable]`) sont inanalysables : ils sont exclus et **listés dans la sortie**, jamais passés en silence.

`node apps/web/scripts/prerender.mjs`, dernière étape du build web, prérend les routes de `PRERENDERED_ROUTES` (`apps/web/src/app/prerenderRoutes.ts`) dans `dist/prerendered/`, les styles de la route en ligne dans le document. Il échoue s'il ne trouve plus `#splash` ou `#root` dans `dist/index.html`, si une page ne rend aucun `<h1>`, si une route n'a pas d'entrée dans `PRERENDERED_ROUTE_CHUNKS`, ou si ce nom de chunk est absent de `dist/route-assets.json`. Il ne touche jamais le réseau, `fetch` y reste en attente : une page qui interroge l'API prérend son en-tête, son `<h1>` et son état de chargement, pas ses données. Le prérendu sert deux choses distinctes, l'indexation et le premier rendu : une route en `noindex` n'en tire que la seconde et doit le déclarer dans `PRERENDERED_FOR_FIRST_PAINT_ONLY`, sinon le build échoue, pour qu'un `noindex` posé plus tard sur une page prérendue pour son référencement reste une erreur visible. La page d'accueil en est volontairement absente, son titre peint dans la coquille de démarrage étant son élément LCP (C2 de `docs/technical-debt.md`) ; ce que le prérendu casse en silence quand on y touche (styles liés au lieu d'en ligne, réécritures de `scripts/lighthouse-run.mjs`) est la contrainte C15 du même fichier.

`pnpm run check:workflows` rejoue les portes de `lint-workflows` en local, dans `verify:local`. actionlint lit les workflows ; zizmor lit `.github/` en entier, donc aussi les actions composites et `dependabot.yml`, dont il exige un `cooldown`. Les deux outils passent par Docker épinglé au digest parce qu'`actionlint` **saute silencieusement** sa moitié shellcheck quand shellcheck n'est pas dans le PATH : l'image embarque shellcheck 0.10.0, la version de la CI. Changer une version d'un côté sans l'autre rend une porte locale verte sur ce que la CI refuse.

La porte `gitleaks` de `verify:local` rejoue le job `gitleaks` de la CI, même image épinglée et même mode `dir` : elle scanne **l'arbre de travail, jamais l'historique**. Elle existe parce que sans elle cette classe d'échec ne se découvrait qu'en CI, et la règle `curl-auth-user` est un piège à elle seule : elle déclenche sur `curl -u "$TOKEN:"` **même quand la valeur est un nom de variable**. Pour appeler une API avec un jeton dans une commande documentée, écrire `curl -H "Authorization: Bearer $TOKEN"`. Même famille depuis gitleaks 8.30 : `sentry-access-token` déclenche sur le mot `sentry` suivi, à moins de 20 caractères, d'une valeur de 64 hexadécimaux, donc une somme de contrôle nommée `SENTRY_CLI_SHA256` est un « secret » ; le nom `SENTRY_CLI_LINUX_X86_64_BINARY_SHA256` de `deploy.yml` est long pour ça.

`pnpm run test:api:mongo` rejoue la suite d'intégration API contre une vraie MongoDB en replica set (conteneur Docker créé à la volée, base jetable par classe de test) : c'est le seul chemin qui exécute les adaptateurs Mongo et les transactions. La CI le rejoue dans le job `test-api-mongo`, dont dépend le déploiement API. Il collecte sa propre couverture (`apps/api-dotnet/coverlet.integration.runsettings`) et `scripts/check-mongo-coverage.mjs` la contrôle sur le seul espace de noms `Infrastructure.Persistence.Mongo` : ces classes sont exclues du rapport du job `test-api`, donc sans cette porte la couche qui ne tourne qu'en production ne serait mesurée nulle part.

`MongoIndexInventoryTests` compare les index réellement créés à la liste attendue (nom, unicité, TTL). Trois garanties n'existent que dans ces index : l'expiration des compteurs de rate limiting, celle des sessions et celle des jetons de réinitialisation. Ajouter un index dans `MongoIndexInitializer` sans l'ajouter à cette liste fait échouer le test, c'est voulu. Les index sont décrits par une empreinte (`MongoIndexPlan.MarkerId`) enregistrée dans la collection `migrations` : un démarrage sur une base qui porte déjà l'empreinte ne rejoue aucun `createIndexes`, et tout changement d'index (clé, option, ajout, suppression) change l'empreinte, donc rejoue la création une fois. `MongoDuplicateKeyMappingTests` couvre l'autre moitié : `MongoUserRepository` distingue les conflits en cherchant le nom de l'index dans le message d'erreur Mongo, donc un renommage change le code d'erreur rendu au front.

`pnpm run test:e2e:mongo` rejoue le seul parcours critique Playwright contre l'API branchée sur un vrai MongoDB (variable `E2E_MONGODB_URI`, base dédiée `moviepicker_e2e` : le garde-fou Development refuse la base `moviepicker`). La CI le rejoue dans le job `e2e-mongo`, bloquant pour les deux déploiements. C'est le seul endroit où navigateur réel et base réelle tournent ensemble : `e2e` tourne sur la base mémoire, `test-api-mongo` tourne sans navigateur.

`pnpm run openapi:types:check` régénère `apps/web/src/shared/api/generated/openapiSchema.ts` depuis le contrat exporté et échoue s'il a dérivé ; `apps/web/src/shared/api/apiContract.test.ts` vérifie au niveau des types que les champs lus par le front existent bien dans ce contrat, et que chaque route appelée par le front existe encore dans `paths`. Les réponses simulées de `apps/web/src/mocks/handlers.ts` sont typées sur ce même contrat : une dérive casse `tsc`, donc le job `lint-web`.

`pnpm run test:api:mutation` lance une passe Stryker.NET sur `Domain/` et `Application/UseCases/` (rapport HTML dans `artifacts/stryker`). Hors CI : c'est un outil de diagnostic, à lancer quand on veut savoir si les tests d'une zone vérifient vraiment quelque chose, pas seulement si elle est exécutée.

Seuils de couverture, à relever quand ils décrochent du réel : front `statements 84 / lines 86 / functions 81 / branches 77` (`apps/web/vitest.config.ts`), API `lignes 90 / branches 78` (job `test-api`), adaptateurs Mongo `lignes 86 / branches 58` (`scripts/check-mongo-coverage.mjs`, job `test-api-mongo`).

## Migrations de données

Une correction de données en base est une migration, pas un service de démarrage : ajouter une classe `IDataMigration` dans `Infrastructure/Migrations/` (identifiant daté, `ExecuteAsync` idempotent), l'enregistrer dans `DataMigrationServiceCollectionExtensions`, et c'est tout. `DataMigrationRunner` l'applique une fois, consigne le passage dans la collection `migrations` et la rejoue au démarrage suivant si elle a échoué.

## Écritures multi-documents

Toute suite d'écritures qui doit être tout-ou-rien passe par `IUnitOfWork.ExecuteAsync` (transaction MongoDB côté Mongo, verrou côté InMemory). Les repositories participent automatiquement via `TransactionalCollection` : ne jamais injecter `IMongoDatabase` directement dans un repository, prendre `MongoCollectionFactory`.

**Versions optimistes.** `Event` et `User` portent un champ `Version` : `UpdateAsync` remplace le document seulement si la version lue est encore celle de la base, sinon `ConflictException` avec la raison `concurrent_update` (409 côté front). Toujours réécrire l'entité retournée par le dernier `UpdateAsync`, jamais une copie lue avant ; une mise à jour ciblée (`$set` sur un champ) incrémente aussi la version. Le repli sans transaction de `MongoUnitOfWork` n'existe qu'en Development, pour un serveur sans replica set.

**Plafond compté puis écrit.** Un plafond du type « au plus N participants, votes ou propositions » se vérifie sous `IUnitOfWork.ExecuteAsync` en appelant d'abord `IEventRepository.LockForWriteAsync(eventId)` : côté Mongo c'est un `$inc` sur `writeSeq` qui fait entrer deux transactions concurrentes en `WriteConflict`, la seconde est rejouée après validation de la première et recompte. `JoinEventHandler`, `AddMovieHandler` et `VoteMovieHandler` suivent ce modèle, `EventCapacityRaceTests` le prouve contre Mongo.

**Toute mutation de la vue soirée fait bouger `writeSeq`.** `GET /events/slug/{slug}` et `GET /events/{slug}/movies` répondent avec un `ETag` calculé par `EventViewTagHandler` à partir de `writeSeq`, de `version`, de la minute courante et d'une empreinte du lecteur, et rendent 304 sans relire les films quand le navigateur présente le même. `writeSeq` est donc un compteur exhaustif : `UpdateAsync` et `LockForWriteAsync` l'incrémentent, et tout handler qui écrit dans `movies`, `votes`, `participants` ou `seen_marks` sans passer par l'un des deux appelle `IEventRepository.MarkChangedAsync(eventId)` après son écriture. Oublier cet appel ne casse aucun test de handler existant et laisse les clients en sondage sur l'ancienne réponse jusqu'à la minute suivante : le test du handler doit vérifier l'appel (`Verify(r => r.MarkChangedAsync(...), Times.Once)`), et `EventViewCachingTests` couvre le contrat HTTP. `KnownFieldsUpdate.From(doc, "writeSeq")` exclut le compteur du `$set` et l'incrémente : ne jamais l'écrire depuis l'entité, une copie lue avant une autre écriture le ferait reculer et rendrait un 304 à un client qui a raté ce changement.

**Jeton d'hôte.** Le front l'envoie dans l'en-tête `X-Host-Token` (`withHostToken` dans `apps/web/src/shared/api/client.ts`). `HostTokenAccessor` accepte encore `?host=` pour les clients en cache, et `SensitiveQueryRedaction` le masque dans les logs HTTP et dans Sentry : ne jamais logger une query string brute.

## Stack

Monorepo pnpm + Turbo :
- `apps/web` : Vite + React + TypeScript
- `apps/api-dotnet` : .NET + MongoDB

L'application mobile Expo est archivée dans `archive/mobile` depuis mai 2026, il n'y a plus de `apps/mobile`. Le projet d'une vraie app mobile est porté par `docs/roadmap.md`.

## Documentation clé

- **Guide de développement** (installation, seed, scripts, tests, structure) : [`docs/development.md`](docs/development.md), destiné à un humain qui arrive sur le dépôt, il porte aussi les pièges d'environnement local.
- **Roadmap** (features par version et statuts, puis une section Tech par version pour l'infra, la CI/CD, la qualité et la sécurité) : [`docs/roadmap.md`](docs/roadmap.md).
- **Dette technique** : [`docs/technical-debt.md`](docs/technical-debt.md), fichier de travail pour agent, pas de lecture humaine. Une entrée par dette, chacune avec sa commande `verify` de fraîcheur et son critère de fin, plus deux sections « Contraintes » et « Impasses » à lire avant toute optimisation front ou tout geste de déploiement. C'est là qu'atterrit toute dette constatée, jamais dans une roadmap ni en mémoire agent.

**Dossier technique publié dans l'application** (`/tech`), source dans `apps/web/src/app/pages/tech/`. Deux dates s'affichent dans son en-tête et elles ne se maintiennent pas de la même façon :

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
