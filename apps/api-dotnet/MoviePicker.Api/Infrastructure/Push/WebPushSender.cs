using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Configuration;
using WebPush;
using PushSubscriptionDomain = MoviePicker.Api.Domain.Entities.PushSubscription;

namespace MoviePicker.Api.Infrastructure.Push;

public sealed class WebPushSender : IPushNotificationSender
{
    public const string HttpClientName = "web-push";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebPushSender> _logger;
    private readonly string? _publicKey;
    private readonly string? _privateKey;
    private readonly string _subject;

    public WebPushSender(
        IOptions<MoviePickerOptions> options,
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        ILogger<WebPushSender> logger
    )
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _publicKey = options.Value.VapidPublicKey;
        _privateKey = options.Value.VapidPrivateKey;
        _subject = options.Value.VapidSubject;
    }

    public async Task<bool> SendAsync(
        PushSubscriptionDomain subscription,
        PushMessage message,
        CancellationToken ct = default
    )
    {
        if (string.IsNullOrWhiteSpace(_publicKey) || string.IsNullOrWhiteSpace(_privateKey))
        {
            _logger.LogDebug("VAPID keys not configured, skipping push notification");
            return true;
        }

        if (!PushEndpointPolicy.IsKnownPushService(subscription.Endpoint))
        {
            _logger.LogWarning(
                "Push subscription of user {UserId} points outside the known push services, purging it",
                subscription.UserId
            );
            await PurgeSubscriptionAsync(subscription, ct);
            return true;
        }

        try
        {
            using var http = _httpClientFactory.CreateClient(HttpClientName);
            using var webPushClient = new WebPushClient(http);
            webPushClient.SetVapidDetails(_subject, _publicKey, _privateKey);

            var pushSubscription = new WebPush.PushSubscription(
                subscription.Endpoint,
                subscription.P256dh,
                subscription.Auth
            );

            var payload = JsonSerializer.Serialize(
                new
                {
                    title = message.Title,
                    body = message.Body,
                    tag = message.Tag,
                    url = message.Url,
                }
            );

            await webPushClient.SendNotificationAsync(pushSubscription, payload, cancellationToken: ct);
            return true;
        }
        catch (WebPushException ex)
            when (ex.StatusCode is System.Net.HttpStatusCode.Gone or System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogInformation(
                ex,
                "Push subscription expired for user {UserId}, purging endpoint",
                subscription.UserId
            );
            await PurgeSubscriptionAsync(subscription, ct);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to send push notification to user {UserId}",
                subscription.UserId
            );
            return !IsWorthRetrying(ex);
        }
    }

    internal static bool IsWorthRetrying(Exception ex) => ex switch
    {
        WebPushException push => push.StatusCode is System.Net.HttpStatusCode.TooManyRequests
            || (int)push.StatusCode >= 500,
        HttpRequestException or TaskCanceledException => true,
        _ => false
    };

    private async Task PurgeSubscriptionAsync(
        PushSubscriptionDomain subscription,
        CancellationToken ct
    )
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var repository =
                scope.ServiceProvider.GetRequiredService<IPushSubscriptionRepository>();
            await repository.DeleteByEndpointAsync(subscription.UserId, subscription.Endpoint, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to purge expired push subscription for user {UserId}",
                subscription.UserId
            );
        }
    }
}
