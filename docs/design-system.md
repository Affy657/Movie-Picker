# Design system

Les composants partagés de `apps/web/src/shared/components/`, leurs props, leurs états et ce qu'ils garantissent pour l'accessibilité. Les règles d'usage (réutiliser avant d'écrire, jetons obligatoires, `:hover` sous `(hover: hover)`) sont dans [`AGENTS.md`](../AGENTS.md) et vérifiées par `pnpm run check:architecture`. Ce document décrit ce que chaque composant fait ; quand un composant change, cette page change dans le même commit.

## Jetons

Tous dans `apps/web/src/styles/01-foundation.css`, sauf ceux propres à la page d'accueil, dans `app/pages/landing/landingPalette.css`.

| Famille | Jetons | Note |
|---|---|---|
| Espacement | `--space-0` à `--space-24`, demi-pas jusqu'à `--space-3-5` (14 px) | base 4 px, y compris à l'intérieur d'un `calc()` ou d'un `clamp()` ; `--tap-target-min` (44 px) est la seule taille qui n'appartient pas à la grille |
| Tailles | toute `width`, `height`, `min-*`, `max-*`, `top`, `left`, `right`, `bottom`, `inset`, le `translate` d'un `transform`, une piste de `grid-template-*` et une propriété personnalisée de module, sous 96 px, vient de `--space-*`, `--icon-*`, `--avatar-*`, `--tap-target-min` ou `--lift-*` | 1 px et 2 px restent des traits ; au-delà de 96 px (affiches, colonnes) la valeur est une dimension de contenu, pas un jeton |
| Colonnes | `--poster-column-sm` (8,4 rem), `--poster-column-md` (9 rem), `--collection-column` (17 rem) | la largeur d'une colonne d'affiches ou de collections dans un rail (`grid-auto-columns`), et le minimum des grilles de Ma liste et du profil ; les listes complètes de l'accueil gardent leurs minimums propres (9,5 rem et 15 rem) |
| Icônes | `--icon-xs` (12) `-sm` (14) `-md` (16) `-lg` (18) `-xl` (20) `-2xl` (24) `-3xl` (28) `-4xl` (32) ; miroir TypeScript `ICON_SIZE` dans `shared/components/iconSize.ts` | une icône Lucide prend `size={ICON_SIZE.md}`, jamais un nombre ; la porte vérifie que les deux échelles coïncident |
| Avatars | `--avatar-xs` (20) `-sm` (28) `-md` (36) `-lg` (56) `-xl` (96) ; `--color-avatar-0` à `-7` pour les initiales | la palette des initiales est choisie par `data-palette` sur l'élément, jamais par une couleur en dur ; la porte vérifie que `SIZE_PX` d'`Avatar.tsx` recopie ces valeurs |
| Soulèvement | `--lift-sm` (-1 px), `-md` (-2 px), `-lg` (-4 px), `-xl` (-8 px) | le `translateY` d'un survol ; `Button` et `Card` prennent `-sm` |
| Gabarit | `--header-height` (3,5 rem), `--mobile-nav-height` (4 rem + zone sûre) | posés dans la fondation, consommés sans repli |
| Typographie | `--font-size-4xs` à `--font-size-6xl`, `--font-size-page-title` ; `--font-weight-regular/medium/semibold/bold/extrabold` ; `--leading-none` (1), `-tight` (1,2), `-snug` (1,35), `-normal` (1,4), `-comfortable` (1,5), `-relaxed` (1,6) ; `--tracking-tighter` (-0,03 em), `-tight` (-0,02), `-snug` (-0,01), `-slight` (0,01), `-wide` (0,03), `-wider` (0,06), `-widest` (0,12) ; `--font-body`, `--font-mono` | aucune valeur littérale de taille, de graisse, d'interlignage ou d'approche dans un module ; un `font-size` est un jeton ou un `clamp()` de jetons |
| Rayons | `--radius-xs` (4 px), `-sm` (6 px), `-md` (12 px), `-lg` (18 px), `-pill` | |
| Bordures | `--border-width-field` (1,5 px) | tout autre trait fait 1 px ou 2 px, en littéral |
| Focus | `--outline-focus` (contour), `--outline-offset` (2 px), `--outline-offset-inset` (-2 px, contour intérieur d'un menu ou d'une ligne), `--ring-focus` (halo pour les champs) | un `:focus-visible` qui retire le contour pose le halo, jamais un simple fond |
| Géométrie des panneaux | `MENU_VIEWPORT_MARGIN_PX` (8), `MENU_ANCHOR_GAP_PX` (6), `INFO_PANEL_MAX_WIDTH_PX` (320) dans `shared/components/menuGeometry.ts` | les seuls pixels écrits en TypeScript pour positionner un panneau flottant (`Menu`, `InfoBubble`) ; les deux premiers recopient `--space-2` et `--space-1-5` |
| Ombres | `--shadow-sm/md/lg`, `--shadow-nav`, `--shadow-hero-card`, `--shadow-wheel` | en sombre l'élévation se lit sur `--color-surface-raised`, pas sur l'ombre ; `--shadow-nav` change de valeur en sombre |
| Filtres | `--backdrop-blur-bar` (barres collantes), `--backdrop-blur-overlay` (voiles), `--filter-poster-backdrop` (affiche floutée en fond), `--filter-streak-glow`, `-strong` | un flou ou une ombre portée écrits en longueur dans un `filter` ou un `backdrop-filter` sont refusés, ils passent par ces jetons |
| Mouvement | `--duration-instant` (0,01 ms), `--duration-fast` (0,10 s), `--duration-base` (0,15 s), `--duration-slow` (0,20 s), `--duration-enter` (0,25 s), `--duration-sheet` (0,32 s), `--duration-reveal` (0,6 s), `--duration-spin` (0,8 s), `--duration-pulse` (1,2 s), `--duration-shimmer` (1,4 s), `--duration-breathe` (2,4 s) ; `--ease-default/in-out/out/linear/reveal/spring` | chaque étape de `transition` porte sa durée et sa courbe, un `*-delay` aussi ; `--duration-instant` est la remise à zéro de `prefers-reduced-motion` ; une boucle décorative propre à un composant déclare son propre jeton dans son module (`--flame-flicker-duration`), un décalage de phase aussi (`--card-shake-stagger-*`, `--demo-float-offset`) |
| Opacité | `--opacity-disabled` (0,5), `--opacity-muted` (0,6), `--opacity-hover` (0,8), `--opacity-dimmed` (0,85) | état désactivé, contenu secondaire, fondu au survol, `aria-busy` ; un littéral n'est admis que dans une étape de `@keyframes` |
| Couleurs | primitives réservées à la fondation et à `landingPalette.css` : teintes (`--blue-600`…), neutres `--white`, `--black`, `--slate-50` à `-900`, `--night-950` à `-600` (les fonds sombres) ; rôles `--color-*` consommés par les modules ; `--color-heat-0` à `-3` pour la carte d'activité | tableau des rôles ci-dessous ; une couleur littérale (hexadécimal, `rgb()`, `hsl()`, `oklch()` et les autres notations, nom de couleur quelle que soit sa casse) n'apparaît dans aucune feuille hors des déclarations de jetons de la fondation et de `landingPalette.css`, et dans aucun fichier TypeScript hors du logo des technologies, des boutons OAuth et du QR code |
| Teintes de surface | `--color-surface-hover` (6 %), `-hover-strong` (10 %), `-active` (12 %), `-sunken`, `-translucent`, `--color-bg-tint`, `--color-bg-translucent` | remplacent tout `color-mix()` maison sur le texte, le fond ou la surface |
| Sur affiche | `--color-on-poster-*` | texte, bordures et voiles posés sur une image sombre |
| Roue | `--color-wheel-0` à `-11` (segments), `--color-wheel-label`, `-label-shadow`, `-divider`, `-hub`, `-hub-stroke`, `-hub-shadow`, `-pointer`, `-pointer-stroke`, `-pointer-shadow` | le canvas les lit par `readCssToken` (`shared/utils/cssToken.ts`) au moment de dessiner, les confettis et la démo de la page d'accueil aussi |
| Genres | `--color-genre-0` à `-5` | les segments de la barre des genres du profil, lus depuis le TypeScript par leur nom |
| Série | `--color-streak`, `-soft`, `-bg`, `-border`, `--color-streak-flame-base`, `-middle`, `-tip` | la flamme du profil |
| Pastilles d'accent | `--color-accent-swatch-*` | la couleur d'aperçu de chaque accent dans le sélecteur, indépendante de l'accent actif |
| Dégradés | `--gradient-accent` (barre d'accent des cartes de formulaire et de « Quoi de neuf »), `--gradient-hero` (fonds sombres de la page d'accueil et de `/tech`) | |
| Profondeur | `--z-below` à `--z-skip-link` | jamais un nombre, ni en CSS ni dans un objet `style` |
| Largeurs | `--container-xs` (28 rem), `-sm` (32), `-md` (36), `-lg` (40), `-xl` (56), `-2xl` (64), `-3xl` (72), `-4xl` (84) ; `--layout-max` (`--container-lg`, la largeur de page par défaut, qu'une page change en posant `--page-max-width`), `--layout-max-landing` (`--container-3xl`, consommé tel quel par la page d'accueil et `/tech`) | les tailles de `Modal` portent les mêmes noms |
| Zone tactile | `shared/components/tapTarget.module.css`, classe `expanded` | `composes: expanded from '@/shared/components/tapTarget.module.css'` pose `position: relative` (dans la couche `@layer tap-target`, donc un `position: absolute` écrit dans la classe qui compose garde la main, quel que soit l'ordre d'émission des feuilles) et un `::after` de 44 px centré ; c'est ce qu'utilisent `Button` `sm`, `IconButton`, `LinkButton`, `BackLink`, `Chip` cliquable et sa croix, `Toggle`, `ViewModeToggle`, `SegmentedRadioGroup` et tout contrôle dessiné sous 44 px |
| Typographie composée | `shared/components/typography.module.css`, classes `pageTitle`, `overline` et `sectionLabel` | `composes: pageTitle from '@/shared/components/typography.module.css'` pour tout `<h1>` de page (taille `--font-size-page-title`, extra-gras, approche serrée), sauf le titre de l'accueil connecté, que la coquille de démarrage peint à sa propre taille (contrainte C2 de `docs/technical-debt.md`) ; deux libellés en capitales grasses : `overline` (`--tracking-widest`) pour un surtitre au-dessus d'un titre ou d'un message (code d'erreur, bandeau d'information, sections de l'accueil), `sectionLabel` (`--tracking-wider`) pour l'intitulé d'un groupe (colonne du pied de page, groupe de réglages, de filtres ou de menu, en-tête de tableau) ; les trois vivent dans `@layer typography`, la classe qui compose peut donc surcharger une propriété (la taille d'un titre de carte) |

### Rôles de couleur

Chaque rôle porte sa déclinaison, en clair, en sombre et sous `.on-dark` ; un module consomme le jeton de la déclinaison, jamais un `color-mix()` maison (règle vérifiée par `check:architecture`, voir `AGENTS.md`).

| Rôle | Surface | Texte | Fond léger | Bordure |
|---|---|---|---|---|
| primaire (accent choisi par l'utilisateur) | `--color-primary`, `-hover` | `--color-primary-text`, `-text-hover` ; `--color-primary-contrast` sur la surface | `--color-primary-tint`, `-soft`, `-soft-hover` | `--color-primary-border`, `-border-soft` |
| erreur, succès, avertissement | `--color-error`, `--color-success`, `--color-warning` | idem | `--color-<rôle>-bg` | `--color-<rôle>-border` |
| texte | | `--color-text`, `--color-text-muted` (secondaire), `--color-text-subtle` (métadonnées : date, durée, compteur) | | |
| marque secondaire | `--color-brand-secondary` | | `--color-brand-secondary-bg`, `-glow` | `--color-brand-secondary-border` |
| états de soirée | | `--color-badge-<état>-text` | `--color-badge-<état>-bg` | `--color-badge-<état>-border` |
| teintes neutres | `--color-surface-hover` (6 %), `-hover-strong` (10 %), `-active` (12 %), `-sunken`, `-translucent`, `--color-bg-tint`, `--color-bg-translucent` | | | |

`--color-primary-text` existe parce que `--color-primary` colore des surfaces : la déclinaison texte de chaque accent tient 4,5:1 sur le fond, la surface, le fond léger et la teinte, en clair comme en sombre.

Trois portées de thème : `[data-theme='light']`, `[data-theme='dark']` et `.on-dark` (un bloc sombre posé dans une page claire, la carte d'accueil par exemple). Un rôle ajouté au clair se déclare dans les trois. Les teintes neutres, les bordures des badges et le dégradé d'accent se calculent une fois dans le bloc commun `:root, .on-dark` et suivent leur source dans chaque portée ; les fonds et bordures d'état (`-bg`, `-border`) et les déclinaisons d'accent (`-tint`, `-soft`, `-soft-hover`, `-border`) sont redosés dans chaque portée, parce que le même pourcentage ne donne pas le même contraste sur fond clair et sur fond sombre.

**Les contrastes sont testés.** `apps/web/src/styles/foundationContrast.test.ts` lit la fondation, résout chaque `var()` et chaque `color-mix()`, et échoue, sans arrondir le rapport, si un couple descend sous son seuil. En clair et en sombre : le texte, le texte secondaire et les métadonnées sur le fond et les surfaces, les états, les badges et le surlignage de recherche à 4,5:1, le contour d'un champ sur la surface, la surface élevée, le fond et le fond de champ à 3:1 ; pour chacun des huit accents, le texte sur le bouton d'accent et sur son survol, le texte d'accent sur le fond, la surface, la teinte et le fond léger (posés sur la surface comme sur la surface élevée), le texte de survol sur le fond léger survolé, à 4,5:1, et l'accent sur la surface à 3:1. Sous `.on-dark` : le texte d'accent de chacun des huit accents sur la surface, puis les couples de texte et de contour avec l'accent par défaut. Enfin l'étiquette de la roue sur chacun des douze segments, à 4,5:1. Un jeton de couleur modifié se valide par ce test avant toute capture ; un fond léger survolé prend `--color-primary-text-hover`, jamais `--color-primary-text`.

Un `var(--jeton, repli)` sur un jeton de la fondation est refusé : le repli est mort tant que la fondation charge, et quand il diverge du jeton (`var(--radius-sm, 4px)` pour un jeton à 6 px) il ment. Le repli n'a de sens que sur un jeton local à un module (`--mc-*` des cartes film, `--swatch-color` des pastilles d'accent). Un tel thème local se déclare une fois : la classe `onSurface` de `movieCardParts.module.css` porte les dix-sept `--mc-*` d'une carte posée sur une surface, et les modules qui en ont besoin la `composes`, ils ne recopient pas le bloc. Même principe pour la pastille posée sur une affiche : `posterBadge` du même fichier, composée par le badge « série » des cartes de soirée et le rang des vitrines. Un jeton de la fondation que personne ne consomme est refusé aussi.

## Composants

`className` est accepté par tous les composants, sauf ceux qui possèdent leur surface : `Sheet`, `Notice`, `FormPageShell`, `InfoBubble`, `Toggle`, `DialogTitleBar`, `ConfirmDialog`, `ShareDialog`, `ConsentDialog`, `InstallPwaDialog`, `QrCode`, les états de page pleins (`ErrorState`, `ServerErrorPage`, `SignedOutState`) et `Menu`, qui prend `triggerClassName` et `panelClassName` (ses briques `MenuItem`, `MenuLabel` et `MenuSeparator` n'en prennent aucun). Seuls `Button`, `IconButton`, `LinkButton`, `Card`, `ChoiceCard`, `CountBadge`, `StatusDot` et `MenuPanel` transmettent les attributs HTML natifs à leur élément racine.

Conventions de nommage des props, les mêmes partout :

- `ariaLabel`, `ariaLabelledBy`, `ariaDescribedBy` pour le nom et la description accessibles ; le nom d'un sous-élément garde le suffixe : `closeAriaLabel` (`Modal`, `DialogTitleBar`), `removeAriaLabel` (`Chip`), `panelAriaLabel` (`Menu`) ;
- `label` est un texte visible (`Field`, `Tabs`, `Dropdown`, `Tooltip`, et le titre du panneau d'`InfoBubble`, qui nomme aussi son bouton), sauf l'onglet `iconOnly` de `Tabs`, qui le garde comme seul nom accessible ;
- `data-testid` sur les composants qui étalent les attributs natifs, accepté aussi par `Chip` et `Modal` ; `ConfirmDialog` garde `testId`, préfixe dont il dérive `-cancel` et `-confirm` ;
- `onChange(value)` remonte la valeur, y compris `Toggle` et `ToggleRow` (`onChange(checked)`) ;
- le composant d'un module est son export par défaut ; ses briques et ses fonctions de classe sont des exports nommés (`buttonClass`, `buttonLabelClass`, `iconButtonClass`, `linkButtonClass`, `MenuPanel`, `MenuItem`) ; un module qui exporte une paire sans composant principal (`ChoiceGroup` + `ChoiceCard`, `Tabs` + `TabPanel`, `Skeleton` + `SkeletonScreen`) n'a que des exports nommés.

### Button

Le bouton du produit. `buttonClass()` donne la même composition de classes à un `<Link>` ou un `<a>`, `buttonLabelClass(texte)` la classe du libellé.

| Prop | Type | Défaut | Rôle |
|---|---|---|---|
| `variant` | `primary` / `secondary` / `soft` / `ghost` | `secondary` | hiérarchie : plein, contour, fond d'accent léger, sans fond ; `soft` dit « actif sans être l'action principale » (filtres ouverts, menu déplié) |
| `tone` | `default` / `danger` / `warning` | `default` | couleur sémantique, cumulable avec la variante ; `warning` pour l'action qui répond à une alerte (confirmer les films Letterboxd non identifiés) |
| `size` | `sm` / `md` / `lg` | `md` | `lg` pour les appels à l'action de la page d'accueil |
| `fullWidth` | `boolean` | `false` | occupe la largeur du conteneur (soumission d'un formulaire) |
| `loading` | `boolean` | `false` | désactive, pose `aria-busy` et un `Spinner` devant le libellé ; le libellé reste |
| `type` | | `button` | à poser à `submit` explicitement |

Les enfants texte qui se suivent (`Proposer ({count})`) sont réunis dans un seul libellé centré optiquement (`--text-optical-nudge`, ou `-caps` sans jambage), les blancs seuls sont ignorés ; un appelant n'ajoute jamais de `<span>` de décalage. États : repos, survol (sous `(hover: hover)`, soulèvement `--lift-sm` annulé sous `prefers-reduced-motion`), focus (`--outline-focus`), désactivé (`--opacity-disabled`), chargement (`--opacity-dimmed`). Hauteur minimale `--tap-target-min` ; `sm` dessine 40 px et étend sa zone tactile à 44 px.

### IconButton

Bouton à icône seule. `ariaLabel` est obligatoire et devient `aria-label` et, sauf `showTitle={false}`, `title`. `iconButtonClass()` donne sa composition à un autre élément (le lien de la cloche de notifications).

| Prop | Type | Défaut |
|---|---|---|
| `ariaLabel` | `string` | requis |
| `size` | `sm` / `md` / `lg` | `md` |
| `tone` | `default` / `danger` / `onPoster` | `default` |
| `shape` | `square` / `round` | `square` ; `round` pour un bouton posé sur une image (flèches d'un rail, menu d'une carte) |
| `expandHitArea` | `boolean` | `true`, compose `expanded` de `tapTarget.module.css` : 44 px de zone tactile sans changer le dessin |
| `loading` | `boolean` | `false`, remplace l'icône par le spinner |

### LinkButton

Un `<button>` qui ressemble à un lien, pour une action secondaire dans une phrase. `size` : `sm` / `md` (défaut, comme `Button`). `linkButtonClass()` donne son dessin à un `<a>` (la bande-annonce externe). Sa zone tactile est étendue à 44 px autour du texte, son libellé est centré comme celui de `Button`.

### BackLink

Le retour vers la page parente, flèche et libellé : `to` rend un `<Link>`, `onClick` un `<button>` (le retour d'une soirée, qui revient dans l'historique). `children` est le libellé, un texte. Survol en pastille sous `(hover: hover)`, focus `--outline-focus`, zone tactile de 44 px. Toute page secondaire (compte, formulaires, collections, listes, profil, soirée) commence par lui.

### Spinner

Le disque qui tourne pendant une attente, `1em` de côté et à la couleur du texte courant, `aria-hidden`. C'est lui que `Button` et `IconButton` affichent en `loading` ; un composant qui attend hors d'un bouton le pose lui-même, jamais une `@keyframes` à lui. Immobile sous `prefers-reduced-motion`.

### Chip

Pastille, badge, filtre ou étiquette d'état. Quatre formes, exclusives : une étiquette (`<span>`), une action (`onClick`, `<button>`), une pastille retirable (`onRemove`) et un lien (`href`, `<a>`).

| Prop | Type | Défaut |
|---|---|---|
| `tone` | `default` / `primary` / `success` / `warning` / `pending` / `danger` / `muted` | `default` |
| `size` | `sm` / `md` | `md` |
| `icon` | composant Lucide | |
| `dot` | `boolean` / `'pulsing'` | un `StatusDot` devant le texte, qui pulse pour un état en cours (enregistrement) |
| `dashed` | `boolean` | bordure pointillée : une place à prendre (inviter), une étape à venir |
| `onClick`, `selected`, `ariaLabel`, `disabled` | | forme action ; `selected` pose le style plein et `aria-pressed`, laissé `undefined` le bouton est une action, pas un interrupteur |
| `onRemove`, `removeAriaLabel` | | forme retirable : croix de retrait, zone tactile de 44 px |
| `href`, `external`, `ariaLabel` | | forme lien : un `<Link>` du routeur pour une route de l'application, un `<a>` qui ouvre un nouvel onglet avec `rel="noopener noreferrer"` quand `external` est posé |
| `data-testid` | `string` | |

Chaque forme refuse au typage les props des autres (une étiquette ne prend ni `ariaLabel` ni `selected` : un nom accessible sur un `<span>` n'est pas lu, le texte masqué visuellement le remplace). Les tons sémantiques consomment les rôles (`--color-success-bg`…) ; `pending` garde son jeton propre `--color-badge-pending-*`. Le centrage optique du texte est intégré (`--text-optical-nudge`).

### StatusDot

La pastille de 6 px (`--space-1-5`) à la couleur du texte courant qui dit un état vivant : `pulsing` la fait respirer (`--duration-breathe`), immobile sous `prefers-reduced-motion`. Décorative (`aria-hidden`), l'état est dit par le texte voisin. C'est le point de `EventLifecyclePill` `live` et de `Chip` `dot`.

### CountBadge

Le compteur en pastille : `value` (nombre ou texte court, « 9+ »), `size` `sm` (16 px) / `md` (20 px, défaut), `tone` `primary` (défaut) / `success` / `neutral`. Chiffres tabulaires, centrage optique des capitales. Un compteur qui double un texte déjà lu (filtres actifs, cloche) prend `aria-hidden`. C'est le nombre de filtres actifs, la cloche de notifications, le rang d'un gagnant et le compteur d'un onglet de `Tabs`.

### Card

Surface de contenu. `as` change l'élément et type ses props : `<Card as={Link} to=…>` exige `to`, `<Card as="button" onClick=…>` accepte `onClick`.

| Prop | Valeurs | Défaut |
|---|---|---|
| `padding` | `none` / `sm` / `md` / `lg` | `md` |
| `radius` | `md` / `lg` | `md` |
| `elevation` | `none` / `sm` / `md` / `lg` | `none` ; `md` et `lg` posent `--color-surface-raised` |
| `surface` | `default` / `sunken` | `default` ; `sunken` pose `--color-surface-sunken`, un encart dans une surface (statistique, rapport, étapes, ligne de modèles) |
| `interactive` | `boolean` | survol et focus visibles, pour une carte cliquable |

`Modal` et `Dropdown` composent `Card` (`elevationLg`). Une surface de carte locale (soirée en attente, carte film en liste, groupe de réglages, table des films) rend `<Card padding="none" elevation="sm" as=…>` avec sa classe, elle ne redessine ni le fond ni la bordure.

### Modal

Seul endroit du projet où `<dialog>` et `::backdrop` sont écrits. Fermeture par Échap, clic sur le voile et bouton de fermeture ; le `<dialog>` natif retient le focus et le rend à l'ouvreur.

| Prop | Type | Note |
|---|---|---|
| `open`, `onClose` | requis | |
| `title` (+ `titleId`, `titleDetail`), ou `ariaLabelledBy`, ou `ariaLabel` | | exactement un des trois nommages, le typage refuse les autres combinaisons et un titre vide (`title` est un texte ou un élément) ; `title` rend la barre de titre `DialogTitleBar`, `titleDetail` s'affiche sous le titre (la progression d'un parcours) |
| `ariaDescribedBy` | `string` | |
| `size` | `xs` / `sm` / `md` / `lg` / `2xl` | `--container-<size>`, `sm` par défaut |
| `surface` | `surface` / `bare` / `media` / `borderless` | `media` pour une bande-annonce |
| `padded`, `column`, `anchoredTop`, `bottomSheetOnMobile`, `strongBackdrop` | `boolean` | |
| `closeAriaLabel` | `string` | nom du bouton de fermeture, « Fermer » par défaut |

`data-testid` se pose sur le `<dialog>`, `dialogRef` en donne la référence à l'appelant. Une modale à titre passe par `title`, jamais par une barre de titre recopiée dans ses enfants.

Dialogues déjà câblés dessus :

- `ConfirmDialog` : `title`, `message`, `onConfirm`, `onCancel`, `confirmLabel`, `cancelLabel`, `confirmTone` `danger` par défaut ou `default` pour une confirmation non destructive, `loading` met le bouton en chargement, `hideCancel` pour un accusé de lecture, `testId`.
- `ShareDialog` : `title`, `url`, `qrHint`, `fileSlug` (nom du PNG téléchargé), `preview` (`avatarId`, `name`, `meta`), `analyticsSurface` `event` / `profile` (analytics), `shareText`, `initialTab`, `extraTab` pour un onglet propre à l'appelant.
- `ConsentDialog` : `open`, `onClose` ; la modale de consentement lit et écrit `useConsent()` elle-même.
- `DialogTitleBar` (`titleId`, `title`, `detail`, `onClose`, `closeAriaLabel`).

### Sheet

Feuille ancrée en bas, glissable : le geste est `useSheetDrag` (`shared/hooks/`), `SheetDrag.module.css` porte la surface, la poignée et les animations d'entrée (`sheetEnter`, `sheetBackdropEnter`, retirées sous `prefers-reduced-motion`). `open`, `title`, `onClose`, `footer`, `size` `md` / `lg`. Sa croix est un `IconButton`.

### Notice

Le bandeau d'information flottant : `title`, `description`, `placement` `top` (défaut, glisse du haut) / `bottom` (glisse du bas), `onClose` (sans lui, pas de croix : le bandeau attend une décision), les actions en enfants, pleine largeur sur mobile. C'est le consentement, l'avertissement du navigateur intégré et celui de l'ancienne adresse.

### FormPageShell

La page d'un formulaire seul : `back` (`to`, `label`) rend le `BackLink`, puis une `Card` `lg` élevée avec sa barre `--gradient-accent`, le `<h1>` (`title`, `pageTitle`) et `description`, puis les enfants. C'est la connexion, l'inscription, le mot de passe oublié et sa réinitialisation, et la création de soirée.

### InlineError

L'erreur d'un bloc qui n'a pas chargé, dans la page : `message`, `retryLabel`, `onRetry`, `messageRole` `alert` (défaut) / `status`. Icône `AlertCircle`, bouton `sm` de nouvel essai. `status` quand plusieurs blocs peuvent échouer ensemble (les rangées de l'accueil) : une alerte par rangée ferait lire le même message six fois. Une erreur de page entière reste `ErrorState`.

### Field

Câble `label`, `hint`, `error` et `aria-describedby` autour d'un champ rendu par la fonction enfant : `children({ id, describedBy, invalid })`. L'erreur porte `role="alert"` et son icône `AlertCircle` ; quand une erreur et une aide sont données, l'erreur passe en premier. `htmlFor` impose l'identifiant du champ quand l'appelant le connaît déjà. Tout `<label>` de formulaire du produit passe par là : un `<label className="label">` écrit à la main perd le câblage de l'aide. Un groupe (radiogroup, interrupteur) prend un `<span className="label" id>` et `ariaLabelledBy` à la place.

Le skin de champ est la classe globale `.input` de `02-forms-and-content.css` : bordure `--color-border-field`, corps `--font-size-md`, survol, `:focus` en `--ring-focus`, `:disabled` en `--opacity-disabled`. `SearchField` et `NumberInput` la portent, ils n'en redessinent rien.

`NumberInput` (`value` chaîne, `min`, `max`, `step`, `placeholder`, `invalid`, `disabled`, `ariaDescribedBy`), `SearchField` (`type="search"`, `placeholder`, `ariaLabel`, `ariaDescribedBy`, `iconSize` dans `ICON_SIZE`, `disabled`, icône décorative) et `Toggle` (`role="switch"`, `checked`, `onChange(checked)`, `ariaLabel` ou `ariaLabelledBy`) s'y insèrent.

### ToggleRow

Une ligne de réglage : un titre, une description et un `Toggle` à droite, nommé par le titre (`aria-labelledby`). `title`, `description`, `checked`, `onChange(checked)`, `disabled`. C'est la ligne « Autoriser les séries » ou « Limiter les votes » des paramètres de soirée.

### Section de réglages

`shared/components/SettingsSection.module.css` est une feuille sans composant : l'anatomie commune des pages du compte (`app/pages/account/`), de la section notifications et de l'import Letterboxd. Un consommateur l'importe à côté de son propre module et n'y ajoute rien : une classe qui manque se déclare ici.

| Classe | Rôle |
|---|---|
| `panelHead`, `panelHeading`, `saved` | en-tête du panneau : titre et pastille « Enregistré » (`AccountSavedChip`, un `Chip` `success` dans une région `role="status"`) |
| `card`, `cardTitle` | groupe de réglages, rendu par `<Card padding="none" elevation="sm">` avec la classe ; `cardTitle` est le libellé en capitales du groupe |
| `field` | un champ (`Field`) séparé du précédent par un trait |
| `row`, `rowMain`, `rowLabel`, `rowSub`, `rowIcon`, `rowFlush`, `rowSubFlush`, `noDivider` | une ligne libellé + sous-titre, icône facultative à gauche, action (`Button`, lien, `Toggle`) poussée à droite |
| `attention`, `attentionText` | bandeau d'alerte `--color-warning-*` dans un groupe, son action est un `Button size="sm" tone="warning"` |
| `dangerZone` | bloc `--color-error-*` des actions irréversibles, en bas de page |

Les boutons y prennent leurs tailles et tons de `Button`, la feuille n'en redéfinit aucun.

### Fiche film depuis une liste

`features/watchlist/components/LibraryMovieDetails.tsx` ouvre `MovieDetailsModal` pour un titre d'une liste (Ma liste, accueil, listes publiques, profil). `useLibraryMovieDetails` lit la cible dans l'URL (`?film=<id>` ou `?serie=<id>`, en `replace`, sans reset du défilement) et garde en mémoire la graine passée à `open` (titre, affiche, plateformes) pour peindre la fiche avant sa requête ; un lien profond sans graine charge tout depuis l'API. La cible venant de l'URL, **une page ne monte qu'un seul `LibraryMovieDetails`** : un second lirait la même cible et ouvrirait une seconde fiche.

### ChoiceGroup et ChoiceCard

Un choix exclusif entre des cartes, quand `SegmentedRadioGroup` est trop étroit (une carte porte un titre, une description, une vignette). `ChoiceGroup` (`id`, `value`, `onChange`, `ariaLabel` ou `ariaLabelledBy`) rend le `role="radiogroup"` et pilote flèches, Home et End ; seule la carte cochée est tabulable, la première quand rien ne l'est. `onSelect` (optionnel) est appelé quand une carte est activée, au clic ou par Entrée et Espace, jamais lors d'un déplacement par flèche : c'est ce qui ferme un popover (`ThemeField`) sans poser de gestionnaire de clic sur un conteneur.

| Prop de `ChoiceCard` | Type | Rôle |
|---|---|---|
| `value` | `string` | requis, la valeur remontée par `onChange` |
| `title`, `description` | `ReactNode` | le corps texte |
| `children` | `ReactNode` | une vignette, une image, avant le texte |
| `indicator` | `boolean` | dessine la puce ronde cochée |
| `layout` | `row` / `tile` | `tile` centre le contenu et porte le cadre de 2 px des grilles d'images |
| `dashed` | `boolean` | la carte « aucun de ces choix » |
| `ariaLabel` | `string` | `aria-label` quand le contenu ne nomme pas la carte |
| `disabled` | `boolean` | `--opacity-disabled`, les flèches la sautent |

Chaque carte est un `<button role="radio" aria-checked>`. C'est le mode de roue, les candidats Letterboxd, la grille d'avatars, la grille d'emojis du thème (`tile`, 44 px, le clic ferme le sélecteur, les flèches changent l'emoji sans le fermer) et les pastilles de couleur d'accent (`tile` rond de 44 px autour d'un disque de 28 px).

### Menu

`Menu` rend un déclencheur et son panneau : `triggerLabel`, `triggerIcon`, `triggerClassName`, `panelAriaLabel`, `panelClassName`, enfants sous forme de fonction `(close) => …`. Le déclencheur est un `Button` `sm` `secondary` qui passe en `soft` tant que le panneau est ouvert. Un déclencheur sur mesure (avatar, bouton à icône) garde le même comportement avec `useMenuState()` puis `MenuPanel {...menu.panelProps}` : c'est le menu du compte, celui de l'agenda et celui des cartes de soirée (`IconButton` `lg` `round` qui reçoit `{...menu.triggerProps}`). Échap ferme et rend le focus au déclencheur, focus visible en contour interne (`--outline-offset-inset`).

| Brique | Props | Rôle |
|---|---|---|
| `MenuPanel` | `ariaLabel`, `anchored`, attributs natifs de `<div>` | porte lui-même les flèches, Home et End entre ses `menuitem` non désactivés ; `anchored={false}` retire l'ancrage sous le déclencheur, pour un panneau porté par un portail ou posé en `fixed` (le menu des cartes film), qui garde son état d'ouverture local |
| `MenuItem` | `icon`, `href` (lien externe, `external` ouvre un nouvel onglet avec `rel="noopener noreferrer"`), `to` (route interne, rend un `<Link>`), `selected`, `tone` `default` / `danger`, `disabled`, `ariaLabel`, `title`, `aria-haspopup` | `disabled` rend un `<button disabled>` même avec `href` ou `to` ; `ariaLabel` et `title` quand le nom accessible diffère du texte ; `aria-haspopup` quand l'entrée ouvre une boîte de dialogue ; un libellé sans jambage est nudgé comme des petites capitales (`--text-optical-nudge-caps`, `hasDescenders` de `shared/components/opticalNudge.ts`) |
| `MenuLabel`, `MenuSeparator` | | titre de groupe et séparateur |

### Dropdown

Liste déroulante maison avec `role="listbox"`.

| Prop | Type | Rôle |
|---|---|---|
| `value`, `onChange` | | requis |
| `id` | `string` | identifiant du déclencheur, pour un `<label htmlFor>` |
| `options` | `{ value, label, disabled? }[]` | une option désactivée porte `aria-disabled`, les flèches la sautent |
| `placement` | `auto` / `bottom` / `top` | `auto` par défaut : la liste s'ouvre vers le haut quand la place manque dessous |
| `ariaLabel` | `string` | |
| `inline` | `boolean` | renonce à la pleine largeur du conteneur, pour un sélecteur posé dans une ligne (la langue du pied de page) |
| `disabled` | `boolean` | le déclencheur passe en `--opacity-disabled` |

### Tabs et TabPanel

Toute liste d'onglets du produit passe par là, y compris deux onglets dans une modale. Flèches et Home/End sautent les onglets désactivés, défilement horizontal avec fondus, onglet de 44 px.

| Prop | Type | Rôle |
|---|---|---|
| `idBase`, `active`, `onChange` | | requis |
| `tabs` | `{ key, label, icon?, iconOnly?, badge?, disabled? }[]` | `iconOnly` garde `label` comme nom accessible sans le dessiner ; `badge` rend un `CountBadge` `neutral`, recoloré par l'onglet actif et par la variante `pill` |
| `ariaLabel` | `string` | |
| `variant` | `underline` / `pill` | |

`TabPanel` (`idBase`, le même que celui de `Tabs`, `tabKey`, `active`) rend le panneau associé.

### SegmentedRadioGroup

Choix exclusif entre deux à cinq options courtes, `role="radiogroup"`, flèches, Home et End, seule l'option cochée est tabulable. C'est le sélecteur de thème, d'échelle de note et de mode de roue.

| Prop | Type | Rôle |
|---|---|---|
| `value`, `onChange` | | requis |
| `id` | `string` | préfixe des identifiants des options |
| `options` | `{ value, label, icon? }[]` | |
| `ariaLabel` ou `ariaLabelledBy` | `string` | au moins l'un des deux, le typage refuse un groupe sans nom |
| `size` | `md` / `sm` | |
| `iconOnly` | `boolean` | le libellé devient `aria-label` |
| `disabled` | `boolean` | toutes les options, `--opacity-disabled`, clavier inerte |

### Tooltip et InfoBubble

| Composant | Props | Rôle |
|---|---|---|
| `Tooltip` | `label` (le texte de la bulle), `placement` `top` / `bottom` / `left` / `right`, `delayMs`, `focusable`, `disabled` (ne rend pas la bulle) | apparaît au survol et au focus, jamais seul vecteur d'une information |
| `InfoBubble` | `label` (titre visible du panneau et nom du bouton d'aide), contenu en enfants | l'aide contextuelle d'un champ ou d'un réglage ; le panneau se place par `menuGeometry.ts` (320 px au plus, 8 px du bord), se ferme par son `LinkButton`, Échap ou un clic dehors |

### États de page

- `PageLayout` : le `<main id="main-content" tabIndex={-1}>`, cible du lien d'évitement ; `ref` transmis.
- `EmptyState` : `icon`, `title`, `titleTag` `p` / `h1` / `h2`, `message`, `actions`, `compact` (dans une rangée, une liste de modale).
- `ErrorState` : page entière (`PageLayout`) avec `code`, `title` en `h1`, `message` (`messageRole` `alert` / `status`), `actions`.
- `InlineError` : l'erreur d'un bloc dans une page, voir plus haut.
- `SignedOutState` : `EmptyState` avec connexion et inscription qui reviennent sur `returnTo` ; trace `signed_out_cta_clicked`.
- `ServerErrorPage` : `ErrorState` 500, `onRetry` optionnel, message d'erreur masqué en production.
- `Skeleton` (`variant` `text` / `circle` / `poster` / `block`, `width`, `height`, `style`) et `SkeletonScreen` (`label`, texte masqué visuellement, `role="status"`, `aria-busy`, `style`).
- `ErrorBoundary` : attrape les erreurs de rendu et affiche `ServerErrorPage`.

### Divers

- `Avatar` : `avatarId`, `pseudo`, `size` `xs` / `sm` / `md` / `lg` / `xl` (`--avatar-*`). Sans identifiant, initiales sur l'une des huit couleurs `--color-avatar-*`, choisie par le pseudo ; sans pseudo, pastille vide. Toujours décoratif (`aria-hidden`), le nom est porté par le texte voisin. Les tailles sont déclarées en `:where()` : un module qui doit redimensionner un avatar pose `width` et `height` sur sa propre classe, sans `!important`.
- `AvatarStack` : `people` (`{ key, avatarId, pseudo }`), `max` (3), `hidden` quand la liste n'est qu'un échantillon, `size` `xs` / `sm`, `ariaLabel`. Avatars chevauchés d'un quart, anneau `--avatar-stack-ring` (le fond de page par défaut, la surface ou l'anneau d'affiche via une classe), pastille « +N » pour le reste. Décoratif sans `ariaLabel`, `role="img"` avec.
- `EventLifecyclePill` : `lifecycle` `upcoming` / `live` / `pending` / `finished`, `label`, `detail` ; seul `live` pulse (`StatusDot pulsing`). Consomme `--color-badge-*`, comme `Chip` `pending`.
- `ViewModeToggle` : barre d'outils grille / liste, `aria-pressed` sur le mode courant, boutons de 28 px à zone tactile étendue.
- `InstallPwaDialog` : `open`, `mode` `ios` / `in_app` / `generic`, `onClose` ; le guide d'ajout à l'écran d'accueil qu'ouvre `usePwaInstallClick`, depuis le pied de page, le menu du compte et la section notifications.
- `QrCode` : `value`, `title` ; SVG de 240 px.
- `readCssToken(nom, élément?)` (`shared/utils/cssToken.ts`) : la valeur calculée d'un jeton, pour ce qui dessine hors du CSS (canvas de la roue, confettis).

## Tests

Chaque composant partagé a son fichier `*.test.tsx` à côté de lui. Un test de composant vérifie le rôle et le nom accessible, les états (`disabled`, `aria-pressed`, `aria-busy`, `aria-checked`) et les classes de variante via l'import du module CSS, jamais un nom de classe en dur. Les contrastes des rôles de couleur sont vérifiés par `styles/foundationContrast.test.ts` (voir « Rôles de couleur »).
