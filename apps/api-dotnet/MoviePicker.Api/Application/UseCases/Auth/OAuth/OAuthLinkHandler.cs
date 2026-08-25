using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.OAuth;

public sealed class OAuthLinkHandler : IOAuthLinkHandler
{
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;
    private readonly ILogger<OAuthLinkHandler> _logger;

    public OAuthLinkHandler(IUserRepository users, TimeProvider clock, ILogger<OAuthLinkHandler> logger)
    {
        _users = users;
        _clock = clock;
        _logger = logger;
    }

    public async Task<OAuthOutcome> HandleAsync(string currentUserId, ExternalLoginInfo info, CancellationToken ct = default)
    {
        var existing = await _users.GetByIdentityAsync(info.Provider, info.Subject, ct);
        if (existing is not null)
        {
            if (existing.Id != currentUserId)
            {
                _logger.LogWarning(
                    "OAuth link: identity {Provider} already linked to another account", info.Provider);
                return new OAuthOutcome { Kind = OAuthOutcomeKind.IdentityLinkedToOtherAccount };
            }

            return new OAuthOutcome { Kind = OAuthOutcomeKind.Linked, User = existing };
        }

        var user = await _users.GetByIdAsync(currentUserId, ct) ?? throw new NotFoundException("Utilisateur introuvable.");
        var now = _clock.GetUtcNow();
        var identity = new LinkedIdentity
        {
            Provider = info.Provider,
            Subject = info.Subject,
            Email = string.IsNullOrWhiteSpace(info.Email) ? user.Email : info.Email.Trim(),
            LinkedAt = now
        };

        var otherProviderIdentities = user.Identities.Where(i => i.Provider != info.Provider).ToList();
        var updated = user with { Identities = [.. otherProviderIdentities, identity], UpdatedAt = now };
        User saved;
        try
        {
            saved = await _users.UpdateAsync(updated, ct);
        }
        catch (ConflictException ex) when (ex.Message == "identity_conflict")
        {
            _logger.LogWarning(ex, "OAuth link: race on identity {Provider} for userId={UserId}", info.Provider, currentUserId);
            return new OAuthOutcome { Kind = OAuthOutcomeKind.IdentityLinkedToOtherAccount };
        }

        _logger.LogInformation("OAuth link: linked {Provider} (userId={UserId})", info.Provider, saved.Id);
        return new OAuthOutcome { Kind = OAuthOutcomeKind.Linked, User = saved };
    }
}
