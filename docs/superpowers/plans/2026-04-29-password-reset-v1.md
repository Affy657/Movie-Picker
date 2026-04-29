# Mot de passe oublié V1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec source :** [`../specs/2026-04-29-password-reset-v1-design.md`](../specs/2026-04-29-password-reset-v1-design.md). Le spec contient le code complet, les contrats d'erreur, la liste exhaustive des cas de test et les décisions de design. Ce plan se concentre sur l'**ordonnancement**, les **fichiers exacts** et les **commandes de vérification**. Le code détaillé est référencé par § du spec.

**Goal :** Livrer le flux mot de passe oublié V1 — API .NET (request/confirm), email transactionnel Resend, pages front, sécurité et observabilité — prêt à cocher la § 22 ligne 271 de `docs/v1-produit/livraison-v1.md`.

**Architecture :** Clean architecture .NET (Domain → Application/Ports → Infrastructure), token aléatoire 256 bits hashé SHA-256 stocké dans une collection Mongo dédiée à TTL 30 min, port `IEmailSender` avec impl Resend (HTTP direct) en prod et `LogEmailSender` en dev. Front React avec deux pages dédiées + lien depuis LoginPage. i18n FR + EN (UI + email).

**Tech Stack :** .NET 10, MongoDB.Driver, Microsoft.AspNetCore.Identity (`PasswordHasher`), `HttpClient` typé pour Resend, React + Vite + TanStack Query, Vitest + RTL, xUnit + WebApplicationFactory.

---

## Conventions du projet à respecter

