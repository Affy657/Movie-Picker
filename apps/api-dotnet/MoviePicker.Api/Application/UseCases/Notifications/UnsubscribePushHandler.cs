using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class UnsubscribePushHandler : IUnsubscribePushHandler
{
    private readonly IPushSubscriptionRepository _subscriptions;

    public UnsubscribePushHandler(IPushSubscriptionRepository subscriptions)
    {
        _subscriptions = subscriptions;
    }

    public async Task HandleAsync(string userId, string endpoint, CancellationToken ct = default)
    {
        await _subscriptions.DeleteByEndpointAsync(userId, endpoint, ct);
    }
}
