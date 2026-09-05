using System.Globalization;
using System.Linq;
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
        },
        new()
        {
            Email = "carla@test.local",
            Password = "CarlaTest123!",
            DisplayName = "Carla test"
        },
        new()
        {
            Email = "david@test.local",
            Password = "DavidTest123!",
            DisplayName = "David test"
        }
    };

    private const int ScenarioActorCount = 4;

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

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var sp = scope.ServiceProvider;
            var users = sp.GetRequiredService<IUserRepository>();
            var hasher = sp.GetRequiredService<IPasswordHasher>();

            var user = await EnsureUserAsync(users, hasher, email, password, displayName, cancellationToken).ConfigureAwait(false);

            if (opts.SeedSampleEvents)
                await TrySeedSampleEventsAsync(sp, user.Id, cancellationToken).ConfigureAwait(false);

            if (!opts.SeedScenarioDemos)
                return;

            var extraEntries = ResolveExtraUserEntries(opts);

            var allEmails = new List<string> { email };
            allEmails.AddRange(extraEntries.Select(e => (e.Email ?? string.Empty).Trim()));
            if (allEmails.Select(x => x.ToLowerInvariant()).Distinct().Count() != allEmails.Count)
            {
                _logger.LogWarning("DevelopmentSeed : e-mails en conflit entre comptes seed — scénarios ignorés.");
                return;
            }

            foreach (var entry in extraEntries)
            {
                if (!TryValidateExtraEntry(entry, out var entryErr))
                {
                    _logger.LogWarning(
                        "DevelopmentSeed : utilisateur extra {EmailMasked} invalide ({Reason}) — scénarios ignorés.",
                        EmailMasking.Mask((entry.Email ?? string.Empty).Trim()),
                        entryErr);
                    return;
                }
            }

            var extraUsers = new List<User>(extraEntries.Count);
            foreach (var entry in extraEntries)
            {
                var ensured = await EnsureUserAsync(
                    users,
                    hasher,
                    entry.Email.Trim(),
                    entry.Password,
                    entry.DisplayName.Trim(),
                    cancellationToken).ConfigureAwait(false);
                extraUsers.Add(ensured);
            }

            var actors = new DevelopmentSeedActors(
                user,
                extraUsers[0],
                extraUsers[1],
                extraUsers[2],
                extraUsers[3]);

            await DevelopmentScenarioSeed.TrySeedAsync(sp, actors, _logger, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DevelopmentSeed : échec inattendu du seed — démarrage de l'application poursuivi sans seed complet.");
        }
    }

    private static List<DevelopmentSeedExtraUserEntry> ResolveExtraUserEntries(DevelopmentSeedOptions opts)
    {
        var resolved = new List<DevelopmentSeedExtraUserEntry>(ScenarioActorCount);
        if (opts.ExtraUsers is { Count: > 0 })
            resolved.AddRange(opts.ExtraUsers.Take(ScenarioActorCount));

        foreach (var fallback in DefaultExtraUsers)
        {
            if (resolved.Count >= ScenarioActorCount)
                break;
            var alreadyPresent = resolved.Any(e =>
                string.Equals((e.Email ?? string.Empty).Trim(), fallback.Email, StringComparison.OrdinalIgnoreCase));
            if (!alreadyPresent)
                resolved.Add(fallback);
        }

        return resolved;
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
        IPasswordHasher hasher,
        string email,
        string password,
        string displayName,
        CancellationToken ct)
    {
        var existing = await users.GetByEmailAsync(email, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            var verify = hasher.Verify(existing.PasswordHash, password);
            if (verify == PasswordVerification.Failed)
            {
                var rehashed = existing with
                {
                    PasswordHash = hasher.Hash(password),
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
        var hash = hasher.Hash(password);
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