- Handlers auto-enregistrés par convention (cf. `ServiceCollectionExtensions.RegisterHandlers`) — pas besoin d'`AddScoped` manuel pour les `*Handler`.
- Repositories : pattern in-memory + Mongo en parallèle (basé sur présence de `MONGODB_URI`).
- Env-vars **plates** bindées dans `MoviePickerOptions` (pas de section JSON `Email__*`).
- Erreurs : `BadRequestException`, `UnauthorizedException`, `ConflictException` avec enveloppe `ApiErrorResponse`.
- Tests intégration : `MoviePickerApplicationFactory` + `IClassFixture`.
- Front : `useAsyncAction`, `useTranslation`, `AuthPageShell`, `safeReturnTo`, classes CSS `form` / `input` / `btn-primary`.
- Pas de chaîne en dur côté front (i18n FR + EN obligatoire dès l'écriture).
- TDD : test d'abord à chaque fois (red → green → commit).
- **Commits fréquents** durant l'exécution (1 commit par tâche complétée). La règle « tout dans le même commit » du brainstorming concernait uniquement spec + plan, pas l'implémentation.

---

## File Structure

### API .NET — fichiers à créer

```
apps/api-dotnet/MoviePicker.Api/
  Domain/Entities/PasswordResetToken.cs
  Application/Ports/
    IPasswordResetTokenRepository.cs
    IEmailSender.cs
    IAuthSessionInvalidator.cs
  Application/UseCases/Auth/PasswordReset/
    PasswordResetTokenFactory.cs
    PasswordResetEmailFactory.cs
    IRequestPasswordResetHandler.cs
    RequestPasswordResetHandler.cs
    IConfirmPasswordResetHandler.cs
    ConfirmPasswordResetHandler.cs
  Application/DTOs/PasswordResetDtos.cs        (PasswordResetRequest + PasswordResetConfirmRequest)
  Infrastructure/Persistence/Mongo/
    PasswordResetTokenDocument.cs
    PasswordResetTokenDocumentMapper.cs
    MongoPasswordResetTokenRepository.cs
  Infrastructure/Persistence/InMemory/
    InMemoryPasswordResetTokenRepository.cs
  Infrastructure/Email/
    EmailServiceCollectionExtensions.cs
    ResendEmailSender.cs
    LogEmailSender.cs
    EmailDeliveryException.cs
  Infrastructure/Web/MongoAuthSessionInvalidator.cs   (impl IAuthSessionInvalidator au-dessus de la collection auth_sessions)
```

### API .NET — fichiers à modifier

```
apps/api-dotnet/MoviePicker.Api/
  Configuration/MoviePickerOptions.cs                         (+ EmailProvider, EmailFromAddress, EmailFromName, ResendApiKey, ResendApiBaseUrl)
  Infrastructure/ServiceCollectionExtensions.cs               (+ binding env-vars Email + AddEmailSender + repos token reset + IAuthSessionInvalidator)
  Infrastructure/Persistence/Mongo/MongoIndexInitializer.cs   (+ EnsurePasswordResetTokenIndexesAsync)
  Infrastructure/Web/RateLimitingExtensions.cs                (+ AuthPasswordResetRequestPolicy + AuthPasswordResetConfirmPolicy)
  Controllers/AuthController.cs                               (+ 2 endpoints)
```

### API .NET — tests

```
apps/api-dotnet/MoviePicker.Api.Tests/UseCases/Auth/PasswordReset/
  PasswordResetTokenFactoryTests.cs
  PasswordResetEmailFactoryTests.cs
  RequestPasswordResetHandlerTests.cs
  ConfirmPasswordResetHandlerTests.cs
apps/api-dotnet/MoviePicker.Api.Tests/Infrastructure/Email/
  ResendEmailSenderTests.cs
  LogEmailSenderTests.cs
apps/api-dotnet/MoviePicker.Api.Tests/Infrastructure/Persistence/Mongo/
  PasswordResetTokenDocumentMapperTests.cs
apps/api-dotnet/MoviePicker.Api.IntegrationTests/
  AuthPasswordResetTests.cs
  Fakes/FakeEmailSender.cs                                    (capture in-memory pour les tests)
```

### Front — fichiers à créer

```
apps/web/src/features/auth/pages/
  ForgotPasswordPage.tsx
  ForgotPasswordPage.test.tsx
  ResetPasswordPage.tsx
  ResetPasswordPage.test.tsx
```

### Front — fichiers à modifier

```
apps/web/src/
  app/routes.ts                                  (+ forgotPassword, resetPassword)
  app/AppRouter.tsx (ou équivalent)              (+ <Route> pour les 2 pages)
  features/auth/api/authApi.ts                   (+ postPasswordResetRequest + postPasswordResetConfirm)
  features/auth/pages/LoginPage.tsx              (+ lien forgotPasswordLink)
  features/auth/pages/LoginPage.test.tsx         (+ assertion lien présent)
  shared/i18n/locales/fr.ts                      (+ auth.forgotPassword + auth.resetPassword + auth.login.forgotPasswordLink)
  shared/i18n/locales/en.ts                      (idem)
```

### Configuration et docs

```
.env.example                                     (+ bloc Email)
docs/v1-produit/deploiement-secrets-ci.md        (§ 1, § 2, § 5)
docs/v1-produit/email-reset-mot-de-passe.md      (NOUVEAU — procédure DKIM/SPF + test local)
docs/v1-produit/livraison-v1.md                  (cocher § 3 lignes 84-86, § 21, § 22 ligne 271)
  README.md                                        (ligne table secrets si présente)
```

---

## Phase 1 — Domain + Token factory

### Task 1 : Domain entity `PasswordResetToken` + port repository

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Domain/Entities/PasswordResetToken.cs`
- Create : `apps/api-dotnet/MoviePicker.Api/Application/Ports/IPasswordResetTokenRepository.cs`

**Steps :**

- [ ] **1.1** Créer le record `PasswordResetToken` avec les champs du spec § 5.3 (Id, UserId, TokenHash, ExpiresAtUtc, ConsumedAt?, CreatedAt, RequestIp?, RequestUserAgent?).

- [ ] **1.2** Créer l'interface `IPasswordResetTokenRepository` :

```csharp
public interface IPasswordResetTokenRepository
{
    Task<PasswordResetToken> AddAsync(PasswordResetToken token, CancellationToken ct = default);
    Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task MarkConsumedAsync(string tokenId, DateTimeOffset consumedAt, CancellationToken ct = default);
    Task InvalidateActiveForUserAsync(string userId, DateTimeOffset consumedAt, CancellationToken ct = default);
    Task<PasswordResetToken?> GetMostRecentForUserAsync(string userId, CancellationToken ct = default);
}
```

- [ ] **1.3** Build : `dotnet build apps/api-dotnet/MoviePicker.slnx` → succès attendu (compile only).

- [ ] **1.4** Commit :

```
git add apps/api-dotnet/MoviePicker.Api/Domain/Entities/PasswordResetToken.cs apps/api-dotnet/MoviePicker.Api/Application/Ports/IPasswordResetTokenRepository.cs
git commit -m "feat(api): ajoute entité PasswordResetToken + port IPasswordResetTokenRepository"
```

---

### Task 2 : `PasswordResetTokenFactory` + tests

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Application/UseCases/Auth/PasswordReset/PasswordResetTokenFactory.cs`
- Create : `apps/api-dotnet/MoviePicker.Api.Tests/UseCases/Auth/PasswordReset/PasswordResetTokenFactoryTests.cs`

**Steps :**

- [ ] **2.1** RED — écrire les tests d'abord :

```csharp
public class PasswordResetTokenFactoryTests
{
    [Fact]
    public void Generate_ProducesPlainTokenOf43BytesBase64Url()
    {
        var (plain, hash) = PasswordResetTokenFactory.Generate();
        Assert.Equal(43, plain.Length);            // 32 bytes en base64url sans padding
        Assert.Matches("^[A-Za-z0-9_-]+$", plain);
        Assert.Equal(64, hash.Length);             // SHA-256 hex
        Assert.Matches("^[a-f0-9]+$", hash);
    }

    [Fact]
    public void Generate_ProducesDistinctTokens()
    {
        var set = new HashSet<string>();
        for (var i = 0; i < 100; i++) set.Add(PasswordResetTokenFactory.Generate().Plain);
        Assert.Equal(100, set.Count);
    }

    [Fact]
    public void Hash_IsDeterministic()
    {
        var plain = "abc";
        Assert.Equal(PasswordResetTokenFactory.Hash(plain), PasswordResetTokenFactory.Hash(plain));
    }
}
```

- [ ] **2.2** Run : `dotnet test apps/api-dotnet/MoviePicker.Api.Tests --filter PasswordResetTokenFactoryTests` → FAIL (type absent).

- [ ] **2.3** GREEN — implémenter la factory :

```csharp
public static class PasswordResetTokenFactory
{
    public static (string Plain, string Hash) Generate()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        var plain = Base64UrlEncoder.Encode(bytes);  // ou WebEncoders.Base64UrlEncode
        return (plain, Hash(plain));
    }

    public static string Hash(string plain)
    {
        var bytes = Encoding.UTF8.GetBytes(plain);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
```

- [ ] **2.4** Run tests → PASS.

- [ ] **2.5** Commit :

```
git add apps/api-dotnet/MoviePicker.Api/Application/UseCases/Auth/PasswordReset/ apps/api-dotnet/MoviePicker.Api.Tests/UseCases/Auth/PasswordReset/PasswordResetTokenFactoryTests.cs
git commit -m "feat(api): ajoute PasswordResetTokenFactory (32 bytes random, hash SHA-256) + tests"
```

---

### Task 3 : `InMemoryPasswordResetTokenRepository`

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/InMemory/InMemoryPasswordResetTokenRepository.cs`

**Steps :**

- [ ] **3.1** Implémenter `IPasswordResetTokenRepository` au-dessus d'un `ConcurrentDictionary<string, PasswordResetToken>` (clé = Id). `GetByTokenHashAsync` filtre par `TokenHash` ET `ExpiresAtUtc > now` ET `ConsumedAt == null`. `InvalidateActiveForUserAsync` marque tous les tokens du user `ConsumedAt = consumedAt` quand `ConsumedAt == null`. `GetMostRecentForUserAsync` retourne le plus récent par `CreatedAt`.

- [ ] **3.2** Enregistrer dans `ServiceCollectionExtensions.AddMoviePicker` (branche in-memory, à côté de `InMemoryUserRepository` existant) :

```csharp
services.AddSingleton<IPasswordResetTokenRepository, InMemoryPasswordResetTokenRepository>();
```

- [ ] **3.3** Build : `dotnet build apps/api-dotnet/MoviePicker.slnx` → succès.

- [ ] **3.4** Commit :

```
git commit -am "feat(api): ajoute InMemoryPasswordResetTokenRepository et enregistre le port en mode in-memory"
```

---

### Task 4 : Persistence Mongo (Document + Mapper + Repository + Index TTL)

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/Mongo/PasswordResetTokenDocument.cs`
- Create : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/Mongo/PasswordResetTokenDocumentMapper.cs`
- Create : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/Mongo/MongoPasswordResetTokenRepository.cs`
- Create : `apps/api-dotnet/MoviePicker.Api.Tests/Infrastructure/Persistence/Mongo/PasswordResetTokenDocumentMapperTests.cs`
- Modify : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Persistence/Mongo/MongoIndexInitializer.cs`
- Modify : `apps/api-dotnet/MoviePicker.Api/Infrastructure/ServiceCollectionExtensions.cs`

**Steps :**

- [ ] **4.1** RED — écrire `PasswordResetTokenDocumentMapperTests` (round-trip Domain ↔ Document, conversion ExpiresAtUtc ↔ DateTime UTC). Pattern : copier `UserDocumentMapperTests`.

- [ ] **4.2** GREEN — créer `PasswordResetTokenDocument` (champs BSON `userId`, `tokenHash`, `expiresAtUtc`, `consumedAt`, `createdAt`, `requestIp`, `requestUserAgent`) + mapper bidirectionnel (`ToDocument` / `ToDomain`), miroir de `UserDocumentMapper`.

- [ ] **4.3** Implémenter `MongoPasswordResetTokenRepository` au-dessus de `IMongoCollection<PasswordResetTokenDocument>` (collection `password_reset_tokens`). Méthodes :
  - `AddAsync` : `InsertOneAsync` + retourne le doc avec son `Id` Mongo.
  - `GetByTokenHashAsync` : `Find(d => d.TokenHash == hash && d.ExpiresAtUtc > now && d.ConsumedAt == null)` → 1.
  - `MarkConsumedAsync` : `UpdateOneAsync` `Set(d.ConsumedAt, consumedAt)`.
  - `InvalidateActiveForUserAsync` : `UpdateManyAsync` filtre `userId == X && consumedAt == null`.
  - `GetMostRecentForUserAsync` : `Find(d => d.UserId == userId).SortByDescending(d => d.CreatedAt).Limit(1)`.

- [ ] **4.4** Étendre `MongoIndexInitializer` :

```csharp
private async Task EnsurePasswordResetTokenIndexesAsync(CancellationToken ct)
{
    var col = _database.GetCollection<PasswordResetTokenDocument>("password_reset_tokens");
    var tokenHash = new CreateIndexModel<PasswordResetTokenDocument>(
        Builders<PasswordResetTokenDocument>.IndexKeys.Ascending(x => x.TokenHash),
        new CreateIndexOptions { Name = "password_reset_tokens_tokenHash_unique", Unique = true });
    var byUser = new CreateIndexModel<PasswordResetTokenDocument>(
        Builders<PasswordResetTokenDocument>.IndexKeys.Ascending(x => x.UserId),
        new CreateIndexOptions { Name = "password_reset_tokens_userId", Sparse = true });
    var ttl = new CreateIndexModel<PasswordResetTokenDocument>(
        Builders<PasswordResetTokenDocument>.IndexKeys.Ascending(x => x.ExpiresAtUtc),
        new CreateIndexOptions { Name = "password_reset_tokens_expires_ttl", ExpireAfter = TimeSpan.Zero });
    await col.Indexes.CreateManyAsync(new[] { tokenHash, byUser, ttl }, ct);
}
```

…et appeler `EnsurePasswordResetTokenIndexesAsync(cancellationToken)` dans `StartAsync`.

- [ ] **4.5** Enregistrer le repo Mongo dans `ServiceCollectionExtensions.AddMoviePicker` (branche Mongo, à côté de `MongoUserRepository`) :

```csharp
services.AddScoped<IPasswordResetTokenRepository, MongoPasswordResetTokenRepository>();
```

- [ ] **4.6** Run tests : `dotnet test apps/api-dotnet/MoviePicker.Api.Tests --filter PasswordResetTokenDocumentMapper` → PASS.

- [ ] **4.7** Commit :

```
git commit -am "feat(api): persistence Mongo password_reset_tokens (doc, mapper, repo, index TTL)"
```

---

## Phase 2 — Email infrastructure

### Task 5 : Port `IEmailSender` + `EmailMessage`

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Application/Ports/IEmailSender.cs`

**Steps :**

- [ ] **5.1** Définir le port (cf. spec § 6.1) :

```csharp
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
    string? Tag = null);
```

- [ ] **5.2** Build : succès attendu.

- [ ] **5.3** Commit :

```
git commit -am "feat(api): ajoute port IEmailSender + record EmailMessage"
```

---

### Task 6 : `PasswordResetEmailFactory` (templates FR + EN inline) + tests

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Application/UseCases/Auth/PasswordReset/PasswordResetEmailFactory.cs`
- Create : `apps/api-dotnet/MoviePicker.Api.Tests/UseCases/Auth/PasswordReset/PasswordResetEmailFactoryTests.cs`

**Steps :**

- [ ] **6.1** RED — tests :

```csharp
public class PasswordResetEmailFactoryTests
{
    private static readonly Uri ResetUrl = new("https://web.movie-picker.fr/reset?token=abc");

    [Fact]
    public void Build_French_HasFrenchSubjectAndContainsResetUrl()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.fr", "Alice", ResetUrl, "fr");
        Assert.Contains("Réinitialise", msg.Subject);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.HtmlBody);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.TextBody);
        Assert.Contains("30", msg.HtmlBody);            // mention expiration
        Assert.Equal("password-reset", msg.Tag);
    }

    [Fact]
    public void Build_English_HasEnglishSubject()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.com", "Bob", ResetUrl, "en");
        Assert.Contains("Reset", msg.Subject);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.HtmlBody);
    }

    [Fact]
    public void Build_UnknownLocale_FallsBackToFrench()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.fr", "x", ResetUrl, "es");
        Assert.Contains("Réinitialise", msg.Subject);
    }
}
```

- [ ] **6.2** Run → FAIL.

- [ ] **6.3** GREEN — implémenter avec switch sur locale, deux constantes (`FrTemplate`, `EnTemplate`) contenant Subject + HtmlBody + TextBody. HTML inline-styles, bouton CTA, mention expiration "30 minutes" (FR) / "30 minutes" (EN), phrase de garde « Si tu n'es pas à l'origine de cette demande, ignore cet email. » (FR) / « If you didn't request this, ignore this email. » (EN).

- [ ] **6.4** Run tests → PASS.

- [ ] **6.5** Commit :

```
git commit -am "feat(api): templates email reset password FR + EN (inline) + tests"
```

---

### Task 7 : Étendre `MoviePickerOptions` avec config Email

**Files :**
- Modify : `apps/api-dotnet/MoviePicker.Api/Configuration/MoviePickerOptions.cs`
- Modify : `apps/api-dotnet/MoviePicker.Api/Infrastructure/ServiceCollectionExtensions.cs` (binding env vars)

**Steps :**

- [ ] **7.1** Ajouter à `MoviePickerOptions` :

```csharp
/// <summary>Provider email transactionnel : "resend" ou "log". Variable : <c>EMAIL_PROVIDER</c>.</summary>
public string EmailProvider { get; set; } = "log";
public string EmailFromAddress { get; set; } = "noreply@movie-picker.fr";
public string EmailFromName { get; set; } = "Movie Picker";
public string? ResendApiKey { get; set; }
public string ResendApiBaseUrl { get; set; } = "https://api.resend.com";
```

- [ ] **7.2** Étendre le binding dans `ServiceCollectionExtensions.AddMoviePicker` :

```csharp
var emailProvider = cfg["EMAIL_PROVIDER"];
if (!string.IsNullOrWhiteSpace(emailProvider))
    opts.EmailProvider = emailProvider.Trim().ToLowerInvariant();
