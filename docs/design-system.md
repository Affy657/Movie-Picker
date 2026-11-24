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
| Typographie | `--font-size-4xs` à `--font-size-7xl` (le dernier pour les grands numéros du top 10 d'Explorer), `--font-size-page-title` ; `--font-weight-regular/medium/semibold/bold/extrabold` ; `--leading-none` (1), `-tight` (1,2), `-snug` (1,35), `-normal` (1,4), `-comfortable` (1,5), `-relaxed` (1,6) ; `--tracking-tighter` (-0,03 em), `-tight` (-0,02), `-snug` (-0,01), `-slight` (0,01), `-wide` (0,03), `-wider` (0,06), `-widest` (0,12) ; `--font-body`, `--font-mono` | aucune valeur littérale de taille, de graisse, d'interlignage ou d'approche dans un module ; un `font-size` est un jeton ou un `clamp()` de jetons |
| Rayons | `--radius-xs` (4 px), `-sm` (6 px), `-md` (12 px), `-lg` (18 px), `-pill` | |
| Bordures | `--border-width-field` (1,5 px) | tout autre trait fait 1 px ou 2 px, en littéral |
| Focus | `--outline-focus` (contour), `--outline-offset` (2 px), `--outline-offset-inset` (-2 px, contour intérieur d'un menu ou d'une ligne), `--ring-focus` (halo pour les champs) | un `:focus-visible` qui retire le contour pose le halo, jamais un simple fond |
| Géométrie des panneaux | `MENU_VIEWPORT_MARGIN_PX` (8), `MENU_ANCHOR_GAP_PX` (6), `INFO_PANEL_MAX_WIDTH_PX` (320) dans `shared/components/menuGeometry.ts` | les seuls pixels écrits en TypeScript pour positionner un panneau flottant (`Menu`, `InfoBubble`) ; les deux premiers recopient `--space-2` et `--space-1-5` |
| Ombres | `--shadow-sm/md/lg`, `--shadow-nav`, `--shadow-hero-card`, `--shadow-wheel` | en sombre l'élévation se lit sur `--color-surface-raised`, pas sur l'ombre ; `--shadow-nav` change de valeur en sombre |
| Filtres | `--backdrop-blur-bar` (barres collantes), `--backdrop-blur-overlay` (voiles), `--filter-streak-glow`, `-strong` | un flou ou une ombre portée écrits en longueur dans un `filter` ou un `backdrop-filter` sont refusés, ils passent par ces jetons |
| Mouvement | `--duration-instant` (0,01 ms), `--duration-fast` (0,10 s), `--duration-base` (0,15 s), `--duration-slow` (0,20 s), `--duration-enter` (0,25 s), `--duration-sheet` (0,32 s), `--duration-reveal` (0,6 s), `--duration-spin` (0,8 s), `--duration-pulse` (1,2 s), `--duration-shimmer` (1,4 s), `--duration-breathe` (2,4 s) ; `--ease-default/in-out/out/linear/reveal/spring` | chaque étape de `transition` porte sa durée et sa courbe, un `*-delay` aussi ; `--duration-instant` est la remise à zéro de `prefers-reduced-motion` ; une boucle décorative propre à un composant déclare son propre jeton dans son module (`--flame-flicker-duration`), un décalage de phase aussi (`--card-shake-stagger-*`, `--demo-float-offset`) |
| Opacité | `--opacity-disabled` (0,5), `--opacity-muted` (0,6), `--opacity-hover` (0,8), `--opacity-dimmed` (0,85), `--opacity-poster-glow` (0,35 en clair, 0,55 en sombre) | état désactivé, contenu secondaire, fondu au survol, `aria-busy`, halo d’affiche ; un littéral n'est admis que dans une étape de `@keyframes` |
| Couleurs | primitives réservées à la fondation et à `landingPalette.css` : teintes (`--blue-600`…), neutres `--white`, `--black`, `--slate-50` à `-900`, `--night-950` à `-600` (les fonds sombres) ; rôles `--color-*` consommés par les modules ; `--color-heat-0`, `-2` et `-3` pour le rythme des soirées du profil (mois, jours de la semaine) | tableau des rôles ci-dessous ; une couleur littérale (hexadécimal, `rgb()`, `hsl()`, `oklch()` et les autres notations, nom de couleur quelle que soit sa casse) n'apparaît dans aucune feuille hors des déclarations de jetons de la fondation et de `landingPalette.css`, et dans aucun fichier TypeScript hors du logo des technologies, des boutons OAuth et du QR code |
| Teintes de surface | `--color-surface-hover` (6 %), `-hover-strong` (10 %), `-active` (12 %), `-sunken`, `-translucent`, `--color-bg-tint`, `--color-bg-translucent`, `--color-bg-scrim` (80 %), `--color-bg-veil` (35 %) | remplacent tout `color-mix()` maison sur le texte, le fond ou la surface |
| Sur affiche | `--color-on-poster-*` | texte, bordures et voiles posés sur une image sombre |
| Roue | `--color-wheel-0` à `-11` (segments), `--color-wheel-label`, `-label-shadow`, `-divider`, `-hub`, `-hub-stroke`, `-hub-shadow`, `-pointer`, `-pointer-stroke`, `-pointer-shadow` | le canvas les lit par `readCssToken` (`shared/utils/cssToken.ts`) au moment de dessiner, les confettis et la démo de la page d'accueil aussi |
| Série | `--color-streak`, `-soft`, `-bg`, `-border`, `-fg`, `--color-streak-flame-base`, `-middle`, `-tip` | la pastille de série du profil, visible seulement quand la série est en cours |
| Pastilles d'accent | `--color-accent-swatch-*` | la couleur d'aperçu de chaque accent dans le sélecteur, indépendante de l'accent actif |
| Dégradés | `--gradient-accent` (barre d'accent des cartes de formulaire), `--gradient-hero` (fonds sombres de la page d'accueil et de `/tech`) | |
| Profondeur | `--z-below` à `--z-skip-link` | jamais un nombre, ni en CSS ni dans un objet `style` |
| Largeurs | `--container-xs` (28 rem), `-sm` (32), `-md` (36), `-lg` (40), `-xl` (56), `-2xl` (64), `-3xl` (72), `-4xl` (84) ; `--layout-max` (`--container-lg`, la largeur de page par défaut, qu'une page change en posant `--page-max-width`), `--layout-max-landing` (`--container-3xl`, consommé tel quel par la page d'accueil et `/tech`) | les tailles de `Modal` portent les mêmes noms |
| Zone tactile | `shared/components/tapTarget.module.css`, classe `expanded` | `composes: expanded from '@/shared/components/tapTarget.module.css'` pose `position: relative` (dans la couche `@layer tap-target`, donc un `position: absolute` écrit dans la classe qui compose garde la main, quel que soit l'ordre d'émission des feuilles) et un `::after` de 44 px centré ; c'est ce qu'utilisent `Button` `sm`, `IconButton`, `LinkButton`, `BackLink`, `Chip` cliquable et sa croix, `Toggle`, `ViewModeToggle`, `SegmentedRadioGroup` et tout contrôle dessiné sous 44 px |
| Typographie composée | `shared/components/typography.module.css`, classes `pageTitle`, `overline` et `sectionLabel` | `composes: pageTitle from '@/shared/components/typography.module.css'` pour tout `<h1>` de page (taille `--font-size-page-title`, extra-gras, approche serrée), sauf le titre de l'accueil connecté, que la coquille de démarrage peint à sa propre taille (contrainte C2 de `docs/technical-debt.md`) ; deux libellés en capitales grasses : `overline` (`--tracking-widest`) pour un surtitre au-dessus d'un titre ou d'un message (code d'erreur, bandeau d'information, sections de l'accueil), `sectionLabel` (`--tracking-wider`) pour l'intitulé d'un groupe (colonne du pied de page, groupe de réglages, de filtres ou de menu, en-tête de tableau) ; les trois vivent dans `@layer typography`, la classe qui compose peut donc surcharger une propriété (la taille d'un titre de carte) |

### Rôles de couleur

Chaque rôle porte sa déclinaison, en clair, en sombre et sous `.on-dark` ; un module consomme le jeton de la déclinaison, jamais un `color-mix()` maison (règle vérifiée par `check:architecture`, voir `AGENTS.md`).

| Rôle | Surface | Texte | Fond léger | Bordure |
|---|---|---|---|---|
| primaire (accent choisi par l'utilisateur) | `--color-primary`, `-hover` | `--color-primary-text`, `-text-hover` ; `--color-primary-contrast` sur la surface | `--color-primary-tint`, `-soft`, `-soft-hover` ; `--color-primary-glow` pour la tache d'accent derrière le haut de la page soirée | `--color-primary-border`, `-border-soft` |
| erreur, succès, avertissement | `--color-error`, `--color-success`, `--color-warning` | idem | `--color-<rôle>-bg` | `--color-<rôle>-border` |
| texte | | `--color-text`, `--color-text-muted` (secondaire), `--color-text-subtle` (métadonnées : date, durée, compteur) | | |
| marque secondaire | `--color-brand-secondary` | `--color-brand-secondary-text` (surtitre du thème d’une soirée) | `--color-brand-secondary-bg`, `-glow` | `--color-brand-secondary-border` |
| états de soirée | | `--color-badge-<état>-text` | `--color-badge-<état>-bg` | `--color-badge-<état>-border` |
| teintes neutres | `--color-surface-hover` (6 %), `-hover-strong` (10 %), `-active` (12 %), `-sunken`, `-translucent`, `--color-bg-tint`, `--color-bg-translucent`, `--color-bg-scrim`, `--color-bg-veil` | | | |
| note d'un film (étoiles pleines, pastille de note) | `--color-rating` (ambre, identique en clair, en sombre et sous `.on-dark`) | | | |

`--color-primary-text` existe parce que `--color-primary` colore des surfaces : la déclinaison texte de chaque accent tient 4,5:1 sur le fond, la surface, le fond léger et la teinte, en clair comme en sombre.

Trois portées de thème : `[data-theme='light']`, `[data-theme='dark']` et `.on-dark` (un bloc sombre posé dans une page claire, la carte d'accueil par exemple). Une zone `.accent-<couleur>` (`accentZoneClass` de `shared/utils/accentColor.ts`) repose l'accent d'un membre et ses déclinaisons sur une partie de page, quel que soit l'accent du visiteur : le profil public d'un membre, l'anneau de son avatar en soirée ; `.accent-default` ramène le bleu de l'application. C'est une classe, pas un `[data-accent]` posé ailleurs qu'à la racine, pour que le repli `color-mix()` des vieux Safari la suive. Un rôle ajouté au clair se déclare dans les trois. Les teintes neutres, les bordures des badges et le dégradé d'accent se calculent une fois dans le bloc commun `:root, .on-dark` et suivent leur source dans chaque portée ; les fonds et bordures d'état (`-bg`, `-border`) et les déclinaisons d'accent (`-tint`, `-soft`, `-soft-hover`, `-border`) sont redosés dans chaque portée, parce que le même pourcentage ne donne pas le même contraste sur fond clair et sur fond sombre.

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
| `tone` | `default` / `danger` / `warning` | `default` | couleur sémantique, cumulable avec la variante : en contour, la bordure prend la couleur ; en `ghost`, seul le texte la prend (« Supprimer la soirée », « Quitter » au pied d'une fenêtre) ; `warning` pour l'action qui répond à une alerte (confirmer les films Letterboxd non identifiés) |
| `size` | `sm` / `md` / `lg` | `md` | `lg` pour les appels à l'action de la page d'accueil |
| `fullWidth` | `boolean` | `false` | occupe la largeur du conteneur (soumission d'un formulaire) |
| `loading` | `boolean` | `false` | désactive, pose `aria-busy` et un `Spinner` devant le libellé ; le libellé reste |
| `type` | | `button` | à poser à `submit` explicitement |

Les enfants texte qui se suivent (`Proposer ({count})`) sont réunis dans un seul libellé centré optiquement (`--text-optical-nudge`, ou `-caps` sans jambage), les blancs seuls sont ignorés ; un appelant n'ajoute jamais de `<span>` de décalage. États : repos, survol (sous `(hover: hover)`, soulèvement `--lift-sm` annulé sous `prefers-reduced-motion`), focus (`--outline-focus`), désactivé (`--opacity-disabled`), inerte (`aria-disabled` : le rendu du désactivé, mais le bouton garde le focus et ignore le clic, soumission comprise ; pour une action indisponible un instant, comme pendant une animation), chargement (`--opacity-dimmed`). Hauteur minimale `--tap-target-min` ; `sm` dessine 40 px et étend sa zone tactile à 44 px.

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

Avec `aria-expanded="true"` (le déclencheur d'un menu ouvert), le bouton prend le fond et la couleur du `Button` `soft`, sauf en `onPoster`.

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
| `leading` | `ReactNode` | un dessin posé avant le texte, hors du décalage optique : la pile d'avatars de la pastille des membres d'une liste |
| `trailingIcon` | composant Lucide | une icône après le texte, décorative (`aria-hidden`) : le chevron d'une pastille qui ouvre une fenêtre |
| `dot` | `boolean` / `'pulsing'` | un `StatusDot` devant le texte, qui pulse pour un état en cours (enregistrement) |
| `dashed` | `boolean` | bordure pointillée : une place à prendre (inviter), une étape à venir |
| `onClick`, `selected`, `ariaLabel`, `disabled` | | forme action ; `selected` pose le style plein et `aria-pressed`, laissé `undefined` le bouton est une action, pas un interrupteur |
| `onRemove`, `removeAriaLabel` | | forme retirable : croix de retrait, zone tactile de 44 px |
| `href`, `external`, `ariaLabel` | | forme lien : un `<Link>` du routeur pour une route de l'application, un `<a>` qui ouvre un nouvel onglet avec `rel="noopener noreferrer"` quand `external` est posé |
| `data-testid` | `string` | |

Chaque forme refuse au typage les props des autres (une étiquette ne prend ni `ariaLabel` ni `selected` : un nom accessible sur un `<span>` n'est pas lu, le texte masqué visuellement le remplace). Les tons sémantiques consomment les rôles (`--color-success-bg`…) ; `pending` garde son jeton propre `--color-badge-pending-*`. Le centrage optique du texte est intégré (`--text-optical-nudge`). Seul le texte est décalé : `leading`, `icon` et `trailingIcon` restent centrés par `align-items: center`.

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

`Modal` compose `Card` (`elevationLg`). Les panneaux flottants (`MenuPanel`, la liste de `Dropdown`, `InfoBubble`, le sélecteur d'emoji de `ThemeField`, l'historique de recherche) composent `surface` de `shared/components/popover.module.css`, qui pose la même carte élevée, la couche `--z-popover` pour passer au-dessus des barres fixes et de la barre du bas, et une entrée en fondu de `--duration-base` (`popoverEnter`, retirée sous `prefers-reduced-motion`) ; seul `Tooltip` reste sur `--z-tooltip`. Une surface de carte locale (soirée en attente, carte film en liste, groupe de réglages, table des films) rend `<Card padding="none" elevation="sm" as=…>` avec sa classe, elle ne redessine ni le fond ni la bordure.

### Modal

Seul endroit du projet où `<dialog>` et `::backdrop` sont écrits. Fermeture par Échap, clic sur le voile et bouton de fermeture ; le `<dialog>` natif retient le focus et le rend à l'ouvreur. Tant qu'un `<dialog>` est ouvert, la page derrière ne défile plus (`html:has(dialog[open])` dans `01-foundation.css`) : la gouttière de `scrollbar-gutter: stable` reste réservée, donc rien ne saute à l'ouverture. Un navigateur sans `:has()` ignore la règle et garde le défilement, comme avant.

| Prop | Type | Note |
|---|---|---|
| `open`, `onClose` | requis | |
| `title` (+ `titleId`, `titleDetail`), ou `ariaLabelledBy`, ou `ariaLabel` | | exactement un des trois nommages, le typage refuse les autres combinaisons et un titre vide (`title` est un texte ou un élément) ; `title` rend la barre de titre `DialogTitleBar`, `titleDetail` s'affiche sur la ligne du titre, aligné sur sa ligne de base, et passe dessous si la place manque (un compte, l'état d'enregistrement, la progression d'un parcours) |
| `ariaDescribedBy` | `string` | |
| `size` | `xs` / `sm` / `md` / `lg` / `xl` / `2xl` | `--container-<size>`, `sm` par défaut ; `xl` pour une fenêtre en deux colonnes (nouvelle soirée, paramètres) |
| `surface` | `surface` / `bare` / `media` / `borderless` | `media` pour une bande-annonce, qui pose aussi `on-dark` : titre et croix restent lisibles en thème clair |
| `padded`, `column`, `anchoredTop`, `strongBackdrop` | `boolean` | `column` sépare aussi la barre de titre du corps par un filet |
| `fixedHeight` | `md` / `lg` | avec `column`, une hauteur qui ne suit plus le contenu (`min(85dvh, 34rem)` ou `min(85dvh, 44rem)`) : changer d'onglet ou de sous-vue ne fait plus sauter la fenêtre |
| `titleSlots` | `{ leading?, actions?, replacement?, below? }` | ce que la barre de titre porte en plus : la flèche retour d'une sous-vue avant le titre, des boutons avant la croix, un contenu qui prend toute la ligne (un champ de recherche), des onglets sous le titre |
| `closeAriaLabel` | `string` | nom du bouton de fermeture, « Fermer » par défaut |
| `onEscape` | `() => boolean` | reçoit Échap avant la fenêtre ; renvoyer `true` dit que la touche est traitée et garde la fenêtre ouverte (le retour d'une sous-vue), `false` laisse Échap fermer ; `Sheet` et `ResponsiveDialog` le transmettent |

`data-testid` se pose sur le `<dialog>`, `dialogRef` en donne la référence à l'appelant. Une modale à titre passe par `title`, jamais par une barre de titre recopiée dans ses enfants. La fenêtre entre en fondu avec un léger glissement (`dialogEnter`, voile en `backdropEnter`), retirés sous `prefers-reduced-motion` ; la `Sheet` garde sa propre entrée. À l'ouverture, `showModal()` donne le focus au premier élément focalisable, la croix d'une modale à titre ; un descendant marqué `data-autofocus` le prend à sa place (l'`autoFocus` de React tombe avant `showModal()`, quand le `<dialog>` est encore fermé, et ne sert à rien ici).

Trois briques donnent à toutes les modales le même corps et le même pied, exportées par `Modal.tsx` :

| Brique | Rôle |
|---|---|
| `ModalBody` | corps qui défile entre la barre de titre et le pied (`flex: 1 1 auto; min-height: 0`), marges `--space-4` `--space-5` `--space-5` ; avec `column` dès que le contenu peut dépasser l'écran |
| `ModalFooter` | pied hors du défilement, filet `--color-border-subtle` au-dessus, marges `--space-3` `--space-5`, sans fond propre |
| `ModalActions` | la rangée de boutons : alignée à droite, `--space-2-5` entre les boutons, retour à la ligne si la place manque, boutons étirés à parts égales sous 48 rem ; Annuler (`secondary`) à gauche, l'action principale à droite, tous en taille `md`, `ghost` réservé à une troisième action (« Passer », « Plus tard ») |

Ont leur propre en-tête, et seulement eux : les dialogues d'alerte sans croix (`ConfirmDialog`, `ConsentDialog`, titre `--font-size-xl`) et les dialogues sur affiche (`WheelModal`, `MovieRatingDialog`), dont la croix reste un `IconButton` à icône `lg` comme celle de `DialogTitleBar`.

Dialogues déjà câblés dessus :

- `ConfirmDialog` : `title`, `message`, `onConfirm`, `onCancel`, `confirmLabel`, `cancelLabel`, `confirmTone` `danger` par défaut ou `default` pour une confirmation non destructive, `loading` met le bouton en chargement (Annuler reste actif), `hideCancel` pour un accusé de lecture, `testId`. Le focus d'ouverture va sur Annuler quand l'action est destructive, pour qu'Entrée ne confirme pas une suppression, et sur Confirmer sinon.
- `ShareDialog` : une seule page sans onglets. `title`, `url`, `qrTitle` (titre de la vue agrandie), `card` (`name`, `detail` sous le grand QR), `qrImage` (l'image 1080 × 1350 dessinée par le moteur des stories : `status`, `blob`, `retry`), `imageFileName`, `shareText`, `analyticsSurface` `event` / `profile`, `identity` (la personne au-dessus du bloc QR, partage d'un profil), `extraView` (une sous-vue propre à l'appelant, la Story du recap : bouton, titre, corps, pied), `onViewChange`, `fixedHeight`, et en enfants ce qui vient sous le bloc QR (les amis à inviter). En haut, le QR petit qui s'agrandit, le lien, « Copier le lien » et « Enregistrer le QR » ; sur téléphone avec partage natif, « Partager » passe en premier et la copie entre dans le champ. La vue « QR code » a sa flèche retour sur grand écran et passe en plein écran sur téléphone. Entrer dans une sous-vue met le focus sur sa flèche retour, en sortir le rend au bouton qui l'avait ouverte, et Échap y revient à la vue principale au lieu de fermer. Une image qui n'a pas pu être dessinée (QR non chargé compris) n'est jamais enregistrée : le bouton devient « Réessayer » sous une ligne d'erreur. Avec `fixedHeight`, la liste sous le lien garde au moins deux lignes et la page entière défile quand l'écran est trop bas. La vue revient à la principale dès la fermeture.
- `ConsentDialog` : `open`, `onClose` ; la modale de consentement lit et écrit `useConsent()` elle-même.
- `DialogTitleBar` (`titleId`, `title`, `detail`, `onClose`, `closeAriaLabel`, `leading`, `actions`, `replacement`, `divided`, enfants sous la ligne du titre) : une ligne de 44 px où le titre et son détail se centrent sur la croix, croix `IconButton` `lg` de 44 px ; `replacement` garde le titre pour les lecteurs d'écran (`visually-hidden`) et retire la croix, le contenu de remplacement porte sa sortie (« Annuler ») ; `divided` pose le filet du bas.

### Sheet

Feuille ancrée en bas, glissable : le geste est `useSheetDrag` (`shared/hooks/`), `SheetDrag.module.css` porte la surface, la poignée et les animations d'entrée (`sheetEnter`, `sheetBackdropEnter`, retirées sous `prefers-reduced-motion`). `open`, `title`, `detail` (sur la ligne du titre), `onClose`, `footer`, `size` `md` / `lg`, `fixedHeight` (la feuille garde sa hauteur maximale), `titleSlots` (comme `Modal`), `bodyClassName`. Son en-tête est `DialogTitleBar`, toujours séparé du corps par un filet, dans la zone qu'on peut saisir pour glisser (un bouton, un champ ou un onglet ne lance pas le geste). La poignée ne se montre que sous 48 rem, là où le geste existe. Son corps prend toute la hauteur libre (`flex: 1 1 auto; min-height: 0`), donc le pied reste en bas même quand le contenu est court, et pose `overscroll-behavior: contain` : arrivé en butée, le geste ne passe pas à la page. Le pied est une rangée `space-between` : une rangée d'actions qui doit occuper toute la largeur passe par `ModalActions`.

### ResponsiveDialog

Le dialogue qui est une `Sheet` sur téléphone et une `Modal` en colonne sur grand écran, avec le même contenu : `open`, `title`, `detail` (sur la ligne du titre dans les deux formats, dessous si la place manque), `onClose`, `footer`, `ariaDescribedBy` (la description accessible, dans les deux formats), `size` (la taille de la `Modal`, `sm` par défaut), `sheetSize` (`md` par défaut), `fixedHeight` (`md` / `lg` sur grand écran, hauteur maximale de la feuille sur téléphone), `leading` (la flèche retour d'une sous-vue), `headerActions` (une loupe avant la croix), `headerReplacement` (ce qui prend la ligne du titre, un champ de recherche), `tabs` (des onglets `pill` fixés sous le titre, hors du défilement), `className`, `bodyClassName`. Sur grand écran, le corps et le pied sont `ModalBody` et `ModalFooter`, et sans `footer` il n'y a pas de pied. Un formulaire dont le bouton d'envoi est dans `footer` pose un `id` sur son `<form>` et `form={id}` sur le bouton. C'est la création de soirée, la création et les membres d'une liste, la pioche dans la watchlist, la proposition d'un film, « Proposer une idée » et « Signaler un problème » : aucune autre fenêtre ne devient feuille sur téléphone sans passer par lui. Les fenêtres à onglets (abonnés et abonnements) y passent aussi : les onglets vont dans `tabs`, jamais dans le corps.

### Notice

Le bandeau d'information flottant : `title`, `description`, `placement` `top` (défaut, glisse du haut) / `bottom` (glisse du bas), `onClose` (sans lui, pas de croix : le bandeau attend une décision), `closeAriaLabel` pour nommer la croix dans la langue d'un contenu qui n'est pas celle de l'interface (la suggestion de l'anglais), les actions en enfants, pleine largeur sur mobile. C'est le consentement, l'avertissement du navigateur intégré et celui de l'ancienne adresse, et la confirmation d'une soirée rejointe (`JoinedNotice`, qui se retire seule après huit secondes). Les bandeaux du haut de la coquille passent un par un : chacun demande son tour par `useTopNoticeTurn(id, wanted)` (`app/components/topNoticeQueue.ts`), et `TopNoticeQueueProvider`, posé dans `AppShell`, n'en montre qu'un, le premier de `TOP_NOTICE_ORDER` (session expirée, déconnexion en attente, compte supprimé, navigateur intégré, ancienne adresse, suggestion de l'anglais) ; le suivant paraît quand il est fermé. Un nouveau bandeau du haut s'ajoute à cette liste.

### FormPageShell

La page d'un formulaire seul : `back` (`to`, `label`) rend le `BackLink`, puis une `Card` `lg` élevée avec sa barre `--gradient-accent`, le `<h1>` (`title`, `pageTitle`) et `description`, puis les enfants. C'est la connexion, l'inscription, le mot de passe oublié et sa réinitialisation. La création de soirée, elle, est une fenêtre (`CreateEventDialog` sur `ResponsiveDialog`), ouverte depuis l'en-tête, la barre du bas ou l'adresse `/new`.

### InlineError

L'erreur d'un bloc qui n'a pas chargé, dans la page : `message`, `retryLabel`, `onRetry`, `messageRole` `alert` (défaut) / `status`. Icône `AlertCircle`, bouton `sm` de nouvel essai. `status` quand plusieurs blocs peuvent échouer ensemble (les rangées de l'accueil) : une alerte par rangée ferait lire le même message six fois. Une erreur de page entière reste `ErrorState`. Après un 429 qui porte `Retry-After`, le bouton reste désactivé et décompte le délai (« Réessayer dans 30 s ») : `fetchApi` le note dans `shared/api/rateLimitCooldown.ts`, que lit `useRateLimitCooldownMs`.

### Field

Câble `label`, `hint`, `error` et `aria-describedby` autour d'un champ rendu par la fonction enfant : `children({ id, labelId, describedBy, invalid })`, où `labelId` est l'identifiant du `<label>`, pour un champ qui se nomme par `aria-labelledby` (`Dropdown`). L'erreur porte `role="alert"` et son icône `AlertCircle` ; quand une erreur et une aide sont données, l'erreur passe en premier. `htmlFor` impose l'identifiant du champ quand l'appelant le connaît déjà. Tout `<label>` de formulaire du produit passe par là : un `<label className="label">` écrit à la main perd le câblage de l'aide. Un groupe (radiogroup, interrupteur) prend un `<span className="label" id>` et `ariaLabelledBy` à la place.

Le skin de champ est la classe globale `.input` de `02-forms-and-content.css` : bordure `--color-border-field`, corps `--font-size-md`, survol, `:focus` en `--ring-focus`, `:disabled` en `--opacity-disabled`. `SearchField`, `NumberInput` et `PasswordInput` la portent, ils n'en redessinent rien.

`PasswordInput` est le champ de mot de passe : il prend tous les attributs d'un `<input>` sauf `type`, et pose à droite un `IconButton` « Afficher le mot de passe » (`aria-pressed`, `aria-controls` vers le champ) qui bascule entre `password` et `text`. Le libellé du bouton ne change pas, c'est `aria-pressed` qui dit l'état. Un formulaire de compte le combine avec `noValidate` et des erreurs passées à `Field`, jamais avec les bulles natives du navigateur, qui parlent sa langue et pas celle du produit.

`NumberInput` (`value` chaîne, `min`, `max`, `step`, `placeholder`, `invalid`, `disabled`, `ariaDescribedBy`, et `unlimited` (`label`, `fallback`) pour une limite facultative : la valeur vide s'affiche « Sans limite », se place au-dessus de `max`, et « − » la ramène à `fallback`), `SearchField` (`type="search"`, `placeholder`, `ariaLabel`, `ariaDescribedBy`, `iconSize` dans `ICON_SIZE`, `disabled`, `ref` vers le champ pour y rendre le focus, icône décorative) et `Toggle` (`role="switch"`, `checked`, `onChange(checked)`, `ariaLabel` ou `ariaLabelledBy`) s'y insèrent.

### DateTimePicker

Une seule entrée pour le jour et l'heure (« Jeudi 26 novembre, 20:30 »). `id`, `label`, `value` (`{ date, time }`), `onChange`, `today` (obligatoire, le jour dans le fuseau de la soirée), `min`, `max`, `invalid`, `disabled`, `ariaLabelledBy`, `ariaDescribedBy`. Sur grand écran, un panneau `useFixedPopover` au style de `Dropdown` : le mois (semaine du lundi au dimanche, jours hors de `min` et `max` désactivés) et la liste des heures par demi-heure, avec une saisie libre (« 20h30 », « 2030 »). Sur téléphone, une `Sheet` « Date et heure » avec la même saisie libre devant la rangée des heures, et « Valider ». Au clavier, un seul jour et une seule heure sont dans l'ordre de tabulation : flèches entre les jours, Début et Fin pour la semaine, Page précédente et Page suivante pour le mois, flèches entre les heures ; changer de mois par ses boutons garde le même numéro de jour. Le sélecteur n'enregistre rien lui-même : l'appelant valide la valeur quand il le veut (les paramètres d'une soirée attendent que le focus quitte le bloc Date et heure, pour laisser décocher « Prévenir les participants »). Les messages (date passée, trop ancienne, heure de Paris) restent sous le champ, posés par l'appelant.

### ToggleRow

Une ligne de réglage : un titre, une description et un `Toggle` à droite, nommé par le titre (`aria-labelledby`). `title`, `description`, `checked`, `onChange(checked)`, `disabled`. C'est la ligne « Autoriser les séries » ou « Limiter les votes » des paramètres de soirée, et les interrupteurs « À voir » et « Films vus » de la carte Letterboxd des réglages.

### Section de réglages

`shared/components/SettingsSection.module.css` est une feuille sans composant : l'anatomie commune des pages du compte (`app/pages/account/`), de la section notifications et de l'import Letterboxd. Un consommateur l'importe à côté de son propre module et n'y ajoute rien : une classe qui manque se déclare ici.

| Classe | Rôle |
|---|---|
| `panelHead`, `panelHeading`, `saved` | en-tête du panneau : titre et pastille « Enregistré » (`AccountSavedChip`, un `Chip` `success` dans une région `role="status"`) |
| `card`, `cardTitle` | groupe de réglages, rendu par `<Card padding="none" elevation="sm">` avec la classe ; `cardTitle` est le libellé en capitales du groupe |
| `field` | un champ (`Field`) séparé du précédent par un trait |
| `row`, `rowMain`, `rowLabel`, `rowSub`, `rowIcon`, `rowSubFlush`, `noDivider` | une ligne libellé + sous-titre, icône facultative à gauche, action (`Button`, lien, `Toggle`) poussée à droite |
| `attention`, `attentionText` | bandeau d'alerte `--color-warning-*` dans un groupe, son action est un `Button size="sm" tone="warning"` ; c'est aussi, hors des réglages, le bandeau de « À voir » qui compte les films absents de la watchlist Letterboxd |
| `dangerZone` | bloc `--color-error-*` des actions irréversibles, en bas de page |

Les boutons y prennent leurs tailles et tons de `Button`, la feuille n'en redéfinit aucun.

### Page d'un film ou d'une série

`app/pages/movie/MoviePage.tsx` sert `/film/<id>-<titre>` et `/serie/<id>-<titre>` (`ROUTES.moviePage`), en `noindex`. Un titre d'une liste (accueil, Explorer, Ma liste, profil, soirée) l'ouvre par `useOpenMoviePage(seed, nightSlug?)`, qui empile une entrée d'historique portant l'état `{ fromApp: true, seed }` : la graine (titre, année, affiche, note, genres) peint le haut de la page avant la requête des détails, et le retour repasse par l'historique tant que `fromApp` est posé, sinon il mène à la soirée ou à l'accueil. Un lien profond sans graine montre des `Skeleton` à la place du titre et du synopsis, et garde Proposer, À voir, Je l'ai vu, les listes et Partager désactivés tant que le titre n'est pas connu. Connecté, « Je l'ai vu » (`WatchedToggle` de `features/library`) suit « À voir » : il devient « Vu » (`soft`, `aria-pressed`) pour un film vu ailleurs, qu'un clic retire aussitôt, et cède la place au texte « Vu en soirée le 12 oct. », lien vers la soirée, pour un film vu en soirée ; « Votre note » (`WatchedRating`) se pose alors à côté de la note TMDB, modifiable pour un film vu ailleurs, en lecture seule pour la note de soirée. Un échec de chargement avec graine garde la graine et propose de réessayer par `InlineError` ; sans graine, la page entière passe en `ErrorState`, avec un retour à l'accueil sur un 404. `?soiree=<slug>` ajoute `MovieNightBar` (vote, déjà vu, exclusion du tirage, retrait) à la place du bouton Proposer. Les anciens liens `?film=<id>` et `?serie=<id>` passent par `useLegacyMovieLinkRedirect`, monté dans `AppShell` : l'entrée courante devient la liste sans ce paramètre, puis la page du film est empilée, pour que Retour ramène à la liste.

### ChoiceGroup et ChoiceCard

Un choix exclusif entre des cartes, quand `SegmentedRadioGroup` est trop étroit (une carte porte un titre, une description, une vignette). `ChoiceGroup` (`id`, `value`, `onChange`, `ariaLabel` ou `ariaLabelledBy`) rend le `role="radiogroup"` et pilote flèches, Home et End ; seule la carte cochée est tabulable, la première quand rien ne l'est. `onSelect` (optionnel) est appelé quand une carte est activée, au clic ou par Entrée et Espace, jamais lors d'un déplacement par flèche : c'est ce qui ferme un popover (`ThemeField`) sans poser de gestionnaire de clic sur un conteneur. Un panneau en `position: fixed` hors d'un menu (`InfoBubble`, le sélecteur d'emoji de `ThemeField`) se place par `useFixedPopover` (`shared/hooks/useFixedPopover.ts`) et `fixedPopoverStyle`, jamais par un calcul recopié.

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

`Menu` rend un déclencheur et son panneau : `triggerLabel`, `triggerIcon`, `triggerClassName`, `panelAriaLabel`, `panelClassName`, enfants sous forme de fonction `(close) => …`. Le déclencheur est un `Button` `sm` `secondary` suivi d'un chevron, qui passe en `soft` tant que le panneau est ouvert ; `align` aligne le panneau comme `useMenuState`. Un déclencheur sur mesure (avatar, bouton à icône) garde le même comportement avec `useMenuState()` puis `MenuPanel {...menu.panelProps}` : c'est le menu du compte, celui de l'agenda et celui des cartes de soirée (`IconButton` `lg` `round` qui reçoit `{...menu.triggerProps}`). `useMenuState({ align: 'left' })` aligne le panneau sur le bord gauche du déclencheur au lieu du bord droit (le menu « Ajouter à une liste » de la fiche film, premier bouton de sa ligne). Échap ferme et rend le focus au déclencheur, focus visible en contour interne (`--outline-offset-inset`) ; `close()`, appelé par une entrée, le rend aussi, ce qui le laisse au déclencheur quand l'entrée ouvre une boîte de dialogue puis qu'elle se ferme. Le panneau s'ouvre sous son déclencheur, ou au-dessus quand la place manque en bas (`data-placement="top"`), et sa hauteur se plafonne à la place disponible, avec défilement (`useMenuVerticalFit`) : aucun menu ne recopie ce retournement. Le calcul ne voit que l'écran : un menu posé dans une barre fixée en bas sur téléphone (la barre de soirée, les actions du tirage) ou dans une rangée au pied d'une modale qui défile (l'agenda de l'invitation) demande `useMenuState({ placement: 'top' })`, qui l'ouvre toujours au-dessus. Un bouton à icône qui ouvre un menu prend l'état `soft` tant que `aria-expanded` est vrai, comme un `Button` déclencheur.

Un menu dont le panneau doit sortir d'un conteneur qui coupe (une carte en `overflow: hidden`, un tableau en `overflow: clip`) passe par `FixedMenu` : il rend lui-même son bouton déclencheur (`triggerContent`, `triggerAriaLabel`, `triggerClassName`), `children(close)` rend les entrées, et le panneau part en portail, placé en fixe par `useFixedPopover`, avec le même clavier et la même fermeture au clic extérieur qu'un menu ancré (le « +N » des plateformes et le tri « Film » de la liste d'une soirée).

Règles communes à tous les menus : une entrée qui ouvre une boîte de dialogue porte `aria-haspopup="dialog"` ; les entrées destructives (`tone="danger"`) viennent en dernier, après un `MenuSeparator` ; un choix exclusif (un tri, son sens) est un `MenuItem` avec `selected`. Le ⋯ d'une carte ou d'une ligne est `MoreVertical` dans un `IconButton` `lg` `round` ; celui d'une page ou d'une barre est `MoreHorizontal` dans un `IconButton` carré à la taille de ses voisins ; le bouton de 28 px posé sur l'affiche d'une carte film est la seule exception. Tab parcourt les entrées, et le focus qui sort du panneau le ferme en restant là où Tab l'a mené, sans revenir au déclencheur : c'est l'option `closeOnFocusLeave` de `useClickOutside`, posée par `useMenuState`, à passer aussi à un menu qui garde son état local, avec tous ses éléments dans `refs` quand un portail les sépare. Échap ne ferme que le dernier panneau ouvert : la grille d'emoji ouverte depuis le panneau « Autre » se ferme seule, puis un second Échap ferme le panneau.

| Brique | Props | Rôle |
|---|---|---|
| `MenuPanel` | `ariaLabel`, `anchored`, `embedded`, attributs natifs de `<div>` | porte lui-même les flèches, Home et End entre ses `menuitem`, `menuitemradio` et `menuitemcheckbox` non désactivés ; `anchored={false}` retire l'ancrage sous le déclencheur, pour un panneau porté par un portail ou posé en `fixed` (le menu des cartes film), qui garde son état d'ouverture local ; `embedded` retire en plus la surface flottante (fond, bordure, ombre, marge) pour poser le menu dans une autre surface, la feuille des listes sur téléphone |
| `MenuItem` | `icon` (posé dans un emplacement qui le dessine en `--icon-md` et `--color-text-muted`, à la couleur du libellé sur une entrée choisie ou destructive), `href` (lien externe, `external` ouvre un nouvel onglet avec `rel="noopener noreferrer"`), `to` (route interne, rend un `<Link>`), `selected`, `tone` `default` / `danger`, `disabled`, `ariaLabel`, `title`, `aria-haspopup`, `trailing` (contenu en bout de ligne : pastille, chevron) | `selected` (même `false`) en fait un `menuitemradio` avec `aria-checked`, pour qu'un lecteur d'écran dise le choix en cours ; `disabled` rend un `<button disabled>` même avec `href` ou `to` ; `ariaLabel` et `title` quand le nom accessible diffère du texte ; `aria-haspopup` quand l'entrée ouvre une boîte de dialogue ; un libellé sans jambage est nudgé comme des petites capitales (`--text-optical-nudge-caps`, `hasDescenders` de `shared/components/opticalNudge.ts`) |
| `MenuCheckboxItem` | `checked`, `onChange(checked)`, `description`, `disabled` | entrée à case (`menuitemcheckbox`, `aria-checked`) avec une seconde ligne facultative ; cocher ne ferme pas le menu, chaque case agit tout de suite (les listes de la fiche film) |
| `MenuLabel`, `MenuSeparator` | | titre de groupe et séparateur |
| `MenuChoiceRow` | `label`, `icon`, `options` (`value`, `label`, `content`), `value`, `onChange` | ligne de réglage dans un menu : un `group` nommé par `label` et ses `menuitemradio` en segments ; un choix ne ferme pas le menu (thème et langue du menu du compte) |

### Dropdown

Liste déroulante maison avec `role="listbox"`. Le déclencheur est nommé par le libellé suivi de la valeur choisie (« Langue Français »), la liste ouverte par le libellé seul ; `ariaLabel` ou `ariaLabelledBy` est requis. Tab ferme la liste sans rien choisir, le focus reste là où Tab l'a mené ; Échap ferme et rend le focus au déclencheur. Ses options font 44 px de haut comme les entrées d'un menu, avec les mêmes couleurs : option active en `--color-surface-hover`, option choisie en `--color-primary-soft` avec sa coche `sm`.

| Prop | Type | Rôle |
|---|---|---|
| `value`, `onChange` | | requis |
| `ariaLabelledBy` | `string` | identifiant du libellé visible (`labelId` de `Field`) |
| `ariaLabel` | `string` | le libellé quand aucun n'est affiché |
| `id` | `string` | identifiant du déclencheur, pour un `<label htmlFor>` |
| `options` | `{ value, label, disabled? }[]` | une option désactivée porte `aria-disabled`, les flèches la sautent |
| `placement` | `auto` / `bottom` / `top` | `auto` par défaut : la liste s'ouvre vers le haut quand la place manque dessous |
| `inline` | `boolean` | renonce à la pleine largeur du conteneur, pour un sélecteur posé dans une ligne (la langue du pied de page) |
| `disabled` | `boolean` | le déclencheur passe en `--opacity-disabled` |

### Tabs et TabPanel

Toute liste d'onglets du produit passe par là, y compris deux onglets dans une modale. Flèches et Home/End sautent les onglets désactivés, défilement horizontal avec fondus, onglet de 44 px ; en `pill`, chaque onglet fait 40 px de haut à la souris et 44 px sur écran tactile (`hover: none`), avec ou sans icône ni pastille ; la zone étendue de `tapTarget` ne sert pas ici, la liste qui défile de côté la rogne.

| Prop | Type | Rôle |
|---|---|---|
| `idBase`, `active`, `onChange` | | requis |
| `tabs` | `{ key, label, icon?, iconOnly?, badge?, disabled? }[]` | `iconOnly` garde `label` comme nom accessible sans le dessiner ; `badge` rend un `CountBadge` `neutral`, recoloré par l'onglet actif et par la variante `pill` |
| `ariaLabel` | `string` | |
| `variant` | `underline` / `pill` / `chip` | `chip` : puces séparées, l'active pleine à la couleur du texte (sélections d'Explorer) |

`TabPanel` (`idBase`, le même que celui de `Tabs`, `tabKey`, `active`) rend le panneau associé.

### SegmentedRadioGroup

Choix exclusif entre deux à cinq options courtes, `role="radiogroup"`, flèches, Home et End, qui déplacent la sélection et le focus ensemble, seule l'option cochée est tabulable. C'est le sélecteur de thème, d'échelle de note, de mode de roue et de visibilité d'une liste.

| Prop | Type | Rôle |
|---|---|---|
| `value`, `onChange` | | requis |
| `onSelect` | `(value) => void` | facultatif, appelé quand une option est activée, au clic ou par Entrée et Espace, jamais lors d'un déplacement par flèche : c'est là qu'on déplace le focus vers un champ que l'option révèle, comme `onSelect` de `ChoiceGroup` |
| `id` | `string` | préfixe des identifiants des options |
| `options` | `{ value, label, icon? }[]` | |
| `ariaLabel` ou `ariaLabelledBy` | `string` | au moins l'un des deux, le typage refuse un groupe sans nom |
| `ariaDescribedBy` | `string` | facultatif, l'identifiant de la phrase qui dit ce que change l'option cochée (la visibilité d'une liste) |
| `size` | `md` / `sm` | |
| `iconOnly` | `boolean` | le libellé devient `aria-label` |
| `disabled` | `boolean` | toutes les options, `--opacity-disabled`, clavier inerte |

### StarRating

Cinq étoiles à demi-pas pour noter un film vu, valeur entière sur 10 (`1` à `10`, une demi-étoile vaut un point), `role="group"`. C'est la fenêtre de notation d'une soirée et « Votre note » de la fiche d'un film vu ailleurs. Un tap donne l'étoile pleine, un second tap sur la même étoile la passe en demie ; à la souris, la moitié gauche de l'étoile prévisualise et choisit la demie ; les flèches déplacent d'une demi-étoile, bornées à 1 et 10. La valeur s'affiche à côté par `formatRating` (`shared/utils/formatRating.ts`), dans l'échelle du lecteur (`3,5/5` ou `7/10`) et sa langue.

| Prop | Type | Rôle |
|---|---|---|
| `value`, `onChange` | `number \| null`, `(value: number) => void` | requis |
| `ariaLabel` | `string` | nom du groupe |
| `starLabel` | `(stars: number) => string` | nom de chaque bouton |
| `size` | `md` / `lg` | `lg` (fenêtre de notation) porte des cellules de 44 px, `md` étend sa zone tactile |
| `readOnly` | `true` | une note qu'on lit sans la changer (la note de soirée sur la fiche d'un film) : un seul `role="img"` nommé par `ariaLabel`, cinq étoiles dessinées sans bouton ; `onChange` et `starLabel` disparaissent du typage |

### ProgressBar

La barre d'avancée fine suivie de son libellé : `value` (de 0 à 100, bornée), `label` (le texte visible à droite, un `<strong>` y passe en gras à la couleur du texte), `className` (la largeur que l'appelant lui donne). La piste (`--space-1` de haut, `--color-surface-hover-strong`) est décorative (`aria-hidden`) : le libellé dit tout, aucun lecteur d'écran ne lit deux fois la même part. Le remplissage `--color-success` (`tone="primary"` le passe à `--color-primary`) prend sa largeur de `--progress-value`, posé en `style` par le composant. C'est l'avancée d'une liste créée ou enregistrée sous son titre (« 5 sur 8 vus, **63 %** », `ListProgress` de `features/library`), et celle d'une saga ou d'une sélection d'Explorer pour un membre connecté, comptée sur ses Films vus (`useWatchedKeys`). En `primary`, c'est la barre du classement d'un groupe (`GroupRanking`), la part de chaque membre rapportée au maximum de la stat.

### Tooltip et InfoBubble

| Composant | Props | Rôle |
|---|---|---|
| `Tooltip` | `label` (le texte de la bulle), `placement` `top` / `bottom` / `left` / `right`, `delayMs`, `focusable`, `disabled` (ne rend pas la bulle) | apparaît au survol et au focus, jamais seul vecteur d'une information |
| `InfoBubble` | `label` (titre visible du panneau et nom du bouton d'aide), contenu en enfants | l'aide contextuelle d'un champ ou d'un réglage ; le panneau, sur la surface des panneaux flottants, se place par `useFixedPopover` (320 px au plus, 8 px du bord, retourné au-dessus du bouton et plafonné en hauteur quand la place manque, comme un menu), se ferme par son `LinkButton`, Échap ou un clic dehors ; le bouton Fermer et Échap rendent le focus au bouton d'aide |

### États de page

- `PageLayout` : le `<main id="main-content" tabIndex={-1}>`, cible du lien d'évitement ; `ref` transmis.
- `EmptyState` : `icon`, `title`, `titleTag` `p` / `h1` / `h2`, `message` (facultatif : un titre seul suffit, « Aucun abonné »), `actions`, `compact` (dans une rangée, une liste de modale).
- `ErrorState` : page entière (`PageLayout`) avec `code`, `title` en `h1`, `message` (`messageRole` `alert` / `status`), `actions`.
- `InlineError` : l'erreur d'un bloc dans une page, voir plus haut.
- `SignedOutState` : `EmptyState` avec connexion et inscription qui reviennent sur `returnTo` ; trace `signed_out_cta_clicked`.
- `ServerErrorPage` : `ErrorState` 500, `onRetry` optionnel, message d'erreur masqué en production.
- `Skeleton` (`variant` `text` / `circle` / `poster` / `block`, `width`, `height`, `style`) et `SkeletonScreen` (`label`, texte masqué visuellement, `role="status"`, `aria-busy`, `style`).
- `ErrorBoundary` : attrape les erreurs de rendu et affiche `ServerErrorPage`.
- `AccountChoiceLinks` : les deux liens d'un visiteur qui doit avoir un compte, « Créer un compte » en `primary` d'abord, « J’ai déjà un compte » en `secondary` ensuite, tous deux avec `returnTo` ; `fullWidth`, `onChoose('register' | 'login')` pour la mesure, `linkClassName` pour les dessiner en simples liens de la liste qui les porte (pied de page, encart « Une soirée ciné à plusieurs ? » de la fiche d'un film). Rendu sans conteneur, l'appelant pose sa rangée. C'est la carte « Rejoindre la soirée », les invitations à une liste ou à un groupe, les Paramètres d'un visiteur, et le pied de page une fois la session vérifiée.
- `AccountPromptLink` : le lien d'une action réservée aux membres (Suivre, Enregistrer une liste) vu par un visiteur. Sans script il mène à l'inscription ; un clic simple ouvre un `ResponsiveDialog` (`title`, `message`) qui explique ce que le compte apporte puis propose `AccountChoiceLinks` en pleine largeur ; un clic avec modificateur garde l'ouverture dans un nouvel onglet. `aria-haspopup="dialog"`, `className` et `ariaLabel` pour le dessin du bouton qu'il remplace ; la fenêtre n'est montée qu'à la première ouverture.

### Divers

- `Avatar` : `avatarId`, `pseudo`, `size` `xs` / `sm` / `md` / `lg` / `xl` (`--avatar-*`). L'identifiant désigne un robot ou un emoji DiceBear, ou une photo de profil (`photo:<clé>`, servie par `/api/v1/avatars/<clé>`). Sans identifiant, ou quand l'image ne répond plus (photo supprimée, compte supprimé), initiales sur l'une des huit couleurs `--color-avatar-*`, choisie par le pseudo ; sans pseudo, pastille vide. Toujours décoratif (`aria-hidden`), le nom est porté par le texte voisin. `accent` (la couleur que le membre a choisie dans son compte) cercle l'avatar d'un trait de 2 px à cette couleur, posé par la zone `.accent-<couleur>` ; rien pour `default` ni pour un invité sans compte (`null`). `halo` remplace cet anneau par un halo `--color-success-border` détaché de l'avatar : la personne propose un film en ce moment. Les tailles sont déclarées en `:where()` : un module qui doit redimensionner un avatar pose `width` et `height` sur sa propre classe, sans `!important`.
- `PersonRow` : la ligne de personne des fenêtres (participants, amis à inviter, abonnés), toujours un `<li>`. `avatar` (un `Avatar` `md`), `name`, `badges` (couronne, `Chip` « Vous ») sur la ligne du nom, `detail` (le @pseudo ou un état) dessous, `action` à droite, `online` pose un point de présence `--color-success` sur l'avatar, `to` (+ `linkAriaLabel`, `onNavigate`) fait de l'avatar et du nom un lien vers le profil, jamais de l'action, `muted` estompe une personne qu'on ne peut plus choisir. Un `linkAriaLabel` remplace tout le contenu du lien pour les lecteurs d'écran : il redit donc ce que les badges et la présence montrent (« Voir le profil d'Adrien, hôte, en ligne »). Un filet sépare deux lignes ; le halo et le point de présence se détachent sur `--color-surface-raised`, le fond des fenêtres et des feuilles.
- `PosterBackdrop` : `posterPath`, `direction` `down` / `side`, `glow`, `className`. Affiche en fond avec son voile, toujours décorative (`aria-hidden`), le voile seul quand il n'y a pas d'affiche. Avec `glow`, l'affiche devient un halo flouté sans voile qui fond vers la gauche, derrière le contenu (`--z-below`, le parent pose `isolation: isolate`), à l'opacité `--opacity-poster-glow` (plus basse en clair) : ce sont les cartes de Mes soirées ; rien n'est rendu sans affiche.
- `AvatarStack` : `people` (`{ key, avatarId, pseudo, accent }`, `accent` remplace l'anneau de séparation par la couleur du membre), `max` (3), `hidden` quand la liste n'est qu'un échantillon, `size` `xs` / `sm`, `ariaLabel`. Avatars chevauchés d'un quart, anneau `--avatar-stack-ring` (le fond de page par défaut, la surface ou l'anneau d'affiche via une classe), pastille « +N » pour le reste. Décoratif sans `ariaLabel`, `role="img"` avec.
- Membres d'une liste à plusieurs (`features/library/`) : sous la description, une `Chip` `primary` `sm` en forme action, la pile d'avatars en `leading` (anneau `--avatar-stack-ring` posé sur `--color-primary-soft` par la classe de la page) et `ChevronRight` en `trailingIcon`, qui ouvre la fenêtre Membres. Sur chaque affiche, l'avatar de la personne qui a ajouté le film en bas à droite (`ContributorBadge` de `movieCardParts`, `role="img"`, « Ajouté par Léa »), qui s'efface au survol comme le badge À voir ; en vue tableau, une colonne « Ajouté par » (`LibraryMovieRowHeader` `contributorLabel`, colonne d'en-tête non triable `label` de `MovieTableHeader`) le remplace. Dans la fenêtre Membres, retirer quelqu'un se confirme sur sa ligne : le premier appui arme le bouton (« Confirmer », `soft` `danger`, le même élément garde le focus), un bouton « Garder » apparaît devant, et la ligne dit ce qui arrive ; pas de `ConfirmDialog` empilé sur une fenêtre déjà ouverte.
- Listes publiques (`features/library/`) : la visibilité se choisit dans `ListFormDialog` (création et modification) par un `SegmentedRadioGroup` `sm` Privée (cadenas) ou Publique (globe), suivi d'une phrase `hint` qui dit ce que change l'option cochée et que le groupe porte en `ariaDescribedBy`. Une liste publique à moi porte une `Chip` `muted` `sm` « Publique » avec le globe, sous son titre. « Copier le lien » d'un menu ⋯ confirme la copie par `CopyLinkStatus` : une région `role="status"` posée à gauche du bouton ⋯, qui montre une `Chip` `success` « Lien copié » deux secondes. « À voir » et « Films vus » règlent leur visibilité dans leur menu ⋯ (`CollectionVisibilityMenu` de `features/library`, `ListActionsMenu` avec une seule entrée « Rendre publique » ou « Rendre privée »), en optimiste avec retour arrière. Mes listes range une liste par ligne : `MovieCollectionCard` en `layout="row"` montre un éventail de trois affiches (`PosterFan` de `features/movies`), une barre d'avancée `--color-success` au pied de l'affiche de devant tant qu'un film au moins est vu, le nom sur deux lignes au plus (`nameSuffix` pour le globe d'une liste publique), « 12 films, 3 vus », puis une ligne « Avec Alice et Bob », « Par Alice », « Saga » ou « Sélection d'Explorer ». Une liste enregistrée dont la source a disparu n'est plus une ligne mais un encart `Card` `sunken` en tête de la section Enregistrées, avec ses `Button` `secondary` `sm` « Garder une copie » et « Ne plus enregistrer ».
- `EventLifecyclePill` : `lifecycle` `upcoming` / `live` / `pending` / `finished`, `label`, `detail`, `variant` `pill` (cadre et fond) ou `text` (texte coloré et icône sans cadre, ligne d'infos de la soirée et cartes de Mes soirées) ; seul `live` pulse (`StatusDot pulsing`). Consomme `--color-badge-*`, comme `Chip` `pending`.
- `ViewModeToggle` : barre d'outils grille / liste, `aria-pressed` sur le mode courant, boutons de 28 px à zone tactile étendue.
- `InstallPwaDialog` : `open`, `mode` `ios` / `in_app` / `generic`, `onClose` ; le guide d'ajout à l'écran d'accueil qu'ouvre `usePwaInstallClick`, depuis le pied de page, le menu du compte et la section notifications.
- `QrCode` : `value`, `title` (le texte de remplacement), `plain`, `className` ; une image de 240 px dont la source est le SVG de `qrSvgDataUrl`, le même dessin que celui de l'image exportée. Style Carrés par `qrcode-generator` : contenu encodé en UTF-8, correction H, marge de 4 modules, yeux en anneaux arrondis, clap de la marque au centre pour les versions 3 à 6, couleurs de `BRAND_COLORS`. `plain` retire le clap et la marge et passe en correction M, pour un code affiché trop petit (l'illustration de « Comment ça marche »). La géométrie vit dans `qrCodeShapes.ts` (`qrShapes`, `qrSvgMarkup`, `qrSvgDataUrl`) ; `qrCodeShapes.test.ts` relit chaque version avec `jsqr` en faussant tous les modules sous le clap.
- `readCssToken(nom, élément?)` (`shared/utils/cssToken.ts`) : la valeur calculée d'un jeton, pour ce qui dessine hors du CSS (canvas de la roue, confettis).

## Tests

Chaque composant partagé a son fichier `*.test.tsx` à côté de lui. Un test de composant vérifie le rôle et le nom accessible, les états (`disabled`, `aria-pressed`, `aria-busy`, `aria-checked`) et les classes de variante via l'import du module CSS, jamais un nom de classe en dur. Les contrastes des rôles de couleur sont vérifiés par `styles/foundationContrast.test.ts` (voir « Rôles de couleur »).
