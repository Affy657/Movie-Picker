using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public sealed record PushMessage(string Title, string Body, string? Tag = null, string? Url = null);

public interface IPushNotificationSender
{
    Task<bool> SendAsync(PushSubscription subscription, PushMessage message, CancellationToken ct = default);
}
