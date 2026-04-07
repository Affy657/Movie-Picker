using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Reactions;

public sealed class RemoveReactionHandler : IRemoveReactionHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IReactionRepository _reactionRepository;

    public RemoveReactionHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IReactionRepository reactionRepository)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _reactionRepository = reactionRepository;
    }

    public async Task HandleAsync(
        string idOrSlug,
        string movieId,
        string reactionId,
        string participantId,
        CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        var movie = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw new NotFoundException("Film introuvable");

        var rid = reactionId.Trim();
        if (!ReactionCatalog.IsKnown(rid))
            throw new BadRequestException("Identifiant de réaction inconnu.");

        var participant = await _participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct);
        if (participant is null)
            throw new BadRequestException("Participant invalide pour cette soirée");

        var deleted = await _reactionRepository.DeleteAsync(evt.Id, movie.Id, participant.Id, rid, ct);
        if (!deleted)
            throw new NotFoundException("Réaction introuvable");
    }
}
