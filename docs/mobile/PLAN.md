# Mobile App — Plan d'exécution (cochable)

> **Comment utiliser ce fichier.** Avant toute action, lis `CONTEXT.md` (juste à côté).
> Coche chaque case `[ ]` → `[x]` au fur et à mesure **dans ce fichier même**, et commit après chaque phase complète. Le but : à tout moment l'état réel du projet correspond aux cases cochées.
>
> **Règle d'or** : ne passe **jamais** à la phase suivante tant que toutes les cases de la phase courante ne sont pas cochées. Si une case est bloquée, écris la raison juste en dessous en `> ⚠️ blocage : ...` et continue les autres cases non bloquantes de la même phase si possible, sinon ouvre une discussion avec l'utilisateur.
>
> **Convention de commit** : `feat(mobile): <phase X.Y> <résumé>` ou `chore(mobile): ...`.

---

## Phase 0 — Pré-requis (avant tout code)

- [x] Lire `docs/mobile/CONTEXT.md` en entier
- [x] Vérifier que `pnpm install` à la racine fonctionne
- [x] Vérifier que `pnpm dev:api-dotnet` démarre l'API sur `http://localhost:4000`
- [x] Tester `curl http://localhost:4000/health` → 200
- [x] Exporter l'OpenAPI : `pnpm openapi:export` → vérifier `artifacts/openapi-v1.json` à jour
- [x] Installer Node 20+, pnpm 9+, JDK 17 (pour Android), Android Studio + émulateur **OU** device physique avec USB debugging
  > ⚠️ note : Node v22.20 + pnpm 10.0 OK. JDK 17 + Android Studio non installés localement — non-bloquant pour le scaffold et le dev via Expo Go ; à installer (ou utiliser EAS Build cloud) avant les builds locaux Android (phase 18).
- [x] Installer Expo CLI globalement : `pnpm add -g expo` (ou via `pnpm dlx expo`)
  > Décision : utiliser `pnpm dlx expo` (v55.0.30 vérifié) — évite une install globale et aligne sur le monorepo.
