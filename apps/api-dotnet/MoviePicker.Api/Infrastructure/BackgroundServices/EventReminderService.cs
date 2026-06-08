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
        }
    }

    private async Task SendRemindersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var subscriptions = scope.ServiceProvider.GetRequiredService<IPushSubscriptionRepository>();
        var sender = scope.ServiceProvider.GetRequiredService<IPushNotificationSender>();
        var notifications = scope.ServiceProvider.GetRequiredService<IUserNotificationRepository>();

        var now = _clock.GetUtcNow();
        var upcomingEvents = await events.ListOpenEventsAsync(ct);

        await ProcessWindowAsync(
            upcomingEvents, now, Window1hMin, Window1hMax,
            UserNotificationType.EventReminder1h,
            "🎬 Soirée dans 1 heure",
            participants, users, subscriptions, sender, notifications, ct);

        await ProcessWindowAsync(
            upcomingEvents, now, Window24hMin, Window24hMax,
            UserNotificationType.EventReminder24h,
            "🎬 Soirée demain",
            participants, users, subscriptions, sender, notifications, ct);
    }

    private async Task ProcessWindowAsync(
        IReadOnlyList<Event> allOpenEvents,
        DateTimeOffset now,
        TimeSpan windowMin,
        TimeSpan windowMax,
        UserNotificationType notifType,
        string pushTitle,
        IParticipantRepository participantRepo,
        IUserRepository userRepo,
        IPushSubscriptionRepository subscriptionRepo,
        IPushNotificationSender sender,
        IUserNotificationRepository notificationRepo,
        CancellationToken ct)
    {
        var windowFrom = now + windowMin;
        var windowTo = now + windowMax;

        var eventsInWindow = allOpenEvents.Where(e =>
        {
            if (!DateTimeOffset.TryParse(
                    $"{e.Date}T{e.Time}:00Z",
                    null,
                    System.Globalization.DateTimeStyles.AssumeUniversal,
                    out var startAt))
                return false;
            return startAt >= windowFrom && startAt <= windowTo;
        }).ToList();

        if (eventsInWindow.Count == 0)
            return;

        _logger.LogInformation(
            "Rappels {Type} : {Count} soirée(s) dans la fenêtre [{Min}–{Max}]",
            notifType, eventsInWindow.Count, windowMin, windowMax);

        foreach (var evt in eventsInWindow)
        {
            var eventParticipants = await participantRepo.ListByEventIdAsync(evt.Id, ct);
            var userIds = eventParticipants
                .Where(p => !string.IsNullOrEmpty(p.UserId))
                .Select(p => p.UserId!)
                .Distinct()
                .ToList();

            if (userIds.Count == 0)
                continue;

            var usersWithPref = await userRepo.ListByIdsAsync(userIds, ct);
            var notifiableUsers = usersWithPref.Where(u => u.NotifyEventReminder).ToList();
            if (notifiableUsers.Count == 0)
                continue;

            var pushBody = $"La soirée \"{evt.Title}\" commence bientôt !";
            var pushSubs = await subscriptionRepo.ListByUserIdsAsync(
                notifiableUsers.Select(u => u.Id).ToHashSet(), ct);

            if (pushSubs.Count > 0)
            {
                var message = new PushMessage(
                    Title: pushTitle,
                    Body: pushBody,
                    Tag: $"reminder-{notifType}-{evt.Id}",
                    Url: $"/e/{evt.Slug}"
                );

                foreach (var sub in pushSubs)
                    await sender.SendAsync(sub, message, ct);
            }

            var notifNow = now;
            foreach (var user in notifiableUsers)
            {
                var alreadySent = await notificationRepo.ExistsAsync(user.Id, notifType, evt.Id, ct);
                if (alreadySent)
                    continue;

                await notificationRepo.AddAsync(new UserNotification
                {
                    UserId = user.Id,
                    Type = notifType,
                    EventId = evt.Id,
                    EventSlug = evt.Slug,
                    EventTitle = evt.Title,
                    IsRead = false,
                    CreatedAt = notifNow
                }, ct);
            }
        }
    }
}
