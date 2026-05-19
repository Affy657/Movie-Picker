using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
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
    private readonly ILogger<DeleteEventHandler> _logger;

    public DeleteEventHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        ISeenMarkRepository seenMarkRepository,
        ICurrentUserAccessor currentUserAccessor,
        ILogger<DeleteEventHandler> logger)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _seenMarkRepository = seenMarkRepository;
        _currentUserAccessor = currentUserAccessor;
        _logger = logger;
    }

    public async Task<DeleteEventResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var currentUserId = _currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId))
            throw new UnauthorizedException("La suppression d'une soirée nécessite un compte connecté.");

        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (string.IsNullOrEmpty(evt.CreatorUserId) || evt.CreatorUserId != currentUserId)
            throw new ForbiddenException("Seul le créateur de la soirée peut la supprimer.");

        var removedVotes = await _voteRepository.DeleteByEventIdAsync(evt.Id, ct);
        var removedSeenMarks = await _seenMarkRepository.DeleteByEventIdAsync(evt.Id, ct);
        var removedMovies = await _movieRepository.DeleteByEventIdAsync(evt.Id, ct);
        var removedParticipants = await _participantRepository.DeleteByEventIdAsync(evt.Id, ct);

        var deleted = await _eventRepository.DeleteAsync(evt.Id, ct);
        if (!deleted)
        {
            _logger.LogWarning(
                "DeleteEvent: cascade OK mais l'événement {EventId} n'existait plus à la suppression finale.",
                evt.Id);
            throw new NotFoundException("Soirée introuvable");
        }

        _logger.LogInformation(
            "Event deleted: {EventId} (slug={Slug}, by={UserId}, cascadedVotes={Votes}, seenMarks={Seen}, movies={Movies}, participants={Participants})",
            evt.Id,
            evt.Slug,
            currentUserId,
            removedVotes,
            removedSeenMarks,
            removedMovies,
            removedParticipants);

        return new DeleteEventResponse
        {
            EventId = evt.Id,
            Slug = evt.Slug ?? string.Empty,
            Message = "Soirée supprimée.",
            RemovedParticipants = removedParticipants,
            RemovedMovies = removedMovies,
            RemovedVotes = removedVotes,
            RemovedSeenMarks = removedSeenMarks
        };
    }
}
