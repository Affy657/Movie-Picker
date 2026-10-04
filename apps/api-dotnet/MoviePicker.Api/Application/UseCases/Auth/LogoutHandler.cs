using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class LogoutHandler : ILogoutHandler
{
    private readonly IPushSubscriptionRepository _subscriptions;
    private readonly ILogger<LogoutHandler> _logger;

    public LogoutHandler(IPushSubscriptionRepository subscriptions, ILogger<LogoutHandler> logger)
    {
        _subscriptions = subscriptions;
        _logger = logger;
    }

    public async Task HandleAsync(string? userId, string? pushEndpoint, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(pushEndpoint))
            return;

        try
        {
            await _subscriptions.DeleteByEndpointAsync(userId, pushEndpoint.Trim(), ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(
                ex,
                "Push subscription of user {UserId} kept at sign-out: the first send the push service refuses purges it",
                userId);
        }
    }
}
