using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.JoinEvent;

public sealed class JoinEventHandler : IJoinEventHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly IUserNotificationRepository _notifications;
    private readonly ILogger<JoinEventHandler> _logger;

    public JoinEventHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IUserRepository userRepository,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        IUserNotificationRepository notifications,
        ILogger<JoinEventHandler> logger)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _userRepository = userRepository;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<JoinEventResult> HandleAsync(string idOrSlug, JoinEventRequest request, string authenticatedUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(authenticatedUserId))
            throw new ArgumentException("Un compte est requis pour rejoindre une soirée.", nameof(authenticatedUserId));

        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        var userId = authenticatedUserId;
        var alreadyLinked = await _participantRepository.FindByEventAndUserIdAsync(evt.Id, userId, ct);
        if (alreadyLinked is not null)
        {
            return new JoinEventResult
            {
                Participant = ParticipantResponse.FromDomain(alreadyLinked),
                IsNew = false,
                Message = "Déjà inscrit avec ce compte"
            };
        }

        var pseudo = request.Pseudo.Trim();
        var existing = await _participantRepository.FindByEventAndPseudoAsync(evt.Id, pseudo, ct);

        if (existing is not null)
        {
            return new JoinEventResult
            {
                Participant = ParticipantResponse.FromDomain(existing),
                IsNew = false,
                Message = "Déjà inscrit avec ce pseudo"
            };
        }

        if (evt.Config?.MaxParticipants is { } cap && cap > 0)
        {
            var currentCount = await _participantRepository.CountByEventIdAsync(evt.Id, ct);
            if (currentCount >= cap)
                throw new ConflictException(
                    $"La soirée est complète ({cap} participants maximum).");
        }

        var now = DateTimeOffset.UtcNow;
        var participant = new Participant
        {
            Id = string.Empty,
            EventId = evt.Id,
            Pseudo = pseudo,
            UserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _participantRepository.AddAsync(participant, ct);

        _ = NotifyHostAsync(evt, pseudo, userId, CancellationToken.None);

        return new JoinEventResult
        {
            Participant = ParticipantResponse.FromDomain(created),
            IsNew = true,
            Message = string.Empty
        };
    }

    private async Task NotifyHostAsync(Event evt, string joinerPseudo, string joinerUserId, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrEmpty(evt.CreatorUserId))
                return;

            var host = await _userRepository.GetByIdAsync(evt.CreatorUserId, ct);
            if (host is null || !host.NotifiesOn(UserNotificationType.ParticipantJoined))
                return;

            var joiner = await _userRepository.GetByIdAsync(joinerUserId, ct);

            var subscriptions = await _pushSubscriptions.ListByUserIdAsync(evt.CreatorUserId, ct);
            if (subscriptions.Count > 0)
            {
                var message = new PushMessage(
                    Title: "Ça s'anime !",
                    Body: $"{joinerPseudo} vient de rejoindre {evt.Title} ! 🎉",
                    Tag: $"join-{evt.Id}",
                    Url: $"/e/{evt.Slug}"
                );

                foreach (var sub in subscriptions)
                    await _pushSender.SendAsync(sub, message, ct);
            }

            await _notifications.AddAsync(new UserNotification
            {
                UserId = evt.CreatorUserId,
                Type = UserNotificationType.ParticipantJoined,
                ActorHandle = joiner?.Handle,
                ActorDisplayName = joiner?.DisplayName,
                ActorAvatarId = joiner?.AvatarId,
                EventId = evt.Id,
                EventSlug = evt.Slug,
                EventTitle = evt.Title,
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Échec de la notification d'inscription pour la soirée {EventId}", evt.Id);
        }
    }
}
