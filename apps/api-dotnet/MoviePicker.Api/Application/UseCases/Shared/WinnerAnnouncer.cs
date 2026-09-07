using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public sealed class WinnerAnnouncer : IWinnerAnnouncer
{
    private readonly IParticipantRepository _participantRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly IUserNotificationRepository _notifications;
    private readonly ILogger<WinnerAnnouncer> _logger;

    public WinnerAnnouncer(
        IParticipantRepository participantRepository,
        IUserRepository userRepository,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        IUserNotificationRepository notifications,
        ILogger<WinnerAnnouncer> logger)
    {
        _participantRepository = participantRepository;
        _userRepository = userRepository;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task AnnounceAsync(Event evt, string winnerTitle, WinnerPickMethod method, CancellationToken ct = default)
    {
        try
        {
            var participants = await _participantRepository.ListByEventIdAsync(evt.Id, ct);
            var userIds = participants
                .Where(p => !string.IsNullOrEmpty(p.UserId))
                .Select(p => p.UserId!)
                .Distinct()
                .ToList();
            if (userIds.Count == 0)
                return;

            var notificationType = method == WinnerPickMethod.Manual
                ? UserNotificationType.MoviePickedManually
                : UserNotificationType.MoviePicked;

            var users = await _userRepository.ListByIdsAsync(userIds, ct);
            var notifiableIds = users.Where(u => u.NotifiesOn(notificationType)).Select(u => u.Id).ToHashSet();
            if (notifiableIds.Count == 0)
                return;

            var subs = await _pushSubscriptions.ListByUserIdsAsync(notifiableIds, ct);
            if (subs.Count > 0)
            {
                var message = new PushMessage(
                    Title: method == WinnerPickMethod.Manual ? "🎬 Film choisi par l'hôte !" : "🎡 Film tiré au sort !",
                    Body: $"Ce soir : « {winnerTitle} » pour « {evt.Title} »",
                    Tag: $"wheel-{evt.Id}",
                    Url: $"/e/{evt.Slug}"
                );

                await PushFanOut.SendToAllAsync(
                    _pushSender,
                    subs.Where(s => notifiableIds.Contains(s.UserId)),
                    message,
                    ct);
            }

            var now = DateTimeOffset.UtcNow;
            foreach (var userId in notifiableIds)
            {
                await _notifications.AddAsync(new UserNotification
                {
                    UserId = userId,
                    Type = notificationType,
                    EventId = evt.Id,
                    EventSlug = evt.Slug,
                    EventTitle = evt.Title,
                    MovieTitle = winnerTitle,
                    IsRead = false,
                    CreatedAt = now
                }, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Échec de la notification du film gagnant pour la soirée {EventId}", evt.Id);
        }
    }
}
