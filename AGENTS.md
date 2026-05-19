# AGENTS.md

Règles pour les agents IA travaillant sur ce repo.

## Style de code

**Ne jamais écrire de commentaires dans le code.**

- Pas de `//`, pas de `/* */`, pas de JSDoc, pas de XML doc C# (`///`).
- Les noms d'identifiants doivent porter l'intention.
- Exception : directives fonctionnelles uniquement (`@ts-expect-error`, `eslint-disable-*`, `prettier-ignore`, `/// <reference ... />`, shebangs `#!`, headers de licence).

Si on ne peut pas exprimer l'intention via le nommage ou la structure, refactoriser le code — pas ajouter un commentaire.

## Workflow

**Avant tout push sur master, toujours exécuter `pnpm run verify:local` et corriger toute erreur avant de push.** Cette vérification couvre lint, format, tests front et tests API — elle est obligatoire quelle que soit la conversation ou la feature.

- Ne jamais skip les hooks pre-push.
- Préférer éditer les fichiers existants à en créer de nouveaux.

## Stack

Monorepo pnpm + Turbo :
- `apps/web` — Vite + React + TypeScript
- `apps/mobile` — Expo + React Native
- `apps/api-dotnet` — .NET + MongoDB