var fromAddress = cfg["EMAIL_FROM_ADDRESS"];
if (!string.IsNullOrWhiteSpace(fromAddress))
    opts.EmailFromAddress = fromAddress.Trim();
var fromName = cfg["EMAIL_FROM_NAME"];
if (!string.IsNullOrWhiteSpace(fromName))
    opts.EmailFromName = fromName.Trim();
var resendKey = cfg["RESEND_API_KEY"];
opts.ResendApiKey = string.IsNullOrWhiteSpace(resendKey) ? null : resendKey;
var resendBase = cfg["RESEND_API_BASE_URL"];
if (!string.IsNullOrWhiteSpace(resendBase))
    opts.ResendApiBaseUrl = resendBase.Trim().TrimEnd('/');
```

- [ ] **7.3** Build → succès.

- [ ] **7.4** Commit :

```
git commit -am "feat(api): ajoute options email (EMAIL_PROVIDER, EMAIL_FROM_*, RESEND_API_KEY) à MoviePickerOptions"
```

---

### Task 8 : `LogEmailSender` + tests

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Email/LogEmailSender.cs`
- Create : `apps/api-dotnet/MoviePicker.Api.Tests/Infrastructure/Email/LogEmailSenderTests.cs`

**Steps :**

- [ ] **8.1** RED — test : envoyer un message via `LogEmailSender` et asserter qu'un `LogInformation` est émis avec `Tag`, `ToEmail` masqué (`u***@x.fr`), `Subject`, et le lien extrait du HTML (regex `\?token=([A-Za-z0-9_-]+)`). Utiliser `FakeLogger<LogEmailSender>` (`Microsoft.Extensions.Logging.Testing`) ou un `ILogger<>` mocké.

