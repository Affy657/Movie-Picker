# Mot de passe oublié — Design V1

> Spec d'implémentation issue d'une session brainstorming. Cible : cocher la § 22 ligne 271 et le § 3 lignes 84–86 de [`docs/v1-produit/livraison-v1.md`](../../v1-produit/livraison-v1.md).
>
> **Statut** : validé pour implémentation — voir prochaine étape `writing-plans`.

## 1. Contexte

L'API Movie Picker (.NET 10, MongoDB, `apps/api-dotnet/`) et le front (React + Vite + TanStack Query, `apps/web/`) disposent déjà d'un parcours d'auth complet : inscription, connexion, déconnexion, profil, cookie de session signé via Data Protection avec session côté serveur (collection `auth_sessions`). Il manque le flux **mot de passe oublié** prévu en V1.

Aucune infrastructure email n'existe à ce jour dans le repo (rien sous `Infrastructure/Email/`, aucune variable `SMTP_*` / `EMAIL__*` dans `.env.example`). Tout est à construire.

## 2. Décisions structurantes

| Sujet | Décision | Raison |
|---|---|---|
| Posture | **Full V1 prod-ready** dès la livraison | Cocher la § 22 lors du merge |
| Provider email | **Resend** appelé en HTTP direct via `HttpClient` typé (pas de SDK NuGet) | Moderne, 3000 emails/mois gratuit, DKIM/SPF rapides, zéro dépendance supplémentaire |
| Domaine expéditeur | `movie-picker.fr` vérifié dans Resend, `from = noreply@movie-picker.fr` | Cohérent avec `web.movie-picker.fr` (front) |
| Stockage du token | **Collection MongoDB dédiée `password_reset_tokens`** (hash + TTL Mongo) | Miroir de `auth_sessions`, audit, purge auto |
| TTL token | 30 minutes | Aligné roadmap |
| Politique post-confirmation | **Pas d'auto-login** + invalidation de **toutes** les sessions actives du user | Default OWASP, friction faible |
| Templates email | **Inline en C#** (FR + EN) dans `PasswordResetEmailFactory` | YAGNI : un seul email transactionnel en V1 |
| Routes front | `/forgot-password` (demande) + `/reset?token=…` (confirmation) | `/reset` court → lien email plus propre, cohérent roadmap |
| Lien depuis LoginPage | « Mot de passe oublié ? » sous le champ password | Endroit naturel |
| i18n | FR + EN (front + email) | Convention V1 |
| Anti-énumération | `request` répond toujours `200` ; throttle silencieux 60 s par user | Pas de leak |

## 3. Flux utilisateur

```
[Front /forgot-password]
   └─ POST /api/v1/auth/password-reset/request { email, lang? }
        ↓
   [API] toujours 200 OK
        ├─ user trouvé →
        │     ├─ génère token (32 bytes random base64url)
        │     ├─ stocke hash SHA-256 du token + expiresAt (now + 30 min) dans password_reset_tokens
        │     ├─ invalide les tokens précédents non consommés du même user (consumedAt = now)
        │     ├─ throttle silencieux : si dernier token actif < 60 s → on ne renvoie PAS d'email
        │     └─ envoie l'email via IEmailSender avec lien :
        │          {PUBLIC_WEB_BASE_URL}/reset?token=<clair>
        └─ user inconnu → no-op silencieux

[Email reçu]
   └─ utilisateur clique → Front /reset?token=…

[Front /reset?token=…]
   └─ POST /api/v1/auth/password-reset/confirm { token, password }
        ↓
   [API]
        ├─ vérifie le hash du token, expiresAt > now, consumedAt == null → sinon 400
        ├─ valide le nouveau password (mêmes règles que register : ≥ 8, lettre + chiffre)
        ├─ hash le password (IPasswordHasher), met à jour User.PasswordHash + UpdatedAt
        ├─ marque le token consumed (consumedAt = now)
        ├─ invalide TOUTES les sessions actives du user (delete auth_sessions where userId = X)
        └─ 204 No Content

   → Front affiche toast i18n « Mot de passe réinitialisé. Connecte-toi. » et redirige /login
```

