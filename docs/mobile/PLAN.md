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
- [x] Lire `AGENTS.md` à la racine du repo
- [x] Lire les règles dans `.cursor/rules/` si présentes (`mp-stack`, `mp-guardrails`, `mp-dev-task` — extension `.md` ou `.mdc`)
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
- [ ] Commit : `feat(mobile): auth complète (login, register, reset, profil)`

---

## Phase 5 — Mes événements + création

> 📐 **Navigation `(authed)`** : utiliser un `<Tabs>` à 2 onglets — `my-events` (liste + accueil) et `settings`. L'écran `new` reste hors-tabs (Stack), poussé par un FAB depuis my-events. Détail event `app/e/[slug].tsx` est aussi un Stack push (hors tabs) car accessible aux invités non connectés.

- [ ] Écran `app/(authed)/my-events.tsx` : liste `useQuery(['events', 'mine'])` avec FlatList
- [ ] Composant `EventCard` : titre, date, statut (upcoming/live/finished), participants count, films count, theme emoji
- [ ] États : loading skeleton, empty (CTA "Créer ma première soirée"), error
- [ ] Pull-to-refresh (RefreshControl)
- [ ] Bouton flottant "Créer" → navigue `/(authed)/new`
- [ ] Écran `app/(authed)/new.tsx` : formulaire (titre, date, time) → POST `/events` → redirect `/e/{slug}`
- [ ] Test : créer un event, le voir apparaître dans la liste
- [ ] Commit : `feat(mobile): liste mes événements + création`

---

## Phase 6 — Détail événement (vue lecture)

- [ ] Écran `app/e/[slug].tsx` : récupère `useQuery(['events', slug])` → `getEvent(slug)`
- [ ] Header : titre, date/heure, statut, thème emoji
- [ ] Section participants : liste avec pseudo + indicateur hôte
- [ ] Section films : liste FlatList avec `MovieCard`
- [ ] Composant `MovieCard` : poster (Image avec fallback), titre, année, score, votes up/down, chips genres + emoji, runtime, watch providers (logos), badge "déjà vu"
- [ ] Gestion mode invité : si user non auth, lire `mp-guest-participant-{slug}` depuis AsyncStorage
- [ ] Si pas de participant invité ni user : afficher CTA "Rejoindre"
- [ ] Commit : `feat(mobile): écran détail événement (lecture)`

---

## Phase 7 — Rejoindre + actions invité

- [ ] Bouton "Rejoindre" → modal/sheet pseudo
- [ ] POST `/events/{slug}/join` → stocke `{participantId, pseudo}` dans AsyncStorage (clé `mp-guest-participant-{slug}`)
- [ ] Invalide `['events', slug]` après join
- [ ] Bouton "Quitter" pour participant invité (clear AsyncStorage + invalidate)
  > ⚠️ Pas d'endpoint serveur "leave" pour un participant invité — l'action est **purement locale côté mobile**. Le participant reste en base mais n'est plus reconnu sur ce device. Aligné avec le web.
- [ ] Test : rejoindre en mode invité, fermer/rouvrir l'app, retrouver son pseudo
- [ ] Commit : `feat(mobile): rejoindre événement en invité`

---

## Phase 8 — Proposer un film (recherche TMDB)

- [ ] Écran/Sheet `ProposeMovie` : input recherche avec debounce 300ms
- [ ] `useQuery(['tmdb-search', q])` → `searchTmdb(q)`
- [ ] Liste résultats : poster, titre, année, vote moyen
- [ ] Tap sur un résultat → confirmation → POST `/movies` → invalidate `['movies', slug]`
- [ ] Affichage erreur si limite atteinte (`maxProposalsPerParticipant`)
- [ ] Commit : `feat(mobile): proposer un film (recherche TMDB)`

---

## Phase 9 — Voter + déjà vu + retirer

