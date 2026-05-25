using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.BackgroundServices;

public sealed class EventReminderService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan ReminderWindowMin = TimeSpan.FromMinutes(50);
    private static readonly TimeSpan ReminderWindowMax = TimeSpan.FromMinutes(80);

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

    private async Task SendRemindersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var subscriptions = scope.ServiceProvider.GetRequiredService<IPushSubscriptionRepository>();
        var sender = scope.ServiceProvider.GetRequiredService<IPushNotificationSender>();

        var now = _clock.GetUtcNow();
        var windowFrom = now + ReminderWindowMin;
        var windowTo = now + ReminderWindowMax;

        var upcomingEvents = await events.ListOpenEventsAsync(ct);
        var eventsInWindow = upcomingEvents.Where(e =>
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

        _logger.LogInformation("Envoi de rappels pour {Count} soirée(s)", eventsInWindow.Count);

        foreach (var evt in eventsInWindow)
        {
            var eventParticipants = await participants.ListByEventIdAsync(evt.Id, ct);
            var userIds = eventParticipants
                .Where(p => !string.IsNullOrEmpty(p.UserId))
                .Select(p => p.UserId!)
                .Distinct()
                .ToList();

            if (userIds.Count == 0)
                continue;

            var pushSubs = await subscriptions.ListByUserIdsAsync(userIds, ct);
            if (pushSubs.Count == 0)
                continue;

            var usersWithPref = await users.ListByIdsAsync(userIds, ct);
            var notifiableUserIds = usersWithPref
                .Where(u => u.NotifyEventReminder)
                .Select(u => u.Id)
                .ToHashSet();

            var message = new PushMessage(
                Title: "🎬 Soirée dans 1 heure",
                Body: $"La soirée \"{evt.Title}\" commence bientôt !",
                Tag: $"reminder-{evt.Id}",
                Url: $"/events/{evt.Slug}"
            );

            foreach (var sub in pushSubs.Where(s => notifiableUserIds.Contains(s.UserId)))
                await sender.SendAsync(sub, message, ct);
        }
    }
}
