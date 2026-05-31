using System.Globalization;
using System.Linq;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Development;

public sealed class DevelopmentDataSeedHostedService : IHostedService
{
    private const string SeedEventTitlePrefix = "Soirée de test — ";

    private static readonly DevelopmentSeedExtraUserEntry[] DefaultExtraUsers =
    {
        new()
        {
            Email = "alice@test.local",
            Password = "AliceTest123!",
            DisplayName = "Alice test"
        },
        new()
        {
            Email = "bob@test.local",
            Password = "BobTest12345!",
            DisplayName = "Bob test"
        }
    };

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHostEnvironment _env;
    private readonly IOptions<DevelopmentSeedOptions> _options;
    private readonly ILogger<DevelopmentDataSeedHostedService> _logger;

    public DevelopmentDataSeedHostedService(
        IServiceScopeFactory scopeFactory,
        IHostEnvironment env,
        IOptions<DevelopmentSeedOptions> options,
        ILogger<DevelopmentDataSeedHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _env = env;
        _options = options;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_env.IsDevelopment())
            return;

        var opts = _options.Value;
        if (!opts.Enabled)
            return;

        var email = (opts.Email ?? string.Empty).Trim();
        var password = opts.Password ?? string.Empty;
        var displayName = (opts.DisplayName ?? string.Empty).Trim();

        if (string.IsNullOrEmpty(email))
        {
            _logger.LogWarning("DevelopmentSeed activé mais Email vide — seed ignoré.");
            return;
        }

        if (AuthInputValidation.ValidateDisplayName(displayName) is { } dnErr)
        {
            _logger.LogWarning("DevelopmentSeed : pseudo invalide ({Reason}) — seed ignoré.", dnErr);
            return;
        }

