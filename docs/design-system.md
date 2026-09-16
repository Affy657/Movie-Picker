# Design system

Les composants partagés de `apps/web/src/shared/components/`, leurs props, leurs états et ce qu'ils garantissent pour l'accessibilité. Les règles d'usage (réutiliser avant d'écrire, jetons obligatoires, `:hover` sous `(hover: hover)`) sont dans [`AGENTS.md`](../AGENTS.md) et vérifiées par `pnpm run check:architecture`. Ce document décrit ce que chaque composant fait ; quand un composant change, cette page change dans le même commit.

## Jetons

Tous dans `apps/web/src/styles/01-foundation.css`, sauf ceux propres à la page d'accueil, dans `app/pages/landing/landingPalette.css`.

| Famille | Jetons | Note |
|---|---|---|
| Espacement | `--space-0` à `--space-24`, demi-pas jusqu'à `--space-3-5` | base 4 px ; `--tap-target-min` (44 px) est la seule taille qui n'appartient pas à la grille |
| Tailles | toute `width`, `height`, `min-*`, `max-*`, `top`, `left`, `right`, `bottom`, `inset` sous 96 px vient de `--space-*`, `--icon-*`, `--avatar-*` ou `--tap-target-min` | 1 px et 2 px restent des traits ; au-delà de 96 px (affiches, colonnes) la valeur est une dimension de contenu, pas un jeton |
| Icônes | `--icon-xs` (12) `-sm` (14) `-md` (16) `-lg` (18) `-xl` (20) `-2xl` (24) `-3xl` (28) `-4xl` (32) ; miroir TypeScript `ICON_SIZE` dans `shared/components/iconSize.ts` | une icône Lucide prend `size={ICON_SIZE.md}`, jamais un nombre ; la porte vérifie que les deux échelles coïncident |
| Avatars | `--avatar-xs` (20) `-sm` (28) `-md` (36) `-lg` (56) `-xl` (96) ; `--color-avatar-0` à `-7` pour les initiales | la palette des initiales est choisie par `data-palette` sur l'élément, jamais par une couleur en dur |
| Soulèvement | `--lift-sm` (-1 px), `-md` (-2 px), `-lg` (-4 px), `-xl` (-8 px) | le `translateY` d'un survol ; `Button` et `Card` prennent `-sm` |
| Gabarit | `--header-height` (3,5 rem), `--mobile-nav-height` (4 rem + zone sûre) | posés dans la fondation, consommés sans repli |
| Typographie | `--font-size-4xs` à `--font-size-6xl`, `--font-weight-regular/medium/semibold/bold/extrabold`, `--leading-*`, `--tracking-*`, `--font-body`, `--font-mono` | aucune valeur littérale de graisse, d'interlignage ou d'approche dans un module |
| Rayons | `--radius-xs` (4 px), `-sm` (6 px), `-md` (12 px), `-lg` (18 px), `-pill` | |
| Bordures | `--border-width-field` (1,5 px) | tout autre trait fait 1 px ou 2 px |
| Focus | `--outline-focus` (contour), `--ring-focus` (halo pour les champs) | un `:focus-visible` qui retire le contour pose le halo, jamais un simple fond |
| Ombres | `--shadow-sm/md/lg`, `--shadow-nav`, `--shadow-hero-card`, `--shadow-wheel` | en sombre l'élévation se lit sur `--color-surface-raised`, pas sur l'ombre ; `--shadow-nav` change de valeur en sombre |
| Mouvement | `--duration-fast` (0,10 s), `--duration-base` (0,15 s), `--duration-slow` (0,20 s), `--duration-enter` (0,25 s), `--duration-sheet` (0,32 s), `--duration-reveal` (0,6 s), `--duration-spin` (0,8 s), `--duration-pulse` (1,2 s), `--duration-shimmer` (1,4 s), `--duration-breathe` (2,4 s) ; `--ease-default/in-out/out/linear/reveal/spring` | une boucle décorative propre à un composant déclare son propre jeton dans son module (`--flame-flicker-duration`) |
| Opacité | `--opacity-disabled` (0,5), `--opacity-muted` (0,6), `--opacity-hover` (0,8), `--opacity-dimmed` (0,85) | état désactivé, contenu secondaire, fondu au survol, `aria-busy` ; un littéral n'est admis que dans une étape de `@keyframes` |
| Couleurs | primitives `--blue-600`… réservées à la fondation ; rôles `--color-*` consommés par les modules ; `--color-heat-0` à `-3` pour la carte d'activité | voir le tableau des rôles dans `AGENTS.md` |
| Teintes de surface | `--color-surface-hover` (6 %), `-hover-strong` (10 %), `-active` (12 %), `-sunken`, `-translucent`, `--color-bg-tint`, `--color-bg-translucent` | remplacent tout `color-mix()` maison sur le texte, le fond ou la surface |
| Sur affiche | `--on-poster-*` | texte, bordures et voiles posés sur une image sombre |
| Profondeur | `--z-below` à `--z-skip-link` | |
| Largeurs | `--container-xs` (28 rem) à `--container-3xl` (84 rem) | les tailles de `Modal` portent les mêmes noms |
| Zone tactile | `shared/components/tapTarget.module.css`, classe `expanded` | `composes: expanded from '@/shared/components/tapTarget.module.css'` pose `position: relative` et un `::after` de 44 px centré ; c'est ce qu'utilisent `Button` `sm`, `IconButton`, `LinkButton`, `Chip` cliquable et sa croix, `Toggle`, `ViewModeToggle`, `SegmentedRadioGroup` et tout contrôle dessiné sous 44 px |

