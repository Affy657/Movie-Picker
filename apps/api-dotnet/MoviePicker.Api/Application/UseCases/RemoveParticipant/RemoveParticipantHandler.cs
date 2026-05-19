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
    private readonly ILogger<RemoveParticipantHandler> _logger;

    public RemoveParticipantHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        ISeenMarkRepository seenMarkRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        ILogger<RemoveParticipantHandler> logger)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _seenMarkRepository = seenMarkRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _logger = logger;
    }

    public async Task<RemoveParticipantResponse> HandleAsync(string idOrSlug, string participantId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(participantId))
            throw new BadRequestException("Participant requis.");

        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.ClosedAt.HasValue)
            throw new ConflictException("Soirée clôturée. Impossible de modifier la liste des participants.");

        if (!string.IsNullOrEmpty(evt.WinnerMovieId))
            throw new ConflictException("La roue a déjà été lancée : la liste des participants ne peut plus être modifiée.");

        var participant = await _participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct);
        if (participant is null)
            throw new NotFoundException("Participant introuvable");

        if (!string.IsNullOrEmpty(evt.CreatorUserId) && participant.UserId == evt.CreatorUserId)
            throw new ConflictException("Le créateur de la soirée ne peut pas être retiré.");

        var hostToken = _hostTokenAccessor.GetHostToken();
        var currentUserId = _currentUserAccessor.GetUserId();
        var isHost = EventHost.IsHost(evt, hostToken, currentUserId);
        var isSelfConnected = !string.IsNullOrEmpty(currentUserId)
            && !string.IsNullOrEmpty(participant.UserId)
            && participant.UserId == currentUserId;

        if (!isHost && !isSelfConnected)
            throw new ForbiddenException("Action réservée à l'hôte ou au participant lui-même.");

        var movieIds = await _movieRepository.ListIdsByEventAndParticipantAsync(evt.Id, participant.Id, ct);
        foreach (var movieId in movieIds)
        {
            await _voteRepository.DeleteByMovieIdAsync(movieId, ct);
            await _seenMarkRepository.DeleteByMovieIdAsync(evt.Id, movieId, ct);
            await _movieRepository.DeleteAsync(movieId, ct);
        }

        await _voteRepository.DeleteByEventAndParticipantAsync(evt.Id, participant.Id, ct);
        await _seenMarkRepository.DeleteByEventAndParticipantAsync(evt.Id, participant.Id, ct);

        var deleted = await _participantRepository.DeleteAsync(participant.Id, evt.Id, ct);
        if (!deleted)
            throw new NotFoundException("Participant introuvable");

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
            Message = isSelfConnected && !isHost ? "Vous avez quitté la soirée." : "Participant retiré."
        };
    }
}
