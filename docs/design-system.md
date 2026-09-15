# Design system

Les composants partagés de `apps/web/src/shared/components/`, leurs props, leurs états et ce qu'ils garantissent pour l'accessibilité. Les règles d'usage (réutiliser avant d'écrire, jetons obligatoires, `:hover` sous `(hover: hover)`) sont dans [`AGENTS.md`](../AGENTS.md) et vérifiées par `pnpm run check:architecture`. Ce document décrit ce que chaque composant fait ; quand un composant change, cette page change dans le même commit.

## Jetons

Tous dans `apps/web/src/styles/01-foundation.css`, sauf ceux propres à la page d'accueil, dans `app/pages/landing/landingPalette.css`.

| Famille | Jetons | Note |
|---|---|---|
| Espacement | `--space-0` à `--space-24`, demi-pas jusqu'à `--space-3-5` | base 4 px ; `--tap-target-min` (44 px) est la seule taille qui n'appartient pas à la grille |
| Typographie | `--font-size-4xs` à `--font-size-6xl`, `--font-weight-regular/medium/semibold/bold/extrabold`, `--leading-*`, `--tracking-*`, `--font-body`, `--font-mono` | aucune valeur littérale de graisse, d'interlignage ou d'approche dans un module |
| Rayons | `--radius-xs` (4 px), `-sm` (6 px), `-md` (12 px), `-lg` (18 px), `-pill` | |
| Bordures | `--border-width-field` (1,5 px) | tout autre trait fait 1 px ou 2 px |
| Focus | `--outline-focus` (contour), `--ring-focus` (halo pour les champs) | un `:focus-visible` qui retire le contour pose le halo, jamais un simple fond |
| Ombres | `--shadow-sm/md/lg`, `--shadow-hero-card`, `--shadow-wheel` | en sombre l'élévation se lit sur `--color-surface-raised`, pas sur l'ombre |
| Mouvement | `--duration-instant` à `--duration-slow` (0,10 à 0,20 s), `--duration-enter` (0,25 s), `--duration-sheet` (0,32 s), `--duration-reveal` (0,6 s), `--duration-spin` (0,8 s), `--duration-pulse` (1,2 s), `--duration-shimmer` (1,4 s), `--duration-breathe` (2,4 s) ; `--ease-default/in-out/out/linear/reveal/spring` | une boucle décorative propre à un composant déclare son propre jeton dans son module (`--flame-flicker-duration`) |
| Couleurs | primitives `--blue-600`… réservées à la fondation ; rôles `--color-*` consommés par les modules | voir le tableau des rôles dans `AGENTS.md` |
| Teintes de surface | `--color-surface-hover` (6 %), `-hover-strong` (10 %), `-active` (12 %), `-sunken`, `-translucent`, `--color-bg-tint`, `--color-bg-translucent` | remplacent tout `color-mix()` maison sur le texte, le fond ou la surface |
| Sur affiche | `--on-poster-*` | texte, bordures et voiles posés sur une image sombre |
| Profondeur | `--z-below` à `--z-skip-link` | |
| Largeurs | `--container-xs` (28 rem) à `--container-3xl` (84 rem) | les tailles de `Modal` s'y alignent |

