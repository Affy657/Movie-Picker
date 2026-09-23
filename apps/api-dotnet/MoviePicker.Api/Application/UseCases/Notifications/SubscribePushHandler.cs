using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

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
        if (!PushEndpointPolicy.IsKnownPushServiceEndpoint(request.Endpoint))
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
    }
}

public static class PushEndpointPolicy
{
    private static readonly string[] KnownPushServiceDomains =
    [
        "fcm.googleapis.com",
        "android.googleapis.com",
        "push.services.mozilla.com",
        "notify.windows.com",
        "push.apple.com"
    ];

    public static bool IsKnownPushServiceEndpoint(string? endpoint)
    {
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri))
            return false;
        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            return false;
        if (uri.HostNameType != UriHostNameType.Dns || !uri.IsDefaultPort || uri.UserInfo.Length > 0)
            return false;
        var host = uri.IdnHost;
        return KnownPushServiceDomains.Any(domain =>
            string.Equals(host, domain, StringComparison.OrdinalIgnoreCase)
            || host.EndsWith("." + domain, StringComparison.OrdinalIgnoreCase));
    }
}
