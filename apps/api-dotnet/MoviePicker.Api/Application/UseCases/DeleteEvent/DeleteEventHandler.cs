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
    private readonly IMovieRatingRepository _ratingRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IUserNotificationRepository _notifications;
    private readonly EventAudienceNotifier _audience;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteEventHandler> _logger;
    private readonly TimeProvider _clock;

    public DeleteEventHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        ISeenMarkRepository seenMarkRepository,
        IMovieRatingRepository ratingRepository,
        ICurrentUserAccessor currentUserAccessor,
        IUserNotificationRepository notifications,
        EventAudienceNotifier audience,
        IUnitOfWork unitOfWork,
        ILogger<DeleteEventHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _seenMarkRepository = seenMarkRepository;
        _ratingRepository = ratingRepository;
        _currentUserAccessor = currentUserAccessor;
        _notifications = notifications;
        _audience = audience;
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
                cascade.Ratings = await _ratingRepository.DeleteByEventIdAsync(evt.Id, token);
                cascade.Movies = await _movieRepository.DeleteByEventIdAsync(evt.Id, token);
                cascade.Participants = await _participantRepository.DeleteByEventIdAsync(evt.Id, token);
                await _notifications.DeleteByEventIdAsync(evt.Id, token);
                await EndTheSeriesThatLeadsHereAsync(evt, token);
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

        await _audience.NotifyUsersAsync(participantUserIds, EventDeletedMessage(evt), CancellationToken.None);

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
            RemovedSeenMarks = cascade.SeenMarks,
            RemovedRatings = cascade.Ratings
        };
    }

    private async Task EndTheSeriesThatLeadsHereAsync(Event evt, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(evt.RecurrenceParentEventId))
            return;

        var parents = await _eventRepository.ListByIdsAsync([evt.RecurrenceParentEventId], ct);
        var parent = parents.FirstOrDefault(p => p.Id == evt.RecurrenceParentEventId);
        if (parent is null || parent.NextOccurrenceEventId != evt.Id)
            return;

        await _eventRepository.UpdateAsync(
            parent with { NextOccurrenceEventId = null, Recurrence = null, UpdatedAt = _clock.GetUtcNow() },
            ct);
    }

    private sealed class Cascade
    {
        public long Votes { get; set; }
        public long SeenMarks { get; set; }
        public long Ratings { get; set; }
        public long Movies { get; set; }
        public long Participants { get; set; }
        public bool EventDeleted { get; set; }
    }

    private static EventAudienceMessage EventDeletedMessage(Event evt) => new(
        evt.Id,
        new UserNotification
        {
            Type = UserNotificationType.EventDeleted,
            EventTitle = evt.Title
        },
        new PushMessage(
            Title: "Soirée annulée 😢",
            Body: $"{evt.Title} a été annulée.",
            Tag: $"event-deleted-{evt.Id}",
            Url: "/"));
}
