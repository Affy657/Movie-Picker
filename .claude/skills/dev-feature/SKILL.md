---
name: dev-feature
description: Flow de dev complet d'une feature roadmap Movie Picker, de la lecture du scope au déploiement. Déclenché avec « /dev-feature <nom de la feature> ». L'argument est le nom (ou un extrait) d'une feature présente dans une roadmap (docs/roadmap-product.md, docs/roadmap-tech.md, docs/FIXES.md).
---

# /dev-feature — flow de dev d'une feature

Orchestre le cycle complet d'une feature, du scope au déploiement. L'argument `$ARGUMENTS` est le nom de la feature à développer.

Les règles de style et de workflow du repo (zéro commentaire, `verify:local` avant push, jamais skip les hooks) sont dans [AGENTS.md](../../../AGENTS.md) — les respecter, ne pas les redéfinir ici.

## Étape 1 — Lire la feature

- Chercher `$ARGUMENTS` dans, par ordre : [docs/roadmap-product.md](../../../docs/roadmap-product.md), [docs/roadmap-tech.md](../../../docs/roadmap-tech.md), [docs/FIXES.md](../../../docs/FIXES.md).
- Lire la ligne trouvée + tout doc lié qu'elle référence (ex. `docs/parcours-soiree.md`) pour comprendre le scope réel.
- Si rien ne correspond, ne pas inventer : lister les features approchantes trouvées et demander laquelle.

## Étape 2 — Cadrage

La roadmap ne donne qu'un nom et une phrase : poser les questions nécessaires pour partir dans la bonne direction. Reformuler brièvement ce qui a été compris, puis poser les questions ouvertes — UX, comportement edge-case, scope, interactions avec une autre feature.

**STOP. Terminer le message et attendre la réponse de l'utilisateur. Ne pas écrire de code, ne pas continuer le flow. Reprendre uniquement quand l'utilisateur a répondu et donné son go.**

## Étape 3 — Dev en autonomie

- Implémenter la feature de bout en bout (front `apps/web`, API `apps/api-dotnet`, tests).
- Suivre AGENTS.md. Préférer éditer l'existant plutôt que créer.

## Étape 4 — Lancer front + back pour test manuel

Démarrer les deux serveurs en tâche de fond (config dans [.claude/launch.json](../launch.json)) :
- **web** → `pnpm --filter web dev` (http://localhost:5173)
- **api** → `dotnet run --project apps/api-dotnet/MoviePicker.Api/MoviePicker.Api.csproj` (http://localhost:4000)

Vérifier rapidement qu'ils démarrent sans erreur (logs / preview), donner les URLs à l'utilisateur et lui demander de tester.

**STOP. Terminer le message et attendre. Ne pas continuer le flow. Si l'utilisateur signale un problème : corriger, relancer les serveurs, lui demander de re-tester — et STOP à nouveau. Répéter jusqu'à ce qu'il donne explicitement son go pour passer à l'étape suivante.**

## Étape 5 — Code review

- Invoquer `/code-review`.
- Appliquer les retours pertinents. Re-tester si le diff a bougé de façon notable.

## Étape 6 — Cocher dans la roadmap

- Marquer la feature `✅` dans la roadmap où elle était (étape 1), avec la date du jour si le format du fichier le prévoit.

## Étape 7 — Commit, push, CI

- `pnpm run verify:local` et corriger toute erreur **avant** de push (obligatoire, cf. AGENTS.md). Jamais skip les hooks.
- Commit + push sur `master` (code + mise à jour roadmap en un seul commit).
- Surveiller la CI (`gh run list` / `gh pr checks`), corriger jusqu'à ce que tout soit vert **et déployé**. Reboucler autant que nécessaire.