## 4. API

### 4.1 Nouveaux endpoints

| Méthode | Route | Auth | Body | Réponses |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/password-reset/request` | publique | `{ "email": "...", "lang"?: "fr"\|"en" }` | **200** toujours, body vide ; **400** validation email ; **429** rate limit |
| `POST` | `/api/v1/auth/password-reset/confirm` | publique | `{ "token": "...", "password": "..." }` | **204** ok ; **400** token invalide / expiré / consommé ou password invalide ; **429** rate limit |

`request` ne retourne **jamais** de différence entre user connu et inconnu. Format d'erreur via `ApiErrorResponse` existant.

### 4.2 DTO (`Application/DTOs/AuthDtos.cs`)

```csharp
public sealed class PasswordResetRequest
{
    [Required, EmailAddress] public string Email { get; init; } = string.Empty;
    [RegularExpression("^(fr|en)$")] public string? Lang { get; init; }
}

public sealed class PasswordResetConfirmRequest
{
    [Required, MinLength(20)] public string Token { get; init; } = string.Empty;
    [Required, MinLength(1)]  public string Password { get; init; } = string.Empty;
}
```

### 4.3 Use cases

```text
Application/UseCases/Auth/PasswordReset/
  IRequestPasswordResetHandler.cs   + RequestPasswordResetHandler.cs
  IConfirmPasswordResetHandler.cs   + ConfirmPasswordResetHandler.cs
  PasswordResetTokenFactory.cs       (statique : Generate() → (clair, hash, expiresAt))

Application/Ports/
  IPasswordResetTokenRepository.cs   (CreateAsync, FindByTokenHashAsync,
                                      MarkConsumedAsync, InvalidateActiveForUserAsync,
                                      GetMostRecentForUserAsync)
  IEmailSender.cs                    (SendAsync(EmailMessage, ct))
  IAuthSessionInvalidator.cs         (InvalidateAllForUserAsync(userId, ct))
```

`IAuthSessionInvalidator` est implémenté dans `Infrastructure/Web/` au-dessus du `ITicketStore` Mongo existant (collection `auth_sessions`) — `delete` filtré par `UserId`.

Erreurs domaine : `BadRequestException` pour token invalide / expiré / consommé et password trop faible. Pas de `NotFoundException` côté `request` (silencieux).

### 4.4 Controller

Extension de `Controllers/AuthController.cs` :

```csharp
[HttpPost("password-reset/request")]
[EnableRateLimiting(RateLimitingExtensions.AuthPasswordResetRequestPolicy)]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status429TooManyRequests)]
public async Task<IActionResult> PasswordResetRequest(
    [FromBody] PasswordResetRequest request,
    [FromServices] IRequestPasswordResetHandler handler,
    CancellationToken ct)
{
    await handler.HandleAsync(request, ct);
    return Ok();
}

[HttpPost("password-reset/confirm")]
[EnableRateLimiting(RateLimitingExtensions.AuthPasswordResetConfirmPolicy)]
[ProducesResponseType(StatusCodes.Status204NoContent)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status429TooManyRequests)]
public async Task<IActionResult> PasswordResetConfirm(
    [FromBody] PasswordResetConfirmRequest request,
    [FromServices] IConfirmPasswordResetHandler handler,
    CancellationToken ct)
{
    await handler.HandleAsync(request, ct);
    return NoContent();
}
```

## 5. Données

### 5.1 Collection `password_reset_tokens`

```text
{
  _id: ObjectId,
  userId: string,            // FK logique vers users._id
  tokenHash: string,         // SHA-256 hex (64 chars)
  expiresAtUtc: DateTime,    // now + 30 min, en UTC
  consumedAt: DateTime?,     // null tant qu'inutilisé
  createdAt: DateTime,
  requestIp: string?,        // audit — vidé après TTL via purge
  requestUserAgent: string?  // audit
}
```

### 5.2 Indexes (extension de `MongoIndexInitializer`)

| Nom | Clés | Options |
|---|---|---|
| `password_reset_tokens_tokenHash_unique` | `tokenHash ASC` | `Unique = true` |
| `password_reset_tokens_userId` | `userId ASC` | `Sparse = true` |
| `password_reset_tokens_expires_ttl` | `expiresAtUtc ASC` | `ExpireAfter = TimeSpan.Zero` |

### 5.3 Domain entity

```csharp
namespace MoviePicker.Api.Domain.Entities;

