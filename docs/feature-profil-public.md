# Feature – Profil public léger (V1.2)

Plan de réalisation de l'item **« Profil public léger »** de la [roadmap produit](roadmap-product.md).
Spec produit globale → [spec.md](spec.md). Roadmap plateforme & qualité → [roadmap-tech.md](roadmap-tech.md).

---

## 1. Objectif

Donner à chaque utilisateur **enregistré** une page publique légère, partageable via une URL stable,
consultable depuis l'avatar d'un participant dans une soirée. Première brique d'identité sociale ;
les statistiques et badges viendront l'enrichir dans des lots ultérieurs (mêmes items V1.2 de la roadmap).

---

## 2. Décisions actées

| Sujet | Décision |
|---|---|
| Périmètre V1.2 | Profil **public léger** uniquement (stats / badges hors scope, ajoutés plus tard) |
| Visibilité | **Public par défaut**, avec opt-out (« rendre mon profil privé ») |
| Identifiant URL | **Handle unique** → `/u/:handle` |
| Contenu V1.2 | Avatar + pseudo + bio courte (≤ 140 car.) + « membre depuis » |
| Accès | Clic sur l'avatar d'un participant dans une soirée + URL directe partageable |
| Hors scope V1.2 | Stats publiques, badges, recherche d'utilisateurs, historique de handle |

### Choix techniques tranchés

1. **Format du handle** : `^[a-z0-9_]{3,20}$`, normalisé en minuscules, unicité **insensible à la casse**.
   Pas de tirets ni d'accents (lisibilité, pas d'ambiguïté de normalisation). Liste de mots réservés
   (`me`, `settings`, `admin`, `api`, `new`, `login`, `register`, `u`, `reset`, `forgot-password`…).
2. **Profil privé** : l'API répond **404** (et non 403) pour ne pas révéler l'existence d'un compte.
3. **Handle à l'inscription** : **généré automatiquement** depuis le pseudo (slug + déduplication),
   modifiable ensuite depuis les réglages. Le formulaire d'inscription n'est pas alourdi.

### Divergences avec la roadmap actuelle (à arbitrer)

