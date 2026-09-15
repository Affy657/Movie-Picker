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
        if (!PushEndpointPolicy.IsPublicHttpsEndpoint(request.Endpoint))
            throw new BadRequestException("endpoint doit être une URL https d'un service push public.");

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
    public static bool IsPublicHttpsEndpoint(string? endpoint)
    {
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri))
            return false;
        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            return false;
        if (uri.HostNameType is UriHostNameType.IPv4 or UriHostNameType.IPv6)
            return false;
        if (string.Equals(uri.IdnHost, "localhost", StringComparison.OrdinalIgnoreCase))
            return false;
        return uri.IdnHost.Contains('.');
    }
}
