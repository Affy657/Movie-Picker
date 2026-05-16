# Movie Picker — mobile app

App **React Native (Expo SDK 54+, TypeScript)** qui consomme l'API .NET (`apps/api-dotnet`) du monorepo Movie Picker. Parité fonctionnelle V1 avec `apps/web`.

> Documentation complète : [`docs/mobile/CONTEXT.md`](../../docs/mobile/CONTEXT.md) + [`docs/mobile/PLAN.md`](../../docs/mobile/PLAN.md).

---

## Pré-requis

- Node 20+ (testé sur v22), pnpm 9+ (testé sur 10)
- API tournée localement : `pnpm dev:api-dotnet` à la racine du monorepo
- Pour Android : Android Studio + un AVD **OU** un device USB-debug, ou Expo Go
- Pour iOS : macOS + Xcode, ou Expo Go
- (Optionnel pour les builds) JDK 17 + Android SDK, ou un compte EAS Build

## Variables d'environnement

Copier `.env.example` → `.env` et ajuster :

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000       # émulateur Android
# EXPO_PUBLIC_API_URL=http://localhost:4000    # iOS sim / web
# EXPO_PUBLIC_API_URL=http://192.168.x.x:4000  # device physique sur le LAN
EXPO_PUBLIC_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p
EXPO_PUBLIC_WEB_BASE_URL=http://localhost:5173
```

## Dev local

À la racine du monorepo :

```bash
pnpm install
pnpm --filter mobile dev   # ou pnpm --filter mobile android / ios
```

Scanne le QR code avec Expo Go (Android/iOS) ou lance un émulateur. Le bundler tourne sur `http://localhost:8081`.

## Architecture

```
app/                       # expo-router screens (file-based)
├── _layout.tsx           # providers (Query, Theme, Locale, Auth)
├── index.tsx             # landing
├── login.tsx, register.tsx, forgot-password.tsx, reset.tsx
├── (authed)/             # group protégé (garde via <Redirect>)
│   ├── _layout.tsx       # Tabs (my-events + settings, "new" hidden)
│   ├── my-events.tsx     # liste avec FlatList + pull-to-refresh + FAB
│   ├── new.tsx           # création event
│   └── settings.tsx      # profil + thème + accent + langue + sécu
└── e/[slug].tsx          # détail event (public + guest mode)

src/
├── api/                  # client typé openapi-typescript (cookies + Bearer ready)
├── components/           # Button, TextField, Screen, BottomSheet, Skeleton
├── features/
│   ├── auth/             # AuthContext (refresh /me, login, logout, …)
│   ├── theme/            # ThemeContext (Appearance + AsyncStorage + sync API)
│   ├── i18n/             # LocaleContext + useTranslation
│   ├── events/           # EventCard, JoinSheet, ShareSheet, EventConfigSheet
│   ├── movies/           # MovieCard, ProposeMovieSheet, MovieDetailSheet, useMovieActions
│   └── wheel/            # WheelSheet (animation reanimated)
├── i18n/locales/         # fr/en (copiés du web)
├── lib/                  # auth-storage, guest-storage, tmdb URL helpers
└── theme/colors.ts       # palette light/dark + 5 accents
```

## Tests

```bash
pnpm --filter mobile test            # 28/28 OK (Jest + RTL)
pnpm --filter mobile test:coverage   # coverage HTML + summary
```

Couverture actuelle : `src/api/` ≥ 60 % lines, `src/features/` 30 % (les sheets et contexts ont des tests d'intégration light — à étendre si besoin).

## Build (EAS)

Pré-requis : un compte Expo + `eas login`.

```bash
pnpm dlx eas-cli init                              # une seule fois (lie le projet EAS)
pnpm dlx eas-cli build -p android --profile preview   # APK Android internal
pnpm dlx eas-cli build -p ios --profile preview       # iOS (macOS recommandé)
```

Profils définis dans `eas.json` :

- `preview` : APK internal distribution (à partager via lien EAS).
- `production` : `app-bundle` pour Play Store.

Variables d'env du build préfixées `EXPO_PUBLIC_` sont injectées au bundle — ajuster `EXPO_PUBLIC_API_URL` dans `eas.json` pour pointer sur l'URL publique de l'API en prod.

## Auth — note importante

L'API .NET utilise des **cookies de session HTTP-only**. Le client mobile envoie `credentials: 'include'` (compat cookies natifs RN) **et** `Authorization: Bearer <token>` si un token est stocké via `expo-secure-store`. Côté API, ajouter un endpoint qui retourne un token (cf. `docs/mobile/CONTEXT.md` §6) permettrait de basculer 100 % Bearer sans toucher au client — utile si la session cookie devient instable en RN (background fetch, etc.).

## Limitations V1 connues

- App icon + splash : assets template par défaut, à remplacer.
- Toasts (`react-native-toast-message`) et offline banner (`NetInfo`) non câblés.
- Date/time : TextField avec regex pour V1, datepicker natif reporté.
- Roue : disque animé simple, pas de slices visuels avec les posters.
- "Quitter event" en mode invité = purge locale uniquement (pas d'endpoint API).
- Suppression de compte : pas d'endpoint API, message "À venir".

---

Cf. `docs/mobile/PLAN.md` pour l'historique détaillé de chaque phase (cases cochées + notes de blocage).
