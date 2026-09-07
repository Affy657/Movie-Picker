using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public interface IEventReminderPass
{
    Task<EventReminderPassResult> RunAsync(CancellationToken ct = default);
}

public sealed record EventReminderPassResult(
    int OpenEvents,
    int Reminders1h,
    int Reminders24h,
    int PendingEvents);

public sealed class EventReminderPass : IEventReminderPass
{
    private static readonly TimeSpan Window1hMin = TimeSpan.FromMinutes(50);
    private static readonly TimeSpan Window1hMax = TimeSpan.FromMinutes(80);

    private static readonly TimeSpan Window24hMin = TimeSpan.FromHours(23) + TimeSpan.FromMinutes(50);
    private static readonly TimeSpan Window24hMax = TimeSpan.FromHours(24) + TimeSpan.FromMinutes(20);

    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IUserRepository _users;
    private readonly IMovieRepository _movies;
    private readonly IPushSubscriptionRepository _subscriptions;
    private readonly IPushNotificationSender _sender;
    private readonly IUserNotificationRepository _notifications;
    private readonly INotificationDedupRepository _dedup;
    private readonly TimeProvider _clock;
    private readonly ILogger<EventReminderPass> _logger;

    public EventReminderPass(
        IEventRepository events,
        IParticipantRepository participants,
        IUserRepository users,
        IMovieRepository movies,
        IPushSubscriptionRepository subscriptions,
        IPushNotificationSender sender,
        IUserNotificationRepository notifications,
        INotificationDedupRepository dedup,
        TimeProvider clock,
        ILogger<EventReminderPass> logger)
    {
        _events = events;
        _participants = participants;
        _users = users;
        _movies = movies;
        _subscriptions = subscriptions;
        _sender = sender;
        _notifications = notifications;
        _dedup = dedup;
        _clock = clock;
        _logger = logger;
    }

    public async Task<EventReminderPassResult> RunAsync(CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow();
        var openEvents = await _events.ListOpenEventsAsync(ct);
        var eventsWithStart = openEvents
            .Select(e => (Event: e, HasStart: EventSchedule.TryGetStartUtc(e.Date, e.Time, out var startAt), StartUtc: startAt))
            .Where(x => x.HasStart)
            .Select(x => (x.Event, x.StartUtc))
            .ToList();

        var sent1h = await ProcessWindowAsync(
            eventsWithStart, now,
            new ReminderWindow(Window1hMin, Window1hMax, UserNotificationType.EventReminder1h, "Dans 1 heure !"),
            ct);

        var sent24h = await ProcessWindowAsync(
            eventsWithStart, now,
            new ReminderWindow(Window24hMin, Window24hMax, UserNotificationType.EventReminder24h, "J-1 !"),
            ct);

        var pending = await ProcessPendingEventsAsync(openEvents, now, ct);

        return new EventReminderPassResult(openEvents.Count, sent1h, sent24h, pending);
    }

    private async Task<int> ProcessWindowAsync(
        IReadOnlyList<(Event Event, DateTimeOffset StartUtc)> eventsWithStart,
        DateTimeOffset now,
        ReminderWindow window,
        CancellationToken ct)
    {
        var windowFrom = now + window.Min;
        var windowTo = now + window.Max;

        var eventsInWindow = eventsWithStart
            .Where(x => x.StartUtc >= windowFrom && x.StartUtc <= windowTo)
            .Select(x => x.Event)
            .ToList();

        if (eventsInWindow.Count == 0)
            return 0;

        _logger.LogInformation(
            "Rappels {Type} : {Count} soirée(s) dans la fenêtre [{Min}–{Max}]",
            window.NotifType, eventsInWindow.Count, window.Min, window.Max);

        HashSet<string> noMovieEventIds = [];
        if (window.NotifType == UserNotificationType.EventReminder1h)
        {
            var counts = await _movies.CountByEventIdsAsync(
                eventsInWindow.Select(e => e.Id).ToList(), ct);
            noMovieEventIds = eventsInWindow
                .Where(e => !counts.TryGetValue(e.Id, out var count) || count == 0)
                .Select(e => e.Id)
                .ToHashSet();
        }

        foreach (var evt in eventsInWindow)
            await ProcessEventRemindersAsync(evt, window, now, noMovieEventIds.Contains(evt.Id), ct);

        return eventsInWindow.Count;
    }

