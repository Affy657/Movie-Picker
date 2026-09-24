using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.JoinEvent;

public sealed class JoinEventHandler : IJoinEventHandler
{
    private const int MaxPseudoLength = 100;
    private const int MaxJoinAttempts = 3;

    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly IUserNotificationRepository _notifications;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<JoinEventHandler> _logger;
    private readonly TimeProvider _clock;

    public JoinEventHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IUserRepository userRepository,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        IUserNotificationRepository notifications,
        IUnitOfWork unitOfWork,
        ILogger<JoinEventHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _userRepository = userRepository;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _notifications = notifications;
        _unitOfWork = unitOfWork;
        _logger = logger;
        _clock = clock;
    }

    public async Task<JoinEventResult> HandleAsync(string idOrSlug, JoinEventRequest request, string authenticatedUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(authenticatedUserId))
            throw Errors.AccountRequired();

        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(_clock.GetUtcNow()))
            throw Errors.EventFinished();

        var userId = authenticatedUserId;
        var alreadyLinked = await _participantRepository.FindByEventAndUserIdAsync(evt.Id, userId, ct);
        if (alreadyLinked is not null)
            return AlreadyJoined(alreadyLinked);

        var requestedPseudo = request.Pseudo.Trim();
        for (var attempt = 0; attempt < MaxJoinAttempts; attempt++)
        {
            var pseudo = await AvailablePseudoAsync(evt.Id, requestedPseudo, ct);
            try
            {
                var created = await InsertAsync(evt, NewParticipant(evt.Id, pseudo, userId), ct);
                await NotifyHostAsync(evt, created.Pseudo, userId, CancellationToken.None);
                return new JoinEventResult
                {
                    Participant = ParticipantResponse.FromDomain(created),
                    IsNew = true,
                    Message = string.Empty
                };
            }
            catch (ParticipantConflictException conflict) when (conflict.Collision == ParticipantCollision.SameAccount)
            {
                var linked = await _participantRepository.FindByEventAndUserIdAsync(evt.Id, userId, ct);
                if (linked is not null)
                    return AlreadyJoined(linked);
                throw;
            }
            catch (ParticipantConflictException conflict) when (conflict.Collision == ParticipantCollision.SamePseudo)
            {
                _logger.LogInformation("Pseudo taken concurrently in movie night {EventId}, joining again", evt.Id);
            }
        }

        throw Errors.ConcurrentUpdate();
    }

    private static JoinEventResult AlreadyJoined(Participant participant) => new()
    {
        Participant = ParticipantResponse.FromDomain(participant),
        IsNew = false,
        Message = "Already joined with this account"
    };

    private Participant NewParticipant(string eventId, string pseudo, string userId)
    {
        var now = _clock.GetUtcNow();
        return new Participant
        {
            Id = string.Empty,
            EventId = eventId,
            Pseudo = pseudo,
            UserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    private async Task<string> AvailablePseudoAsync(string eventId, string requested, CancellationToken ct)
    {
        var taken = (await _participantRepository.ListByEventIdAsync(eventId, ct))
            .Select(p => p.Pseudo)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (!taken.Contains(requested))
            return requested;

        for (var rank = 2; ; rank++)
        {
            var suffix = $" {rank}";
            var candidate = TruncateForSuffix(requested, MaxPseudoLength - suffix.Length) + suffix;
            if (!taken.Contains(candidate))
                return candidate;
        }
    }

    private static string TruncateForSuffix(string pseudo, int maxLength)
    {
        if (pseudo.Length <= maxLength)
            return pseudo;

        var cut = char.IsHighSurrogate(pseudo[maxLength - 1]) ? maxLength - 1 : maxLength;
        return pseudo[..cut].TrimEnd();
    }

    private async Task<Participant> InsertAsync(Event evt, Participant participant, CancellationToken ct)
    {
        if (evt.Config?.MaxParticipants is not { } cap || cap <= 0)
        {
            var created = await _participantRepository.AddAsync(participant, ct);
            await _eventRepository.MarkChangedAsync(evt.Id, ct);
            return created;
        }

        var inserted = participant;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                await _eventRepository.LockForWriteAsync(evt.Id, token);
                var currentCount = await _participantRepository.CountByEventIdAsync(evt.Id, token);
                if (currentCount >= cap)
                    throw Errors.EventFull(cap);
                inserted = await _participantRepository.AddAsync(participant, token);
            },
            ct);
        return inserted;
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

                await PushFanOut.SendToAllAsync(_pushSender, subscriptions, message, ct);
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
                CreatedAt = _clock.GetUtcNow()
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Join notification failed for movie night {EventId}", evt.Id);
        }
    }
}
