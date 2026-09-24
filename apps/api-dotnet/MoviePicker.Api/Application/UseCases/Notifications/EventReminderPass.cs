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
    int PendingEvents,
    int DeliveryFailures = 0);

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
        var openEvents = await _events.ListOpenEventsStartingBetweenAsync(
            now - EventSchedule.PendingDelay - EventSchedule.AutoCloseDelay,
            now + Window24hMax,
            ct);
        var eventsWithStart = openEvents
            .Select(e => (Event: e, HasStart: EventSchedule.TryGetStartUtc(e.Date, e.Time, out var startAt), StartUtc: startAt))
            .Where(x => x.HasStart)
            .Select(x => (x.Event, x.StartUtc))
            .ToList();

        var failures = new DeliveryFailures();
        var sent1h = await ProcessWindowAsync(
            eventsWithStart, now,
            new ReminderWindow(Window1hMin, Window1hMax, UserNotificationType.EventReminder1h, "Dans 1 heure !"),
            failures,
            ct);

        var sent24h = await ProcessWindowAsync(
            eventsWithStart, now,
            new ReminderWindow(Window24hMin, Window24hMax, UserNotificationType.EventReminder24h, "J-1 !"),
            failures,
            ct);

        var pending = await ProcessPendingEventsAsync(openEvents, now, failures, ct);

        return new EventReminderPassResult(openEvents.Count, sent1h, sent24h, pending, failures.Count);
    }

    public static string OccurrenceKey(string eventId, DateTimeOffset startUtc) =>
        eventId + "@" + startUtc.UtcDateTime.ToString("yyyyMMdd'T'HHmm", System.Globalization.CultureInfo.InvariantCulture);

    private async Task<int> ProcessWindowAsync(
        IReadOnlyList<(Event Event, DateTimeOffset StartUtc)> eventsWithStart,
        DateTimeOffset now,
        ReminderWindow window,
        DeliveryFailures failures,
        CancellationToken ct)
    {
        var windowFrom = now + window.Min;
        var windowTo = now + window.Max;

        var eventsInWindow = eventsWithStart
            .Where(x => x.StartUtc >= windowFrom && x.StartUtc <= windowTo)
            .ToList();

        if (eventsInWindow.Count == 0)
            return 0;

        _logger.LogInformation(
            "{Type} reminders: {Count} movie night(s) in the window [{Min}, {Max}]",
            window.NotifType, eventsInWindow.Count, window.Min, window.Max);

        HashSet<string> noMovieEventIds = [];
        if (window.NotifType == UserNotificationType.EventReminder1h)
        {
            var counts = await _movies.CountByEventIdsAsync(
                eventsInWindow.Select(x => x.Event.Id).ToList(), ct);
            noMovieEventIds = eventsInWindow
                .Where(x => !counts.TryGetValue(x.Event.Id, out var count) || count == 0)
                .Select(x => x.Event.Id)
                .ToHashSet();
        }

        foreach (var (evt, startUtc) in eventsInWindow)
        {
            var occurrence = new ReminderOccurrence(evt, startUtc, OccurrenceKey(evt.Id, startUtc), noMovieEventIds.Contains(evt.Id));
            await ProcessEventRemindersAsync(occurrence, window, now, failures, ct);
        }

        return eventsInWindow.Count;
    }

    private async Task ProcessEventRemindersAsync(
        ReminderOccurrence occurrence,
        ReminderWindow window,
        DateTimeOffset now,
        DeliveryFailures failures,
        CancellationToken ct)
    {
        var evt = occurrence.Event;
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

        var (pushTitle, pushBody) = occurrence.NoMovieYet
            ? ("Toujours rien au programme ?", $"Plus qu'une heure avant {evt.Title} et toujours aucun film choisi… on en ajoute un ? 👀")
            : (window.PushTitle, window.PushBody(evt.Title));

        var subsByUser = (await _subscriptions.ListByUserIdsAsync(
                notifiableUsers.Select(u => u.Id).ToHashSet(), ct))
            .GroupBy(s => s.UserId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var push = new PushMessage(
            Title: pushTitle,
            Body: pushBody,
            Tag: $"reminder-{window.NotifType}-{evt.Id}",
            Url: $"/e/{evt.Slug}");
        foreach (var user in notifiableUsers)
        {
            var subs = subsByUser.TryGetValue(user.Id, out var userSubs) ? userSubs : [];
            if (!await SentBeforeOccurrenceKeysAsync(user.Id, occurrence, window, NotificationDedupChannel.Push, ct))
                await DeliverOnceAsync(user.Id, window.NotifType, occurrence.Key, subs, push, failures, ct);
            if (!await SentBeforeOccurrenceKeysAsync(user.Id, occurrence, window, NotificationDedupChannel.InApp, ct))
                await AddToInboxOnceAsync(user.Id, window.NotifType, occurrence.Key, evt, now, ct);
        }
    }

    private Task<bool> SentBeforeOccurrenceKeysAsync(
        string userId,
        ReminderOccurrence occurrence,
        ReminderWindow window,
        NotificationDedupChannel channel,
        CancellationToken ct) =>
        _dedup.WasClaimedSinceAsync(userId, window.NotifType, occurrence.Event.Id, channel, occurrence.StartUtc - window.Max, ct);

    private async Task DeliverOnceAsync(
        string userId,
        UserNotificationType type,
        string dedupKey,
        IReadOnlyList<PushSubscription> subs,
        PushMessage message,
        DeliveryFailures failures,
        CancellationToken ct)
    {
        if (subs.Count == 0
            || !await _dedup.TryClaimAsync(userId, type, dedupKey, NotificationDedupChannel.Push, ct))
            return;

        var settled = await Task.WhenAll(subs.Select(sub => _sender.SendAsync(sub, message, ct)));
        if (settled.Any(delivered => delivered))
            return;

        failures.Record();
        await _dedup.ReleaseAsync(userId, type, dedupKey, NotificationDedupChannel.Push, CancellationToken.None);
    }

    private async Task AddToInboxOnceAsync(
        string userId,
        UserNotificationType type,
        string dedupKey,
        Event evt,
        DateTimeOffset now,
        CancellationToken ct)
    {
        if (!await _dedup.TryClaimAsync(userId, type, dedupKey, NotificationDedupChannel.InApp, ct))
            return;

        try
        {
            await _notifications.AddAsync(new UserNotification
            {
                UserId = userId,
                Type = type,
                EventId = evt.Id,
                EventSlug = evt.Slug,
                EventTitle = evt.Title,
                IsRead = false,
                CreatedAt = now
            }, ct);
        }
        catch (Exception)
        {
            await _dedup.ReleaseAsync(userId, type, dedupKey, NotificationDedupChannel.InApp, CancellationToken.None);
            throw;
        }
    }

    private async Task<int> ProcessPendingEventsAsync(
        IReadOnlyList<Event> openEvents,
        DateTimeOffset now,
        DeliveryFailures failures,
        CancellationToken ct)
    {
        var pendingEvents = openEvents
            .Where(e => !string.IsNullOrEmpty(e.CreatorUserId) && e.Lifecycle(now) == EventLifecycle.Pending)
            .ToList();

        if (pendingEvents.Count == 0)
            return 0;

        _logger.LogInformation("Pending movie nights detected: {Count}", pendingEvents.Count);

        foreach (var evt in pendingEvents)
            await ProcessPendingEventAsync(evt, now, failures, ct);

        return pendingEvents.Count;
    }

    private async Task ProcessPendingEventAsync(Event evt, DateTimeOffset now, DeliveryFailures failures, CancellationToken ct)
    {
        var host = await _users.GetByIdAsync(evt.CreatorUserId!, ct);
        if (host is null || !host.NotifiesOn(UserNotificationType.EventPending))
            return;

        if (await _notifications.ExistsAsync(host.Id, UserNotificationType.EventPending, evt.Id, ct))
            return;

        var subs = await _subscriptions.ListByUserIdAsync(host.Id, ct);
        var message = new PushMessage(
            Title: "Soirée en suspens 😅",
            Body: $"{evt.Title} s'est terminée sans qu'aucun film n'ait été choisi… on se rattrape la prochaine fois ?",
            Tag: $"pending-{evt.Id}",
            Url: $"/e/{evt.Slug}");
        await DeliverOnceAsync(host.Id, UserNotificationType.EventPending, evt.Id, subs, message, failures, ct);
        await AddToInboxOnceAsync(host.Id, UserNotificationType.EventPending, evt.Id, evt, now, ct);
    }

    private sealed record ReminderOccurrence(Event Event, DateTimeOffset StartUtc, string Key, bool NoMovieYet);

    private sealed class DeliveryFailures
    {
        public int Count { get; private set; }

        public void Record() => Count++;
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