- [ ] **8.2** GREEN :

```csharp
public sealed class LogEmailSender : IEmailSender
{
    private readonly ILogger<LogEmailSender> _logger;
    public LogEmailSender(ILogger<LogEmailSender> logger) => _logger = logger;

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var masked = MaskEmail(message.ToEmail);
        var link = ExtractFirstLink(message.HtmlBody);
        _logger.LogInformation(
            "[EMAIL][{Tag}] to={To} subject={Subject} link={Link}",
            message.Tag ?? "n/a", masked, message.Subject, link ?? "(none)");
        return Task.CompletedTask;
    }

    internal static string MaskEmail(string email) { /* renvoie "u***@domain" */ }
    internal static string? ExtractFirstLink(string html) { /* premier href ou regex token */ }
}
```

- [ ] **8.3** Tests PASS.

- [ ] **8.4** Commit :

```
git commit -am "feat(api): LogEmailSender pour dev/test (logs structurés, email masqué)"
```

---

### Task 9 : `ResendEmailSender` (HttpClient typé) + tests

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Email/ResendEmailSender.cs`
- Create : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Email/EmailDeliveryException.cs`
- Create : `apps/api-dotnet/MoviePicker.Api.Tests/Infrastructure/Email/ResendEmailSenderTests.cs`

**Steps :**

- [ ] **9.1** Créer `EmailDeliveryException : Exception` (constructeur avec message + inner optionnel + `int? StatusCode`).

- [ ] **9.2** RED — tests `ResendEmailSenderTests` avec `HttpMessageHandler` mocké (`MockHttpMessageHandler` ou pattern custom) :
  - Happy path : POST sur `/emails`, body JSON contient `from`, `to`, `subject`, `html`, `text`, `tags` ; réponse 200 → `SendAsync` complète sans exception.
  - 400 du provider → `EmailDeliveryException` avec `StatusCode = 400`.
  - 401 (clé invalide) → `EmailDeliveryException`.
  - Header `Authorization: Bearer {key}` présent.

- [ ] **9.3** GREEN — implémenter :

```csharp
public sealed class ResendEmailSender : IEmailSender
{
    private readonly HttpClient _http;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(HttpClient http, IOptions<MoviePickerOptions> options, ILogger<ResendEmailSender> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var body = new
        {
            from = $"{_options.EmailFromName} <{_options.EmailFromAddress}>",
            to = new[] { message.ToEmail },
            subject = message.Subject,
            html = message.HtmlBody,
            text = message.TextBody,
            tags = message.Tag is null ? Array.Empty<object>() : new object[] { new { name = "category", value = message.Tag } }
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, "/emails")
        {
            Content = JsonContent.Create(body)
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ResendApiKey);
        using var res = await _http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            var payload = await res.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Resend failed status={Status} body={Body}", (int)res.StatusCode, payload);
            throw new EmailDeliveryException($"Resend returned {(int)res.StatusCode}", null) { StatusCode = (int)res.StatusCode };
        }
        _logger.LogInformation("EmailSent tag={Tag} to_masked={ToMasked}", message.Tag, LogEmailSender.MaskEmail(message.ToEmail));
    }
}
```

