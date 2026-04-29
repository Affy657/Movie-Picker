# V1 — Déploiement, secrets, CORS, cookies et observabilité

Document opérationnel pour l’équipe (roadmap V1 § **21**). Complète le [README](../../README.md) / `.env.example` et le workflow [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml).

## 1. Secrets (GCP Secret Manager + GitHub)

**Ne jamais committer** de valeurs réelles ; utiliser `.env` local (ignoré par Git) et les secrets hébergés.

| Secret GCP (exemple noms) | Rôle |
|---------------------------|------|
| `MONGODB_URI` | Chaîne de connexion MongoDB Atlas |
| `TMDB_API_KEY` | Clé API TMDB (serveur uniquement) |
| `AUTH_DATAPROTECTION_KEYRING` | XML du keyring **ASP.NET Data Protection** : signature des cookies de session, partagé entre révisions Cloud Run |
| `RESEND_API_KEY` | Clé API Resend (`re_…`) — emails transactionnels (mot de passe oublié). Voir [`email-reset-mot-de-passe.md`](email-reset-mot-de-passe.md) |

**Génération du keyring** : projet utilitaire `apps/api-dotnet/ToolGenDpKey` — sortie stdout à copier dans Secret Manager sous le nom attendu par Cloud Run (voir `DataProtectionConfiguration.KeyRingXmlEnvName`).

**CI/CD** : le déploiement Cloud Run mappe les secrets avec `--set-secrets` (voir `ci-cd.yml`). Les noms côté Secret Manager doivent correspondre.

**Variable non secrète mais critique** : `ALLOWED_ORIGINS` est fournie comme **variable d’environnement** Cloud Run (pas besoin d’être un secret). Le workflow lit **`ALLOWED_ORIGINS`** depuis une **variable** GitHub Actions (`vars.ALLOWED_ORIGINS`) ou, à défaut, un secret du même nom.

## 2. Variables d’environnement (API)

Référence complète dans **`.env.example`** à la racine du repo. Synthèse :

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `MONGODB_URI` | Oui en prod avec Mongo | Sans valeur : mode in-memory (tests / dev sans DB) |
| `TMDB_API_KEY` | Recommandé | Recherche / enrichissement films |
| `ALLOWED_ORIGINS` | Oui hors `Development` | Origines CORS autorisées, **virgules**, **sans slash final** (ex. `https://xxx.cloudfront.net,https://web.example.fr`) |
| `AUTH_DATAPROTECTION_KEYRING` | Recommandé multi-instances | XML keyring ; sans lui, redémarrage invalide les sessions existantes si les clés ne sont pas persistées |
| `TMDB_WATCH_REGION` | Non | Défaut `FR` (watch providers) |
| `TMDB_ENRICHMENT_CACHE_HOURS` | Non | TTL cache enrichissement TMDB |
| `TMDB_SEARCH_MAX_PROVIDER_LOOKUPS` | Non | Plafond lookups « où regarder » par recherche |
| `TMDB_LIST_ENRICHMENT_MAX_PARALLEL` | Non | Parallélisme enrichissement liste films (max 16) |
| `POSTER_CACHE_ENABLED` | Non | `0` / `false` pour désactiver le cache d’affiches (Mongo ou mémoire selon implémentation) |
| `POSTER_CACHE_TTL_DAYS` | Non | Durée logique des affiches en cache |
| `POSTER_CACHE_MAX_BYTES` | Non | Taille max image acceptée |
| `PUBLIC_WEB_BASE_URL` | Non | URL canonique du front (HTTPS, sans slash final) — Open Graph / `share-preview` |
| `EMAIL_PROVIDER` | Non | `log` (défaut) ou `resend`. Cf. § 8 |
| `EMAIL_FROM_ADDRESS` | Si `resend` | Adresse expéditeur, sur un domaine vérifié dans Resend |
| `EMAIL_FROM_NAME` | Non | Nom affiché de l’expéditeur (défaut `Movie Picker`) |
| `RESEND_API_KEY` | Si `resend` | Clé API Resend, **secret** |
| `RESEND_API_BASE_URL` | Non | Override (tests E2E) ; défaut `https://api.resend.com` |