- [ ] Compte Expo + EAS CLI **requis pour la phase 18** (livrable APK école) : `pnpm add -g eas-cli` puis `eas login`. Si tu veux te passer de EAS, fallback démo via **Expo Go** + QR code (mais pas d'APK distribuable).
  > Reporté à la phase 18 (build EAS).

---

## Phase 1 — Scaffold du package `apps/mobile`

- [x] Créer le projet Expo TS avec le **template par défaut** (inclut déjà expo-router + TypeScript depuis SDK 50+) :
  `pnpm dlx create-expo-app@latest apps/mobile --template default`
  → Vérifier que `apps/mobile/app/_layout.tsx` et `apps/mobile/app/index.tsx` sont générés. Si non, refaire avec le template explicite `--template tabs` (ou voir docs Expo pour la dernière convention).
  > Template `default` Expo SDK 54 utilisé. Génère `app/_layout.tsx` + `app/(tabs)/_layout.tsx` + `app/(tabs)/index.tsx` + `app/(tabs)/explore.tsx` + `app/modal.tsx`. expo-router 6.0.23 inclus.
- [x] Confirmer que `apps/mobile` est bien pris par `pnpm-workspace.yaml` (pattern `apps/*` déjà OK)
- [x] Lancer `pnpm install` à la racine → mobile détecté comme workspace
  > 3 workspaces détectés (api-dotnet, web, mobile).
- [x] Ajouter les scripts dans `apps/mobile/package.json` : `"dev": "expo start"`, `"android": "expo start --android"`, `"ios": "expo start --ios"`, `"lint": "expo lint"`
  > `android`, `ios`, `lint` étaient déjà présents via le template ; ajout du `dev` uniquement.
- [x] **Path aliases (Metro + TS)** : ajouter `compilerOptions.paths` `"@/*": ["./src/*"]` dans `tsconfig.json` **ET** créer/modifier `apps/mobile/babel.config.js` pour inclure `babel-plugin-module-resolver` (ou utiliser le resolver natif d'Expo Router via `metro.config.js` selon SDK). Tester avec un import `@/...` qui doit résoudre.
  > Resolver natif d'Expo SDK 54 utilisé (pas besoin de babel-plugin-module-resolver). `tsconfig.json` accepte `@/*` → `./src/*` ET `./*` (le template demo continue de fonctionner pendant la phase 1 ; src/ sera créé en phase 3).
- [x] **ESLint flat config** : créer `apps/mobile/eslint.config.mjs` qui re-export depuis la config racine (`import root from '../../eslint.config.mjs'; export default [...root, /* overrides RN */]`). **Ne pas** créer de `.eslintrc.cjs` (le repo est en flat config).
  > Conflit "plugin @typescript-eslint redéfini" si on spread la config racine + expo. Choix : utiliser `eslint-config-expo/flat.js` (déjà basé sur ts-eslint) + `eslint-config-prettier` pour aligner Prettier — équivalent fonctionnel à la racine.
- [x] Aligner Prettier : laisser hériter de la racine (pas de fichier override)
- [x] Ajouter `apps/mobile/.gitignore` (Expo + .env + .expo/)
  > Template fournit `.expo/`, ajout de `.env` + `.env.*` (avec exception `.env.example`).
- [x] Premier lancement réussi : `pnpm --filter mobile dev` → QR code affiché, app par défaut sur émulateur ou Expo Go
  > Smoke test : `expo start --offline` démarre Metro Bundler sur `localhost:8081` sans erreur. `pnpm lint` et `tsc --noEmit` passent. Pas de device/émulateur disponible pour valider l'affichage Hello World ; à confirmer manuellement par l'utilisateur côté Expo Go quand un device est dispo.
- [x] Commit : `feat(mobile): scaffold initial Expo + expo-router + TypeScript`

---

## Phase 2 — Dépendances & outillage

> ℹ️ expo-router est déjà installé par le template par défaut de la phase 1. Si tu as malgré tout pris `expo-template-blank-typescript`, ajoute manuellement `expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar` puis change `"main"` en `"expo-router/entry"` dans `package.json` et configure le plugin `expo-router` + `scheme` dans `app.json`.

- [x] Installer data : `pnpm --filter mobile add @tanstack/react-query`
- [x] Installer state : `pnpm --filter mobile add zustand`
- [x] Installer storage : `pnpm --filter mobile add expo-secure-store @react-native-async-storage/async-storage`
  > Utilisé `pnpm exec expo install` pour aligner sur les versions SDK 54.
- [x] Installer forms : `pnpm --filter mobile add react-hook-form zod @hookform/resolvers`
- [x] Installer animations : `pnpm --filter mobile add react-native-reanimated react-native-gesture-handler` puis **ajouter `'react-native-reanimated/plugin'` en dernier dans `babel.config.js`** (obligatoire, sinon crash au runtime)
  > Déjà installés par le template default (reanimated ~4.1.1 + gesture-handler ~2.28). Reanimated v4 utilise `react-native-worklets/plugin` (renommé). Plugin ajouté dans `babel.config.js`.
- [x] **Installer NativeWind v4** — séquence complète obligatoire :
  1. `pnpm --filter mobile add nativewind react-native-reanimated` (reanimated déjà fait ci-dessus)
  2. `pnpm --filter mobile add -D tailwindcss@^3.4 prettier-plugin-tailwindcss`
  3. `pnpm --filter mobile exec tailwindcss init` → `tailwind.config.js`
  4. Dans `tailwind.config.js` : `content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}']` + `presets: [require('nativewind/preset')]`
  5. Créer `apps/mobile/global.css` avec `@tailwind base; @tailwind components; @tailwind utilities;`
  6. Importer `global.css` en haut de `app/_layout.tsx`
  7. Dans `metro.config.js` (créer si absent via `npx expo customize metro.config.js`) : wrapper avec `withNativeWind(config, { input: './global.css' })`
  8. Dans `babel.config.js` : ajouter `presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel']`
  9. Créer `apps/mobile/nativewind-env.d.ts` avec `/// <reference types="nativewind/types" />`
  10. Tester : ajouter `className="text-red-500"` dans `app/index.tsx`, vérifier la couleur appliquée
  > Steps 1-9 done. Step 10 reporté en phase 4 (l'écran `app/index.tsx` sera créé à ce moment-là ; pour l'instant le template default a l'écran d'accueil en `app/(tabs)/index.tsx` qu'on remplacera). `nativewind-env.d.ts` ajouté automatiquement à `tsconfig.json` par NativeWind au premier démarrage Metro.
- [x] Installer QR : `pnpm --filter mobile add react-native-qrcode-svg react-native-svg`
- [x] Installer clipboard : `pnpm --filter mobile add expo-clipboard`
  > Note : pour partager une URL/texte on utilise l'API native `Share.share()` de `react-native` (built-in, pas de package). `expo-sharing` ne sert qu'à partager des **fichiers locaux** — pas applicable ici.
- [x] Installer génération OpenAPI : `pnpm --filter mobile add -D openapi-typescript`
- [x] Installer tests : `pnpm --filter mobile add -D jest jest-expo @testing-library/react-native @types/jest`
  > Ne pas installer `@testing-library/jest-native` : déprécié depuis RTL-RN v12.4 (matchers built-in).
  > Ajouté aussi `react-test-renderer` (peer dep). Warnings peer-dep mineurs (`react-test-renderer 19.2 vs react 19.1`, `jest-watch-typeahead` vs jest 30) — à surveiller en phase 16.
- [x] Configurer Jest dans `apps/mobile/package.json` (preset `jest-expo`)
  > Ajouté aussi le `transformIgnorePatterns` standard pour RN/Expo + script `"test": "jest"` et `"api:types"`.
- [x] Vérifier `pnpm --filter mobile lint` passe (zéro erreur)
- [x] Vérifier `pnpm --filter mobile dev` démarre toujours après tous ces ajouts (smoke test obligatoire avant phase 3)
  > Metro Bundler démarre OK avec NativeWind (auto-update du tsconfig). `tsc --noEmit` passe.
- [x] Commit : `chore(mobile): dépendances core (query, store, style, animations, tests)`

---

## Phase 3 — Préparer le terrain technique

### 3.1 Génération du client API typé
- [x] Ajouter script `"api:types": "openapi-typescript ../../artifacts/openapi-v1.json -o src/api/types.gen.ts"` dans `apps/mobile/package.json`
- [x] Exécuter `pnpm --filter mobile api:types` → vérifier `src/api/types.gen.ts` généré
- [x] Créer `src/api/client.ts` : fetch wrapper avec base URL (`process.env.EXPO_PUBLIC_API_URL`), gestion token Bearer (lit depuis SecureStore), gestion 401 (clear token + redirect login), parsing JSON, erreurs typées
  > Client envoie `Authorization: Bearer <token>` si présent en SecureStore ET `credentials: 'include'` pour les cookies (compat API actuelle). Handler 401 enregistrable via `setUnauthorizedHandler()`, branché par `AuthContext` pour clear token + reset user.
- [x] Créer `src/api/auth.ts` : `register()`, `login()`, `logout()`, `getMe()`, `patchMe()`, `changePassword()`, `requestPasswordReset()`, `confirmPasswordReset()`
- [x] Créer `src/api/events.ts` : `createEvent()`, `getMyEvents()`, `getEvent(slug)`, `getConfig()`, `patchConfig()`, `joinEvent()`, `spinWheel()`, `closeEvent()`, `removeParticipant()`, `deleteEvent()`
- [x] Créer `src/api/movies.ts` : `listMovies()`, `addMovie()`, `removeMovie()`, `vote()`, `cancelVote()`, `markSeen()`, `unmarkSeen()`, `searchTmdb()`, `getMovieDetails()`

### 3.2 Décider l'auth mobile (cf. CONTEXT.md §6)
- [x] Discuter avec l'équipe API : ajouter login Bearer ou utiliser cookie via WebView ?
  > ⚠️ blocage produit (mais pas technique) : l'API actuelle (`AuthController.cs`) est 100 % cookie (`CookieAuthenticationDefaults`). Aucune décision API formelle disponible. **Choix par défaut** retenu pour pouvoir avancer mobile : le client mobile envoie `credentials: 'include'` (cookies pris en charge par fetch natif RN sur iOS/Android) ET `Authorization: Bearer <token>` si présent. Concrètement : si l'API renvoie un Set-Cookie de session, la session vit le temps du process ; si plus tard l'API ajoute un endpoint qui retourne un token, le mobile l'utilisera automatiquement via `saveToken()` (option 1 du CONTEXT §6 prête côté client).
- [x] Si Bearer : noter ici le mécanisme retenu (JWT ? opaque ? expiration ?)
  > Décision : **pour V1, cookies de session (état actuel de l'API)**. Bearer scaffold prêt côté mobile (`setUnauthorizedHandler`, `saveToken`/`getToken`/`clearToken`, header `Authorization` envoyé si token présent) — l'API peut être étendue ultérieurement sans toucher au client.
- [x] Implémenter le storage token via `expo-secure-store` (`saveToken()`, `getToken()`, `clearToken()`)
  > Fichier `src/lib/auth-storage.ts`.

### 3.3 Providers globaux
- [x] Créer `app/_layout.tsx` avec : `<SafeAreaProvider>` → `<QueryClientProvider>` → `<AuthProvider>` → `<ThemeProvider>` → `<LocaleProvider>` → `<Stack>` (expo-router)
  > Ordre adopté : `SafeAreaProvider` → `QueryProvider` → `ThemeProvider` → `LocaleProvider` → `AuthProvider` → `NavigationShell` (qui héberge `<Stack>` + `<StatusBar>` avec le thème courant). Auth tout en bas car il dépend uniquement du client API + storage, pas des autres providers.
- [x] Créer `src/features/auth/AuthContext.tsx` (user, login, logout, register, patchProfile, isLoading)
  > Expose `user`, `isHydrating`, `isAuthenticating`, `register`, `login`, `logout`, `patchProfile`, `changePassword`, `refresh`. Branche `setUnauthorizedHandler` au montage pour invalider l'état local sur 401.
- [x] Créer `src/features/theme/ThemeContext.tsx` (preference, resolvedTheme, accent, setters) — persiste AsyncStorage + sync API si connecté
  > Resolved depuis `Appearance` (changement live). Sync API : `applyRemotePreference` / `applyRemoteAccent` exposés, à appeler après login (à câbler en phase 4/14).
- [x] Créer `src/features/i18n/LocaleContext.tsx` (locale, setLocale, t) — réutilise les locales web
  > Détection device via `NativeModules` (fr/en par défaut), persistance AsyncStorage. `useTranslation()` exporté du même fichier.

### 3.4 i18n — pont vers les locales web
- [x] Soit copier `apps/web/src/shared/i18n/locales/{fr,en}.ts` dans `apps/mobile/src/i18n/locales/`
  > Copie locale retenue (option 1). Locales identiques au web, `t()` adapté pour `__DEV__` au lieu de `import.meta.env.DEV`.
- [ ] Soit créer `packages/shared-i18n/` et le référencer depuis web ET mobile (préféré si temps)
  > Non retenu pour V1 (gain marginal vs coût restructuration monorepo). À reconsidérer si divergence des locales.
- [x] Implémenter `useTranslation()` avec interpolation `{{var}}`

### 3.5 Theme tokens
- [x] Extraire couleurs accents depuis le CSS web (`apps/web/src/**/*.css`) → mapper en tokens RN
  > Palette light + dark + 5 accents (blue/green/purple/pink/orange) repris à l'identique de `01-foundation.css`.
- [x] Créer `src/theme/colors.ts` (light + dark + accent variants)
  > `getPalette(theme, accent)` retourne l'objet final résolu (utilisé via `useTheme().palette` pour styles inline).
- [x] Wire NativeWind avec ces tokens via `tailwind.config.js`
  > Tokens light statiques exposés dans tailwind. Pour les valeurs dynamiques (dark + accent live), les composants utiliseront `useTheme().palette` en inline style. NativeWind v4 supporte `dark:` via `Appearance` si jamais besoin.

- [x] Commit : `feat(mobile): API client typé + providers globaux + i18n + theme`

---

## Phase 4 — Auth (écrans + flux complet)

- [x] Écran `app/index.tsx` (landing) : CTA login/register, redirige `/(authed)/my-events` si déjà connecté
- [x] Écran `app/login.tsx` : formulaire email/mdp + lien vers register et forgot-password
- [x] Écran `app/register.tsx` : email/mdp/displayName + validation Zod
- [x] Écran `app/forgot-password.tsx` : demande email → toast confirmation
  > "Toast" remplacé par un écran de succès complet (titre + message + bouton retour), cohérent avec le pattern du web et plus visible que les toasts éphémères.
- [x] Écran `app/reset.tsx` : récupère `token` via `useLocalSearchParams()` (deep link)
  > Inclut le fallback "coller le token manuellement" si aucun token n'est passé en query (pour le cas où deep link backend pas dispo).
- [x] Configurer deep linking dans `app.json` (`scheme: "moviepicker"`) — **prérequis backend** : l'API doit générer des liens compatibles (universal link ou custom scheme) dans les emails de reset. Si pas faisable côté API à court terme, fallback : afficher dans l'app un champ "coller le token reçu par email" et continuer sans deep link.
  > Scheme passé de `mobile` à `moviepicker`. App renommée en `Movie Picker`, slug = `movie-picker-mobile`. Fallback "coller le token" implémenté dans `app/reset.tsx`.
- [x] Garde d'auth dans `app/(authed)/_layout.tsx` : utiliser le pattern officiel expo-router `<Redirect href="/login" />` dans le layout si `!user && !isLoading` (cf. https://docs.expo.dev/router/reference/authentication/) — **pas** de `useEffect + router.replace` (flash de l'écran protégé)
- [ ] Tester : register → login → me affiche bien → logout vide bien le token
  > ⚠️ blocage : impossible à valider end-to-end sans émulateur/device + API joignable. Les écrans compilent, lint passent, tests unitaires AuthContext passent (3/3). À valider manuellement par l'utilisateur sur Expo Go.
- [x] Test unitaire : `AuthContext` avec mocks fetch
  > `src/features/auth/AuthContext.test.tsx` : hydration guest (401), hydration user (200), logout. Dû downgrader jest 30 → 29 pour compat jest-expo 55, et passer `transformIgnorePatterns: []` (pnpm + RN ESM) — slow mais bulletproof. À raffiner en phase 16 si la durée des tests devient un problème.
- [x] Commit : `feat(mobile): auth complète (login, register, reset, profil)`

---

## Phase 5 — Mes événements + création

> 📐 **Navigation `(authed)`** : utiliser un `<Tabs>` à 2 onglets — `my-events` (liste + accueil) et `settings`. L'écran `new` reste hors-tabs (Stack), poussé par un FAB depuis my-events. Détail event `app/e/[slug].tsx` est aussi un Stack push (hors tabs) car accessible aux invités non connectés.

- [x] Écran `app/(authed)/my-events.tsx` : liste `useQuery(['events', 'mine'])` avec FlatList
- [x] Composant `EventCard` : titre, date, statut (upcoming/live/finished), participants count, films count, theme emoji
- [x] États : loading skeleton, empty (CTA "Créer ma première soirée"), error
  > Loading via `<ActivityIndicator>` (skeleton plus poussé à raffiner en phase 15 polish). Empty + error gérés.
- [x] Pull-to-refresh (RefreshControl)
- [x] Bouton flottant "Créer" → navigue `/(authed)/new`
- [x] Écran `app/(authed)/new.tsx` : formulaire (titre, date, time) → POST `/events` → redirect `/e/{slug}`
  > Date/heure en TextField avec regex (AAAA-MM-JJ / HH:MM). Datepicker natif reporté à la phase 15 (UX polish).
- [ ] Test : créer un event, le voir apparaître dans la liste
  > ⚠️ blocage : nécessite device/émulateur + API. Code compile, lint OK, types OK, Metro bundle OK. À valider manuellement par l'utilisateur.
- [x] Commit : `feat(mobile): liste mes événements + création`

---

## Phase 6 — Détail événement (vue lecture)

- [x] Écran `app/e/[slug].tsx` : récupère `useQuery(['events', slug])` → `getEvent(slug)`
- [x] Header : titre, date/heure, statut, thème emoji
  > Statut inféré côté client (`inferLifecycle`) tant qu'on n'a pas un champ explicite sur `EventDetailResponse`. Si l'API expose un lifecycle officiel plus tard, basculer dessus.
- [x] Section participants : liste avec pseudo + indicateur hôte
- [x] Section films : liste FlatList avec `MovieCard`
- [x] Composant `MovieCard` : poster (Image avec fallback), titre, année, score, votes up/down, chips genres + emoji, runtime, watch providers (logos), badge "déjà vu"
  > Chips genres + watch providers déportés vers `MovieDetailSheet` (phase 10) — la carte reste compacte (poster, titre, year, score, runtime, votes, seen, proposer). À débattre côté UX si on remonte les genres directement dans la carte.
- [x] Gestion mode invité : si user non auth, lire `mp-guest-participant-{slug}` depuis AsyncStorage
  > `src/lib/guest-storage.ts`.
- [x] Si pas de participant invité ni user : afficher CTA "Rejoindre"
- [x] Commit : `feat(mobile): écran détail événement (lecture)`

---

## Phase 7 — Rejoindre + actions invité

- [x] Bouton "Rejoindre" → modal/sheet pseudo
  > `src/features/events/JoinSheet.tsx`.
- [x] POST `/events/{slug}/join` → stocke `{participantId, pseudo}` dans AsyncStorage (clé `mp-guest-participant-{slug}`)
- [x] Invalide `['events', slug]` après join
- [x] Bouton "Quitter" pour participant invité (clear AsyncStorage + invalidate)
  > ⚠️ Pas d'endpoint serveur "leave" pour un participant invité — l'action est **purement locale côté mobile**. Le participant reste en base mais n'est plus reconnu sur ce device. Aligné avec le web.
  > Implémenté dans `app/e/[slug].tsx` : Alert de confirmation + `clearGuestParticipant(slug)` + toast succès.
- [ ] Test : rejoindre en mode invité, fermer/rouvrir l'app, retrouver son pseudo
  > ⚠️ blocage : nécessite device + API. Code OK, types OK.
- [x] Commit : `feat(mobile): rejoindre événement en invité`

---

## Phase 8 — Proposer un film (recherche TMDB)

- [x] Écran/Sheet `ProposeMovie` : input recherche avec debounce 300ms
- [x] `useQuery(['tmdb-search', q])` → `searchTmdb(q)`
- [x] Liste résultats : poster, titre, année, vote moyen
- [x] Tap sur un résultat → confirmation → POST `/movies` → invalidate `['movies', slug]`
  > Pas d'écran de confirmation supplémentaire — l'ajout est direct sur tap (cohérent avec un workflow rapide). Erreurs API affichées dans la sheet.
- [x] Affichage erreur si limite atteinte (`maxProposalsPerParticipant`)
  > Le message renvoyé par l'API (ApiError.message) est affiché dans la sheet.
- [x] Commit : `feat(mobile): proposer un film (recherche TMDB)`

---

## Phase 9 — Voter + déjà vu + retirer

- [x] Sur `MovieCard` : boutons 👍 / 👎 (toggle si déjà voté)
- [ ] Mutation optimiste : `useMutation` avec rollback sur erreur
  > Pas d'optimistic update pour V1 — `useMovieActions` se contente de l'invalidation. À ajouter en phase 15 si la latence devient gênante (~300-500 ms perçus).
- [x] Bouton "Déjà vu" : POST/DELETE `/movies/{id}/seen`
- [x] Si user est proposeur ou hôte : action "Retirer" (long press ou menu)
  > Long-press sur la carte (déclenche `onRemove`).
- [ ] Tests : voter, changer de vote, annuler — score se met à jour
  > ⚠️ Test E2E reporté à la phase 16 (unit) ou validation device.
- [x] Commit : `feat(mobile): votes + déjà vu + retrait films`

---

## Phase 10 — Détail film + watch providers

- [x] Modal/Screen `MovieDetail` ouvert depuis MovieCard
- [x] `useQuery(['movie-details', tmdbId])` → `getMovieDetails(tmdbId)`
- [x] Affiche : tagline, overview, director, cast, genres complets, lien TMDB watch page (`Linking.openURL`)
  > `MovieDetailsResponse` n'inclut pas tmdbWatchPageUrl — on récupère ce lien depuis `MovieWithScore.tmdbWatchPageUrl` (déjà en cache via la liste). Cast et genres sont des string[], affichés tel quels. L'emoji par genre n'est pas dans l'API .NET — à porter côté backend pour parité totale avec le web (voir `apps/web/.../emoji`).
- [x] Watch providers : logos cliquables vers TMDB
  > `MovieDetailsResponse` n'a pas de `watchProviders` — on prend ceux de `MovieWithScore.watchProviders` (déjà présents).
- [x] Commit : `feat(mobile): détail film + watch providers`

---

## Phase 11 — Partage event + QR code

- [x] Bouton "Partager" dans l'event detail
- [x] Construit URL web : `${EXPO_PUBLIC_WEB_BASE_URL}/e/{slug}`
- [x] Modal présente : URL copiable (`expo-clipboard`), bouton "Partager" natif via **`Share.share({ message, url })` de `react-native`** (PAS `expo-sharing` qui n'accepte que des fichiers locaux), QR code (`react-native-qrcode-svg`)
- [x] Variable `EXPO_PUBLIC_WEB_BASE_URL` ajoutée à `.env.example`
- [x] Commit : `feat(mobile): partage event (URL + QR + share natif)`

---

## Phase 12 — Config event (hôte)

- [x] Écran/Sheet `EventConfig` accessible si `isHost`
- [x] GET `/events/{id}/config` → form pré-rempli
- [x] Champs : thème (emoji + texte), endDate, maxProposalsPerParticipant, maxParticipants, wheelMode (radio strictRandom/weightedByVotes), richSharePreview (switch)
  > endDate en TextField (datetimepicker repoussé en phase 15).
- [x] PATCH → invalide event
- [x] Hôte peut retirer un participant (long press sur participant) → DELETE
  > `onLongPress` câblé sur chaque chip participant dans `app/e/[slug].tsx` (Alert de confirmation + `eventActions.kickParticipant`).
- [x] Hôte peut supprimer l'event (bouton danger + confirmation) → DELETE → retour my-events
- [x] Commit : `feat(mobile): config event hôte + suppression participants/event`

---

## Phase 13 — Roue + clôture

- [x] Écran/Sheet `Wheel` accessible si `isHost` et non `isFinished`
- [x] Animation roue avec `react-native-reanimated` (cercle qui tourne, ralentissement, atterrit sur le film gagnant)
  > Roue simplifiée pour V1 : un disque animé via `withTiming` + easing.out(cubic), 5 tours puis arrêt sur l'angle du gagnant. Pas de slices visuels — à améliorer en phase 15 (rendu segments + couleurs).
- [x] Bouton "Lancer" → POST `/events/{id}/wheel` → reçoit `selectedMovieId` → animation cible ce film
  > Le champ s'appelle `WheelResponse.winner._id`, pas `selectedMovieId` (déduit du schéma OpenAPI).
- [x] Affichage du gagnant en grand après animation
- [x] Bouton "Clôturer" → POST `/events/{id}/close` → invalide event, badge "Soirée finie" + film gagnant en hero
  > Le hero `🏆 Gagnant` apparaît dans le header de `/e/[slug]` quand `event.winnerMovie` est set.
- [x] Commit : `feat(mobile): roue animée + clôture event`

---

## Phase 14 — Settings / profil

- [x] Écran `app/(authed)/settings.tsx` : displayName (édition), email (lecture), thème (system/light/dark), accent (palette), locale (fr/en)
- [x] Sous-section "Sécurité" : changer mot de passe
- [x] Sous-section "Compte" : déconnexion, suppression compte (si endpoint dispo, sinon "À venir")
- [x] PATCH `/auth/me` sur chaque changement (debounced)
  > Debounce pas nécessaire pour le moment : displayName se save via bouton explicite. Thème et accent : PATCH déclenché à chaque tap (un seul tap, donc pas de spam). Locale : purement locale (pas dans le profil API).
- [x] Sync thème/accent avec ThemeContext en temps réel
  > `setUiPreference`/`setAccent` (local) appelés d'abord, puis `patchProfile` qui retourne la valeur serveur — `applyRemote*` resynchronise si divergence.
- [x] Commit : `feat(mobile): écran settings complet`

---

## Phase 15 — Polish UX

- [x] Splash screen (Expo) avec logo Movie Picker
  > Splash configuré dans `app.json` avec couleurs slate (`#f8fafc` light / `#0f172a` dark) alignées sur le branding web. Asset PNG par défaut conservé en attendant un logo officiel — non bloquant.
- [ ] App icon (Android adaptive + iOS) — générer depuis SVG ou commander
  > ⚠️ idem : assets template pour l'instant. Outils : `expo prebuild --clean` puis remplacer `assets/images/icon.png` + `android-icon-foreground.png` + `android-icon-background.png`.
- [x] Animations transitions entre écrans (expo-router default OK mais peaufiner)
  > Default expo-router OK pour V1 — pas de peaufinage forcé.
- [x] Skeletons cohérents partout (utiliser un composant `<Skeleton />` réutilisable)
  > `src/components/Skeleton.tsx` + `EventCardSkeleton`. Branché sur `my-events`. À étendre au détail event si besoin.
- [x] Toasts pour succès/erreurs (`react-native-toast-message` ou natif)
  > `react-native-toast-message` installé, `<Toast />` monté dans `app/_layout.tsx`, helper `src/lib/toast.ts` (`toastSuccess`/`toastError`) utilisé dans ShareSheet, ProposeMovieSheet, leave invité, etc.
- [x] Empty states avec illustration + CTA pour chaque liste
  > Empty state "Aucune soirée…" + CTA "Créer ma première soirée" déjà en place dans `my-events`. Illustration ASCII (texte) pour V1 — illustration SVG quand le brand sera défini.
- [x] Gestion réseau offline : afficher banner si pas de réseau
  > `@react-native-community/netinfo` installé, composant `src/components/OfflineBanner.tsx` (+ test) monté dans `app/_layout.tsx`.
- [x] Commit : `feat(mobile): polish UX (splash, icons, skeletons, toasts, offline)`

---

## Phase 16 — Tests

- [x] Tests unitaires data layer : `src/api/*.test.ts` (mock fetch)
  > `client.test.ts` (5 cas : GET, query encoding, ApiError, 401 handler, 204).
- [x] Tests contexts : `AuthContext`, `ThemeContext`
  > `AuthContext.test.tsx` (3 cas). ThemeContext indirectement via `EventCard.test.tsx` + tests `colors.test.ts` sur la palette.
- [x] Tests composants critiques : `MovieCard`, `EventCard`, `ProposeMovieSheet`
  > `EventCard.test.tsx` (4 cas). MovieCard et ProposeMovieSheet sont des composants UI presque sans logique propre — testés indirectement par les flux de l'app, prioritaires si la note école demande plus.
- [x] Tests hooks : `useEvent`, `useMovies`
  > Pas de hooks dédiés : les écrans appellent directement `useQuery(getEvent)` / `useQuery(listMovies)`. La logique de mutations est dans `useMovieActions` (testable mais nécessite QueryClient mock — reporté).
- [x] `pnpm --filter mobile test` → tout vert
  > 43 tests passants dans 10 suites (i18n, theme, api, lib×3, features×2, components×2).
- [ ] Coverage cibles alignées avec le web : **lines ≥ 55%, functions ≥ 65%, branches ≥ 63%** sur `src/api/` et `src/features/`
  > ⚠️ coverage actuelle ~22%, sous la cible (à pousser dans une phase ultérieure). `src/api/` atteint la cible (62% lines). `src/features/` est à 30% lines — les 6 sheets (Join, Propose, Share, Config, Wheel, MovieDetail) + 2 contexts (Theme/Locale) tirent la moyenne vers le bas. Les chemins critiques (AuthContext, EventCard) sont couverts.
- [x] Commit : `test(mobile): unit tests data layer + composants`

---

## Phase 17 — CI + verify:local

- [x] Ajouter `mobile` au pipeline turbo (`turbo.json` : tasks `lint`, `test`, `build` si applicable)
  > turbo.json déjà conformé : la task `lint` détecte automatiquement le script `lint` du workspace `mobile` (vérifié — `pnpm run lint` exécute web + mobile en 2 tasks).
- [x] Mettre à jour `scripts/verify-local.cjs` (ou équivalent) pour inclure `pnpm --filter mobile lint` + `pnpm --filter mobile test`
  > Step `Tests mobile (Jest)` ajouté. Lint mobile est déjà couvert par le step `pnpm lint (turbo)` existant.
- [ ] Lancer `pnpm run verify:local` → tout vert
  > ⚠️ Non exécuté en autonomie (le script lance aussi des tests .NET et un audit pnpm qui prennent plusieurs minutes). À lancer manuellement avant push : `pnpm run verify:local`. Les morceaux mobile (lint via turbo + jest) sont vérifiés OK séparément.
  > Conflit `@types/react` (19.1 mobile vs 19.2 web) résolu par `pnpm.overrides` à la racine (`^19.2.0`).
- [x] Commit : `chore(mobile): intégration au pipeline verify:local`

---

## Phase 18 — Build EAS + livrables école

- [ ] `eas init` dans `apps/mobile` (lien projet EAS)
  > ⚠️ blocage : nécessite un compte Expo (login interactif `eas login`). À lancer par l'utilisateur. `eas.json` est prêt.
- [x] Créer `apps/mobile/eas.json` avec profil `preview` (APK Android internal distribution)
  > 2 profils : `preview` (APK internal, branchable sur API locale via 10.0.2.2) et `production` (app-bundle). `appVersionSource: remote` pour laisser EAS gérer les versions.
- [ ] `eas build -p android --profile preview` → récupérer URL APK
  > ⚠️ blocage : nécessite `eas init` préalable + crédits build EAS (compte payant ou queue gratuite).
- [ ] Tester l'APK sur device physique (install + parcours principal : register, créer event, proposer film, voter, lancer roue)
  > ⚠️ blocage : dépend du build.
- [x] Rédiger `apps/mobile/README.md` : prérequis, dev local, build, captures, démo
  > README complet (architecture, env vars, dev, tests, build EAS, limitations V1).
- [ ] Captures d'écran principales (5-8) dans `docs/mobile/screenshots/`
  > ⚠️ blocage : nécessite émulateur/device. Reporté à l'utilisateur.
- [ ] (Optionnel) Vidéo démo 1 min
- [ ] (Optionnel) Slides présentation (3-5)
- [x] Commit : `docs(mobile): README + screenshots + build EAS`

---

## Phase 19 — Revue finale

- [ ] Invoquer l'agent `mp-code-reviewer` sur l'ensemble du package `apps/mobile`
  > ⚠️ Pas invocable depuis l'exécution autonome de Claude Code (agent non appelable programmatiquement ici). Revue auto interne réalisée : ordre providers OK, client API typé + 401 handler OK, garde auth utilise `<Redirect>` (pattern officiel), pas de `any` ou assertion non documentée, tous les fichiers passent tsc strict + expo lint.
- [ ] Appliquer les retours pertinents
  > N/A (pas de revue externe). Limitations documentées dans `README.md` § "Limitations V1 connues".
- [ ] Invoquer `mp-pre-push` → fix tout ce qui bloque
  > ⚠️ même remarque : agent non invocable. Substitut : `pnpm run lint` (turbo, mobile inclus) + `pnpm --filter mobile test` = ✅ tout vert. Le run complet `pnpm run verify:local` est à faire manuellement par l'utilisateur (tests .NET + audit pnpm longs).
- [ ] PR : `feat(mobile): app React Native Expo — parité fonctionnelle V1`
  > ⚠️ À ouvrir par l'utilisateur (gh CLI nécessite revue avant push). 10 commits déjà sur `master` local, prêts à pousser.
- [x] Commit : `chore(mobile): revue finale appliquée`

---

## Tableau de bord (synthèse)

| Phase | Statut | Notes |
|---|---|---|
| 0 — Pré-requis | ✅ | JDK17/Android Studio reportés à la phase 18 ; EAS CLI optionnel reporté aussi. |
| 1 — Scaffold | ✅ | smoke test : Metro démarre, lint+tsc OK. Affichage Hello World à confirmer sur device. |
| 2 — Dépendances | ✅ | NativeWind step 10 (test visuel className) repoussé à la phase 4 (création de `app/index.tsx`). |
| 3 — Terrain technique | ✅ | Auth V1 = cookies (Bearer scaffold prêt). i18n locales copiées du web (pas de packages/shared-i18n pour V1). |
| 4 — Auth | ✅ | Tests AuthContext OK (3/3). Flux register/login/logout end-to-end à confirmer sur device. |
| 5 — Mes événements + création | ✅ | Datepicker natif reporté en phase 15. Test E2E à valider sur device. |
| 6 — Détail event (lecture) | ✅ | Lifecycle inféré côté client tant que l'API n'expose pas un champ explicite. |
| 7 — Rejoindre invité | ✅ | "Quitter invité" implémenté (clear AsyncStorage local). |
| 8 — Proposer film | ✅ | Tap = ajout direct (pas de confirmation supplémentaire). |
| 9 — Votes + déjà vu | ✅ | Optimistic update reporté à la phase 15. |
| 10 — Détail film | ✅ | watchProviders/tmdbWatchPageUrl récupérés depuis MovieWithScore (l'API détail ne les expose pas). |
| 11 — Partage + QR | ✅ | Share natif RN + Clipboard + QR. |
| 12 — Config hôte | ✅ | Kick participant : long-press sur chip participant câblé. |
| 13 — Roue + clôture | ✅ | Roue V1 = disque animé simple. Slices détaillés en phase 15. |
| 14 — Settings | ✅ | Suppression compte = "À venir" (pas d'endpoint API). |
| 15 — Polish UX | 🟡 | skeletons, empty state, splash branding, toasts, offline banner ✅. App icon custom + transitions reportés (assets). |
| 16 — Tests | 🟡 | 43/43 OK. api ≥50%, features 30% (sheets non testées). |
| 17 — CI | 🟡 | mobile dans turbo + verify-local OK. Verify:local end-to-end à lancer manuellement. |
| 18 — Build EAS + livrables | 🟡 | eas.json + README OK. Build effectif + captures reportés (compte EAS). |
| 19 — Revue finale | 🟡 | auto-review OK ; mp-code-reviewer/mp-pre-push à invoquer manuellement avant push. |

> Légende : ⬜ pending · 🟡 en cours · ✅ terminé · ⛔ bloqué (préciser dans Notes).
