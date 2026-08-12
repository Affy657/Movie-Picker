using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.OAuth;

public sealed class OAuthLoginHandler : IOAuthLoginHandler
{
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;
    private readonly ILogger<OAuthLoginHandler> _logger;

    public OAuthLoginHandler(IUserRepository users, TimeProvider clock, ILogger<OAuthLoginHandler> logger)
    {
        _users = users;
        _clock = clock;
        _logger = logger;
    }

    public async Task<OAuthOutcome> HandleAsync(ExternalLoginInfo info, CancellationToken ct = default)
    {
        var existing = await _users.GetByIdentityAsync(info.Provider, info.Subject, ct);
        if (existing is not null)
        {
            _logger.LogInformation("OAuth login: known identity {Provider} (userId={UserId})", info.Provider, existing.Id);
            return new OAuthOutcome { Kind = OAuthOutcomeKind.SignedIn, User = existing };
        }

        if (string.IsNullOrWhiteSpace(info.Email) || !info.EmailVerified)
        {
            _logger.LogWarning("OAuth login: unverified or missing email for provider {Provider}", info.Provider);
            return new OAuthOutcome { Kind = OAuthOutcomeKind.EmailNotVerified };
        }

        var now = _clock.GetUtcNow();
        var email = info.Email.Trim();
        var identity = new LinkedIdentity
        {
            Provider = info.Provider,
            Subject = info.Subject,
            Email = email,
            LinkedAt = now
        };

        var byEmail = await _users.GetByEmailAsync(email, ct);
        if (byEmail is not null)
        {
            User saved;
            try
            {
                var updated = byEmail with { Identities = [.. byEmail.Identities, identity], UpdatedAt = now };
                saved = await _users.UpdateAsync(updated, ct);
            }
            catch (ConflictException ex) when (ex.Message == "identity_conflict")
            {
                saved = await ResolveIdentityRaceAsync(info, ct);
            }
            _logger.LogInformation(
                "OAuth login: auto-linked {Provider} to existing account (userId={UserId})", info.Provider, saved.Id);
            return new OAuthOutcome { Kind = OAuthOutcomeKind.SignedIn, User = saved };
        }

        var (createdUser, isNewAccount) = await CreateAccountAsync(info, email, identity, now, ct);
        _logger.LogInformation(
            "OAuth login: created account via {Provider} (userId={UserId})", info.Provider, createdUser.Id);
        return new OAuthOutcome { Kind = OAuthOutcomeKind.SignedIn, User = createdUser, IsNewAccount = isNewAccount };
    }

    private async Task<(User User, bool IsNewAccount)> CreateAccountAsync(
        ExternalLoginInfo info,
        string email,
        LinkedIdentity identity,
        DateTimeOffset now,
        CancellationToken ct)
    {
        var displayName = string.IsNullOrWhiteSpace(info.DisplayName) ? "Membre" : info.DisplayName.Trim();

        try
        {
            var created = await HandleAllocator.CreateWithUniqueHandleAsync(
                _users,
                displayName,
                handle => new User
                {
                    Email = email,
                    DisplayName = displayName,
                    Handle = handle,
                    IsProfilePublic = true,
                    Identities = [identity],
                    CreatedAt = now,
                    UpdatedAt = now
                },
                ct);
            return (created, true);
        }
        catch (ConflictException ex) when (ex.Message == "identity_conflict")
        {
            return (await ResolveIdentityRaceAsync(info, ct), false);
        }
    }

    private async Task<User> ResolveIdentityRaceAsync(ExternalLoginInfo info, CancellationToken ct) =>
        await _users.GetByIdentityAsync(info.Provider, info.Subject, ct)
        ?? throw new ConflictException("Impossible de connecter ce compte. Réessayez.");
}