public sealed record PasswordResetToken
{
    public string Id { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public string TokenHash { get; init; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; init; }
    public DateTimeOffset? ConsumedAt { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public string? RequestIp { get; init; }
    public string? RequestUserAgent { get; init; }
}
```

### 5.4 Repository

```text
Infrastructure/Persistence/Mongo/
  PasswordResetTokenDocument.cs
  PasswordResetTokenDocumentMapper.cs
  MongoPasswordResetTokenRepository.cs

Infrastructure/Persistence/InMemory/
  InMemoryPasswordResetTokenRepository.cs
```

Les deux implémentations couvrent les méthodes d'`IPasswordResetTokenRepository` ; l'in-memory simule la TTL via filtre `expiresAtUtc > now` à la lecture.

## 6. Email — port et implémentations

### 6.1 Port

```csharp
// Application/Ports/IEmailSender.cs
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}

public sealed record EmailMessage(
    string ToEmail,
    string ToName,
    string Subject,
    string HtmlBody,
    string TextBody,
    string? Tag = null  // ex. "password-reset"
);
```

### 6.2 Implémentations

```text
Infrastructure/Email/
  ResendEmailSender.cs
    HttpClient typé (AddHttpClient<IEmailSender, ResendEmailSender>)
    POST {ResendApiBaseUrl}/emails
    Auth: Authorization: Bearer {MoviePickerOptions.ResendApiKey}
    Body JSON : { from, to, subject, html, text, tags: [{name:"category", value:Tag}] }
    Lève EmailDeliveryException sur 4xx (sauf 429 → 1 retry court avec délai)
    Logs structurés : EmailSent { tag, to_masked, request_id, status }

  LogEmailSender.cs
    Logger.LogInformation("[EMAIL][{Tag}] to={To} subject={Subject} link={Link}")
    Activé automatiquement si EMAIL_PROVIDER == "log" ou si RESEND_API_KEY absente
    Pratique en `dotnet run` : on copie/colle le lien depuis la console

Configuration/MoviePickerOptions.cs (extension)
  + EmailProvider          (string, "resend" | "log", défaut "log")
  + EmailFromAddress       (string, défaut "noreply@movie-picker.fr")
  + EmailFromName          (string, défaut "Movie Picker")
  + ResendApiKey           (string?, secret)
  + ResendApiBaseUrl       (string, défaut "https://api.resend.com")

Infrastructure/Email/EmailServiceCollectionExtensions.cs
  AddEmailSender(services, configuration, environment) :
    provider = cfg["EMAIL_PROVIDER"] ?? "log"
    "resend" + RESEND_API_KEY présente → AddHttpClient<IEmailSender, ResendEmailSender>
    "log"  OU clé absente              → AddSingleton<IEmailSender, LogEmailSender>
                                          (+ warning startup si environment != Development
                                             et provider voulu = "resend")
```

### 6.3 Templates

Classe statique `Application/UseCases/Auth/PasswordReset/PasswordResetEmailFactory.cs` :

```csharp
public static EmailMessage Build(string toEmail, string toName, Uri resetUrl, string locale)
```

Deux locales (`fr`, `en`), chacune avec sujet + HTML + texte.

- HTML : inline-styles, conforme aux clients mail (Gmail, Outlook), bouton CTA + lien brut en repli, mention « Si tu n'es pas à l'origine de cette demande, ignore cet email », expiration 30 min affichée.
- Texte : version texte avec URL en clair (délivrabilité).

Sujet (FR) : « Réinitialise ton mot de passe Movie Picker » — Sujet (EN) : « Reset your Movie Picker password ».

### 6.4 Construction du lien

`PUBLIC_WEB_BASE_URL` (déjà existant pour OG) + path `/reset` + query `?token=<clair>`. Construction via `UriBuilder` côté serveur, jamais à partir d'un input client.

## 7. Front

### 7.1 Routes (`apps/web/src/app/routes.ts`)

```ts
export const ROUTES = {
  // ...existant
  forgotPassword: '/forgot-password',
  resetPassword: '/reset',
} as const;
```

### 7.2 API client (extension de `apps/web/src/features/auth/api/authApi.ts`)

```ts
export async function postPasswordResetRequest(
  email: string,
  lang?: 'fr' | 'en'
): Promise<void> {
  await fetchApi('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email, lang }),
  });
}

