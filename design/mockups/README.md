# Maquettes de Movie Picker

Les écrans de l'application dans la direction artistique « Salle obscure en bleu », retenue le 9 novembre 2026. Ils sont publiés dans un canvas Design de claude.ai, **Movie Picker, Salle obscure en bleu** :

https://claude.ai/artifact/Hi7sLHFHDPK3LhYqoHrKbJ

Le canvas tient sur une seule page :

- en haut, la planche (couleurs, statuts, typographie, composants) et le **Sommaire**, qui liste les 93 écrans ;
- en dessous, six sections : Parcours principal, Connexion et réglages, Films et listes, Soirées (suite), Notifications et profils, Pages publiques et système ;
- dans chaque section, les écrans ordinateur (1120 × 700) puis les écrans téléphone (375 × 800).

Tous les écrans sont cliquables. Lancez le mode Play sur le Sommaire, ouvrez un écran, puis naviguez comme dans l'application.

Le canvas sert à dessiner une page ou un changement d'interface avant de le développer.

## Règles de contenu

- **Rien d'inventé.** Un écran montre ce que l'application fait vraiment, ou ce qu'une feature de `docs/roadmap.md` doit faire. Une action, un filtre ou un réglage absent de l'application n'a rien à faire dans la maquette.
- **Données fictives.** Les films, les affiches et les invités sont inventés (`FILMS`, `PEOPLE` et `PROGRAM` dans `foundation.py`). Aucune image ne vient de TMDB.
- **Textes en français**, au vouvoiement, avec les libellés de `apps/web/src/shared/i18n/locales/fr.ts` quand ils existent. Comme partout dans le dépôt : pas de tiret cadratin, pas de point médian, pas de flèche.
- **Couleurs et arrondis de l'application**, repris de `apps/web/src/styles/01-foundation.css`. Ce qui est propre à la direction artistique :
  - les titres en Archivo étroite et en capitales ;
  - le bleu réservé à l'action principale et aux états choisis, sans halo autour des boutons ;
  - le cyan, couleur secondaire de l'application, pour les surtitres et le compte à rebours ;
  - une couleur par statut : vert pour le vote ouvert, cyan pour une soirée à venir, orange pour une soirée en suspens, gris pour une soirée terminée, indigo pour l'hôte, rouge pour le direct.
