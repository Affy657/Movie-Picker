# Mobile App — Contexte technique

> **À lire en premier.** Ce fichier contient toutes les infos nécessaires pour reconstruire l'app web sous forme d'app mobile React Native. Le plan d'exécution est dans `PLAN.md`.

---

## 1. Cible

App **React Native (Expo, dernier SDK stable, TypeScript)** placée dans `apps/mobile/` du monorepo. Objectif : **parité fonctionnelle** avec `apps/web` en consommant la même API .NET (`apps/api-dotnet`).

Plateformes : **Android d'abord** (APK via EAS pour démo école), iOS bonus si temps.

---

## 2. Stack imposée

| Couche | Choix | Notes |
|---|---|---|
| Framework | **Expo (dernier SDK stable)** managed workflow | Pas de bare workflow, pas d'`eject` |
| Langage | **TypeScript strict** | Aligné sur le monorepo |
| Navigation | **expo-router** (file-based) | Pas react-navigation manuel |
| Data fetching | **@tanstack/react-query v5** | Même version que web si possible |
| State UI | **Zustand** (si besoin global non-server) | Sinon `useState`/Context |
| HTTP | `fetch` natif + wrapper typé | Pas d'axios |
| Auth storage | **expo-secure-store** | Cookie httpOnly NE FONCTIONNE PAS en RN → voir §6 |
| Forms | **react-hook-form** + Zod | Mêmes schemas que web si extraits |
| Style | **NativeWind v4** (Tailwind RN) | Cohérence avec le web si web utilise Tailwind, sinon StyleSheet |
| i18n | **Copier** `apps/web/src/shared/i18n/locales/{fr,en}.ts` → `apps/mobile/src/i18n/locales/`. Extraire en `packages/shared-i18n/` plus tard si nécessaire | FR par défaut, évite circular deps |
| Tests unitaires | **Jest + @testing-library/react-native** | Suffit pour la note école |
| QR Code | `react-native-qrcode-svg` | Affichage + scan ultérieur |
| Build mobile | **EAS Build** profil `preview` → APK | Pas besoin de stores |

**Ne pas introduire** : Redux, MobX, axios, react-navigation natif (utiliser expo-router), styled-components.

---

## 3. Structure cible

```
apps/mobile/
├── app/                          # expo-router screens (file-based routing)
│   ├── _layout.tsx              # Root layout (providers : QueryClient, Auth, Theme, Locale)
│   ├── index.tsx                # Landing (= "/" web)
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   ├── reset.tsx                # Param query "token"
│   ├── (authed)/                # Group protégé
│   │   ├── _layout.tsx          # Garde auth
│   │   ├── my-events.tsx
│   │   ├── settings.tsx
│   │   └── new.tsx
│   └── e/
│       └── [slug].tsx           # Détail événement (public + guest mode)
├── src/
│   ├── api/
│   │   ├── client.ts            # fetch wrapper + base URL + token Bearer
│   │   ├── auth.ts              # endpoints auth typés
│   │   ├── events.ts
│   │   ├── movies.ts
│   │   └── types.ts             # Types générés depuis OpenAPI (artifacts/openapi-v1.json)
│   ├── components/              # UI réutilisables (Button, Card, Chip, MovieCard…)
│   ├── features/                # Logique par feature (auth/, events/, movies/, wheel/)
│   ├── hooks/                   # useAuth, useEvent, useMovies, useWheel…
│   ├── store/                   # Zustand stores (theme, guest sessions)
│   ├── i18n/                    # Re-export des locales web ou pont
│   └── theme/                   # Tokens couleurs/accents (mapping depuis web)
├── assets/                      # Icônes, splash, fonts
├── app.json                     # Config Expo
├── eas.json                     # Profils build EAS
├── package.json
├── tsconfig.json
└── babel.config.js
```

---

## 4. API .NET — Référence rapide

**Base URL dev** : `http://localhost:4000` (configurable via `EXPO_PUBLIC_API_URL`).
- Émulateur Android : remplacer `localhost` par `10.0.2.2`.
- iOS simulator : `localhost` fonctionne.
- Device physique : IP LAN de la machine dev (ex. `http://192.168.1.42:4000`).

**Préfixe routes** : `/api/v1`.

**OpenAPI** : `artifacts/openapi-v1.json` (export via `pnpm openapi:export` à la racine) ou `tmp-swagger.json`. Utiliser `openapi-typescript` pour générer `src/api/types.ts`.

### Endpoints à consommer (résumé)

**Auth** — `/api/v1/auth`