        if (AuthInputValidation.ValidatePassword(password) is { } pwdErr)
        {
            _logger.LogWarning("DevelopmentSeed : mot de passe invalide ({Reason}) — seed ignoré.", pwdErr);
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var sp = scope.ServiceProvider;
        var users = sp.GetRequiredService<IUserRepository>();
        var hasher = sp.GetRequiredService<IPasswordHasher<User>>();

        var user = await EnsureUserAsync(users, hasher, email, password, displayName, cancellationToken).ConfigureAwait(false);

        if (opts.SeedSampleEvents)
            await TrySeedSampleEventsAsync(sp, user.Id, cancellationToken).ConfigureAwait(false);

        if (!opts.SeedScenarioDemos)
            return;

        var extraEntries = ResolveExtraUserEntries(opts);
        var aliceEntry = extraEntries[0];
        var bobEntry = extraEntries[1];

        if (string.Equals(aliceEntry.Email.Trim(), email, StringComparison.OrdinalIgnoreCase)
            || string.Equals(bobEntry.Email.Trim(), email, StringComparison.OrdinalIgnoreCase)
            || string.Equals(aliceEntry.Email.Trim(), bobEntry.Email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("DevelopmentSeed : e-mails des utilisateurs extra en conflit — scénarios ignorés.");
            return;
        }

        if (!TryValidateExtraEntry(aliceEntry, out var aliceErr))
        {
            _logger.LogWarning("DevelopmentSeed : utilisateur extra Alice invalide ({Reason}) — scénarios ignorés.", aliceErr);
            return;
        }

        if (!TryValidateExtraEntry(bobEntry, out var bobErr))
        {
            _logger.LogWarning("DevelopmentSeed : utilisateur extra Bob invalide ({Reason}) — scénarios ignorés.", bobErr);
            return;
        }

        var alice = await EnsureUserAsync(
            users,
            hasher,
            aliceEntry.Email.Trim(),
            aliceEntry.Password,
            aliceEntry.DisplayName.Trim(),
            cancellationToken).ConfigureAwait(false);

        var bob = await EnsureUserAsync(
            users,
            hasher,
            bobEntry.Email.Trim(),
            bobEntry.Password,
            bobEntry.DisplayName.Trim(),
            cancellationToken).ConfigureAwait(false);

        await DevelopmentScenarioSeed.TrySeedAsync(sp, user.Id, alice, bob, _logger, cancellationToken).ConfigureAwait(false);
    }

    private static DevelopmentSeedExtraUserEntry[] ResolveExtraUserEntries(DevelopmentSeedOptions opts)
    {
        if (opts.ExtraUsers is { Count: >= 2 })
            return new[] { opts.ExtraUsers[0], opts.ExtraUsers[1] };

        return DefaultExtraUsers;
    }

    private static bool TryValidateExtraEntry(DevelopmentSeedExtraUserEntry e, out string? error)
    {
        error = null;
        var em = (e.Email ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(em))
        {
            error = "email vide";
            return false;
        }

        if (AuthInputValidation.ValidateDisplayName(e.DisplayName) is { } dnErr)
        {
            error = dnErr;
            return false;
        }

        if (AuthInputValidation.ValidatePassword(e.Password) is { } pwdErr)
        {
            error = pwdErr;
            return false;
        }

        return true;
    }

    private async Task<User> EnsureUserAsync(
        IUserRepository users,
        IPasswordHasher<User> hasher,
        string email,
        string password,
        string displayName,
        CancellationToken ct)
    {
        var existing = await users.GetByEmailAsync(email, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            var verify = hasher.VerifyHashedPassword(existing, existing.PasswordHash, password);
            if (verify == PasswordVerificationResult.Failed)
            {
                var rehashed = existing with
                {
                    PasswordHash = hasher.HashPassword(existing, password),
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                var updated = await users.UpdateAsync(rehashed, ct).ConfigureAwait(false);
                _logger.LogInformation(
                    "DevelopmentSeed : mot de passe de {EmailMasked} (id={UserId}) resynchronisé sur la config courante.",
                    EmailMasking.Mask(email),
                    updated.Id);
                return updated;
            }

            _logger.LogInformation(
                "DevelopmentSeed : utilisateur {EmailMasked} existe déjà (id={UserId}).",
                EmailMasking.Mask(email),
                existing.Id);
            return existing;
        }

        var now = DateTimeOffset.UtcNow;
        var draft = new User
        {
            Id = string.Empty,
            Email = email,
            PasswordHash = string.Empty,
            DisplayName = displayName.Trim(),
            UiTheme = UiThemePreference.System,
            CreatedAt = now,
            UpdatedAt = now
        };
        var hash = hasher.HashPassword(draft, password);
        var handle = await HandleAllocator
            .AllocateFromDisplayNameAsync(users, draft.DisplayName, ct)
            .ConfigureAwait(false);
        var user = new User
        {
            Id = string.Empty,
            Email = email,
            PasswordHash = hash,
            DisplayName = draft.DisplayName,
            Handle = handle,
            UiTheme = draft.UiTheme,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await users.AddAsync(user, ct).ConfigureAwait(false);
        _logger.LogInformation(
            "DevelopmentSeed : utilisateur de test créé (id={UserId}, email={EmailMasked}, displayName={DisplayName}).",
            created.Id,
            EmailMasking.Mask(email),
            created.DisplayName);
        return created;
    }

    private async Task TrySeedSampleEventsAsync(IServiceProvider sp, string userId, CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.ListByCreatorUserIdAsync(userId, 100, ct).ConfigureAwait(false);
        if (existing.Any(e => e.Title.StartsWith(SeedEventTitlePrefix, StringComparison.Ordinal)))
        {
            _logger.LogInformation("DevelopmentSeed : soirées de test déjà présentes — rien à faire.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var utc = DateTimeOffset.UtcNow;
        var samples = new[]
        {
            new CreateEventRequest
            {
                Title = SeedEventTitlePrefix + "Apéro cinéma",
                Date = FormatDate(utc.AddDays(7)),
                Time = "20:00"
            },
            new CreateEventRequest
            {
                Title = SeedEventTitlePrefix + "Marathon SF",
                Date = FormatDate(utc.AddDays(14)),
                Time = "19:30"
            },
            new CreateEventRequest
            {
                Title = SeedEventTitlePrefix + "Classiques du dimanche",
                Date = FormatDate(utc.AddDays(21)),
                Time = "21:00"
            }
        };

        foreach (var req in samples)
            await create.HandleAsync(req, userId, ct).ConfigureAwait(false);

        _logger.LogInformation("DevelopmentSeed : {Count} soirées de test créées pour l’utilisateur {UserId}.", samples.Length, userId);
    }

    private static string FormatDate(DateTimeOffset utc) =>
        utc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