**Front** : `VITE_API_URL` au build (`apps/web/.env.example`) — URL racine de l’API (sans `/api/v1`).

## 3. CORS et `ALLOWED_ORIGINS`

- **Production / staging** : toute origine depuis laquelle le navigateur appelle l’API avec **`credentials: 'include'`** (cookie de session) doit être listée dans `ALLOWED_ORIGINS`.
- **Développement** : origines locales (`localhost`, `127.0.0.1`, ports Vite) sont autorisées par défaut ; on peut **ajouter** des origines explicites via `ALLOWED_ORIGINS` en dev.
- **Sous-domaine OG / prerender** : si une page **exécutant du JavaScript** vers l’API est servie depuis un autre hôte (ex. sous-domaine dédié), ajouter cette origine à `ALLOWED_ORIGINS`. Un domaine qui ne sert **que** du HTML statique aux crawlers (sans appels XHR/Fetch vers l’API) n’en a en général **pas** besoin.
- La politique CORS expose l’en-tête **`X-Request-Id`** (corrélation, voir § 6).

Code : `CorsPolicyBuilderExtensions`, politique `Front` — `AllowCredentials()`, méthodes et en-têtes larges, origines strictes hors dev.

## 4. Cookies, session et CSRF

**Choix V1** : authentification par **cookie** (`moviepicker_auth`) + **session serveur** stockée (MongoDB via `ITicketStore`), configurée dans `MoviePickerCookieAuthenticationConfigurer`.

| Attribut | Développement | Production |
|----------|---------------|------------|
| **HttpOnly** | `true` | `true` |
| **Secure** | `SameAsRequest` (HTTP local possible) | `Always` (HTTPS) |
| **SameSite** | `Lax` | `None` (front et API sur des **sites différents** : ex. CloudFront + Cloud Run) |
| **Durée** | Glissant 14 jours | Idem |

**CSRF (cross-origin)** : les requêtes métier modifiant l’état utilisent en pratique du **JSON** (`Content-Type: application/json`) → le navigateur envoie une **préflight CORS**. Combiné à une liste `ALLOWED_ORIGINS` **stricte** (uniquement les frontaux contrôlés), les sites tiers ne peuvent pas obtenir une réponse CORS valide pour déclencher des actions au nom de l’utilisateur depuis leur origine. Il n’y a **pas** de jeton anti-CSRF double-submit séparé dans cette version ; **ne pas élargir** `ALLOWED_ORIGINS` à des domaines non maîtrisés.

**Cookie hôte MVP** : `moviepicker_host` (token hôte) — même politique CORS ; parcours V1 privilégie l’hôte **connecté** (`creatorUserId`).

## 5. Rate limiting (plafonds production)

Implémentation : `RateLimitingExtensions` — fenêtre **fixe 1 minute**, clé **IP client** (avec `UseForwardedHeaders` pour Cloud Run). En **Development**, limiteurs désactivés (`NoLimiter`).

| Politique | Endpoint(s) typique(s) | Plafond / minute / IP |
|-----------|-------------------------|------------------------|
| `create-event` | `POST /api/v1/events` | 20 |
| `join-event` | `POST /api/v1/events/{slug}/join` | 60 |
| `search-movies` | `GET /api/v1/movies/search` | 40 |
| `auth-register` | `POST /api/v1/auth/register` | 10 |
| `auth-login` | `POST /api/v1/auth/login` | 30 |
| `auth-password-reset-request` | `POST /api/v1/auth/password-reset/request` | 5 |
| `auth-password-reset-confirm` | `POST /api/v1/auth/password-reset/confirm` | 30 |
| `patch-event-config` | `PATCH /api/v1/events/{id}/config` | 40 |
| `vote-mutation` | `POST /api/v1/events/{id}/movies/{movieId}/vote` | 120 |
| `seen-marks-mutation` | `POST` / `DELETE` marque « déjà vu » | 120 |
| `posters-get` | `GET /api/v1/posters/{key}` | 300 |