> ⚠️ Important : aujourd'hui l'API pose un **cookie httpOnly** et **ne retourne pas de token** dans le body. Voir §6 pour la stratégie mobile. Les réponses ci-dessous reflètent l'état actuel ; le contrat mobile sera décidé en phase 3.2.

- `POST /register` → `{email, password, displayName}` → `UserProfileResponse` (+ cookie posé)
- `POST /login` → `{email, password}` → `UserProfileResponse` (+ cookie posé)
- `POST /logout` (auth)
- `GET /me` (auth) → profil
- `PATCH /me` (auth) → `{displayName?, uiTheme?, accentColor?}`
- `PATCH /me/password` (auth) → `{currentPassword, newPassword}`
- `POST /password-reset/request` → `{email}`
- `POST /password-reset/confirm` → `{token, newPassword}`

**Événements** — `/api/v1/events`
- `POST /` (auth) → `{title, date, time}` → event créé
- `GET /mine` (auth) → liste mes événements
- `GET /slug/{slug}` → détail public + films + participants
- `GET /{id}/config` (hôte) → config event
- `PATCH /{id}/config` (hôte, token via `?host=TOKEN`) → maj config
- `POST /{slug}/join` → `{pseudo}` → participant créé (invité ou auth)
- `POST /{id}/wheel` → tire le film gagnant (mode `strictRandom` ou `weightedByVotes`)
- `POST /{id}/close` → clôture event
- `DELETE /{id}/participants/{participantId}` (hôte)
- `DELETE /{id}` (hôte)

**Films par event** — `/api/v1/events/{idOrSlug}/movies`
- `GET /` → liste films + scores + mon vote
- `POST /` → `{tmdbId, participantId}` ajoute film
- `DELETE /{movieId}` → retire (auteur ou hôte)
- `POST /{movieId}/vote` → `{participantId, vote: 1|-1}`
- `DELETE /{movieId}/vote?participantId=...`
- `POST /{movieId}/seen` → `{participantId}` marque "déjà vu"
- `DELETE /{movieId}/seen` → annule

**Recherche TMDB** — `/api/v1/movies`
- `GET /search?q=...&lang=fr` → liste films TMDB
- `GET /tmdb/{tmdbId}/details` → détails complets

**Posters** — deux sources possibles :
1. **Proxy API** : `GET /api/v1/posters/{posterKey}` (cache backend, recommandé — résolution gérée serveur). Le `posterKey` est fourni dans la réponse film.
2. **CDN TMDB direct** : `https://image.tmdb.org/t/p/w500{posterPath}` si seul `posterPath` est disponible.

→ **Choisir le proxy** par défaut. Inspecter `apps/web/src/**/*MovieCard*` ou équivalent pour confirmer ce que fait le web et s'aligner.

---

## 5. Modèles principaux (TypeScript résumé)

> Générer la version exhaustive depuis OpenAPI. Ci-dessous le strict nécessaire pour réfléchir.

```ts
type UserProfile = {
  userId: string; email: string; displayName: string;
  uiTheme: 'system' | 'light' | 'dark';
  accentColor: 'default' | 'blue' | 'green' | 'purple' | 'pink' | 'orange';
};

type EventConfig = {
  theme?: string; endDate?: string;
  maxProposalsPerParticipant?: number;
  maxParticipants?: number;
  wheelMode: 'strictRandom' | 'weightedByVotes';
  richSharePreview: boolean;
};

type Participant = { id: string; pseudo: string; isCreator?: boolean };

type MovieWithScore = {
  id: string; eventId: string; participantId: string;
  tmdbId: number; title: string; year: number | null;
  posterPath: string | null; proposerPseudo: string;
  score: number; up: number; down: number;
  myVote: 1 | -1 | null;
  voteAverage: number;
  watchProviders: { name: string; logoPath: string }[];
  tmdbWatchPageUrl: string | null;
  runtimeMinutes: number | null;
  seenCount: number; seenByPseudos: string[];
  genres?: { id: number; name: string; emoji?: string }[]; // chips genres
};

type EventDetail = {
  id: string; slug: string; title: string; date: string; time: string;
  config: EventConfig;
  participants: Participant[];
  movies: MovieWithScore[];
  isHost: boolean; isFinished: boolean; closedAt: string | null;
  winnerMovie: MovieWithScore | null;
};
```

---

## 6. Auth — différence cruciale avec le web

Le web utilise un **cookie httpOnly de session** (`credentials: 'include'`). En React Native, **les cookies httpOnly ne sont pas gérables proprement** → adapter :

