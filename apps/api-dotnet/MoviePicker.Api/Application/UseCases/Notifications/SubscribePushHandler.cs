using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class SubscribePushHandler : ISubscribePushHandler
{
    private readonly IPushSubscriptionRepository _subscriptions;
    private readonly TimeProvider _clock;

    public SubscribePushHandler(IPushSubscriptionRepository subscriptions, TimeProvider clock)
    {
        _subscriptions = subscriptions;
        _clock = clock;
    }

    public async Task HandleAsync(string userId, SubscribePushRequest request, CancellationToken ct = default)
    {
        var subscription = new PushSubscription
        {
            Id = string.Empty,
            UserId = userId,
            Endpoint = request.Endpoint,
            P256dh = request.P256dh,
            Auth = request.Auth,
            CreatedAt = _clock.GetUtcNow()
        };
        await _subscriptions.UpsertAsync(subscription, ct);
    }
}
