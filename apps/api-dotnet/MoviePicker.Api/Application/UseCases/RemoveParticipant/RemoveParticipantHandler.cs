using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.RemoveParticipant;

public sealed class RemoveParticipantHandler : IRemoveParticipantHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly ISeenMarkRepository _seenMarkRepository;
    private readonly IMovieRatingRepository _ratingRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly EventAudienceNotifier _audience;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;
    private readonly ILogger<RemoveParticipantHandler> _logger;

    public RemoveParticipantHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        ISeenMarkRepository seenMarkRepository,
        IMovieRatingRepository ratingRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        EventAudienceNotifier audience,
        IUnitOfWork unitOfWork,
        TimeProvider clock,
        ILogger<RemoveParticipantHandler> logger)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _seenMarkRepository = seenMarkRepository;
        _ratingRepository = ratingRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _audience = audience;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _logger = logger;
    }

    public async Task<RemoveParticipantResponse> HandleAsync(string idOrSlug, string participantId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(participantId))
            throw Errors.ParticipantRequired();

        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);
        EnsureParticipantsCanChange(evt);

        var participant = await _participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct);
        if (participant is null)
            throw Errors.ParticipantNotFound();

        if (!string.IsNullOrEmpty(evt.CreatorUserId) && participant.UserId == evt.CreatorUserId)
            throw Errors.CreatorCannotBeRemoved();

        var currentUserId = _currentUserAccessor.GetUserId();
        var isHost = HostedEvent.IsHost(evt, _hostTokenAccessor, currentUserId);
        var isSelfConnected = !string.IsNullOrEmpty(currentUserId)
            && !string.IsNullOrEmpty(participant.UserId)
            && participant.UserId == currentUserId;

        if (!isHost && !isSelfConnected)
            throw Errors.HostOrSelfOnly();

        var keptOutUserId = isHost && !isSelfConnected ? participant.UserId : null;
        var movieIds = await RemoveWithItsMoviesAsync(idOrSlug, evt.Id, participant.Id, keptOutUserId, ct);
        if (!string.IsNullOrEmpty(keptOutUserId))
            await _audience.NotifyUsersAsync([keptOutUserId], RemovedMessage(evt), CancellationToken.None);

        _logger.LogInformation(
            "Participant removed: {ParticipantId} from event {EventId} (byHost={IsHost}, selfConnected={IsSelf}, cascadedMovies={MovieCount})",
            participant.Id,
            evt.Id,
            isHost,
            isSelfConnected,
            movieIds.Count);

        return new RemoveParticipantResponse
        {
            ParticipantId = participant.Id,
            EventId = evt.Id,
            RemovedMovies = movieIds.Count,
            Message = isSelfConnected && !isHost ? "You left the movie night" : "Participant removed"
        };
    }

    private static void EnsureParticipantsCanChange(Event evt)
    {
        if (evt.ClosedAt.HasValue)
            throw Errors.EventClosedParticipantsLocked();

        if (evt.HasWinner)
            throw Errors.ParticipantsLockedWheel();
    }

    private async Task<IReadOnlyList<string>> RemoveWithItsMoviesAsync(
        string idOrSlug,
        string eventId,
        string participantId,
        string? keptOutUserId,
        CancellationToken ct)
    {
        IReadOnlyList<string> movieIds = [];
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                var current = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, token);
                EnsureParticipantsCanChange(current);

                movieIds = await EventChildData.PurgeParticipantTracesAsync(
                    _voteRepository,
                    _seenMarkRepository,
                    _ratingRepository,
                    _movieRepository,
                    eventId,
                    participantId,
                    token);
                if (!await _participantRepository.DeleteAsync(participantId, eventId, token))
                    throw Errors.ParticipantNotFound();
                var updated = string.IsNullOrEmpty(keptOutUserId) ? current : current.KeepingOut(keptOutUserId);
                await _eventRepository.UpdateAsync(updated with { UpdatedAt = _clock.GetUtcNow() }, token);
            },
            ct);
        return movieIds;
    }

    private static EventAudienceMessage RemovedMessage(Event evt) => new(
        evt.Id,
        new UserNotification
        {
            Type = UserNotificationType.RemovedFromEvent,
            EventId = evt.Id,
            EventSlug = evt.Slug,
            EventTitle = evt.Title
        },
        ServerCopy.Push.RemovedFromEvent(evt.Title).ToMessage(
            tag: $"removed-{evt.Id}",
            url: FrontRoutes.EventDetail(evt.Slug)));
}