- La roadmap ([roadmap-product.md](roadmap-product.md), item « Profil public léger ») indique
  *« privé par défaut »* et une URL `/u/:pseudo`. Ce plan retient **public par défaut** et un
  **handle** dédié (le pseudo `displayName` n'est pas unique). → Mettre à jour la ligne de la roadmap.

---

## 3. Modèle de données (API .NET)

Ajouts sur `User` (`Domain/Entities/User.cs`) et son document Mongo (`Infrastructure/Persistence/Mongo/UserDocument.cs`) :

| Champ | Type | Notes |
|---|---|---|
| `Handle` | `string` | Identifiant public, **unique** (index Mongo), normalisé minuscules |
| `Bio` | `string?` | Texte libre, ≤ 140 caractères, échappé à l'affichage |
| `IsProfilePublic` | `bool` | Défaut `true` (l'opt-out) |

`CreatedAt` existe déjà → sert au « membre depuis ». L'email **n'est jamais** exposé sur le profil public.

Index unique sur le handle normalisé à créer dans `Infrastructure/Persistence/Mongo/MongoIndexInitializer.cs`.

---

## 4. Endpoints API

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/v1/users/{handle}` | Profil public : avatar, pseudo, bio, memberSince. **404** si introuvable **ou** privé |
| `GET` | `/v1/users/handle-available?handle=` | Disponibilité d'un handle (formulaire réglages) |
| `PATCH` | `/me` (étendu) | Ajoute `handle`, `bio`, `isProfilePublic` à l'existant (validation unicité + format) |

Réutilise les use-cases d'auth existants (`Application/UseCases/Auth/`) :
`PatchUserProfileHandler` étendu, nouveau `GetPublicProfileHandler`, validation de handle partagée.

---

## 5. Migration / backfill du handle

Les comptes existants n'ont pas de handle.

- **Backfill** au démarrage : génère un slug depuis `DisplayName` avec déduplication (`jean`, `jean-2`, …).
- **Nouvelles inscriptions** (`RegisterUserHandler`) : génération automatique du handle, modifiable ensuite.

---

## 6. Web (React)

Nouveau dossier `apps/web/src/features/profile/`.

- **Route publique** `/u/:handle` (ajout dans `app/routes.ts`) → `ProfilePage.tsx`
  - Récupère `GET /v1/users/:handle`.
  - États : profil affiché / **privé ou introuvable** (même écran, 404) / chargement / erreur.
  - Bouton « Copier le lien du profil ».
- **Réglages** (`features/auth/pages/AccountPage.tsx`) : nouvelle section profil public
  - Champ **handle** éditable + indicateur de disponibilité (`handle-available`).
  - **Bio** : textarea ≤ 140 caractères (même UX que les notes de pitch).
  - Toggle **« Rendre mon profil public »** (activé par défaut).
- i18n FR / EN pour tous les nouveaux libellés (`shared/i18n/locales`).

---

## 7. Point d'entrée « avatar cliquable »

Le **compte est obligatoire pour rejoindre une soirée** (le mode invité est retiré — cf. §9), donc tout
participant est rattaché à un compte et possède un `handle`. L'avatar est donc cliquable par défaut.

- **DTO participant** (détail soirée) : exposer le `handle` du participant.
- **Web** : l'`Avatar` (`features/auth/components/Avatar.tsx`) devient un lien vers `/u/:handle`.

> **Robustesse données héritées** : conserver une dégradation gracieuse (participant sans `handle` →
> avatar non cliquable) au cas où d'anciens participants invités subsistent en base. Le code ne doit
> pas planter sur un participant historique sans compte, même si on n'en crée plus.

---

## 8. RGPD / sécurité

- Public par défaut → mention claire au moment de l'inscription + lien vers le réglage de visibilité.
- Bio : champ libre → échappement à l'affichage (anti-XSS), limite stricte 140 caractères.
- Profil privé : strictement non exposé par l'API (404, aucune fuite de métadonnée).
- L'email n'apparaît jamais dans le payload public.
- Cohérent avec l'item backlog RGPD « suppression du compte / export des données ».

---

## 9. Prérequis : retrait du mode invité

**Décision produit** : le compte est obligatoire pour rejoindre une soirée (le mode invité posait trop
de problèmes en usage réel). ✅ **Retrait effectué** (2026-05-29) :

- **API** : `[Authorize]` + 401 sur `POST /v1/events/{idOrSlug}/join` ; `JoinEventHandler` exige un
  `userId` non nul (sinon `ArgumentException`) ; seed dev et tests d'intégration mis à jour
  (clients authentifiés). `Participant.UserId` reste **nullable en lecture** pour tolérer d'éventuels
  participants invités historiques (décision « tolérer en lecture »).
- **Web** : `JoinForm` non connecté → CTA connexion/inscription ; `/my-events` réservé aux connectés
  (redirection login) ; suppression de `guestJoinedEventLifecycle`, `queryKeys.myEvents.guestJoined`,
  `listStoredParticipantSlugs`, `fetchGuestJoinedEventsSummaries` et des branches guest de
  `MyEventsPage` / `EventDetail`. Tests web adaptés (226 verts).
- **Reste cosmétique** : quelques clés i18n `*guest*` (events/MyEvents) restent définies mais ne sont
  plus référencées — chaînes mortes inoffensives, à purger au passage suivant. Les clés
  `auth.account.guestLead` / `guestNavAriaLabel` sont **conservées** (état non connecté de la page
  Compte, concept d'auth distinct).

> Note V2 : un usage « sans compte » plus large pourra revenir plus tard, mais de façon contrôlée et
> repensée — distinct de l'ancien mode invité supprimé ici.

---

## 10. Tests

- **API** : unicité + normalisation du handle, validation format / mots réservés, `GET /{handle}`
  public vs privé (404), backfill, absence d'email dans le payload public.
- **Web** : `ProfilePage` (3 états), section réglages (disponibilité du handle, toggle visibilité),
  avatar cliquable (compte) vs non cliquable (invité). Aligné sur le style `vitest` existant.

---

## 11. Découpage (3 PRs)

1. **API – modèle + endpoints + migration** : `User` (`handle` / `bio` / `isProfilePublic`),
   `GET /v1/users/{handle}`, `handle-available`, `PATCH /me` étendu, backfill, index Mongo, tests.
2. **Web – page profil + réglages** : route `/u/:handle`, `ProfilePage`, section réglages, partage, i18n, tests.
3. **Web/API – avatar cliquable** : `handle` dans le DTO participant, lien depuis la soirée, tests.

---

## 12. Reste à arbitrer

- Valider la mise à jour de la roadmap (visibilité par défaut + URL `/u/:handle`).
- Confirmer la liste exacte des mots réservés.
- Comportement au changement de handle : l'ancienne URL casse (pas d'historique de redirection en V1.2).