Réponse **429** + JSON d’erreur ; en-tête **`Retry-After`** lorsque disponible. Ajuster après mesure trafic réel (roadmap « après coup »).

## 6. Observabilité et logs structurés

- **Production** : sortie console en **JSON** (`JsonConsole`, scopes inclus) — adapté à **Google Cloud Logging**.
- **Correlation ID** : middleware `CorrelationIdMiddleware` — accepte `X-Request-Id` ou `X-Correlation-Id`, sinon génère un id ; renvoie **`X-Request-Id`** ; propage **`CorrelationId`** dans le **scope** de logging pour **toutes** les requêtes (y compris **auth** et **config**).
- **Requête HTTP** : `StructuredHttpRequestLoggingMiddleware` journalise méthode, chemin, statut, durée, endpoint ; champ structuré **`ApiRouteKind`** : `auth` (`/api/v1/auth/...`), `event-config` (chemins `/api/v1/events/.../config`), sinon `other` — facilite les filtres Cloud Logging sur les routes sensibles.
- **Erreurs** : enveloppe JSON + `requestId` aligné sur le correlation id ([`docs/v0-mvp/livraison-mvp.md`](../v0-mvp/livraison-mvp.md) § 29).

Exemple de filtre (conceptuel) : `jsonPayload.ApiRouteKind="auth"` ou `jsonPayload.CorrelationId="..."`.

## 7. Références code

- CORS : `Infrastructure/Web/CorsPolicyBuilderExtensions.cs`
- Cookies auth : `Infrastructure/Web/MoviePickerCookieAuthenticationConfigurer.cs`, `AuthConstants.CookieName`
- Rate limiting : `Infrastructure/Web/RateLimitingExtensions.cs`
- Correlation : `Infrastructure/Web/CorrelationIdMiddleware.cs`, `CorrelationIdConstants`
- Data Protection : `Infrastructure/DataProtectionConfiguration.cs`
- Options / env : `Configuration/MoviePickerOptions.cs`, `Infrastructure/ServiceCollectionExtensions.cs`
- Emails : `Infrastructure/Email/{LogEmailSender,ResendEmailSender,EmailServiceCollectionExtensions}.cs` ; port `Application/Ports/IEmailSender.cs`

## 8. Emails transactionnels (mot de passe oublié)

Détail dédié dans **[`email-reset-mot-de-passe.md`](email-reset-mot-de-passe.md)** (vérification domaine Resend, génération clé API, tests). Synthèse ici :

- **Provider** : sélectionné via `EMAIL_PROVIDER` — `log` (dev / fallback : email loggué côté serveur, **pas envoyé**) ou `resend` (prod via API HTTP).
- **DI** : `EmailServiceCollectionExtensions.AddEmailSender` enregistre l’implémentation appropriée. Si `EMAIL_PROVIDER=resend` mais `RESEND_API_KEY` absent en environnement non-Development, un **warning** est émis sur stderr et `LogEmailSender` est utilisé en repli.
- **Domaine expéditeur** : domaine de `EMAIL_FROM_ADDRESS` doit être vérifié dans Resend (DNS : SPF + DKIM + DMARC). V1 : `noreply@movie-picker.fr`.
- **Erreurs réseau / HTTP** : `ResendEmailSender` lève `EmailDeliveryException` (wrapping `HttpRequestException` / timeouts / statuts ≠ 2xx). Le handler `RequestPasswordResetHandler` **swallows** cette exception (anti-énumération + pas de retour fonctionnel utilisateur côté API → l’endpoint répond toujours `202 Accepted`).
- **Logs** : adresses destinataires sont **masquées** (`EmailMasking.Mask`) ; le **lien de reset** n’est **jamais** logué (override `EmailMessage.PrintMembers`).