- [ ] Sur `MovieCard` : boutons 👍 / 👎 (toggle si déjà voté)
- [ ] Mutation optimiste : `useMutation` avec rollback sur erreur
- [ ] Bouton "Déjà vu" : POST/DELETE `/movies/{id}/seen`
- [ ] Si user est proposeur ou hôte : action "Retirer" (long press ou menu)
- [ ] Tests : voter, changer de vote, annuler — score se met à jour
- [ ] Commit : `feat(mobile): votes + déjà vu + retrait films`

---

## Phase 10 — Détail film + watch providers

- [ ] Modal/Screen `MovieDetail` ouvert depuis MovieCard
- [ ] `useQuery(['movie-details', tmdbId])` → `getMovieDetails(tmdbId)`
- [ ] Affiche : tagline, overview, director, cast, genres complets, lien TMDB watch page (`Linking.openURL`)
- [ ] Watch providers : logos cliquables vers TMDB
- [ ] Commit : `feat(mobile): détail film + watch providers`

---

## Phase 11 — Partage event + QR code

- [ ] Bouton "Partager" dans l'event detail
- [ ] Construit URL web : `${EXPO_PUBLIC_WEB_BASE_URL}/e/{slug}`
- [ ] Modal présente : URL copiable (`expo-clipboard`), bouton "Partager" natif via **`Share.share({ message, url })` de `react-native`** (PAS `expo-sharing` qui n'accepte que des fichiers locaux), QR code (`react-native-qrcode-svg`)
- [ ] Variable `EXPO_PUBLIC_WEB_BASE_URL` ajoutée à `.env.example`
- [ ] Commit : `feat(mobile): partage event (URL + QR + share natif)`

---

## Phase 12 — Config event (hôte)

- [ ] Écran/Sheet `EventConfig` accessible si `isHost`
- [ ] GET `/events/{id}/config` → form pré-rempli
- [ ] Champs : thème (emoji + texte), endDate, maxProposalsPerParticipant, maxParticipants, wheelMode (radio strictRandom/weightedByVotes), richSharePreview (switch)
- [ ] PATCH → invalide event
- [ ] Hôte peut retirer un participant (long press sur participant) → DELETE
- [ ] Hôte peut supprimer l'event (bouton danger + confirmation) → DELETE → retour my-events
- [ ] Commit : `feat(mobile): config event hôte + suppression participants/event`

---

## Phase 13 — Roue + clôture

- [ ] Écran/Sheet `Wheel` accessible si `isHost` et non `isFinished`
- [ ] Animation roue avec `react-native-reanimated` (cercle qui tourne, ralentissement, atterrit sur le film gagnant)
- [ ] Bouton "Lancer" → POST `/events/{id}/wheel` → reçoit `selectedMovieId` → animation cible ce film
- [ ] Affichage du gagnant en grand après animation
- [ ] Bouton "Clôturer" → POST `/events/{id}/close` → invalide event, badge "Soirée finie" + film gagnant en hero
- [ ] Commit : `feat(mobile): roue animée + clôture event`

---

## Phase 14 — Settings / profil

- [ ] Écran `app/(authed)/settings.tsx` : displayName (édition), email (lecture), thème (system/light/dark), accent (palette), locale (fr/en)
- [ ] Sous-section "Sécurité" : changer mot de passe
- [ ] Sous-section "Compte" : déconnexion, suppression compte (si endpoint dispo, sinon "À venir")
- [ ] PATCH `/auth/me` sur chaque changement (debounced)
- [ ] Sync thème/accent avec ThemeContext en temps réel
- [ ] Commit : `feat(mobile): écran settings complet`

---

## Phase 15 — Polish UX

- [ ] Splash screen (Expo) avec logo Movie Picker
- [ ] App icon (Android adaptive + iOS) — générer depuis SVG ou commander
- [ ] Animations transitions entre écrans (expo-router default OK mais peaufiner)
- [ ] Skeletons cohérents partout (utiliser un composant `<Skeleton />` réutilisable)
- [ ] Toasts pour succès/erreurs (`react-native-toast-message` ou natif)
- [ ] Empty states avec illustration + CTA pour chaque liste
- [ ] Gestion réseau offline : afficher banner si pas de réseau
- [ ] Commit : `feat(mobile): polish UX (splash, icons, skeletons, toasts, offline)`

---

## Phase 16 — Tests

- [ ] Tests unitaires data layer : `src/api/*.test.ts` (mock fetch)
- [ ] Tests contexts : `AuthContext`, `ThemeContext`
- [ ] Tests composants critiques : `MovieCard`, `EventCard`, `ProposeMovieSheet`
- [ ] Tests hooks : `useEvent`, `useMovies`
- [ ] `pnpm --filter mobile test` → tout vert
- [ ] Coverage cibles alignées avec le web : **lines ≥ 55%, functions ≥ 65%, branches ≥ 63%** sur `src/api/` et `src/features/`
- [ ] Commit : `test(mobile): unit tests data layer + composants`

---

## Phase 17 — CI + verify:local

- [ ] Ajouter `mobile` au pipeline turbo (`turbo.json` : tasks `lint`, `test`, `build` si applicable)
- [ ] Mettre à jour `scripts/verify-local.cjs` (ou équivalent) pour inclure `pnpm --filter mobile lint` + `pnpm --filter mobile test`
- [ ] Lancer `pnpm run verify:local` → tout vert
- [ ] Commit : `chore(mobile): intégration au pipeline verify:local`

---

## Phase 18 — Build EAS + livrables école

- [ ] `eas init` dans `apps/mobile` (lien projet EAS)
- [ ] Créer `apps/mobile/eas.json` avec profil `preview` (APK Android internal distribution)
- [ ] `eas build -p android --profile preview` → récupérer URL APK
- [ ] Tester l'APK sur device physique (install + parcours principal : register, créer event, proposer film, voter, lancer roue)
- [ ] Rédiger `apps/mobile/README.md` : prérequis, dev local, build, captures, démo
- [ ] Captures d'écran principales (5-8) dans `docs/mobile/screenshots/`
- [ ] (Optionnel) Vidéo démo 1 min
- [ ] (Optionnel) Slides présentation (3-5)
- [ ] Commit : `docs(mobile): README + screenshots + build EAS`

---

## Phase 19 — Revue finale

- [ ] Invoquer l'agent `mp-code-reviewer` sur l'ensemble du package `apps/mobile`
- [ ] Appliquer les retours pertinents
- [ ] Invoquer `mp-pre-push` → fix tout ce qui bloque
- [ ] PR : `feat(mobile): app React Native Expo — parité fonctionnelle V1`
- [ ] Commit : `chore(mobile): revue finale appliquée`

---

## Tableau de bord (synthèse)

| Phase | Statut | Notes |
|---|---|---|
| 0 — Pré-requis | ✅ | JDK17/Android Studio reportés à la phase 18 ; EAS CLI optionnel reporté aussi. |
| 1 — Scaffold | ✅ | smoke test : Metro démarre, lint+tsc OK. Affichage Hello World à confirmer sur device. |
| 2 — Dépendances | ✅ | NativeWind step 10 (test visuel className) repoussé à la phase 4 (création de `app/index.tsx`). |
| 3 — Terrain technique | ✅ | Auth V1 = cookies (Bearer scaffold prêt). i18n locales copiées du web (pas de packages/shared-i18n pour V1). |
| 4 — Auth | ⬜ | |
| 5 — Mes événements + création | ⬜ | |
| 6 — Détail event (lecture) | ⬜ | |
| 7 — Rejoindre invité | ⬜ | |
| 8 — Proposer film | ⬜ | |
| 9 — Votes + déjà vu | ⬜ | |
| 10 — Détail film | ⬜ | |
| 11 — Partage + QR | ⬜ | |
| 12 — Config hôte | ⬜ | |
| 13 — Roue + clôture | ⬜ | |
| 14 — Settings | ⬜ | |
| 15 — Polish UX | ⬜ | |
| 16 — Tests | ⬜ | |
| 17 — CI | ⬜ | |
| 18 — Build EAS + livrables | ⬜ | |
| 19 — Revue finale | ⬜ | |

> Légende : ⬜ pending · 🟡 en cours · ✅ terminé · ⛔ bloqué (préciser dans Notes).
