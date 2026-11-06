using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public sealed record EventAudienceMessage(string EventId, UserNotification Inbox, PushMessage Push);

public sealed class EventAudienceNotifier
{
    private readonly IParticipantRepository _participants;
    private readonly IUserRepository _users;
    private readonly IPushSubscriptionRepository _subscriptions;
    private readonly IPushNotificationSender _sender;
    private readonly IUserNotificationRepository _notifications;
    private readonly ILogger<EventAudienceNotifier> _logger;
    private readonly TimeProvider _clock;

    public EventAudienceNotifier(
        IParticipantRepository participants,
        IUserRepository users,
        IPushSubscriptionRepository subscriptions,
        IPushNotificationSender sender,
        IUserNotificationRepository notifications,
        ILogger<EventAudienceNotifier> logger,
        TimeProvider clock)
    {
        _participants = participants;
        _users = users;
        _subscriptions = subscriptions;
        _sender = sender;
        _notifications = notifications;
        _logger = logger;
        _clock = clock;
    }

    public async Task NotifyParticipantsAsync(
        EventAudienceMessage message,
        string? exceptUserId = null,
        CancellationToken ct = default)
    {
        try
        {
            var participants = await _participants.ListByEventIdAsync(message.EventId, ct);
            var userIds = participants
                .Where(p => !string.IsNullOrEmpty(p.UserId) && p.UserId != exceptUserId)
                .Select(p => p.UserId!)
                .Distinct()
                .ToList();
            await DeliverAsync(userIds, message, ct);
        }
        catch (Exception ex)
        {
            LogFailure(ex, message);
        }
    }

    public async Task NotifyUsersAsync(
        IReadOnlyCollection<string> userIds,
        EventAudienceMessage message,
        CancellationToken ct = default)
    {
        try
        {
            await DeliverAsync(userIds, message, ct);
        }
        catch (Exception ex)
        {
            LogFailure(ex, message);
        }
    }

    private void LogFailure(Exception ex, EventAudienceMessage message) =>
        _logger.LogWarning(ex, "{Type} notification failed for movie night {EventId}", message.Inbox.Type, message.EventId);

    private async Task DeliverAsync(IReadOnlyCollection<string> userIds, EventAudienceMessage message, CancellationToken ct)
    {
        if (userIds.Count == 0)
            return;

        var users = await _users.ListByIdsAsync(userIds, ct);
        var notifiableIds = users.Where(u => u.NotifiesOn(message.Inbox.Type)).Select(u => u.Id).ToHashSet();
        if (notifiableIds.Count == 0)
            return;

        await PushAsync(notifiableIds, message, ct);
        await AddToInboxesAsync(notifiableIds, message, ct);
    }

    private async Task PushAsync(HashSet<string> userIds, EventAudienceMessage message, CancellationToken ct)
    {
        try
        {
            var subscriptions = await _subscriptions.ListByUserIdsAsync(userIds, ct);
            if (subscriptions.Count > 0)
                await PushFanOut.SendToAllAsync(_sender, subscriptions.Where(s => userIds.Contains(s.UserId)), message.Push, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "{Type} push failed for movie night {EventId}, the inboxes still go out", message.Inbox.Type, message.EventId);
        }
    }

    private async Task AddToInboxesAsync(HashSet<string> userIds, EventAudienceMessage message, CancellationToken ct)
    {
        var now = _clock.GetUtcNow();
        foreach (var userId in userIds)
        {
            try
            {
                await _notifications.AddAsync(message.Inbox with { UserId = userId, CreatedAt = now }, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "{Type} inbox entry failed for user {UserId} on movie night {EventId}", message.Inbox.Type, userId, message.EventId);
            }
        }
    }
}