(`StatusCode` = init-only sur l'exception ou propriété mutable selon style projet.)

- [ ] **9.4** Run tests → PASS.

- [ ] **9.5** Commit :

```
git commit -am "feat(api): ResendEmailSender (HttpClient typé + bearer + erreurs structurées) + tests"
```

---

### Task 10 : `EmailServiceCollectionExtensions` + branchement DI

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Email/EmailServiceCollectionExtensions.cs`
- Modify : `apps/api-dotnet/MoviePicker.Api/Infrastructure/ServiceCollectionExtensions.cs`

**Steps :**

- [ ] **10.1** Implémenter :

```csharp
public static class EmailServiceCollectionExtensions
{
    public static IServiceCollection AddEmailSender(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var provider = (configuration["EMAIL_PROVIDER"] ?? "log").Trim().ToLowerInvariant();
        var apiKey = configuration["RESEND_API_KEY"];
        var apiBase = (configuration["RESEND_API_BASE_URL"] ?? "https://api.resend.com").TrimEnd('/');

        if (provider == "resend" && !string.IsNullOrWhiteSpace(apiKey))
        {
            services.AddHttpClient<IEmailSender, ResendEmailSender>(c =>
            {
                c.BaseAddress = new Uri(apiBase + "/");
                c.Timeout = TimeSpan.FromSeconds(15);
                c.DefaultRequestHeaders.UserAgent.ParseAdd("MoviePicker-Api/1.0");
            });
        }
        else
        {
            services.AddSingleton<IEmailSender, LogEmailSender>();
            if (!environment.IsDevelopment() && provider == "resend")
            {
                // Provider voulu mais clé absente : log d'avertissement au démarrage via un IHostedService minimal,
                // ou simplement un Console.Error.WriteLine ici (le logger n'est pas encore dispo).
                Console.Error.WriteLine("[WARN] EMAIL_PROVIDER=resend mais RESEND_API_KEY absente → fallback LogEmailSender.");
            }
        }
        return services;
    }
}
```

- [ ] **10.2** Appeler dans `ServiceCollectionExtensions.AddMoviePicker` :

```csharp
services.AddEmailSender(configuration, environment);
```

- [ ] **10.3** Build → succès.

- [ ] **10.4** Commit :

```
git commit -am "feat(api): EmailServiceCollectionExtensions (sélection provider via EMAIL_PROVIDER + clé)"
```

---

### Task 11 : `IAuthSessionInvalidator` + impl Mongo

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Application/Ports/IAuthSessionInvalidator.cs`
- Create : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/MongoAuthSessionInvalidator.cs`
- Modify : `apps/api-dotnet/MoviePicker.Api/Infrastructure/ServiceCollectionExtensions.cs`

**Steps :**

- [ ] **11.1** Définir le port :

```csharp
public interface IAuthSessionInvalidator
{
    Task InvalidateAllForUserAsync(string userId, CancellationToken ct = default);
}
```

- [ ] **11.2** Implémenter `MongoAuthSessionInvalidator` : `_database.GetCollection<AuthSessionDocument>("auth_sessions").DeleteManyAsync(d => d.UserId == userId, ct)`.

- [ ] **11.3** Pour le mode in-memory (pas de Mongo), implémenter `NoOpAuthSessionInvalidator` qui retourne `Task.CompletedTask` (les tests intégration utilisent Mongo réel via fixture, et les tests unitaires mockent ce port).

- [ ] **11.4** Enregistrer dans `ServiceCollectionExtensions.AddMoviePicker` :
  - branche in-memory : `services.AddSingleton<IAuthSessionInvalidator, NoOpAuthSessionInvalidator>();`
  - branche Mongo : `services.AddScoped<IAuthSessionInvalidator, MongoAuthSessionInvalidator>();`

- [ ] **11.5** Build → succès.

- [ ] **11.6** Commit :

```
git commit -am "feat(api): IAuthSessionInvalidator + impl Mongo (delete auth_sessions par userId)"
```

---

## Phase 3 — Use cases

### Task 12 : `RequestPasswordResetHandler` + tests complets

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Application/UseCases/Auth/PasswordReset/IRequestPasswordResetHandler.cs`
- Create : `apps/api-dotnet/MoviePicker.Api/Application/UseCases/Auth/PasswordReset/RequestPasswordResetHandler.cs`
- Create : `apps/api-dotnet/MoviePicker.Api/Application/DTOs/PasswordResetDtos.cs`
- Create : `apps/api-dotnet/MoviePicker.Api.Tests/UseCases/Auth/PasswordReset/RequestPasswordResetHandlerTests.cs`

**Steps :**

- [ ] **12.1** Créer le DTO `PasswordResetRequest` (cf. spec § 4.2). Mettre `Lang` nullable avec `[RegularExpression("^(fr|en)$")]`.

- [ ] **12.2** Définir `IRequestPasswordResetHandler` :

```csharp
public interface IRequestPasswordResetHandler
{
    Task HandleAsync(PasswordResetRequest request, string? ip, string? userAgent, CancellationToken ct = default);
}
```

- [ ] **12.3** RED — tests `RequestPasswordResetHandlerTests` couvrant les cas du spec § 11.1 :
  - email inconnu → 0 token créé, 0 email envoyé, retourne sans exception
  - email connu → 1 token créé (hash != clair, expiresAt = now + 30 min) + 1 email envoyé
  - email connu mais token actif < 60 s → 0 email envoyé
  - tokens précédents non consommés du user → invalidés (vérifier appel `InvalidateActiveForUserAsync`)
  - lang "en" → email anglais ; lang absent → FR

  Mocks : `IUserRepository`, `IPasswordResetTokenRepository`, `IEmailSender` (utiliser un fake qui capture). `MoviePickerOptions` injecté avec `PublicWebBaseUrl = "https://web.movie-picker.fr"`.

- [ ] **12.4** GREEN — implémenter :

```csharp
public sealed class RequestPasswordResetHandler : IRequestPasswordResetHandler
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan ResendThrottle = TimeSpan.FromSeconds(60);

    private readonly IUserRepository _users;
    private readonly IPasswordResetTokenRepository _tokens;
    private readonly IEmailSender _email;
    private readonly MoviePickerOptions _options;
    private readonly TimeProvider _clock;
    private readonly ILogger<RequestPasswordResetHandler> _logger;

    public RequestPasswordResetHandler(/* DI */) { /* assign */ }

    public async Task HandleAsync(PasswordResetRequest request, string? ip, string? userAgent, CancellationToken ct = default)
    {
        var locale = string.Equals(request.Lang, "en", StringComparison.OrdinalIgnoreCase) ? "en" : "fr";
        var user = await _users.GetByEmailAsync(request.Email.Trim(), ct);
        if (user is null)
        {
            // Faux travail pour réduire l'écart de timing
            _ = PasswordResetTokenFactory.Generate();
            return;
        }

        var now = _clock.GetUtcNow();
        var recent = await _tokens.GetMostRecentForUserAsync(user.Id, ct);
        var throttle = recent is not null
            && recent.ConsumedAt is null
            && (now - recent.CreatedAt) < ResendThrottle;

        await _tokens.InvalidateActiveForUserAsync(user.Id, now, ct);

        var (plain, hash) = PasswordResetTokenFactory.Generate();
        var token = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAtUtc = now + TokenLifetime,
            CreatedAt = now,
            RequestIp = ip,
            RequestUserAgent = userAgent
        };
        await _tokens.AddAsync(token, ct);

        if (throttle)
        {
            _logger.LogInformation("PasswordReset throttled (silent) userId={UserId}", user.Id);
            return;
        }

        var resetUrl = new Uri($"{_options.PublicWebBaseUrl}/reset?token={Uri.EscapeDataString(plain)}");
        var msg = PasswordResetEmailFactory.Build(user.Email, user.DisplayName, resetUrl, locale);
        await _email.SendAsync(msg, ct);
    }
}
```

- [ ] **12.5** Tests PASS.

- [ ] **12.6** Commit :

```
git commit -am "feat(api): RequestPasswordResetHandler (token + email + throttle 60s + anti-énum) + tests"
```

---

### Task 13 : `ConfirmPasswordResetHandler` + tests complets

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api/Application/UseCases/Auth/PasswordReset/IConfirmPasswordResetHandler.cs`
- Create : `apps/api-dotnet/MoviePicker.Api/Application/UseCases/Auth/PasswordReset/ConfirmPasswordResetHandler.cs`
- Modify : `apps/api-dotnet/MoviePicker.Api/Application/DTOs/PasswordResetDtos.cs` (ajouter `PasswordResetConfirmRequest`)
- Create : `apps/api-dotnet/MoviePicker.Api.Tests/UseCases/Auth/PasswordReset/ConfirmPasswordResetHandlerTests.cs`

**Steps :**

- [ ] **13.1** Ajouter le DTO `PasswordResetConfirmRequest` (Token + Password requis).

- [ ] **13.2** Définir `IConfirmPasswordResetHandler.HandleAsync(PasswordResetConfirmRequest, ct)`.

- [ ] **13.3** RED — tests couvrant spec § 11.1 :
  - token inconnu → `BadRequestException`
  - token expiré (ExpiresAt < now) → `BadRequestException`
  - token déjà consommé → `BadRequestException`
  - password trop court / sans chiffre / sans lettre → `BadRequestException` (réutilise `AuthInputValidation.ValidatePassword`)
  - happy path : `User.PasswordHash` mis à jour, `UpdatedAt` avancé, `MarkConsumedAsync` appelé, `IAuthSessionInvalidator.InvalidateAllForUserAsync(user.Id)` appelé

- [ ] **13.4** GREEN — implémenter :

```csharp
public sealed class ConfirmPasswordResetHandler : IConfirmPasswordResetHandler
{
    private readonly IPasswordResetTokenRepository _tokens;
    private readonly IUserRepository _users;
    private readonly IPasswordHasher<User> _hasher;
    private readonly IAuthSessionInvalidator _invalidator;
    private readonly TimeProvider _clock;

    public ConfirmPasswordResetHandler(/* DI */) { /* assign */ }

    public async Task HandleAsync(PasswordResetConfirmRequest request, CancellationToken ct = default)
    {
        var pwdErr = AuthInputValidation.ValidatePassword(request.Password);
        if (pwdErr is not null) throw new BadRequestException(pwdErr);

        var hash = PasswordResetTokenFactory.Hash(request.Token);
        var token = await _tokens.GetByTokenHashAsync(hash, ct);
        var now = _clock.GetUtcNow();
        if (token is null || token.ExpiresAtUtc <= now || token.ConsumedAt is not null)
            throw new BadRequestException("Lien invalide ou expiré.");

        var user = await _users.GetByIdAsync(token.UserId, ct)
            ?? throw new BadRequestException("Lien invalide ou expiré.");

        var updated = user with
        {
            PasswordHash = _hasher.HashPassword(user, request.Password),
            UpdatedAt = now
        };
        await _users.UpdateAsync(updated, ct);
        await _tokens.MarkConsumedAsync(token.Id, now, ct);
        await _invalidator.InvalidateAllForUserAsync(user.Id, ct);
    }
}
```

(Note : `GetByTokenHashAsync` du repo filtre déjà `expires > now && consumed == null`, mais on re-vérifie en handler pour être robuste si l'impl in-memory évolue.)

- [ ] **13.5** Tests PASS.

- [ ] **13.6** Commit :

```
git commit -am "feat(api): ConfirmPasswordResetHandler (validation, hash, invalidation sessions) + tests"
```

---

## Phase 4 — Controller + Rate limit + Intégration

### Task 14 : Rate limit policies

**Files :**
- Modify : `apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/RateLimitingExtensions.cs`

**Steps :**

- [ ] **14.1** Ajouter les 2 constantes :

```csharp
public const string AuthPasswordResetRequestPolicy = "auth-password-reset-request";
public const string AuthPasswordResetConfirmPolicy = "auth-password-reset-confirm";
```

- [ ] **14.2** Branche Development : `NoLimiter("dev")` pour les 2 policies.

- [ ] **14.3** Branche prod :

```csharp
options.AddPolicy(AuthPasswordResetRequestPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 5, windowMinutes: 1));
options.AddPolicy(AuthPasswordResetConfirmPolicy, ctx => CreateFixedWindow(ctx, permitLimit: 30, windowMinutes: 1));
```

- [ ] **14.4** Build → succès.

- [ ] **14.5** Commit :

```
git commit -am "feat(api): rate limits dédiés pour password-reset (request 5/min, confirm 30/min par IP)"
```

---

### Task 15 : Endpoints controller

**Files :**
- Modify : `apps/api-dotnet/MoviePicker.Api/Controllers/AuthController.cs`

**Steps :**

- [ ] **15.1** Ajouter les 2 actions selon spec § 4.4. Pour `request`, récupérer IP + UA via `HttpContext.Connection.RemoteIpAddress` + `Request.Headers.UserAgent.ToString()` et les passer au handler. `[ProducesResponseType]` aligné spec § 4.1.

- [ ] **15.2** Build → succès.

- [ ] **15.3** Smoke test manuel : `dotnet run` + curl POST sur les 2 routes (avec `EMAIL_PROVIDER=log`) → vérifier dans les logs qu'on voit `[EMAIL][password-reset]` à la demande.

- [ ] **15.4** Commit :

```
git commit -am "feat(api): expose endpoints POST /auth/password-reset/{request,confirm}"
```

---

### Task 16 : `FakeEmailSender` (tests intégration) + tests E2E

**Files :**
- Create : `apps/api-dotnet/MoviePicker.Api.IntegrationTests/Fakes/FakeEmailSender.cs`
- Create : `apps/api-dotnet/MoviePicker.Api.IntegrationTests/AuthPasswordResetTests.cs`
- Modify : `apps/api-dotnet/MoviePicker.Api.IntegrationTests/MoviePickerApplicationFactory.cs` (registrer le fake si présent)

**Steps :**

- [ ] **16.1** Créer `FakeEmailSender : IEmailSender` avec `ConcurrentBag<EmailMessage> SentMessages` + méthode `Last()` + `Reset()`. Singleton dans le test factory.

- [ ] **16.2** Modifier `MoviePickerApplicationFactory` pour remplacer l'enregistrement `IEmailSender` par le fake (via `ConfigureTestServices`).

- [ ] **16.3** Écrire les tests intégration (cf. spec § 11.2) — chaque test indépendant :
  - `Request_WithUnknownEmail_Returns200_NoEmailSent`
  - `Request_WithKnownEmail_Returns200_AndSendsEmail` → extract token via `Regex.Match(html, @"\?token=([A-Za-z0-9_-]+)")` → POST confirm avec ce token → 204
  - `Confirm_TwiceSameToken_SecondReturns400`
  - `Confirm_WithMalformedToken_Returns400`
  - `RateLimit_RequestExceedsBudget_Returns429` (fait 6 POST request rapides en environnement non-Development, ou skip si NoLimiter)
  - `AfterConfirm_LoginWithOldPassword_Returns401`
  - `AfterConfirm_LoginWithNewPassword_Returns200`
  - `AfterConfirm_OldSessionCookie_Returns401_OnGetMe`

  Note : pour tester le rate limit, soit créer une fixture qui force `Production`, soit (plus simple) sortir du scope dev et tester juste l'enregistrement de la policy via test unitaire.

- [ ] **16.4** Run : `dotnet test apps/api-dotnet/MoviePicker.Api.IntegrationTests --filter AuthPasswordResetTests` → tous PASS.

- [ ] **16.5** Commit :

```
git commit -am "test(api): tests intégration password-reset (E2E request → email → confirm + invalidation sessions)"
```

---

### Task 17 : OpenAPI contract + ProducesResponseType

**Files :**
- Vérifier : `apps/api-dotnet/MoviePicker.Api/Controllers/AuthController.cs` (déjà fait en Task 15)
- Vérifier : `apps/api-dotnet/MoviePicker.Api/openapi/` (export contract)

**Steps :**

- [ ] **17.1** Lancer l'export : `dotnet run --project apps/api-dotnet/MoviePicker.Api -- export-openapi <path>` ou la cible documentée du repo (`scripts/verify-local.cjs` doit le faire).

- [ ] **17.2** Vérifier `OpenApiContractTests` PASS : `dotnet test apps/api-dotnet/MoviePicker.Api.IntegrationTests --filter OpenApi`.

- [ ] **17.3** Si le snapshot OpenAPI a changé → régénérer + reviewer le diff.

- [ ] **17.4** Commit :

```
git commit -am "docs(openapi): regen contract avec endpoints password-reset"
```

---

## Phase 5 — Front

### Task 18 : i18n FR + EN

**Files :**
- Modify : `apps/web/src/shared/i18n/locales/fr.ts`
- Modify : `apps/web/src/shared/i18n/locales/en.ts`

**Steps :**

- [ ] **18.1** Ajouter dans `fr.ts` sous `auth.login` la clé `forgotPasswordLink: 'Mot de passe oublié ?'`.

- [ ] **18.2** Ajouter dans `fr.ts` deux nouvelles sections complètes (cf. spec § 7.5) :

```ts
forgotPassword: {
  title: 'Mot de passe oublié',
  description: 'Entre ton email et nous t\'enverrons un lien pour le réinitialiser.',
  emailLabel: 'E-mail',
  submit: 'Envoyer le lien',
  submitting: 'Envoi…',
  fallbackError: 'Impossible d\'envoyer le lien.',
  successMessage: 'Si un compte existe pour cet email, tu recevras un lien dans quelques instants.',
  loginLink: 'Retour à la connexion',
},
resetPassword: {
  title: 'Définir un nouveau mot de passe',
  description: 'Choisis un nouveau mot de passe pour ton compte.',
  passwordLabel: 'Nouveau mot de passe',
  confirmPasswordLabel: 'Confirmer le mot de passe',
  submit: 'Définir le mot de passe',
  submitting: 'Enregistrement…',
  fallbackError: 'Impossible de réinitialiser le mot de passe.',
  passwordMismatchError: 'Les mots de passe ne correspondent pas.',
  passwordRulesError: 'Le mot de passe doit contenir au moins 8 caractères, avec une lettre et un chiffre.',
  invalidTokenTitle: 'Lien invalide ou expiré',
  invalidTokenBody: 'Ce lien n\'est plus valide. Demande un nouveau lien pour continuer.',
  requestNewLinkCta: 'Demander un nouveau lien',
  successToast: 'Mot de passe réinitialisé. Connecte-toi.',
  loginCta: 'Aller à la connexion',
},
```

- [ ] **18.3** Ajouter le miroir EN dans `en.ts` (mêmes clés, traduction).

- [ ] **18.4** Vérifier le typage : `pnpm --filter web tsc --noEmit` (ou équivalent du repo).

- [ ] **18.5** Commit :

```
git commit -am "feat(web): clés i18n FR + EN pour forgotPassword/resetPassword + lien sur login"
```

---

### Task 19 : API client + routes

**Files :**
- Modify : `apps/web/src/features/auth/api/authApi.ts`
- Modify : `apps/web/src/app/routes.ts`

**Steps :**

- [ ] **19.1** Ajouter à `authApi.ts` les fonctions `postPasswordResetRequest` et `postPasswordResetConfirm` (cf. spec § 7.2).

- [ ] **19.2** Ajouter à `routes.ts` :

```ts
forgotPassword: '/forgot-password',
resetPassword: '/reset',
```

- [ ] **19.3** Tests existants : `pnpm --filter web test --run` → pas de régression.

- [ ] **19.4** Commit :

```
git commit -am "feat(web): API client password-reset + routes /forgot-password et /reset"
```

---

### Task 20 : Page `ForgotPasswordPage` + tests

**Files :**
- Create : `apps/web/src/features/auth/pages/ForgotPasswordPage.tsx`
- Create : `apps/web/src/features/auth/pages/ForgotPasswordPage.test.tsx`
- Modify : routeur (`AppRouter` ou équivalent) pour brancher `/forgot-password` → `<ForgotPasswordPage />`.

**Steps :**

- [ ] **20.1** RED — écrire `ForgotPasswordPage.test.tsx` couvrant :
  - rendu initial (titre i18n, input email, bouton submit)
  - soumission avec email valide → `postPasswordResetRequest` appelé avec email + lang détectée → message de succès neutre affiché
  - erreur API (mock throw) → message `fallbackError` affiché
  - lien retour `/login` présent

- [ ] **20.2** Run : `pnpm --filter web test --run ForgotPasswordPage` → FAIL.

- [ ] **20.3** GREEN — implémenter la page sur le pattern `LoginPage` : `AuthPageShell`, `PageLayout`, `useTranslation`, `useAsyncAction`, `useDocumentTitle`, `useLocale().localeCode` pour `lang`. Après succès, basculer en mode "message neutre affiché" (pas de redirect immédiat).

- [ ] **20.4** Brancher la route dans le routeur principal.

- [ ] **20.5** Tests PASS.

- [ ] **20.6** Commit :

```
git commit -am "feat(web): ForgotPasswordPage + tests + branchement route /forgot-password"
```

---

### Task 21 : Page `ResetPasswordPage` + tests

**Files :**
- Create : `apps/web/src/features/auth/pages/ResetPasswordPage.tsx`
- Create : `apps/web/src/features/auth/pages/ResetPasswordPage.test.tsx`
- Modify : routeur pour brancher `/reset` → `<ResetPasswordPage />`.

**Steps :**

- [ ] **21.1** RED — tests :
  - sans `?token=` dans l'URL → état `invalidTokenTitle` affiché
  - 2 champs password, mismatch → erreur locale `passwordMismatchError`, pas d'appel API
  - password non conforme aux rules (`isRegisterPasswordCompliant`) → erreur locale `passwordRulesError`
  - submit valide → `postPasswordResetConfirm(token, password)` appelé → `useNavigate('/login')` (mocké)
  - 400 backend (token expiré) → message d'erreur + lien `/forgot-password` (`requestNewLinkCta`)

- [ ] **21.2** Run → FAIL.

- [ ] **21.3** GREEN — implémenter la page : lecture `useSearchParams().get('token')`, deux champs `<input type="password">`, validation locale (mismatch + rules), submit via `useAsyncAction`. À succès : `navigate(ROUTES.login)` + signaler le toast (utiliser le mécanisme toast existant du repo, ou un state `success` affiché juste avant la redirection).

- [ ] **21.4** Brancher la route.

- [ ] **21.5** Tests PASS.

- [ ] **21.6** Commit :

```
git commit -am "feat(web): ResetPasswordPage + tests + branchement route /reset"
```

---

### Task 22 : Lien « Mot de passe oublié ? » dans `LoginPage`

**Files :**
- Modify : `apps/web/src/features/auth/pages/LoginPage.tsx`
- Modify : `apps/web/src/features/auth/pages/LoginPage.test.tsx`

**Steps :**

- [ ] **22.1** Ajouter sous le bouton submit (et avant `registerPrompt`) :

```tsx
<p className="muted">
  <Link to={ROUTES.forgotPassword}>{t('auth.login.forgotPasswordLink')}</Link>
