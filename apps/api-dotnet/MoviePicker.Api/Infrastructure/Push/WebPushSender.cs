using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using WebPush;
using PushSubscriptionDomain = MoviePicker.Api.Domain.Entities.PushSubscription;

namespace MoviePicker.Api.Infrastructure.Push;

public sealed class WebPushSender : IPushNotificationSender
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WebPushSender> _logger;
    private readonly string? _publicKey;
    private readonly string? _privateKey;
    private readonly string _subject;

    public WebPushSender(
        IOptions<MoviePickerOptions> options,
        IServiceScopeFactory scopeFactory,
        ILogger<WebPushSender> logger
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _publicKey = options.Value.VapidPublicKey;
        _privateKey = options.Value.VapidPrivateKey;
        _subject = options.Value.VapidSubject;
    }

    internal HttpClient? HttpClientOverride { get; set; }

    public async Task SendAsync(
        PushSubscriptionDomain subscription,
        PushMessage message,
        CancellationToken ct = default
    )
    {
        if (string.IsNullOrWhiteSpace(_publicKey) || string.IsNullOrWhiteSpace(_privateKey))
        {
            _logger.LogDebug("VAPID keys not configured — skipping push notification");
            return;
        }

        try
        {
            var webPushClient =
                HttpClientOverride is null
                    ? new WebPushClient()
                    : new WebPushClient(HttpClientOverride);
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
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to send push notification to user {UserId}",
                subscription.UserId
            );
        }
    }

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
