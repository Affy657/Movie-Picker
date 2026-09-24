using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.OAuth;

public sealed class OAuthUnlinkHandler : IOAuthUnlinkHandler
{
    private readonly IUserRepository _users;
    private readonly IAuthSessionInvalidator _sessionInvalidator;
    private readonly TimeProvider _clock;
    private readonly ILogger<OAuthUnlinkHandler> _logger;

    public OAuthUnlinkHandler(
        IUserRepository users,
        IAuthSessionInvalidator sessionInvalidator,
        TimeProvider clock,
        ILogger<OAuthUnlinkHandler> logger)
    {
        _users = users;
        _sessionInvalidator = sessionInvalidator;
        _clock = clock;
        _logger = logger;
    }

    public async Task HandleAsync(string userId, string provider, string? currentSessionId, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();

        if (!user.Identities.Any(i => i.Provider == provider))
            throw Errors.OAuthProviderNotLinked();

        var remainingIdentities = user.Identities.Count(i => i.Provider != provider);
        var hasPassword = !string.IsNullOrEmpty(user.PasswordHash);
        if (!hasPassword && remainingIdentities == 0)
            throw Errors.LastLoginMethod();

        var now = _clock.GetUtcNow();
        var unlinked = user.Identities
            .Where(i => i.Provider == provider)
            .Select(i => new UnlinkedIdentity { Provider = i.Provider, Subject = i.Subject, UnlinkedAt = now })
            .ToList();
        var updated = user with
        {
            Identities = user.Identities.Where(i => i.Provider != provider).ToList(),
            UnlinkedIdentities =
            [
                .. user.UnlinkedIdentities.Where(u => !unlinked.Exists(i => i.Provider == u.Provider && i.Subject == u.Subject)),
                .. unlinked
            ],
            UpdatedAt = now
        };
        await _users.UpdateAsync(updated, ct);

        var revokedSessions = await _sessionInvalidator.InvalidateOthersForUserAsync(userId, currentSessionId, ct);

        _logger.LogInformation(
            "OAuth unlink: removed {Provider} (userId={UserId}, revokedSessions={Sessions})",
            provider, userId, revokedSessions);
    }
}