</p>
```

- [ ] **22.2** Étendre `LoginPage.test.tsx` : assertion `getByRole('link', { name: t('auth.login.forgotPasswordLink') })` avec `href` correspondant à `/forgot-password`.

- [ ] **22.3** Tests PASS.

- [ ] **22.4** Commit :

```
git commit -am "feat(web): lien 'Mot de passe oublié ?' sur LoginPage"
```

---

## Phase 6 — Configuration et documentation

### Task 23 : `.env.example`

**Files :**
- Modify : `.env.example`

**Steps :**

- [ ] **23.1** Ajouter le bloc Email (cf. spec § 10.1) à la fin du fichier, en commenté.

- [ ] **23.2** Commit :

```
git commit -am "docs(env): documente les vars EMAIL_PROVIDER, EMAIL_FROM_*, RESEND_API_KEY"
```

---

### Task 24 : Doc déploiement-secrets-ci

**Files :**
- Modify : `docs/v1-produit/deploiement-secrets-ci.md`

**Steps :**

- [ ] **24.1** § 1 — ajouter une ligne au tableau des secrets :

```
| `RESEND_API_KEY` | Clé API Resend pour l'envoi des emails transactionnels (mot de passe oublié) |
```

- [ ] **24.2** § 2 — ajouter dans le tableau des variables d'env :

```
| `EMAIL_PROVIDER` | Non | `resend` (prod) ou `log` (défaut, dev) |
| `EMAIL_FROM_ADDRESS` | Oui en prod si `EMAIL_PROVIDER=resend` | Adresse expéditeur (ex. `noreply@movie-picker.fr`) |
| `EMAIL_FROM_NAME` | Non | Nom affiché (défaut `Movie Picker`) |
| `RESEND_API_BASE_URL` | Non | Override pour tests (défaut `https://api.resend.com`) |
```

- [ ] **24.3** § 5 — ajouter dans le tableau des plafonds :

```
| `auth-password-reset-request` | `POST /api/v1/auth/password-reset/request` | 5 |
| `auth-password-reset-confirm` | `POST /api/v1/auth/password-reset/confirm` | 30 |
```

- [ ] **24.4** Commit :

```
git commit -am "docs(v1): ajoute secrets RESEND_API_KEY + vars EMAIL_* + rate limits password-reset"
```

---

### Task 25 : Nouveau doc `email-reset-mot-de-passe.md`

**Files :**
- Create : `docs/v1-produit/email-reset-mot-de-passe.md`

**Steps :**

- [ ] **25.1** Créer le doc (court, ~80 lignes) avec sections :
  1. Contexte (lien vers spec)
  2. Vérification du domaine Resend (DKIM + SPF) — étapes en console Resend + DNS du domaine
  3. Génération de la clé API + dépôt dans GCP Secret Manager
  4. Mappage Cloud Run (`gcloud run deploy ... --set-secrets RESEND_API_KEY=RESEND_API_KEY:latest --set-env-vars EMAIL_PROVIDER=resend,EMAIL_FROM_ADDRESS=...,EMAIL_FROM_NAME=...`)
  5. Test local (`EMAIL_PROVIDER=log` par défaut → lien dans la console `dotnet run`)
  6. Test prod (envoi d'un reset à une adresse contrôlée, vérifier dans dashboard Resend)
  7. Procédure de rotation de clé Resend

- [ ] **25.2** Commit :

```
git commit -am "docs(v1): procédure email-reset-mot-de-passe (Resend, DKIM/SPF, secrets, test)"
```

---

### Task 26 : Mise à jour `livraison-v1.md`

**Files :**
- Modify : `docs/v1-produit/livraison-v1.md`

**Steps :**

- [ ] **26.1** Cocher § 3 lignes 84, 85, 86 (mot de passe oublié API + transport email + front).

- [ ] **26.2** Cocher § 22 ligne 271 (`Mot de passe oublié : flux email + reset opérationnel en prod`).

- [ ] **26.3** Cocher § 22 ligne 24 dans la "Couverture du catalog V1" (Compte utilisateur — la mention reset).

- [ ] **26.4** Cocher § 22 ligne 39 (Auth — reset mot de passe — email transactionnel + lien TTL court + invalidation).

- [ ] **26.5** Mettre à jour la mention V1 § 21 si quelque chose y manque côté secrets/env (cohérence avec Task 24).

- [ ] **26.6** Commit :

```
git commit -am "docs(v1): coche les cases mot de passe oublié dans livraison-v1.md"
```

---

## Phase 7 — Vérification finale

### Task 27 : `verify:local` + revue + PR

**Steps :**

- [ ] **27.1** Lancer la CI locale : `pnpm run verify:local` à la racine — doit être verte (lint, format, build, tests, audit, export OpenAPI).

- [ ] **27.2** Si échec : corriger, re-run jusqu'au vert.

- [ ] **27.3** Vérifier visuellement que le diff total reste cohérent (`git diff master...HEAD --stat` puis lecture).

- [ ] **27.4** Invoquer l'agent `mp-code-reviewer` pour une revue senior (lecture seule) — appliquer les retours pertinents puis re-vérifier `verify:local`.

- [ ] **27.5** Invoquer l'agent `mp-pre-push` (gate CI locale finale).

- [ ] **27.6** Push de la branche puis `gh pr create` — titre suggéré : `feat(v1): mot de passe oublié — API Resend + front /forgot-password & /reset` — corps avec lien vers spec + plan + cases cochées de la § 22.

---

## Self-review (effectuée par l'auteur du plan)

- **Spec coverage** :
  - § 3 (Architecture & flux) → Tâches 12, 13, 16
  - § 4 (API endpoints + DTOs + use cases) → Tâches 12, 13, 14, 15, 17
  - § 5 (Données / collection / index) → Tâches 1, 3, 4
  - § 6 (Email port + impls + templates + lien) → Tâches 5, 6, 7, 8, 9, 10
  - § 7 (Front routes / API client / pages / LoginPage / i18n) → Tâches 18, 19, 20, 21, 22
  - § 8 (Sécurité — récap) → couvert transversal (factory, throttle dans Task 12, invalidation dans Task 13, masquage dans Task 8, rate limits dans Task 14, anti-énum dans Task 12)
  - § 9 (Rate limiting) → Task 14
  - § 10 (Configuration & secrets) → Tâches 7, 10, 23, 24
  - § 11 (Tests unit + intégration + front + OpenAPI) → Tâches 2, 6, 8, 9, 12, 13, 16, 17, 20, 21, 22
  - § 12 (Mise à jour roadmap) → Task 26

- **Placeholder scan** : pas de "TBD", "implement later", "similar to". Les zones où le code est résumé renvoient explicitement aux sections du spec qui contiennent le détail. Le compromis "plan condensé" est annoncé dans le header.

- **Type / nom consistency** :
  - `IPasswordResetTokenRepository` (Task 1) — méthodes utilisées dans Task 12 (`GetMostRecentForUserAsync`, `InvalidateActiveForUserAsync`, `AddAsync`) et Task 13 (`GetByTokenHashAsync`, `MarkConsumedAsync`) — OK
  - `IEmailSender.SendAsync(EmailMessage, ct)` (Task 5) — utilisé Task 6, 8, 9, 12, 16 — OK
  - `IAuthSessionInvalidator.InvalidateAllForUserAsync` (Task 11) — utilisé Task 13 — OK
  - `MoviePickerOptions.{EmailProvider, EmailFromAddress, EmailFromName, ResendApiKey, ResendApiBaseUrl, PublicWebBaseUrl}` (Task 7) — utilisé Tasks 9, 10, 12 — OK
  - `PasswordResetTokenFactory.{Generate(), Hash(string)}` (Task 2) — utilisé Tasks 12, 13 — OK

---

## Execution Handoff

Plan complet et sauvegardé dans `docs/superpowers/plans/2026-04-29-password-reset-v1.md`. Spec source : `docs/superpowers/specs/2026-04-29-password-reset-v1-design.md`.

**Deux options d'exécution :**

1. **Subagent-Driven (recommandé)** — un subagent fresh par tâche (Tasks 1 à 27), revue entre chaque, itération rapide. Skill : `superpowers:subagent-driven-development`.
2. **Inline Execution** — exécution dans la session courante avec checkpoints. Skill : `superpowers:executing-plans`.

Laquelle veux-tu lancer (ou démarre-t-on simplement par la **Task 1** maintenant) ?
