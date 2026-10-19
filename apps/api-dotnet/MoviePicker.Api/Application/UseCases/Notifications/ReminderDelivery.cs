using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed record ReminderDeliveryResult(bool Reminded, bool PushFailed);

public sealed class ReminderDelivery
{
    private enum PushOutcome
    {
        Skipped,
        Sent,
        Failed
    }

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

    public async Task<ReminderDeliveryResult> DeliverAsync(
        UserNotification inApp,
        IReadOnlyList<PushSubscription> subscriptions,
        PushMessage push,
        DateTimeOffset passDayStartUtc,
        CancellationToken ct)
    {
        var eventId = inApp.EventId ?? string.Empty;
        var inAppClaimed = await _dedup.TryClaimAsync(
            inApp.UserId, inApp.Type, eventId, NotificationDedupChannel.InApp, ct);
        if (!inAppClaimed && !await _dedup.WasClaimedSinceAsync(
                inApp.UserId, inApp.Type, eventId, NotificationDedupChannel.InApp, passDayStartUtc, ct))
            return new ReminderDeliveryResult(false, false);

        var pushed = await PushOnceAsync(inApp, eventId, subscriptions, push, ct);
        var added = inAppClaimed && await AddToInboxOnceAsync(inApp, eventId, ct);
        return new ReminderDeliveryResult(pushed == PushOutcome.Sent || added, pushed == PushOutcome.Failed);
    }

    private async Task<PushOutcome> PushOnceAsync(
        UserNotification inApp,
        string eventId,
        IReadOnlyList<PushSubscription> subscriptions,
        PushMessage push,
        CancellationToken ct)
    {
        if (subscriptions.Count == 0
            || !await _dedup.TryClaimAsync(inApp.UserId, inApp.Type, eventId, NotificationDedupChannel.Push, ct))
            return PushOutcome.Skipped;

        var settled = await Task.WhenAll(subscriptions.Select(sub => _sender.SendAsync(sub, push, ct)));
        if (settled.Any(delivered => delivered))
            return PushOutcome.Sent;

        await _dedup.ReleaseAsync(inApp.UserId, inApp.Type, eventId, NotificationDedupChannel.Push, CancellationToken.None);
        return PushOutcome.Failed;
    }

    private async Task<bool> AddToInboxOnceAsync(UserNotification inApp, string eventId, CancellationToken ct)
    {
        if (await _notifications.ExistsAsync(inApp.UserId, inApp.Type, eventId, ct))
            return false;

        try
        {
            await _notifications.AddAsync(inApp, ct);
        }
        catch (Exception)
        {
            await _dedup.ReleaseAsync(inApp.UserId, inApp.Type, eventId, NotificationDedupChannel.InApp, CancellationToken.None);
            throw;
        }

        return true;
    }
}
