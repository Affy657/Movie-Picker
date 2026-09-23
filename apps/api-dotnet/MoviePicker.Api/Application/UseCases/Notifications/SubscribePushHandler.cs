using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class SubscribePushHandler : ISubscribePushHandler
{
    public const int MaxDevicesPerAccount = 10;

    private readonly IPushSubscriptionRepository _subscriptions;
    private readonly TimeProvider _clock;

    public SubscribePushHandler(IPushSubscriptionRepository subscriptions, TimeProvider clock)
    {
        _subscriptions = subscriptions;
        _clock = clock;
    }

    public async Task HandleAsync(string userId, SubscribePushRequest request, CancellationToken ct = default)
    {
        if (!PushEndpointPolicy.IsKnownPushService(request.Endpoint))
            throw Errors.InvalidPushEndpoint();

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

        var devices = await _subscriptions.ListByUserIdAsync(userId, ct);
        var stale = devices
            .Where(d => d.Endpoint != request.Endpoint)
            .OrderByDescending(d => d.CreatedAt)
            .Skip(MaxDevicesPerAccount - 1);
        foreach (var device in stale)
            await _subscriptions.DeleteByEndpointAsync(userId, device.Endpoint, ct);
    }
}

public static class PushEndpointPolicy
{
    private static readonly string[] KnownPushServiceDomains =
    [
        "googleapis.com",
        "google.com",
        "push.services.mozilla.com",
        "push.apple.com",
        "notify.windows.com"
    ];

    public static bool IsKnownPushService(string? endpoint)
    {
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri))
            return false;
        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            return false;
        if (uri.HostNameType is not UriHostNameType.Dns)
            return false;

        var host = uri.IdnHost;
        return KnownPushServiceDomains.Any(domain =>
            string.Equals(host, domain, StringComparison.OrdinalIgnoreCase)
            || host.EndsWith("." + domain, StringComparison.OrdinalIgnoreCase));
    }
}
