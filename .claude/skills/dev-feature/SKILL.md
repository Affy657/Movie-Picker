---
name: dev-feature
description: Flow de dev complet d'une feature roadmap Movie Picker, de la lecture du scope au déploiement. Déclenché avec « /dev-feature <nom de la feature> ». L'argument est le nom (ou un extrait) d'une feature présente dans la roadmap (docs/roadmap-product.md).
---

# /dev-feature — flow de dev d'une feature

Orchestre le cycle complet d'une feature, du scope au déploiement. L'argument `$ARGUMENTS` est le nom de la feature à développer.

Les règles de style et de workflow du repo (zéro commentaire, `verify:local` avant push, jamais skip les hooks) sont dans [AGENTS.md](../../../AGENTS.md) — les respecter, ne pas les redéfinir ici.

**Deux règles qui structurent tout le flow :**
- Les suites de tests lourdes se lancent **juste avant le commit** (étape 7), jamais à la fin du dev.
- Le commit et le push n'ont lieu **qu'après** que l'utilisateur a testé la feature lui-même et donné son go.

## Étape 1 — Lire la feature

- Chercher `$ARGUMENTS` dans [docs/roadmap-product.md](../../../docs/roadmap-product.md), features d'abord, puis les sections Tech.
- Lire la ligne trouvée + tout doc lié qu'elle référence (ex. `docs/parcours-soiree.md`) pour comprendre le scope réel.
- Si rien ne correspond, ne pas inventer : lister les features approchantes trouvées et demander laquelle.

## Étape 2 — Cadrage

La roadmap ne donne qu'un nom et une phrase : poser les questions nécessaires pour partir dans la bonne direction. Reformuler brièvement ce qui a été compris, puis poser les questions ouvertes — UX, comportement edge-case, scope, interactions avec une autre feature.

**STOP. Terminer le message et attendre la réponse de l'utilisateur. Ne pas écrire de code, ne pas continuer le flow. Reprendre uniquement quand l'utilisateur a répondu et donné son go.**

## Étape 3 — Maquettage (conditionnel)

Décider d'abord si l'étape s'applique. **Sauter le maquettage** dans ces cas :
- la feature ne touche pas au front (API seule, infra, CI, script) ;
- le changement front est petit et localisé (un libellé, un champ de plus dans un formulaire existant, un bouton dans un composant déjà en place) ;
- l'utilisateur a déjà décrit précisément le rendu attendu, ou fourni une maquette ou une capture annotée.

Sinon (nouvel écran, refonte de page, nouveau composant structurant, changement de hiérarchie visuelle), produire une maquette **avant** d'écrire du code :
- Page HTML autonome publiée en Artifact, reprenant les jetons de design du projet (`apps/web/src/styles/01-foundation.css`) pour que la maquette ressemble à l'app et pas à un wireframe générique.
- Montrer les états qui comptent (vide, chargé, hôte / participant, mobile), pas seulement le cas nominal.
- Annoter les partis pris et lister explicitement les points à trancher ; proposer des variantes quand un choix est ouvert plutôt que d'imposer une option.
- Réutiliser les composants existants de l'app plutôt que d'en inventer : vérifier dans le code s'il existe déjà une pastille, un menu ou un bouton pour ce besoin.

**STOP. Terminer le message avec le lien de la maquette et attendre les retours. Itérer sur la maquette jusqu'à ce que l'utilisateur valide. Ne pas écrire de code avant son go.**

## Étape 4 — Dev en autonomie

- Implémenter la feature de bout en bout (front `apps/web`, API `apps/api-dotnet`, tests).
- Suivre AGENTS.md. Préférer éditer l'existant plutôt que créer.
- Vérifications **ciblées** uniquement pendant le dev : `tsc --noEmit`, `eslint`, `vitest run <chemin>` sur les fichiers touchés. Pas de suite complète, pas de `test:coverage`, pas de `verify:local` à ce stade.

## Étape 5 — Lancer front + back pour test manuel

Démarrer les deux serveurs en tâche de fond (config dans [.claude/launch.json](../launch.json)) :
- **web** → `pnpm --filter web dev` (http://localhost:5173)
- **api** → `dotnet run --project apps/api-dotnet/MoviePicker.Api/MoviePicker.Api.csproj` (http://localhost:4000)

Vérifier rapidement qu'ils démarrent sans erreur (logs / preview), donner les URLs à l'utilisateur et lui demander de tester.

**STOP. Terminer le message et attendre. Ne pas continuer le flow. Si l'utilisateur signale un problème : corriger, relancer les serveurs, lui demander de re-tester — et STOP à nouveau. Répéter jusqu'à ce qu'il donne explicitement son go pour passer à l'étape suivante.**

## Étape 6 — Code review et roadmap

- Invoquer `/code-review`. Appliquer les retours pertinents ; re-tester manuellement si le diff a bougé de façon notable.
- Marquer la feature `✅` dans la roadmap où elle était (étape 1), avec la date du jour si le format du fichier le prévoit.

## Étape 7 — Tests, commit, push, CI

Dans cet ordre, et seulement une fois le go de l'utilisateur obtenu à l'étape 5 :

- Arrêter les serveurs de dev avant de lancer les suites : les laisser tourner sature le CPU et provoque de faux échecs par timeout.
- `pnpm run verify:local` et corriger toute erreur **avant** de push (obligatoire, cf. AGENTS.md). Jamais skip les hooks.
- Commit + push sur `master` (code + mise à jour roadmap en un seul commit).
- Surveiller la CI (`gh run list` / `gh pr checks`), corriger jusqu'à ce que tout soit vert **et déployé**. Reboucler autant que nécessaire.