    private async Task ProcessEventRemindersAsync(
        Event evt,
        ReminderWindow window,
        DateTimeOffset now,
        bool noMovieYet,
        CancellationToken ct)
    {
        var eventParticipants = await _participants.ListByEventIdAsync(evt.Id, ct);
        var userIds = eventParticipants
            .Where(p => !string.IsNullOrEmpty(p.UserId))
            .Select(p => p.UserId!)
            .Distinct()
            .ToList();

        if (userIds.Count == 0)
            return;

        var users = await _users.ListByIdsAsync(userIds, ct);
        var notifiableUsers = users.Where(u => u.NotifiesOn(window.NotifType)).ToList();
        if (notifiableUsers.Count == 0)
            return;

        var (pushTitle, pushBody) = noMovieYet
            ? ("Toujours rien au programme ?", $"Plus qu'une heure avant {evt.Title} et toujours aucun film choisi… on en ajoute un ? 👀")
            : (window.PushTitle, window.PushBody(evt.Title));

        var subsByUser = (await _subscriptions.ListByUserIdsAsync(
                notifiableUsers.Select(u => u.Id).ToHashSet(), ct))
            .GroupBy(s => s.UserId)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var user in notifiableUsers)
            await NotifyUserReminderAsync(user, evt, window, now, pushTitle, pushBody, subsByUser, ct);
    }

    private async Task NotifyUserReminderAsync(
        User user,
        Event evt,
        ReminderWindow window,
        DateTimeOffset now,
        string pushTitle,
        string pushBody,
        Dictionary<string, List<PushSubscription>> subsByUser,
        CancellationToken ct)
    {
        if (subsByUser.TryGetValue(user.Id, out var subs) && subs.Count > 0)
        {
            var claimed = await _dedup.TryClaimAsync(
                user.Id, window.NotifType, evt.Id, NotificationDedupChannel.Push, ct);
            if (claimed)
            {
                var message = new PushMessage(
                    Title: pushTitle,
                    Body: pushBody,
                    Tag: $"reminder-{window.NotifType}-{evt.Id}",
                    Url: $"/e/{evt.Slug}"
                );
                foreach (var sub in subs)
                    await _sender.SendAsync(sub, message, ct);
            }
        }

        if (await _notifications.ExistsAsync(user.Id, window.NotifType, evt.Id, ct))
            return;

        var inAppClaimed = await _dedup.TryClaimAsync(
            user.Id, window.NotifType, evt.Id, NotificationDedupChannel.InApp, ct);
        if (!inAppClaimed)
            return;

        await _notifications.AddAsync(new UserNotification
        {
            UserId = user.Id,
            Type = window.NotifType,
            EventId = evt.Id,
            EventSlug = evt.Slug,
            EventTitle = evt.Title,
            IsRead = false,
            CreatedAt = now
        }, ct);
    }

    private async Task<int> ProcessPendingEventsAsync(
        IReadOnlyList<Event> openEvents,
        DateTimeOffset now,
        CancellationToken ct)
    {
        var pendingEvents = openEvents
            .Where(e => !string.IsNullOrEmpty(e.CreatorUserId) && e.Lifecycle(now) == EventLifecycle.Pending)
            .ToList();

        if (pendingEvents.Count == 0)
            return 0;

        _logger.LogInformation("Soirées en suspens détectées : {Count}", pendingEvents.Count);

        foreach (var evt in pendingEvents)
            await ProcessPendingEventAsync(evt, now, ct);

        return pendingEvents.Count;
    }

    private async Task ProcessPendingEventAsync(Event evt, DateTimeOffset now, CancellationToken ct)
    {
        var host = await _users.GetByIdAsync(evt.CreatorUserId!, ct);
        if (host is null || !host.NotifiesOn(UserNotificationType.EventPending))
            return;

        var subs = await _subscriptions.ListByUserIdAsync(host.Id, ct);
        if (subs.Count > 0)
        {
            var claimed = await _dedup.TryClaimAsync(
                host.Id, UserNotificationType.EventPending, evt.Id, NotificationDedupChannel.Push, ct);
            if (claimed)
            {
                var message = new PushMessage(
                    Title: "Soirée en suspens 😅",
                    Body: $"{evt.Title} s'est terminée sans qu'aucun film n'ait été choisi… on se rattrape la prochaine fois ?",
                    Tag: $"pending-{evt.Id}",
                    Url: $"/e/{evt.Slug}"
                );
                foreach (var sub in subs)
                    await _sender.SendAsync(sub, message, ct);
            }
        }

        if (await _notifications.ExistsAsync(host.Id, UserNotificationType.EventPending, evt.Id, ct))
            return;

        var inAppClaimed = await _dedup.TryClaimAsync(
            host.Id, UserNotificationType.EventPending, evt.Id, NotificationDedupChannel.InApp, ct);
        if (!inAppClaimed)
            return;

        await _notifications.AddAsync(new UserNotification
        {
            UserId = host.Id,
            Type = UserNotificationType.EventPending,
            EventId = evt.Id,
            EventSlug = evt.Slug,
            EventTitle = evt.Title,
            IsRead = false,
            CreatedAt = now
        }, ct);
    }

    private sealed record ReminderWindow(
        TimeSpan Min,
        TimeSpan Max,
        UserNotificationType NotifType,
        string PushTitle)
    {
        public string PushBody(string eventTitle) => NotifType == UserNotificationType.EventReminder24h
            ? $"Demain, c'est {eventTitle} ! Prépare le canapé et le popcorn 🍿"
            : $"⏰ {eventTitle} arrive à grands pas !";
    }
}
