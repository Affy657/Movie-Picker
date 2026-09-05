using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.BackgroundServices;

public sealed class EventReminderService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);

    private static readonly TimeSpan Window1hMin = TimeSpan.FromMinutes(50);
    private static readonly TimeSpan Window1hMax = TimeSpan.FromMinutes(80);

    private static readonly TimeSpan Window24hMin = TimeSpan.FromHours(23) + TimeSpan.FromMinutes(50);
    private static readonly TimeSpan Window24hMax = TimeSpan.FromHours(24) + TimeSpan.FromMinutes(20);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeProvider _clock;
    private readonly ILogger<EventReminderService> _logger;

    public EventReminderService(IServiceScopeFactory scopeFactory, TimeProvider clock, ILogger<EventReminderService> logger)
    {
        _scopeFactory = scopeFactory;
        _clock = clock;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SendRemindersAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogError(ex, "Erreur lors de l'envoi des rappels de soirée");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
        }
    }

    private async Task SendRemindersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var services = new ReminderServices(
            scope.ServiceProvider.GetRequiredService<IParticipantRepository>(),
            scope.ServiceProvider.GetRequiredService<IUserRepository>(),
            scope.ServiceProvider.GetRequiredService<IMovieRepository>(),
            scope.ServiceProvider.GetRequiredService<IPushSubscriptionRepository>(),
            scope.ServiceProvider.GetRequiredService<IPushNotificationSender>(),
            scope.ServiceProvider.GetRequiredService<IUserNotificationRepository>(),
            scope.ServiceProvider.GetRequiredService<IPushDedupRepository>());

        var now = _clock.GetUtcNow();
        var openEvents = await events.ListOpenEventsAsync(ct);
        var eventsWithStart = openEvents
            .Select(e => (Event: e, HasStart: EventSchedule.TryGetStartUtc(e.Date, e.Time, out var startAt), StartUtc: startAt))
            .Where(x => x.HasStart)
            .Select(x => (x.Event, x.StartUtc))
            .ToList();

        await ProcessWindowAsync(
            eventsWithStart, now,
            new ReminderWindow(Window1hMin, Window1hMax, UserNotificationType.EventReminder1h, "Dans 1 heure !"),
            services, ct);

        await ProcessWindowAsync(
            eventsWithStart, now,
            new ReminderWindow(Window24hMin, Window24hMax, UserNotificationType.EventReminder24h, "J-1 !"),
            services, ct);

        await ProcessPendingEventsAsync(openEvents, now, services, ct);
    }

    private async Task ProcessWindowAsync(
        IReadOnlyList<(Event Event, DateTimeOffset StartUtc)> eventsWithStart,
        DateTimeOffset now,
        ReminderWindow window,
        ReminderServices services,
        CancellationToken ct)
    {
        var windowFrom = now + window.Min;
        var windowTo = now + window.Max;

        var eventsInWindow = eventsWithStart
            .Where(x => x.StartUtc >= windowFrom && x.StartUtc <= windowTo)
            .Select(x => x.Event)
            .ToList();

        if (eventsInWindow.Count == 0)
            return;

        _logger.LogInformation(
            "Rappels {Type} : {Count} soirée(s) dans la fenêtre [{Min}–{Max}]",
            window.NotifType, eventsInWindow.Count, window.Min, window.Max);

        HashSet<string> noMovieEventIds = [];
        if (window.NotifType == UserNotificationType.EventReminder1h)
        {
            var counts = await services.MovieRepo.CountByEventIdsAsync(
                eventsInWindow.Select(e => e.Id).ToList(), ct);
            noMovieEventIds = eventsInWindow
                .Where(e => !counts.TryGetValue(e.Id, out var count) || count == 0)
                .Select(e => e.Id)
                .ToHashSet();
        }

        foreach (var evt in eventsInWindow)
            await ProcessEventRemindersAsync(evt, window, services, now, noMovieEventIds.Contains(evt.Id), ct);
    }

    private static async Task ProcessEventRemindersAsync(
        Event evt,
        ReminderWindow window,
        ReminderServices services,
        DateTimeOffset now,
        bool noMovieYet,
        CancellationToken ct)
    {
        var eventParticipants = await services.ParticipantRepo.ListByEventIdAsync(evt.Id, ct);
        var userIds = eventParticipants
            .Where(p => !string.IsNullOrEmpty(p.UserId))
            .Select(p => p.UserId!)
            .Distinct()
            .ToList();

        if (userIds.Count == 0)
            return;

        var users = await services.UserRepo.ListByIdsAsync(userIds, ct);
        var notifiableUsers = users.Where(u => u.NotifiesOn(window.NotifType)).ToList();
        if (notifiableUsers.Count == 0)
            return;

        var (pushTitle, pushBody) = noMovieYet
            ? ("Toujours rien au programme ?", $"Plus qu'une heure avant {evt.Title} et toujours aucun film choisi… on en ajoute un ? 👀")
            : (window.PushTitle, window.PushBody(evt.Title));

        var subsByUser = (await services.SubscriptionRepo.ListByUserIdsAsync(
                notifiableUsers.Select(u => u.Id).ToHashSet(), ct))
            .GroupBy(s => s.UserId)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var user in notifiableUsers)
            await NotifyUserReminderAsync(user, evt, window, services, now, pushTitle, pushBody, subsByUser, ct);
    }

    private static async Task NotifyUserReminderAsync(
        User user,
        Event evt,
        ReminderWindow window,
        ReminderServices services,
        DateTimeOffset now,
        string pushTitle,
        string pushBody,
        Dictionary<string, List<PushSubscription>> subsByUser,
        CancellationToken ct)
    {
        if (subsByUser.TryGetValue(user.Id, out var subs) && subs.Count > 0)
        {
            var claimed = await services.PushDedup.TryClaimAsync(user.Id, window.NotifType, evt.Id, ct);
            if (claimed)
            {
                var message = new PushMessage(
                    Title: pushTitle,
                    Body: pushBody,
                    Tag: $"reminder-{window.NotifType}-{evt.Id}",
                    Url: $"/e/{evt.Slug}"
                );
                foreach (var sub in subs)
                    await services.Sender.SendAsync(sub, message, ct);
            }
        }

        var alreadySent = await services.NotificationRepo.ExistsAsync(user.Id, window.NotifType, evt.Id, ct);
        if (alreadySent)
            return;

        await services.NotificationRepo.AddAsync(new UserNotification
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

    private async Task ProcessPendingEventsAsync(
        IReadOnlyList<Event> openEvents,
        DateTimeOffset now,
        ReminderServices services,
        CancellationToken ct)
    {
        var pendingEvents = openEvents
            .Where(e => !string.IsNullOrEmpty(e.CreatorUserId) && e.Lifecycle(now) == EventLifecycle.Pending)
            .ToList();

        if (pendingEvents.Count == 0)
            return;

        _logger.LogInformation("Soirées en suspens détectées : {Count}", pendingEvents.Count);

        foreach (var evt in pendingEvents)
            await ProcessPendingEventAsync(evt, now, services, ct);
    }

    private static async Task ProcessPendingEventAsync(
        Event evt,
        DateTimeOffset now,
        ReminderServices services,
        CancellationToken ct)
    {
        var host = await services.UserRepo.GetByIdAsync(evt.CreatorUserId!, ct);
        if (host is null || !host.NotifiesOn(UserNotificationType.EventPending))
            return;

        var subs = await services.SubscriptionRepo.ListByUserIdAsync(host.Id, ct);
        if (subs.Count > 0)
        {
            var claimed = await services.PushDedup.TryClaimAsync(host.Id, UserNotificationType.EventPending, evt.Id, ct);
            if (claimed)
            {
                var message = new PushMessage(
                    Title: "Soirée en suspens 😅",
                    Body: $"{evt.Title} s'est terminée sans qu'aucun film n'ait été choisi… on se rattrape la prochaine fois ?",
                    Tag: $"pending-{evt.Id}",
                    Url: $"/e/{evt.Slug}"
                );
                foreach (var sub in subs)
                    await services.Sender.SendAsync(sub, message, ct);
            }
        }

        var alreadySent = await services.NotificationRepo.ExistsAsync(host.Id, UserNotificationType.EventPending, evt.Id, ct);
        if (alreadySent)
            return;

        await services.NotificationRepo.AddAsync(new UserNotification
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

    private sealed record ReminderServices(
        IParticipantRepository ParticipantRepo,
        IUserRepository UserRepo,
        IMovieRepository MovieRepo,
        IPushSubscriptionRepository SubscriptionRepo,
        IPushNotificationSender Sender,
        IUserNotificationRepository NotificationRepo,
        IPushDedupRepository PushDedup);
}
