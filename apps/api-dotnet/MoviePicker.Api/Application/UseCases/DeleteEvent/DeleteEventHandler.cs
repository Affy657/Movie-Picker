using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.DeleteEvent;

public sealed class DeleteEventHandler : IDeleteEventHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly ISeenMarkRepository _seenMarkRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IUserRepository _userRepository;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly IUserNotificationRepository _notifications;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteEventHandler> _logger;
    private readonly TimeProvider _clock;

    public DeleteEventHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        ISeenMarkRepository seenMarkRepository,
        ICurrentUserAccessor currentUserAccessor,
        IUserRepository userRepository,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        IUserNotificationRepository notifications,
        IUnitOfWork unitOfWork,
        ILogger<DeleteEventHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _seenMarkRepository = seenMarkRepository;
        _currentUserAccessor = currentUserAccessor;
        _userRepository = userRepository;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _notifications = notifications;
        _unitOfWork = unitOfWork;
        _logger = logger;
        _clock = clock;
    }

    public async Task<DeleteEventResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var currentUserId = _currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId))
            throw Errors.AccountRequired();

        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (string.IsNullOrEmpty(evt.CreatorUserId) || evt.CreatorUserId != currentUserId)
            throw Errors.CreatorOnlyDelete();

        var participants = await _participantRepository.ListByEventIdAsync(evt.Id, ct);
        var participantUserIds = participants
            .Where(p => !string.IsNullOrEmpty(p.UserId) && p.UserId != currentUserId)
            .Select(p => p.UserId!)
            .Distinct()
            .ToList();

        var cascade = new Cascade();
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                cascade.Votes = await _voteRepository.DeleteByEventIdAsync(evt.Id, token);
                cascade.SeenMarks = await _seenMarkRepository.DeleteByEventIdAsync(evt.Id, token);
                cascade.Movies = await _movieRepository.DeleteByEventIdAsync(evt.Id, token);
                cascade.Participants = await _participantRepository.DeleteByEventIdAsync(evt.Id, token);
                await _notifications.DeleteByEventIdAsync(evt.Id, token);
                cascade.EventDeleted = await _eventRepository.DeleteAsync(evt.Id, token);
            },
            ct);

        if (!cascade.EventDeleted)
        {
            _logger.LogWarning(
                "DeleteEvent: cascade succeeded but movie night {EventId} no longer existed at the final deletion",
                evt.Id);
            throw Errors.EventNotFound();
        }

        await NotifyParticipantsOnEventDeletedAsync(evt, participantUserIds, CancellationToken.None);

        _logger.LogInformation(
            "Event deleted: {EventId} (slug={Slug}, by={UserId}, cascadedVotes={Votes}, seenMarks={Seen}, movies={Movies}, participants={Participants})",
            evt.Id,
            evt.Slug,
            currentUserId,
            cascade.Votes,
            cascade.SeenMarks,
            cascade.Movies,
            cascade.Participants);

        return new DeleteEventResponse
        {
            EventId = evt.Id,
            Slug = evt.Slug ?? string.Empty,
            Message = "Movie night deleted",
            RemovedParticipants = cascade.Participants,
            RemovedMovies = cascade.Movies,
            RemovedVotes = cascade.Votes,
            RemovedSeenMarks = cascade.SeenMarks
        };
    }

    private sealed class Cascade
    {
        public long Votes { get; set; }
        public long SeenMarks { get; set; }
        public long Movies { get; set; }
        public long Participants { get; set; }
        public bool EventDeleted { get; set; }
    }

    private async Task NotifyParticipantsOnEventDeletedAsync(Event evt, List<string> userIds, CancellationToken ct)
    {
        try
        {
            if (userIds.Count == 0)
                return;

            var users = await _userRepository.ListByIdsAsync(userIds, ct);
            var notifiableIds = users.Where(u => u.NotifiesOn(UserNotificationType.EventDeleted)).Select(u => u.Id).ToHashSet();
            if (notifiableIds.Count == 0)
                return;

            var subs = await _pushSubscriptions.ListByUserIdsAsync(notifiableIds, ct);
            if (subs.Count > 0)
            {
                var message = new PushMessage(
                    Title: "Soirée annulée 😢",
                    Body: $"{evt.Title} a été annulée.",
                    Tag: $"event-deleted-{evt.Id}",
                    Url: "/"
                );

                await PushFanOut.SendToAllAsync(
                    _pushSender,
                    subs.Where(s => notifiableIds.Contains(s.UserId)),
                    message,
                    ct);
            }

            var now = _clock.GetUtcNow();
            foreach (var userId in notifiableIds)
            {
                await _notifications.AddAsync(new UserNotification
                {
                    UserId = userId,
                    Type = UserNotificationType.EventDeleted,
                    EventTitle = evt.Title,
                    IsRead = false,
                    CreatedAt = now
                }, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Deletion notification failed for movie night {EventId}", evt.Id);
        }
    }
}
