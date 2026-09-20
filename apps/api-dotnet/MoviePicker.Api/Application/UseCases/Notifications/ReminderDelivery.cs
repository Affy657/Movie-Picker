using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class ReminderDelivery
{
    private readonly INotificationDedupRepository _dedup;
    private readonly IUserNotificationRepository _notifications;
    private readonly IPushNotificationSender _sender;

    public ReminderDelivery(
        INotificationDedupRepository dedup,
        IUserNotificationRepository notifications,
        IPushNotificationSender sender)
    {
        _dedup = dedup;
        _notifications = notifications;
        _sender = sender;
    }

    public async Task<bool> DeliverAsync(
        UserNotification inApp,
        IReadOnlyList<PushSubscription> subscriptions,
        PushMessage push,
        CancellationToken ct)
    {
        var eventId = inApp.EventId ?? string.Empty;
        var delivered = false;
        if (subscriptions.Count > 0)
        {
            var claimed = await _dedup.TryClaimAsync(
                inApp.UserId, inApp.Type, eventId, NotificationDedupChannel.Push, ct);
            if (claimed)
            {
                delivered = true;
                await PushFanOut.SendToAllAsync(_sender, subscriptions, push, ct);
            }
        }

        if (await _notifications.ExistsAsync(inApp.UserId, inApp.Type, eventId, ct))
            return delivered;

        var inAppClaimed = await _dedup.TryClaimAsync(
            inApp.UserId, inApp.Type, eventId, NotificationDedupChannel.InApp, ct);
        if (!inAppClaimed)
            return delivered;

        await _notifications.AddAsync(inApp, ct);
        return true;
    }
}
