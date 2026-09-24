using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.RemoveParticipant;

public sealed class RemoveParticipantHandler : IRemoveParticipantHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly ISeenMarkRepository _seenMarkRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;
    private readonly ILogger<RemoveParticipantHandler> _logger;

    public RemoveParticipantHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        ISeenMarkRepository seenMarkRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IUnitOfWork unitOfWork,
        TimeProvider clock,
        ILogger<RemoveParticipantHandler> logger)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _seenMarkRepository = seenMarkRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _logger = logger;
    }

    public async Task<RemoveParticipantResponse> HandleAsync(string idOrSlug, string participantId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(participantId))
            throw Errors.ParticipantRequired();

        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.ClosedAt.HasValue)
            throw Errors.EventClosedParticipantsLocked();

        if (evt.HasWinner)
            throw Errors.ParticipantsLockedWheel();

        var participant = await _participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct);
        if (participant is null)
            throw Errors.ParticipantNotFound();

        if (!string.IsNullOrEmpty(evt.CreatorUserId) && participant.UserId == evt.CreatorUserId)
            throw Errors.CreatorCannotBeRemoved();

        var hostToken = _hostTokenAccessor.GetHostToken();
        var currentUserId = _currentUserAccessor.GetUserId();
        var isHost = EventHost.IsHost(evt, hostToken, currentUserId);
        var isSelfConnected = !string.IsNullOrEmpty(currentUserId)
            && !string.IsNullOrEmpty(participant.UserId)
            && participant.UserId == currentUserId;

        if (!isHost && !isSelfConnected)
            throw Errors.HostOrSelfOnly();

        var movieIds = await _movieRepository.ListIdsByEventAndParticipantAsync(evt.Id, participant.Id, ct);
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                var current = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, token);
                if (current.HasWinner)
                    throw Errors.ParticipantsLockedWheel();

                await _voteRepository.DeleteByMovieIdsAsync(movieIds, token);
                await _seenMarkRepository.DeleteByMovieIdsAsync(evt.Id, movieIds, token);
                await _movieRepository.DeleteByIdsAsync(movieIds, token);
                await _voteRepository.DeleteByEventAndParticipantAsync(evt.Id, participant.Id, token);
                await _seenMarkRepository.DeleteByEventAndParticipantAsync(evt.Id, participant.Id, token);
                if (!await _participantRepository.DeleteAsync(participant.Id, evt.Id, token))
                    throw Errors.ParticipantNotFound();
                await _eventRepository.UpdateAsync(current with { UpdatedAt = _clock.GetUtcNow() }, token);
            },
            ct);

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
}
