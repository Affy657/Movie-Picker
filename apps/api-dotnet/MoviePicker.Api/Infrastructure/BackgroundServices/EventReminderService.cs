using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
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
            // Arrêt normal du service (annulation demandée) — rien à faire.
        }
    }

    private async Task SendRemindersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var services = new ReminderServices(
            scope.ServiceProvider.GetRequiredService<IParticipantRepository>(),
            scope.ServiceProvider.GetRequiredService<IUserRepository>(),
            scope.ServiceProvider.GetRequiredService<IPushSubscriptionRepository>(),
            scope.ServiceProvider.GetRequiredService<IPushNotificationSender>(),
            scope.ServiceProvider.GetRequiredService<IUserNotificationRepository>());

        var now = _clock.GetUtcNow();
        var upcomingEvents = await events.ListOpenEventsAsync(ct);

        await ProcessWindowAsync(
            upcomingEvents, now,
            new ReminderWindow(Window1hMin, Window1hMax, UserNotificationType.EventReminder1h, "🎬 Soirée dans 1 heure"),
            services, ct);

        await ProcessWindowAsync(
            upcomingEvents, now,
            new ReminderWindow(Window24hMin, Window24hMax, UserNotificationType.EventReminder24h, "🎬 Soirée demain"),
            services, ct);
    }

    private async Task ProcessWindowAsync(
        IReadOnlyList<Event> allOpenEvents,
        DateTimeOffset now,
        ReminderWindow window,
        ReminderServices services,
        CancellationToken ct)
    {
        var windowFrom = now + window.Min;
        var windowTo = now + window.Max;

        var eventsInWindow = allOpenEvents.Where(e =>
        {
            if (!DateTimeOffset.TryParse(
                    $"{e.Date}T{e.Time}:00Z",
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AssumeUniversal,
                    out var startAt))
                return false;
            return startAt >= windowFrom && startAt <= windowTo;
        }).ToList();

        if (eventsInWindow.Count == 0)
            return;

        _logger.LogInformation(
            "Rappels {Type} : {Count} soirée(s) dans la fenêtre [{Min}–{Max}]",
            window.NotifType, eventsInWindow.Count, window.Min, window.Max);

        foreach (var evt in eventsInWindow)
            await ProcessEventRemindersAsync(evt, window, services, now, ct);
    }

    private static async Task ProcessEventRemindersAsync(
        Event evt,
        ReminderWindow window,
        ReminderServices services,
        DateTimeOffset now,
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

        var usersWithPref = await services.UserRepo.ListByIdsAsync(userIds, ct);
        var notifiableUsers = usersWithPref.Where(u => u.NotifyEventReminder).ToList();
        if (notifiableUsers.Count == 0)
            return;

        var pushBody = $"La soirée \"{evt.Title}\" commence bientôt !";
        var pushSubs = await services.SubscriptionRepo.ListByUserIdsAsync(
            notifiableUsers.Select(u => u.Id).ToHashSet(), ct);

        if (pushSubs.Count > 0)
        {
            var message = new PushMessage(
                Title: window.PushTitle,
                Body: pushBody,
                Tag: $"reminder-{window.NotifType}-{evt.Id}",
                Url: $"/e/{evt.Slug}"
            );

            foreach (var sub in pushSubs)
                await services.Sender.SendAsync(sub, message, ct);
        }

        foreach (var user in notifiableUsers)
        {
            var alreadySent = await services.NotificationRepo.ExistsAsync(user.Id, window.NotifType, evt.Id, ct);
            if (alreadySent)
                continue;

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
    }

    private sealed record ReminderWindow(
        TimeSpan Min,
        TimeSpan Max,
        UserNotificationType NotifType,
        string PushTitle);

    private sealed record ReminderServices(
        IParticipantRepository ParticipantRepo,
        IUserRepository UserRepo,
        IPushSubscriptionRepository SubscriptionRepo,
        IPushNotificationSender Sender,
        IUserNotificationRepository NotificationRepo);
}
