using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Auth;

public readonly record struct RevokedAccess(long Sessions, long PushSubscriptions);

public static class AccountAccessRevocation
{
    public static async Task<RevokedAccess> RevokeEveryDeviceAsync(
        string userId,
        IAuthSessionInvalidator sessions,
        IPushSubscriptionRepository pushSubscriptions,
        ILogger logger,
        CancellationToken ct)
    {
        var invalidatedSessions = await sessions.InvalidateAllForUserAsync(userId, ct);
        try
        {
            return new RevokedAccess(invalidatedSessions, await pushSubscriptions.DeleteByUserIdAsync(userId, ct));
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Push subscriptions not revoked for {UserId}", userId);
            return new RevokedAccess(invalidatedSessions, 0);
        }
    }
}
