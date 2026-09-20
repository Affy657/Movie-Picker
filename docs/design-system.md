# Design system

Les composants partagés de `apps/web/src/shared/components/`, leurs props, leurs états et ce qu'ils garantissent pour l'accessibilité. Les règles d'usage (réutiliser avant d'écrire, jetons obligatoires, `:hover` sous `(hover: hover)`) sont dans [`AGENTS.md`](../AGENTS.md) et vérifiées par `pnpm run check:architecture`. Ce document décrit ce que chaque composant fait ; quand un composant change, cette page change dans le même commit.

## Jetons

Tous dans `apps/web/src/styles/01-foundation.css`, sauf ceux propres à la page d'accueil, dans `app/pages/landing/landingPalette.css`.

| Famille | Jetons | Note |
|---|---|---|
| Espacement | `--space-0` à `--space-24`, demi-pas jusqu'à `--space-3-5` (14 px) | base 4 px, y compris à l'intérieur d'un `calc()` ou d'un `clamp()` ; `--tap-target-min` (44 px) est la seule taille qui n'appartient pas à la grille |
| Tailles | toute `width`, `height`, `min-*`, `max-*`, `top`, `left`, `right`, `bottom`, `inset`, et le `translate` d'un `transform`, sous 96 px, vient de `--space-*`, `--icon-*`, `--avatar-*`, `--tap-target-min` ou `--lift-*` | 1 px et 2 px restent des traits ; au-delà de 96 px (affiches, colonnes) la valeur est une dimension de contenu, pas un jeton |
| Icônes | `--icon-xs` (12) `-sm` (14) `-md` (16) `-lg` (18) `-xl` (20) `-2xl` (24) `-3xl` (28) `-4xl` (32) ; miroir TypeScript `ICON_SIZE` dans `shared/components/iconSize.ts` | une icône Lucide prend `size={ICON_SIZE.md}`, jamais un nombre ; la porte vérifie que les deux échelles coïncident |
| Avatars | `--avatar-xs` (20) `-sm` (28) `-md` (36) `-lg` (56) `-xl` (96) ; `--color-avatar-0` à `-7` pour les initiales | la palette des initiales est choisie par `data-palette` sur l'élément, jamais par une couleur en dur |
| Soulèvement | `--lift-sm` (-1 px), `-md` (-2 px), `-lg` (-4 px), `-xl` (-8 px) | le `translateY` d'un survol ; `Button` et `Card` prennent `-sm` |
| Gabarit | `--header-height` (3,5 rem), `--mobile-nav-height` (4 rem + zone sûre) | posés dans la fondation, consommés sans repli |
| Typographie | `--font-size-4xs` à `--font-size-6xl`, `--font-weight-regular/medium/semibold/bold/extrabold`, `--leading-*`, `--tracking-*`, `--font-body`, `--font-mono` | échelle nommée sans variante « plus » ; aucune valeur littérale de graisse, d'interlignage ou d'approche dans un module |
| Rayons | `--radius-xs` (4 px), `-sm` (6 px), `-md` (12 px), `-lg` (18 px), `-pill` | |
| Bordures | `--border-width-field` (1,5 px) | tout autre trait fait 1 px ou 2 px, en littéral |
| Focus | `--outline-focus` (contour), `--ring-focus` (halo pour les champs) | un `:focus-visible` qui retire le contour pose le halo, jamais un simple fond |
| Géométrie des menus | `MENU_VIEWPORT_MARGIN_PX` (8), `MENU_ANCHOR_GAP_PX` (6) dans `shared/components/menuGeometry.ts` | les seuls pixels écrits en TypeScript pour positionner un panneau flottant ; ils recopient `--space-2` et `--space-1-5` |
| Ombres | `--shadow-sm/md/lg`, `--shadow-nav`, `--shadow-hero-card`, `--shadow-wheel` | en sombre l'élévation se lit sur `--color-surface-raised`, pas sur l'ombre ; `--shadow-nav` change de valeur en sombre |
| Mouvement | `--duration-fast` (0,10 s), `--duration-base` (0,15 s), `--duration-slow` (0,20 s), `--duration-enter` (0,25 s), `--duration-sheet` (0,32 s), `--duration-reveal` (0,6 s), `--duration-spin` (0,8 s), `--duration-pulse` (1,2 s), `--duration-shimmer` (1,4 s), `--duration-breathe` (2,4 s) ; `--ease-default/in-out/out/linear/reveal/spring` | chaque étape de `transition` porte sa durée et sa courbe ; une boucle décorative propre à un composant déclare son propre jeton dans son module (`--flame-flicker-duration`), un décalage de phase aussi (`--card-shake-stagger-*`, `--demo-float-offset`) |
| Opacité | `--opacity-disabled` (0,5), `--opacity-muted` (0,6), `--opacity-hover` (0,8), `--opacity-dimmed` (0,85) | état désactivé, contenu secondaire, fondu au survol, `aria-busy` ; un littéral n'est admis que dans une étape de `@keyframes` |
| Couleurs | primitives `--blue-600`… réservées à la fondation et à `landingPalette.css` ; rôles `--color-*` consommés par les modules ; `--color-heat-0` à `-3` pour la carte d'activité | tableau des rôles ci-dessous |
| Teintes de surface | `--color-surface-hover` (6 %), `-hover-strong` (10 %), `-active` (12 %), `-sunken`, `-translucent`, `--color-bg-tint`, `--color-bg-translucent` | remplacent tout `color-mix()` maison sur le texte, le fond ou la surface |
| Sur affiche | `--on-poster-*` | texte, bordures et voiles posés sur une image sombre |
| Profondeur | `--z-below` à `--z-skip-link` | jamais un nombre, ni en CSS ni dans un objet `style` |
| Largeurs | `--container-xs` (28 rem) à `--container-3xl` (84 rem), posés sur `--page-max-width` (défaut `--layout-max`) | les tailles de `Modal` portent les mêmes noms |
| Zone tactile | `shared/components/tapTarget.module.css`, classe `expanded` | `composes: expanded from '@/shared/components/tapTarget.module.css'` pose `position: relative` (dans la couche `@layer tap-target`, donc un `position: absolute` écrit dans la classe qui compose garde la main, quel que soit l'ordre d'émission des feuilles) et un `::after` de 44 px centré ; c'est ce qu'utilisent `Button` `sm`, `IconButton`, `LinkButton`, `Chip` cliquable et sa croix, `Toggle`, `ViewModeToggle`, `SegmentedRadioGroup` et tout contrôle dessiné sous 44 px |