Trois portées de thème : `[data-theme='light']`, `[data-theme='dark']` et `.on-dark` (un bloc sombre posé dans une page claire, la carte d'accueil par exemple). Un rôle ajouté au clair se déclare dans les trois.

Un `var(--jeton, repli)` sur un jeton de la fondation est refusé : le repli est mort tant que la fondation charge, et quand il diverge du jeton (`var(--radius-sm, 4px)` pour un jeton à 6 px) il ment. Le repli n'a de sens que sur un jeton local à un module (`--mc-*` des cartes film, `--details-font-size`). Un jeton de la fondation que personne ne consomme est refusé aussi.

## Composants

Sauf mention, chaque composant accepte `className` et transmet les attributs HTML natifs à son élément racine.

### Button

Le bouton du produit. `buttonClass()` donne la même composition de classes à un `<Link>` ou un `<a>`.

| Prop | Type | Défaut | Rôle |
|---|---|---|---|
| `variant` | `primary` / `secondary` / `ghost` | `secondary` | hiérarchie : plein, contour, sans fond |
| `tone` | `default` / `danger` | `default` | couleur sémantique, cumulable avec la variante |
| `size` | `sm` / `md` / `lg` | `md` | `lg` pour les appels à l'action de la page d'accueil |
| `loading` | `boolean` | `false` | désactive, pose `aria-busy` et un `Spinner` devant le libellé ; le libellé reste |
| `type` | | `button` | à poser à `submit` explicitement |

États : repos, survol (sous `(hover: hover)`), focus (`--outline-focus`), désactivé (`--opacity-disabled`), chargement (`--opacity-dimmed`). Hauteur minimale `--tap-target-min` ; `sm` dessine 40 px et étend sa zone tactile à 44 px.

### IconButton

Bouton à icône seule. `label` est obligatoire et devient `aria-label` et, sauf `showTitle={false}`, `title`.

| Prop | Type | Défaut |
|---|---|---|
| `label` | `string` | requis |
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
| `label` | `string` | `aria-label` du bouton quand le contenu visible ne suffit pas |
| `disabled` | `boolean` | bouton seulement |
| `testId` | `string` | `data-testid` |

Les tones sémantiques consomment les rôles (`--color-success-bg`…) ; `pending` garde son jeton propre `--color-badge-pending-*`. Le centrage optique du texte est intégré (`--text-optical-nudge`).

### Card

Surface de contenu. `as` change la balise (`section`, `li`…).

| Prop | Valeurs | Défaut |
|---|---|---|
| `padding` | `none` / `sm` / `md` / `lg` | `md` |
| `radius` | `md` / `lg` | `md` |
| `elevation` | `none` / `sm` / `md` / `lg` | `none` ; `md` et `lg` posent `--color-surface-raised` |
| `interactive` | `boolean` | survol et focus visibles, pour une carte cliquable |

`Modal` et `Dropdown` composent `Card` (`elevationLg`).

### Modal

Seul endroit du projet où `<dialog>` et `::backdrop` sont écrits. Fermeture par Échap, clic sur le voile et bouton de fermeture ; le `<dialog>` natif retient le focus et le rend à l'ouvreur.

| Prop | Type | Note |
|---|---|---|
| `open`, `onClose` | requis | |
| `title`, `titleId`, `labelledBy`, `describedBy`, `ariaLabel` | | un des trois nommages est requis |
| `size` | `xs` / `sm` / `md` / `base` / `xl` | `--container-<size>`, `sm` par défaut |
| `surface` | `surface` / `bare` / `media` / `borderless` | `media` pour une bande-annonce |
| `padded`, `column`, `anchoredTop`, `bottomSheetOnMobile`, `strongBackdrop` | `boolean` | |
| `closeLabel` | `string` | |

`testId` pose `data-testid` sur le `<dialog>`, `dialogRef` en donne la référence à l'appelant.

Dialogues déjà câblés dessus :

- `ConfirmDialog` : `title`, `message`, `onConfirm`, `onCancel`, `confirmLabel`, `cancelLabel`, `confirmTone` `danger` par défaut ou `default` pour une confirmation non destructive, `loading` met le bouton en chargement, `hideCancel` pour un accusé de lecture, `testId`.
- `ShareDialog` : `title`, `url`, `qrHint`, `fileSlug` (nom du PNG téléchargé), `preview` (`avatarId`, `name`, `meta`), `surface` `event` / `profile` (analytics), `shareText`, `initialTab`, `extraTab` pour un onglet propre à l'appelant.
- `ConsentDialog`, `DialogTitleBar` (`titleId`, `title`, `onClose`, `closeLabel`).

### Sheet

Feuille ancrée en bas, glissable (`SheetDrag.module.css` porte le geste). `open`, `title`, `onClose`, `footer`, `size` `md` / `lg`. Sa croix est un `IconButton`.

### Field

Câble `label`, `hint`, `error` et `aria-describedby` autour d'un champ rendu par la fonction enfant : `children({ id, describedBy, invalid })`. L'erreur porte `role="alert"`. `htmlFor` impose l'identifiant du champ quand l'appelant le connaît déjà.

`NumberInput` (`value` chaîne, `min`, `max`, `step`, `placeholder`, `invalid`, `ariaDescribedBy`), `SearchField` (`type="search"`, `placeholder`, `ariaLabel`, `ariaDescribedBy`, `iconSize` dans `ICON_SIZE`, `inputClassName`, icône décorative) et `Toggle` (`role="switch"`, `checked`, `label` ou `labelledBy`) s'y insèrent.

### ToggleRow

Une ligne de réglage : un titre, une description et un `Toggle` à droite, nommé par le titre (`aria-labelledby`). `title`, `description`, `checked`, `onChange`, `disabled`. C'est la ligne « Autoriser les séries » ou « Limiter les votes » des paramètres de soirée.

### ChoiceGroup et ChoiceCard

Un choix exclusif entre des cartes, quand `SegmentedRadioGroup` est trop étroit (une carte porte un titre, une description, une vignette). `ChoiceGroup` (`value`, `onChange`, `ariaLabel` ou `ariaLabelledBy`) rend le `role="radiogroup"` et pilote flèches, Home et End ; seule la carte cochée est tabulable, la première quand rien ne l'est.

| Prop de `ChoiceCard` | Type | Rôle |
|---|---|---|
| `value` | `string` | requis, la valeur remontée par `onChange` |
| `title`, `description` | `ReactNode` | le corps texte |
| `children` | `ReactNode` | une vignette, une image, avant le texte |
| `indicator` | `boolean` | dessine la puce ronde cochée |
| `layout` | `row` / `tile` | `tile` centre le contenu et porte le cadre de 2 px des grilles d'images |
| `dashed` | `boolean` | la carte « aucun de ces choix » |
| `label` | `string` | `aria-label` quand le contenu ne nomme pas la carte |

Chaque carte est un `<button role="radio" aria-checked>`. C'est le mode de roue, les candidats Letterboxd et la grille d'avatars.

### Menu, Dropdown, Tabs, Tooltip, InfoBubble

- `Menu` : `triggerLabel`, `triggerIcon`, `triggerClassName`, `panelLabel`, `panelClassName`, enfants sous forme de fonction `(close) => …`. Un déclencheur sur mesure (avatar, bouton à icône) garde le même comportement avec `useMenuState()` puis `MenuPanel {...menu.panelProps}` : c'est le menu du compte et celui de l'agenda. `MenuItem` : `icon`, `href` (lien externe, `external` ouvre un nouvel onglet avec `rel="noopener noreferrer"`), `to` (route interne, rend un `<Link>`), `selected`, `tone` `default` / `danger`, `disabled` rend un `<button disabled>` même avec `href` ou `to`, `aria-haspopup` quand l'entrée ouvre une boîte de dialogue. `MenuLabel`, `MenuSeparator`. Navigation aux flèches, Échap ferme, focus visible en contour interne.
- `Dropdown` : `value`, `options` (`{ value, label, disabled? }`), `onChange`, `ariaLabel`, `disabled` ; liste déroulante maison avec `role="listbox"`, une option désactivée porte `aria-disabled`, les flèches la sautent.
- `Tabs` : `idBase`, `tabs` (`{ key, label, icon?, iconOnly?, badge?, disabled? }`), `active`, `onChange`, `ariaLabel`, `variant` `underline` / `pill` ; `TabPanel` (`tabKey`, `active`). `iconOnly` garde `label` comme nom accessible sans le dessiner. Flèches et Home/End gérées en sautant les onglets désactivés, défilement horizontal avec fondus, onglet de 44 px. Toute liste d'onglets du produit passe par là, y compris les deux onglets d'une modale.
- `SegmentedRadioGroup` : `options` (`{ value, label, icon? }`), `value`, `onChange`, `ariaLabel` ou `ariaLabelledBy`, `size` `md` / `sm`, `iconOnly` (le libellé devient `aria-label`). `role="radiogroup"`, flèches, Home et End, seule l'option cochée est tabulable. C'est le sélecteur de thème, d'échelle de note et de mode de roue.
- `Tooltip` : `label`, `placement` `top` / `bottom` / `left` / `right`, `delayMs`, `focusable`. Apparaît au survol et au focus, jamais seul vecteur d'une information.
- `InfoBubble` : `label` (nom du bouton d'aide), contenu en enfants.

### États de page

- `PageLayout` : le `<main id="main-content" tabIndex={-1}>`, cible du lien d'évitement ; `ref` transmis.
- `EmptyState` : `icon`, `title`, `titleTag` `p` / `h1` / `h2`, `message`, `actions`, `compact`.
- `ErrorState` : page entière (`PageLayout`) avec `code`, `title` en `h1`, `message` (`messageRole` `alert` / `status`), `actions`.
- `SignedOutState` : `EmptyState` avec connexion et inscription qui reviennent sur `returnTo` ; trace `signed_out_cta_clicked`.
- `ServerErrorPage` : `ErrorState` 500, `onRetry` optionnel, message d'erreur masqué en production.
- `Skeleton` (`variant` `text` / `circle` / `poster` / `block`, `width`, `height`) et `SkeletonScreen` (`label`, `role="status"`, `aria-busy`).
- `ErrorBoundary` : attrape les erreurs de rendu et affiche `ServerErrorPage`.

### Divers

- `Avatar` : `avatarId`, `pseudo`, `size` `xs` / `sm` / `md` / `lg` / `xl` (`--avatar-*`). Sans identifiant, initiales sur l'une des huit couleurs `--color-avatar-*`, choisie par le pseudo ; sans pseudo, pastille vide. Toujours décoratif (`aria-hidden`), le nom est porté par le texte voisin. Les tailles sont déclarées en `:where()` : un module qui doit redimensionner un avatar pose `width` et `height` sur sa propre classe, sans `!important`.
- `AvatarStack` : `people` (`{ key, avatarId, pseudo }`), `max` (3), `hidden` quand la liste n'est qu'un échantillon, `size` `xs` / `sm`, `label`. Avatars chevauchés d'un quart, anneau `--avatar-stack-ring` (le fond de page par défaut, la surface ou l'anneau d'affiche via une classe), pastille « +N » pour le reste. Décoratif sans `label`, `role="img"` avec.
- `EventLifecyclePill` : `lifecycle` `upcoming` / `live` / `pending` / `finished`, `label`, `detail` ; seul `live` pulse. Seul consommateur légitime de `--color-badge-*` avec `Chip` `pending`.
- `ViewModeToggle` : barre d'outils grille / liste, `aria-pressed` sur le mode courant, boutons de 30 px à zone tactile étendue.
- `QrCode` : `value`, `title` ; SVG de 240 px.

## Tests

Chaque composant partagé a son fichier `*.test.tsx` à côté de lui. Un test de composant vérifie le rôle et le nom accessible, les états (`disabled`, `aria-pressed`, `aria-busy`, `aria-checked`) et les classes de variante via l'import du module CSS, jamais un nom de classe en dur.