- **La roue** reprend les couleurs de l'application (`--color-wheel-*`), avec des parts proportionnelles aux chances de chaque film.
- **Notes sur 5**, l'échelle par défaut de l'application, suivies d'une étoile, sans cadre TMDB. Les notes restent blanches ; seules les étoiles de sa propre note sont bleues.
- **Pas de titre de film sous une affiche** : l'affiche le porte déjà.
- **Pas de titre de page quand un onglet actif le dit déjà** (barre de navigation, onglets d'Explorer, menu des réglages). Le titre reste pour les lecteurs d'écran, avec `<h1 class="vh">`.
- **Accessibilité** : cibles tactiles de 44 px sur téléphone ; texte de 12 px au moins, 11 px pour les capitales espacées.

## Fichiers

| Fichier | Rôle |
|---|---|
| `manifest.py` | La liste des écrans : numéro, slug, libellé, appareil, section, module. C'est la source des numéros et des noms. |
| `foundation.py` | Icônes, films, affiches, avatars, polices et CSS de base. |
| `base_screens.py` | Les vingt écrans d'origine (01 à 20), la planche, les helpers (`href`, `hole`, `on`, `when`, `component`…) et la CSS commune. |
| `screens_accounts.py` | Connexion et réglages (21 à 34), CSS préfixée `.xa-`. |
| `screens_movies.py` | Films et listes (35 à 46, 91, 92), CSS préfixée `.xb-`. |
| `screens_events.py` | Soirées, suite (47 à 61, 87 à 90), CSS préfixée `.xc-`. |
| `screens_social.py` | Notifications et profils (62 à 70), CSS préfixée `.xd-`. |
| `screens_public.py` | Pages publiques et système (71 à 86), CSS préfixée `.xe-`. |
| `canvas_lib.py` | Habillage d'un écran en artboard du canvas. |
| `build_canvas.py` | Assemble les 95 artboards, le Sommaire et `canvas.json`. |
| `preview_module.py` | Rend un module seul et le contrôle avec `tools/check-module.cjs`. |
| `tools/interaction-tests.cjs` | Rend tous les artboards et rejoue les interactions (votes, filtres, roue, défilement, liens). |

Tout ce qui est généré va dans `build/`, ignoré par git.

## Ajouter ou modifier un écran

1. Ajouter une ligne dans `manifest.py`, avec un numéro libre sous 100.
2. Écrire la fonction `screen_NN()` dans le module de la section et la déclarer dans son `SCREENS`. Si l'écran réagit aux clics, ajouter sa logique dans `LOGIC`.
3. Relier l'écran aux autres : `href("NN-slug")` pour un lien, en reprenant les vrais chemins de l'application.
4. Régénérer et vérifier (ci-dessous), puis republier.

Un artboard garde son propre état. Un parcours qui doit partager un état entre plusieurs vues tient donc dans un seul écran, avec des `when(...)`.

Les briques communes à reprendre plutôt qu'à refaire :

- `hdr()` pour l'en-tête d'un compte connecté, `guest_hdr()` pour un visiteur. Comme dans l'application, la recherche n'est pas dans l'en-tête : elle est sur Explorer.
- `event_bar()` et `event_actions()` pour la barre d'actions d'une soirée, identique dans tous ses états.
- `crowd()` pour une pile d'avatars : quatre au plus, puis « +N ».
- La classe `util` sur le titre d'une page utilitaire (réglages, notifications, pages légales), plus petit que celui d'un écran principal.
- `rating()` pour une note TMDB (convertie sur 5, suivie d'une étoile), `on5()` pour convertir une note sur 10.
- La classe `est` (avec `vote`, `soon` ou `wait`) pour le statut d'une soirée, et les classes `st-live`, `st-soon`, `st-wait`, `st-done` et `st-host` pour colorer une pastille existante.
- `wheel()` pour la roue, `wheel_face()` pour la dessiner ailleurs (page d'accueil).

## Régénérer et vérifier

Il faut Python 3.12 ou plus et les dépendances du dépôt (`pnpm install`), pour Playwright.

```bash
python design/mockups/build_canvas.py
```

```bash
node design/mockups/tools/interaction-tests.cjs
```

```bash
python design/mockups/preview_module.py screens_events
```

Les deux contrôles rendent les écrans avec le vrai moteur du canvas, `tools/dc-runtime.js`. Ce fichier n'est pas versionné : c'est le code de claude.ai, servi avec le canvas. Pour le récupérer, lire le fichier `artifact-type/dc-runtime.js` du canvas avec l'outil Artifact de Claude Code (action `read`, avec `path`), puis le copier dans `design/mockups/tools/`.

Si Playwright ne trouve pas son navigateur, lancer `pnpm exec playwright install chromium`, ou indiquer un Chromium déjà installé dans la variable `MOCKUP_CHROMIUM`.

Ce que les contrôles vérifient : chaque lien mène à un écran du manifeste, aucun trou `{{ }}` ne reste, Archivo et Inter sont chargées, la console est vide, aucun texte ne passe sous 11 px, aucun élément ne déborde du cadre, et la typographie interdite est absente. La liste des films de l'écran 12 et la roue de l'écran 13 sortent volontairement du cadre.

## Publier

Avec l'outil Artifact de Claude Code, en mettant à jour le canvas existant :

- `url` : le lien du canvas ci-dessus ;
- `file_path` : `design/mockups/build/canvas/project/canvas.json` ;
- `root` : `design/mockups/build/canvas` ;
- `files` : chaque `project/*.dc.html` vers lui-même (95 fichiers, environ 9 Mo, en un seul appel), jamais `support.js`.

**Ces scripts sont la seule source de vérité.** Une retouche faite directement dans claude.ai est écrasée à la publication suivante. Si quelqu'un a modifié le canvas, le relire avant de publier et reporter la retouche ici.

## Écarts connus avec l'application

Choix de maquette, à reporter dans l'application quand l'écran sera développé :

- Mes soirées (05, 16, 55) n'a plus d'onglets Actives et Historique : l'historique est affiché sous les soirées à venir.
- Les surtitres, le compte à rebours et les statuts ont leurs propres couleurs ; l'application utilise encore l'ambre pour une soirée à venir.

Écarts restants :

- Le menu du compte (63) contient aussi Apparence, Nouveautés et Signaler un problème, qui sont dans le pied de page de l'application.
- La maquette vouvoie partout, alors que `fr.ts` tutoie encore à quelques endroits (« Vérifie ta boîte mail », « Organise la tienne »).
- La feuille de filtres 46 sert aussi à la recherche et aux tendances sur téléphone, alors que l'application n'y propose que Genre, Type et Décennie.
- Certains états rares ne sont pas dessinés : confirmations, chargement, lien expiré, recadrage de photo.
- Quelques liens passent d'un écran téléphone à un écran ordinateur quand la version téléphone n'existe pas (pages légales, abonnés, liste d'un ami).