**Stratégie** : ajouter côté API un mode "Bearer token" pour login mobile.

**Deux options** :
1. **Préférée** : ajouter un endpoint `/api/v1/auth/login-mobile` (ou un header `X-Client: mobile`) qui retourne `{token, user}` au lieu de poser le cookie. Token stocké via `expo-secure-store`, envoyé en header `Authorization: Bearer <token>`. Backend valide token JWT ou opaque persisté en DB.
2. **Fallback** : utiliser `react-native-cookies` + `expo-web-browser` pour login via WebView. Plus fragile.

**À discuter avec l'équipe API avant d'écrire du code** — un sous-task dédié est listé dans le PLAN.

**Mode invité** : pas d'auth. Stocker `{participantId, pseudo}` par slug d'event dans `AsyncStorage` (clé `mp-guest-participant-{slug}`), identique au web mais via AsyncStorage au lieu de localStorage.

---

## 7. Features à atteindre (parité web)

### Auth
- [x] Inscription email/mdp/displayName
- [x] Connexion
- [x] Déconnexion
- [x] Récupération mdp (demande + confirmation via deep link)
- [x] Édition profil (nom, thème, accent)
- [x] Changement mot de passe

### Événements
- [x] Liste "mes événements" (upcoming / live / finished)
- [x] Création event (titre, date, heure)
- [x] Détail event (films, participants, votes, statut)
- [x] Config event (hôte) : thème emoji, limites, mode roue, rich share
- [x] Partage lien event (Share natif `expo-sharing` + QR code)
- [x] Rejoindre event en invité (pseudo, stockage local)
- [x] Quitter event
- [x] Hôte retire participant
- [x] Hôte supprime event
- [x] Roue (animation + résultat selon mode)
- [x] Clôture event → film gagnant officialisé

### Films
- [x] Recherche TMDB (avec debounce)
- [x] Proposer film
- [x] Retirer film proposé
- [x] Voter +1 / -1 / annuler
- [x] Marquer "déjà vu" / annuler
- [x] Affichage chips genres + emoji
- [x] Affichage watch providers (logos VOD FR)
- [x] Lien vers TMDB

### Préférences
- [x] Thème system/light/dark (persisté AsyncStorage + sync profil si connecté)
- [x] Couleur accent (idem)
- [x] Locale FR/EN (sélecteur)

### Cas spéciaux à NE PAS faire en mobile (V1)
- Share preview HTML/OG tags → géré par le web côté serveur, le mobile envoie juste l'URL via Share natif.
- Lighthouse / e2e Playwright → non applicable.

---

## 8. Commandes monorepo utiles

```bash
# À la racine du repo
pnpm install                            # installe tout (workspace inclut apps/*)
pnpm dev:api-dotnet                     # API sur :4000
pnpm --filter mobile start              # Expo dev server (à ajouter)
pnpm --filter mobile android            # Lance émulateur
pnpm openapi:export                     # Régénère artifacts/openapi-v1.json
pnpm lint                               # Lint tout (mobile inclus une fois ajouté)
pnpm verify:local                       # CI locale — DOIT passer avant push
```

---

## 9. Variables d'environnement mobile

Fichier `apps/mobile/.env` (git-ignored) :

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000   # émulateur Android
# EXPO_PUBLIC_API_URL=http://localhost:4000  # iOS sim
# EXPO_PUBLIC_API_URL=http://192.168.1.42:4000  # device physique
EXPO_PUBLIC_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p
```

Lecture côté code : `process.env.EXPO_PUBLIC_API_URL` (Expo expose automatiquement les vars préfixées `EXPO_PUBLIC_`).

---

## 10. Règles repo importantes

- **Conventional commits FR** : `feat(mobile): ...`, `fix(mobile): ...`, `chore(mobile): ...`.
- **Pas de commentaires non nécessaires** (cf. CLAUDE.md / `.cursor/rules/mp-dev-task`).
- **Pas de secrets en clair**.
- **Avant chaque push** : `pnpm run verify:local`. Pas de `--no-verify`.
- **Tests** : viser ~50% coverage sur la data layer + composants critiques.
- **Code review interne** : invoquer l'agent `mp-code-reviewer` (cf. `.cursor/agents/`) en fin de chaque étape majeure.

---

## 11. Ressources externes

- Expo docs : https://docs.expo.dev/
- expo-router : https://docs.expo.dev/router/introduction/
- NativeWind v4 : https://www.nativewind.dev/
- TanStack Query RN : https://tanstack.com/query/latest
- EAS Build : https://docs.expo.dev/build/introduction/