export async function postPasswordResetConfirm(
  token: string,
  password: string
): Promise<void> {
  await fetchApi('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}
```

### 7.3 Pages

```text
apps/web/src/features/auth/pages/
  ForgotPasswordPage.tsx       — input email, submit, message neutre toujours
                                  affiché après succès (anti-énumération côté UI aussi)
  ForgotPasswordPage.test.tsx
  ResetPasswordPage.tsx        — lit ?token=…, 2 champs (nouveau mdp + confirmation),
                                  valide via isRegisterPasswordCompliant,
                                  submit → toast succès → redirect /login.
                                  Si pas de token dans l'URL → état d'erreur clair.
  ResetPasswordPage.test.tsx
```

Conventions : mêmes hooks (`useAsyncAction`, `useDocumentTitle`, `useTranslation`, `safeReturnTo`), même shell (`AuthPageShell`, `PageLayout`), mêmes classes (`form`, `input`, `btn-primary`).

### 7.4 LoginPage

Ajouter un lien `auth.login.forgotPasswordLink` rendu en permanence (pas conditionnel DEV), juste sous le bouton submit et au-dessus du bloc « registerPrompt » existant :

```tsx
<p className="muted">
  <Link to={ROUTES.forgotPassword}>{t('auth.login.forgotPasswordLink')}</Link>
</p>
```

### 7.5 i18n — clés à ajouter (FR + EN)

```text
auth.login.forgotPasswordLink         "Mot de passe oublié ?"               / "Forgot your password?"

auth.forgotPassword.title             "Mot de passe oublié"                 / "Forgot your password"
auth.forgotPassword.description
auth.forgotPassword.emailLabel
auth.forgotPassword.submit
auth.forgotPassword.submitting
auth.forgotPassword.fallbackError
auth.forgotPassword.successMessage    "Si un compte existe pour cet email, tu recevras un lien dans quelques instants."
                                      / "If an account exists for this email, you'll receive a link shortly."
auth.forgotPassword.loginLink

auth.resetPassword.title              "Définir un nouveau mot de passe"
auth.resetPassword.description
auth.resetPassword.passwordLabel
auth.resetPassword.confirmPasswordLabel
auth.resetPassword.submit
auth.resetPassword.submitting
auth.resetPassword.fallbackError
auth.resetPassword.passwordMismatchError
auth.resetPassword.passwordRulesError
auth.resetPassword.invalidTokenTitle  "Lien invalide ou expiré"
auth.resetPassword.invalidTokenBody
auth.resetPassword.requestNewLinkCta
auth.resetPassword.successToast       "Mot de passe réinitialisé. Connecte-toi."
auth.resetPassword.loginCta
```

La `lang` envoyée à `password-reset/request` est dérivée de `useLocale().localeCode`.

## 8. Sécurité — récap des garde-fous

| Vecteur | Mitigation |
|---|---|
| Énumération d'emails | `request` répond toujours 200. Pour réduire l'écart de timing entre branche connue / inconnue, la branche « inconnu » exécute un faux travail équivalent (génération + hash SHA-256 d'un token jeté) avant de retourner. Mitigation pragmatique, pas une garantie cryptographique. |
| Spam de la BAL d'un user | Throttle silencieux 60 s par user : si un token actif a été créé < 60 s, pas de mail (mais 200). |
| Brute-force du token | 32 bytes random (256 bits, base64url ~43 chars), espace 2^256. Hash SHA-256 stocké suffisant (entropie élevée → pas besoin de bcrypt). |
| Rejouabilité du lien | `consumedAt` posé à la confirmation → toute réutilisation → 400. |
| Expiration | TTL 30 min côté domaine + index TTL Mongo (purge auto). |
| Brute-force de `confirm` | Token requis → l'attaquant doit déjà l'avoir. Rate limit 30/min/IP en filet. |
| Cookie volé | Reset confirmé → invalidation toutes sessions du user (`InvalidateAllForUserAsync`). |
| Phishing du lien | Lien construit serveur depuis `PUBLIC_WEB_BASE_URL` (jamais paramètre client). |
| Header injection email | Sujet = constantes localisées ; `ToEmail` validé `EmailAddress` ; `resetUrl` via `UriBuilder`. |
| Logs | `EmailMessage.ToEmail` masqué (`u***@domain.tld`), token jamais loggé. Correlation id propagé (`ApiRouteKind=auth` déjà en place). |

## 9. Rate limiting

Ajouts dans `Infrastructure/Web/RateLimitingExtensions.cs` :

```text
AuthPasswordResetRequestPolicy = "auth-password-reset-request"   →  5 / min / IP
AuthPasswordResetConfirmPolicy = "auth-password-reset-confirm"   → 30 / min / IP
```

En Development : `NoLimiter` comme les autres policies.

## 10. Configuration et déploiement

### 10.1 Variables d'env

À ajouter à `.env.example` (avec commentaires) :

```text
# Email (V1 — mot de passe oublié, voir docs/v1-produit/email-reset-mot-de-passe.md)
# EMAIL_PROVIDER=resend                            # ou "log" pour forcer LogEmailSender
# EMAIL_FROM_ADDRESS=noreply@movie-picker.fr
# EMAIL_FROM_NAME=Movie Picker
# RESEND_API_KEY=re_xxx                            # secret GCP Secret Manager en prod
# RESEND_API_BASE_URL=https://api.resend.com       # override pour tests / mocks
# PUBLIC_WEB_BASE_URL=https://web.movie-picker.fr  # déjà existant
```

### 10.2 Secrets GCP

| Secret Manager | Mappage Cloud Run |
|---|---|
| `RESEND_API_KEY` | `--set-secrets RESEND_API_KEY=RESEND_API_KEY:latest` |

### 10.3 appsettings

`appsettings.Development.json` : aucune modification nécessaire (les défauts d'`MoviePickerOptions` mettent `EmailProvider="log"`, donc `LogEmailSender` est actif tant que `EMAIL_PROVIDER` n'est pas explicitement positionné). En prod / staging, on définit `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` via Cloud Run.

### 10.4 Doc à mettre à jour

| Fichier | Modification |
|---|---|
| `.env.example` | Bloc Email |
| `docs/v1-produit/deploiement-secrets-ci.md` § 1 | Ajout secret `RESEND_API_KEY` |
| `docs/v1-produit/deploiement-secrets-ci.md` § 2 | Ajout vars `EMAIL__*`, rappel `PUBLIC_WEB_BASE_URL` |
| `docs/v1-produit/deploiement-secrets-ci.md` § 5 | Tableau plafonds : `auth-password-reset-request` (5/min) et `auth-password-reset-confirm` (30/min) |
| `docs/v1-produit/email-reset-mot-de-passe.md` (**nouveau**) | Procédure « vérifier le domaine Resend » (DKIM/SPF), test local, lecture des logs Resend |
| `README.md` | Ligne dans la table des secrets si elle existe |

## 11. Tests

### 11.1 Unitaires .NET

```text
MoviePicker.Api.Tests/UseCases/Auth/PasswordReset/
  RequestPasswordResetHandlerTests.cs
    - email inconnu → no email envoyé, no token créé, retourne sans exception
    - email connu → 1 token créé, hash != clair, expiresAt = now + 30 min, 1 email envoyé
    - email connu + token actif < 60 s → aucun email envoyé (FakeEmailSender vide)
    - tokens précédents non consommés du user → invalidés à la création d'un nouveau
    - lang "en" → email anglais ; lang absent → FR

  ConfirmPasswordResetHandlerTests.cs
    - token inconnu → BadRequestException
    - token expiré → BadRequestException
    - token déjà consommé → BadRequestException
    - password trop court / sans chiffre / sans lettre → BadRequestException
    - happy path → User.PasswordHash mis à jour, UpdatedAt avancé,
      token consumedAt posé, sessions du user invalidées (mock IAuthSessionInvalidator vérifié)

  PasswordResetTokenFactoryTests.cs
    - 100 tokens générés tous distincts
    - hash déterministe, longueur 64 hex
    - clair = base64url, ~43 chars sans padding
```

### 11.2 Intégration .NET

```text
MoviePicker.Api.IntegrationTests/AuthPasswordResetTests.cs
  - POST request avec email inconnu → 200, FakeEmailSender vide
  - POST request avec email connu → 200, FakeEmailSender contient 1 message,
    extract token via regex sur HtmlBody, POST confirm avec ce token → 204
  - Replay du même token → 400
  - Confirm avec token tronqué / invalide → 400
  - Rate limit request : 6e appel rapide depuis même IP → 429
  - Après confirm : tentative login avec ancien mdp → 401, avec nouveau mdp → 200
  - Après confirm : ancienne session cookie ne fonctionne plus
```

`FakeEmailSender` enregistre les `EmailMessage` envoyés en mémoire ; le test extrait le token clair depuis `HtmlBody` via regex sur `\?token=([A-Za-z0-9_-]+)`.

### 11.3 Front Vitest / RTL

```text
ForgotPasswordPage.test.tsx
  - submit avec email valide → message neutre affiché
  - erreur API (429) → message d'erreur générique, pas de leak
  - lien retour /login présent

ResetPasswordPage.test.tsx
  - sans ?token= → état "lien invalide"
  - password mismatch → erreur locale, pas d'appel API
  - password non conforme aux rules → erreur locale via isRegisterPasswordCompliant
  - submit valide → API appelée, redirection /login (mock useNavigate)
  - 400 backend (token expiré) → message d'erreur + lien vers /forgot-password

LoginPage.test.tsx
  - + assertion : lien "Mot de passe oublié ?" présent et pointe sur /forgot-password
```

### 11.4 Contract / OpenAPI

`OpenApiContractTests` regen après ajout des 2 endpoints + DTOs (`PasswordResetRequest`, `PasswordResetConfirmRequest`). `ProducesResponseType` à jour (200, 204, 400, 429, 500).

## 12. Mise à jour de la roadmap V1

Cocher dans `docs/v1-produit/livraison-v1.md` quand tout est livré et déployé en prod :

- § 3 ligne 84 — endpoints `/auth/password-reset/request` + `/confirm`
- § 3 ligne 85 — provider Resend, secrets en Secret Manager, template, SPF/DKIM
- § 3 ligne 86 — pages front « Mot de passe oublié » + « Définir un nouveau mot de passe »
- § 21 — vars/secrets + nouveaux rate limits documentés (déploiement-secrets-ci.md)
- § 22 ligne 271 — coche finale « Mot de passe oublié : flux email + reset opérationnel en prod »

## 13. Hors périmètre (pour cadrer le scope)

- Notifications email autres que reset (invitations soirée, rappels, etc.) — V1.x.
- 2FA / MFA — pas dans le scope V1.
- Reset par SMS / autre canal — non prévu.
- Migration vers Razor / framework de templating email — à faire seulement quand un 2e email est demandé.
- Webhook de bounce / complaint Resend — à ajouter si la délivrabilité pose problème en prod (V1.x).
- Vérification d'email à l'inscription (email confirmation) — feature distincte, non prévue ici.

## 14. Prochaine étape

→ `writing-plans` skill pour produire le plan d'implémentation détaillé (découpage en commits / PR, ordre, dépendances).