Trois portées de thème : `[data-theme='light']`, `[data-theme='dark']` et `.on-dark` (un bloc sombre posé dans une page claire, la carte d'accueil par exemple). Un rôle ajouté au clair se déclare dans les trois.

## Composants

Sauf mention, chaque composant accepte `className` et transmet les attributs HTML natifs à son élément racine.

### Button

Le bouton du produit. `buttonClass()` donne la même composition de classes à un `<Link>` ou un `<a>`.

| Prop | Type | Défaut | Rôle |
|---|---|---|---|
| `variant` | `primary` / `secondary` / `ghost` | `secondary` | hiérarchie : plein, contour, sans fond |
| `tone` | `default` / `danger` | `default` | couleur sémantique, cumulable avec la variante |
| `size` | `sm` / `md` / `lg` | `md` | `lg` pour les appels à l'action de la page d'accueil |
| `loading` | `boolean` | `false` | désactive, pose `aria-busy` et un spinner devant le libellé ; le libellé reste |
| `type` | | `button` | à poser à `submit` explicitement |

États : repos, survol (sous `(hover: hover)`), focus (`--outline-focus`), désactivé (opacité 0,5), chargement. Hauteur minimale `--tap-target-min`.

### IconButton

Bouton à icône seule. `label` est obligatoire et devient `aria-label` et, sauf `showTitle={false}`, `title`.

| Prop | Type | Défaut |
|---|---|---|
| `label` | `string` | requis |
| `size` | `sm` / `md` / `lg` | `md` |
| `tone` | `default` / `danger` / `onPoster` | `default` |
| `expandHitArea` | `boolean` | `true`, étend la zone tactile à 44 px sans changer le dessin |
| `loading` | `boolean` | `false`, remplace l'icône par le spinner |

### LinkButton

Un `<button>` qui ressemble à un lien, pour une action secondaire dans une phrase. `size` : `sm` (défaut) / `md`.

### Chip

Pastille, badge, filtre ou étiquette d'état.

| Prop | Type | Défaut |
|---|---|---|
| `tone` | `neutral` / `primary` / `success` / `warning` / `pending` / `danger` / `muted` | `neutral` |
| `size` | `sm` / `md` | `md` |
| `icon` | composant Lucide | |
| `onClick` | | rend un `<button>` ; `pressed` pose `aria-pressed`, `selected` le style plein |
| `onRemove`, `removeLabel` | | ajoute la croix de retrait |
| `label` | `string` | `aria-label` du bouton quand le contenu visible ne suffit pas |
| `disabled` | `boolean` | bouton seulement |

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
| `size` | `sm` / `md` / `lg` / `xl` / `xxl` | `--container-xs/sm/md/base/xl` |
| `surface` | `surface` / `bare` / `media` / `borderless` | `media` pour une bande-annonce |
| `padded`, `column`, `anchoredTop`, `bottomSheetOnMobile`, `strongBackdrop` | `boolean` | |
| `closeLabel` | `string` | |

Dialogues déjà câblés dessus : `ConfirmDialog` (`title`, `message`, `confirmLabel`, `confirmVariant` `danger` par défaut, `busy` met le bouton en chargement), `ShareDialog`, `ConsentDialog`, `DialogTitleBar` (`titleId`, `title`, `onClose`, `closeLabel`).

### Sheet

Feuille ancrée en bas, glissable (`SheetDrag.module.css` porte le geste). `open`, `title`, `onClose`, `footer`, `size` `default` / `tall`.

### Field

Câble `label`, `hint`, `error` et `aria-describedby` autour d'un champ rendu par la fonction enfant : `children({ id, describedBy, invalid })`. L'erreur porte `role="alert"`.

`NumberInput` (`value` chaîne, `min`, `max`, `step`, `invalid`, `ariaDescribedBy`), `SearchField` (`type="search"`, `ariaLabel`, `ariaDescribedBy`, icône décorative) et `Toggle` (`role="switch"`, `checked`, `label` ou `labelledBy`) s'y insèrent.

### Menu, Dropdown, Tabs, Tooltip, InfoBubble

- `Menu` : `triggerLabel`, `triggerIcon`, `panelLabel`, enfants sous forme de fonction `(close) => …` ; `MenuItem` (`icon`, `href`, `selected`, `danger`), `MenuLabel`, `MenuSeparator`. Navigation aux flèches, Échap ferme, focus visible en contour interne.
- `Dropdown` : `value`, `options` (`{ value, label }`), `onChange`, `ariaLabel` ; liste déroulante maison avec `role="listbox"`.
- `Tabs` : `idBase`, `tabs` (`{ key, label, icon?, badge? }`), `active`, `onChange`, `ariaLabel`, `variant` `underline` / `pill` ; `TabPanel` (`tabKey`, `active`). Flèches et Home/End gérées, défilement horizontal avec fondus.
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

- `Avatar` : `avatarId`, `pseudo`, `size` `xs` / `sm` / `md` / `lg` / `xl`. Sans identifiant, initiales colorées par le pseudo ; sans pseudo, pastille vide. Toujours décoratif (`aria-hidden`), le nom est porté par le texte voisin.
- `EventLifecyclePill` : `lifecycle` `upcoming` / `live` / `pending` / `finished`, `label`, `detail` ; seul `live` pulse. Seul consommateur légitime de `--color-badge-*` avec `Chip` `pending`.
- `ViewModeToggle` : barre d'outils grille / liste, `aria-pressed` sur le mode courant.
- `QrCode` : `value`, `title` ; SVG de 240 px.

## Tests

Chaque composant partagé a son fichier `*.test.tsx` à côté de lui. Un test de composant vérifie le rôle et le nom accessible, les états (`disabled`, `aria-pressed`, `aria-busy`, `aria-checked`) et les classes de variante via l'import du module CSS, jamais un nom de classe en dur.