### Rôles de couleur

Chaque rôle porte sa déclinaison, en clair, en sombre et sous `.on-dark` ; un module consomme le jeton de la déclinaison, jamais un `color-mix()` maison (règle vérifiée par `check:architecture`, voir `AGENTS.md`).

| Rôle | Surface | Texte | Fond léger | Bordure |
|---|---|---|---|---|
| primaire (accent choisi par l'utilisateur) | `--color-primary`, `-hover` | `--color-primary-text`, `-text-hover` | `--color-primary-tint`, `-soft`, `-soft-hover` | `--color-primary-border`, `-border-soft` |
| erreur, succès, avertissement | `--color-error`, `--color-success`, `--color-warning` | idem | `--color-<rôle>-bg` | `--color-<rôle>-border` |
| teintes neutres | `--color-surface-hover` (6 %), `-hover-strong` (10 %), `-active` (12 %), `-sunken`, `-translucent`, `--color-bg-tint`, `--color-bg-translucent` | | | |
| note d'un film (étoiles pleines, pastille de note) | `--color-rating` (ambre, identique en clair, en sombre et sous `.on-dark`) | | | |

`--color-primary-text` existe parce que `--color-primary` colore des surfaces : pour du texte ou un lien, chaque accent garantit 4,5:1 sur fond clair par sa déclinaison texte, ce que le vert, l'orange et le cyan de la surface ne tiennent pas.

Trois portées de thème : `[data-theme='light']`, `[data-theme='dark']` et `.on-dark` (un bloc sombre posé dans une page claire, la carte d'accueil par exemple). Un rôle ajouté au clair se déclare dans les trois.

Un `var(--jeton, repli)` sur un jeton de la fondation est refusé : le repli est mort tant que la fondation charge, et quand il diverge du jeton (`var(--radius-sm, 4px)` pour un jeton à 6 px) il ment. Le repli n'a de sens que sur un jeton local à un module (`--mc-*` des cartes film, `--details-font-size`). Un tel thème local se déclare une fois : la classe `onSurface` de `movieCardParts.module.css` porte les dix-sept `--mc-*` d'une carte posée sur une surface, et les modules qui en ont besoin la `composes`, ils ne recopient pas le bloc. Un jeton de la fondation que personne ne consomme est refusé aussi.

## Composants

Sauf mention, chaque composant accepte `className` et transmet les attributs HTML natifs à son élément racine. `Sheet`, `InfoBubble`, `Toggle`, `ConfirmDialog` et `ShareDialog` ne prennent pas de `className` : leur surface est la leur.

Conventions de nommage des props, les mêmes partout :

- `ariaLabel`, `ariaLabelledBy`, `ariaDescribedBy` pour le nom et la description accessibles ; `label` est toujours un texte visible ;
- `data-testid` sur les composants qui étalent les attributs natifs, accepté aussi par `Chip` et `Modal` ; `ConfirmDialog` garde `testId`, préfixe dont il dérive `-cancel` et `-confirm` ;
- `onChange(value)` remonte la valeur, y compris `Toggle` et `ToggleRow` (`onChange(checked)`) ;
- un module qui exporte une paire (`ChoiceGroup` + `ChoiceCard`, `Tabs` + `TabPanel`, `Skeleton` + `SkeletonScreen`) n'a que des exports nommés, les autres un export par défaut.

### Button

Le bouton du produit. `buttonClass()` donne la même composition de classes à un `<Link>` ou un `<a>`.

| Prop | Type | Défaut | Rôle |
|---|---|---|---|
| `variant` | `primary` / `secondary` / `ghost` | `secondary` | hiérarchie : plein, contour, sans fond |
| `tone` | `default` / `danger` / `warning` | `default` | couleur sémantique, cumulable avec la variante ; `warning` pour l'action qui répond à une alerte (confirmer les films Letterboxd non identifiés) |
| `size` | `sm` / `md` / `lg` | `md` | `lg` pour les appels à l'action de la page d'accueil |
| `loading` | `boolean` | `false` | désactive, pose `aria-busy` et un `Spinner` devant le libellé ; le libellé reste |
| `type` | | `button` | à poser à `submit` explicitement |

États : repos, survol (sous `(hover: hover)`, soulèvement `--lift-sm` annulé sous `prefers-reduced-motion`), focus (`--outline-focus`), désactivé (`--opacity-disabled`), chargement (`--opacity-dimmed`). Hauteur minimale `--tap-target-min` ; `sm` dessine 40 px et étend sa zone tactile à 44 px.

### IconButton

Bouton à icône seule. `ariaLabel` est obligatoire et devient `aria-label` et, sauf `showTitle={false}`, `title`.

| Prop | Type | Défaut |
|---|---|---|
| `ariaLabel` | `string` | requis |
| `size` | `sm` / `md` / `lg` | `md` |
| `tone` | `default` / `danger` / `onPoster` | `default` |
| `expandHitArea` | `boolean` | `true`, compose `expanded` de `tapTarget.module.css` : 44 px de zone tactile sans changer le dessin |
| `loading` | `boolean` | `false`, remplace l'icône par le spinner |

### LinkButton

Un `<button>` qui ressemble à un lien, pour une action secondaire dans une phrase. `size` : `sm` (défaut) / `md`. Sa zone tactile est étendue à 44 px autour du texte.

### Spinner

Le disque qui tourne pendant une attente, `1em` de côté et à la couleur du texte courant, `aria-hidden`. C'est lui que `Button` et `IconButton` affichent en `loading` ; un composant qui attend hors d'un bouton le pose lui-même, jamais une `@keyframes` à lui. Immobile sous `prefers-reduced-motion`.

### Chip

Pastille, badge, filtre ou étiquette d'état.

| Prop | Type | Défaut |
|---|---|---|
| `tone` | `neutral` / `primary` / `success` / `warning` / `pending` / `danger` / `muted` | `neutral` |
| `size` | `sm` / `md` | `md` |
| `icon` | composant Lucide | |
| `onClick` | | rend un `<button>` |
| `selected` | `boolean` | style plein et `aria-pressed` ; laissé `undefined`, le bouton est une action, pas un interrupteur |
| `onRemove`, `removeLabel` | | ajoute la croix de retrait, zone tactile de 44 px |
| `ariaLabel` | `string` | `aria-label` du bouton quand le contenu visible ne suffit pas |
| `disabled` | `boolean` | bouton seulement |
| `data-testid` | `string` | |

Les tones sémantiques consomment les rôles (`--color-success-bg`…) ; `pending` garde son jeton propre `--color-badge-pending-*`. Le centrage optique du texte est intégré (`--text-optical-nudge`).

### Card

Surface de contenu. `as` change la balise (`section`, `li`…).

| Prop | Valeurs | Défaut |
|---|---|---|
| `padding` | `none` / `sm` / `md` / `lg` | `md` |
| `radius` | `md` / `lg` | `md` |
| `elevation` | `none` / `sm` / `md` / `lg` | `none` ; `md` et `lg` posent `--color-surface-raised` |
| `interactive` | `boolean` | survol et focus visibles, pour une carte cliquable |

`Modal` et `Dropdown` composent `Card` (`elevationLg`). Une surface de carte locale (soirée en attente, carte film en liste, groupe de réglages, table des films) rend `<Card padding="none" elevation="sm" as=…>` avec sa classe, elle ne redessine ni le fond ni la bordure.

### Modal

Seul endroit du projet où `<dialog>` et `::backdrop` sont écrits. Fermeture par Échap, clic sur le voile et bouton de fermeture ; le `<dialog>` natif retient le focus et le rend à l'ouvreur.

| Prop | Type | Note |
|---|---|---|
| `open`, `onClose` | requis | |
| `title`, `titleId`, `ariaLabelledBy`, `ariaDescribedBy`, `ariaLabel` | | un des trois nommages est requis |
| `size` | `xs` / `sm` / `md` / `base` / `xl` | `--container-<size>`, `sm` par défaut |
| `surface` | `surface` / `bare` / `media` / `borderless` | `media` pour une bande-annonce |
| `padded`, `column`, `anchoredTop`, `bottomSheetOnMobile`, `strongBackdrop` | `boolean` | |
| `closeLabel` | `string` | |

`data-testid` se pose sur le `<dialog>`, `dialogRef` en donne la référence à l'appelant.

Dialogues déjà câblés dessus :

- `ConfirmDialog` : `title`, `message`, `onConfirm`, `onCancel`, `confirmLabel`, `cancelLabel`, `confirmTone` `danger` par défaut ou `default` pour une confirmation non destructive, `loading` met le bouton en chargement, `hideCancel` pour un accusé de lecture, `testId`.
- `ShareDialog` : `title`, `url`, `qrHint`, `fileSlug` (nom du PNG téléchargé), `preview` (`avatarId`, `name`, `meta`), `surface` `event` / `profile` (analytics), `shareText`, `initialTab`, `extraTab` pour un onglet propre à l'appelant.
- `ConsentDialog` : `open`, `onClose` ; la modale de consentement lit et écrit `useConsent()` elle-même.
- `DialogTitleBar` (`titleId`, `title`, `onClose`, `closeLabel`).

### Sheet

Feuille ancrée en bas, glissable (`SheetDrag.module.css` porte le geste). `open`, `title`, `onClose`, `footer`, `size` `md` / `lg`. Sa croix est un `IconButton`.

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
| `panelHead`, `panelHeading`, `saved` | en-tête du panneau : titre et pastille « Enregistré » (`AccountSavedChip`) |
| `card`, `cardTitle` | groupe de réglages, rendu par `<Card padding="none" elevation="sm">` avec la classe ; `cardTitle` est le libellé en capitales du groupe |
| `field` | un champ (`Field`) séparé du précédent par un trait |
| `row`, `rowMain`, `rowLabel`, `rowSub`, `rowIcon`, `rowFlush`, `rowSubFlush`, `noDivider` | une ligne libellé + sous-titre, icône facultative à gauche, action (`Button`, lien, `Toggle`) poussée à droite |
| `attention`, `attentionText` | bandeau d'alerte `--color-warning-*` dans un groupe, son action est un `Button size="sm" tone="warning"` |
| `dangerZone` | bloc `--color-error-*` des actions irréversibles, en bas de page |

Les boutons y prennent leurs tailles et tons de `Button`, la feuille n'en redéfinit aucun.

### Fiche film depuis une liste

`features/watchlist/components/LibraryMovieDetails.tsx` ouvre `MovieDetailsModal` pour un titre d'une liste (Ma liste, accueil, listes publiques, profil). `useLibraryMovieDetails` lit la cible dans l'URL (`?film=<id>` ou `?serie=<id>`, en `replace`, sans reset du défilement) et garde en mémoire la graine passée à `open` (titre, affiche, plateformes) pour peindre la fiche avant sa requête ; un lien profond sans graine charge tout depuis l'API. La cible venant de l'URL, **une page ne monte qu'un seul `LibraryMovieDetails`** : un second lirait la même cible et ouvrirait une seconde fiche.

### ChoiceGroup et ChoiceCard

Un choix exclusif entre des cartes, quand `SegmentedRadioGroup` est trop étroit (une carte porte un titre, une description, une vignette). `ChoiceGroup` (`value`, `onChange`, `ariaLabel` ou `ariaLabelledBy`) rend le `role="radiogroup"` et pilote flèches, Home et End ; seule la carte cochée est tabulable, la première quand rien ne l'est. `onSelect` (optionnel) est appelé quand une carte est activée, au clic ou par Entrée et Espace, jamais lors d'un déplacement par flèche : c'est ce qui ferme un popover (`ThemeField`) sans poser de gestionnaire de clic sur un conteneur.

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

`Menu` rend un déclencheur et son panneau : `triggerLabel`, `triggerIcon`, `triggerClassName`, `panelLabel`, `panelClassName`, enfants sous forme de fonction `(close) => …`. Un déclencheur sur mesure (avatar, bouton à icône) garde le même comportement avec `useMenuState()` puis `MenuPanel {...menu.panelProps}` : c'est le menu du compte et celui de l'agenda. Échap ferme et rend le focus au déclencheur, focus visible en contour interne.

| Brique | Props | Rôle |
|---|---|---|
| `MenuPanel` | `ariaLabel`, `anchored`, attributs natifs de `<div>` | porte lui-même les flèches, Home et End entre ses `menuitem` non désactivés ; `anchored={false}` retire l'ancrage sous le déclencheur, pour un panneau porté par un portail ou posé en `fixed` (le menu des cartes film), qui garde son état d'ouverture local |
| `MenuItem` | `icon`, `href` (lien externe, `external` ouvre un nouvel onglet avec `rel="noopener noreferrer"`), `to` (route interne, rend un `<Link>`), `selected`, `tone` `default` / `danger`, `disabled`, `ariaLabel`, `title`, `aria-haspopup` | `disabled` rend un `<button disabled>` même avec `href` ou `to` ; `ariaLabel` et `title` quand le nom accessible diffère du texte ; `aria-haspopup` quand l'entrée ouvre une boîte de dialogue ; un libellé sans jambage est nudgé comme des petites capitales (`--text-optical-nudge-caps`) |
| `MenuLabel`, `MenuSeparator` | | titre de groupe et séparateur |

### Dropdown

Liste déroulante maison avec `role="listbox"`.

| Prop | Type | Rôle |
|---|---|---|
| `id`, `value`, `onChange` | | requis |
| `options` | `{ value, label, disabled? }[]` | une option désactivée porte `aria-disabled`, les flèches la sautent |
| `ariaLabel` | `string` | |
| `inline` | `boolean` | renonce à la pleine largeur du conteneur, pour un sélecteur posé dans une ligne (la langue du pied de page) |
| `disabled` | `boolean` | le déclencheur passe en `--opacity-disabled` |

### Tabs et TabPanel

Toute liste d'onglets du produit passe par là, y compris deux onglets dans une modale. Flèches et Home/End sautent les onglets désactivés, défilement horizontal avec fondus, onglet de 44 px.

| Prop | Type | Rôle |
|---|---|---|
| `idBase`, `active`, `onChange` | | requis |
| `tabs` | `{ key, label, icon?, iconOnly?, badge?, disabled? }[]` | `iconOnly` garde `label` comme nom accessible sans le dessiner |
| `ariaLabel` | `string` | |
| `variant` | `underline` / `pill` | |

`TabPanel` (`tabKey`, `active`) rend le panneau associé.

### SegmentedRadioGroup

Choix exclusif entre deux à cinq options courtes, `role="radiogroup"`, flèches, Home et End, seule l'option cochée est tabulable. C'est le sélecteur de thème, d'échelle de note et de mode de roue.

| Prop | Type | Rôle |
|---|---|---|
| `id`, `value`, `onChange` | | requis |
| `options` | `{ value, label, icon? }[]` | |
| `ariaLabel` ou `ariaLabelledBy` | `string` | l'un des deux |
| `size` | `md` / `sm` | |
| `iconOnly` | `boolean` | le libellé devient `aria-label` |
| `disabled` | `boolean` | toutes les options, `--opacity-disabled`, clavier inerte |

### StarRating

Cinq étoiles à demi-pas pour noter un film vu, valeur entière sur 10 (`1` à `10`, une demi-étoile vaut un point), `role="group"`. Un tap donne l'étoile pleine, un second tap sur la même étoile la passe en demie ; à la souris, la moitié gauche de l'étoile prévisualise et choisit la demie ; les flèches déplacent d'une demi-étoile, bornées à 1 et 10. La valeur s'affiche à côté par `formatRating` (`shared/utils/formatRating.ts`), dans l'échelle du lecteur (`3,5/5` ou `7/10`) et sa langue.

| Prop | Type | Rôle |
|---|---|---|
| `value`, `onChange` | `number \| null`, `(value: number) => void` | requis |
| `ariaLabel` | `string` | nom du groupe |
| `starLabel` | `(stars: number) => string` | nom de chaque bouton |
| `size` | `md` / `lg` | `lg` (fenêtre de notation) porte des cellules de 44 px, `md` étend sa zone tactile |

### Tooltip et InfoBubble

| Composant | Props | Rôle |
|---|---|---|
| `Tooltip` | `label` (le texte de la bulle), `placement` `top` / `bottom` / `left` / `right`, `delayMs`, `focusable`, `disabled` (ne rend pas la bulle) | apparaît au survol et au focus, jamais seul vecteur d'une information |
| `InfoBubble` | `label` (nom du bouton d'aide), contenu en enfants | l'aide contextuelle d'un champ ou d'un réglage |

### États de page

- `PageLayout` : le `<main id="main-content" tabIndex={-1}>`, cible du lien d'évitement ; `ref` transmis.
- `EmptyState` : `icon`, `title`, `titleTag` `p` / `h1` / `h2`, `message`, `actions`, `compact`.
- `ErrorState` : page entière (`PageLayout`) avec `code`, `title` en `h1`, `message` (`messageRole` `alert` / `status`), `actions`.
- `SignedOutState` : `EmptyState` avec connexion et inscription qui reviennent sur `returnTo` ; trace `signed_out_cta_clicked`.
- `ServerErrorPage` : `ErrorState` 500, `onRetry` optionnel, message d'erreur masqué en production.
- `Skeleton` (`variant` `text` / `circle` / `poster` / `block`, `width`, `height`, `style`) et `SkeletonScreen` (`label`, texte masqué visuellement, `role="status"`, `aria-busy`, `style`).
- `ErrorBoundary` : attrape les erreurs de rendu et affiche `ServerErrorPage`.

### Divers

- `Avatar` : `avatarId`, `pseudo`, `size` `xs` / `sm` / `md` / `lg` / `xl` (`--avatar-*`). Sans identifiant, initiales sur l'une des huit couleurs `--color-avatar-*`, choisie par le pseudo ; sans pseudo, pastille vide. Toujours décoratif (`aria-hidden`), le nom est porté par le texte voisin. Les tailles sont déclarées en `:where()` : un module qui doit redimensionner un avatar pose `width` et `height` sur sa propre classe, sans `!important`.
- `AvatarStack` : `people` (`{ key, avatarId, pseudo }`), `max` (3), `hidden` quand la liste n'est qu'un échantillon, `size` `xs` / `sm`, `ariaLabel`. Avatars chevauchés d'un quart, anneau `--avatar-stack-ring` (le fond de page par défaut, la surface ou l'anneau d'affiche via une classe), pastille « +N » pour le reste. Décoratif sans `ariaLabel`, `role="img"` avec.
- `EventLifecyclePill` : `lifecycle` `upcoming` / `live` / `pending` / `finished`, `label`, `detail` ; seul `live` pulse. Seul consommateur légitime de `--color-badge-*` avec `Chip` `pending`.
- `ViewModeToggle` : barre d'outils grille / liste, `aria-pressed` sur le mode courant, boutons de 30 px à zone tactile étendue.
- `InstallPwaDialog` : `open`, `mode` `ios` / `in_app` / `generic`, `onClose` ; le guide d'ajout à l'écran d'accueil qu'ouvre `usePwaInstallClick`, depuis le pied de page, le menu du compte et la section notifications.
- `QrCode` : `value`, `title` ; SVG de 240 px.

## Tests

Chaque composant partagé a son fichier `*.test.tsx` à côté de lui. Un test de composant vérifie le rôle et le nom accessible, les états (`disabled`, `aria-pressed`, `aria-busy`, `aria-checked`) et les classes de variante via l'import du module CSS, jamais un nom de classe en dur.
