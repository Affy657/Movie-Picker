using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using WebPush;
using PushSubscriptionDomain = MoviePicker.Api.Domain.Entities.PushSubscription;

namespace MoviePicker.Api.Infrastructure.Push;

public sealed class WebPushSender : IPushNotificationSender
{
    private readonly ILogger<WebPushSender> _logger;
    private readonly string? _publicKey;
    private readonly string? _privateKey;
    private readonly string _subject;

    public WebPushSender(IOptions<MoviePickerOptions> options, ILogger<WebPushSender> logger)
    {
        _logger = logger;
        _publicKey = options.Value.VapidPublicKey;
        _privateKey = options.Value.VapidPrivateKey;
        _subject = options.Value.VapidSubject;
    }

    public async Task SendAsync(PushSubscriptionDomain subscription, PushMessage message, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_publicKey) || string.IsNullOrWhiteSpace(_privateKey))
        {
            _logger.LogDebug("VAPID keys not configured — skipping push notification");
            return;
        }

        try
        {
            var webPushClient = new WebPushClient();
            webPushClient.SetVapidDetails(_subject, _publicKey, _privateKey);

            var pushSubscription = new WebPush.PushSubscription(
                subscription.Endpoint,
                subscription.P256dh,
                subscription.Auth
            );

            var payload = JsonSerializer.Serialize(new
            {
                title = message.Title,
                body = message.Body,
                tag = message.Tag,
                url = message.Url
            });

            await webPushClient.SendNotificationAsync(pushSubscription, payload);
        }
        catch (WebPushException ex) when (ex.StatusCode is System.Net.HttpStatusCode.Gone or System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogInformation("Push subscription expired for user {UserId}, endpoint removed", subscription.UserId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send push notification to user {UserId}", subscription.UserId);
        }
    }
}
