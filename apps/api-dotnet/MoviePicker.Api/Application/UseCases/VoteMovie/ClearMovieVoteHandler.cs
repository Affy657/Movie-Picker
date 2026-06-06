using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.VoteMovie;

public sealed class ClearMovieVoteHandler : IClearMovieVoteHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public ClearMovieVoteHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IVoteRepository voteRepository,
        ICurrentUserAccessor currentUserAccessor)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _voteRepository = voteRepository;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task HandleAsync(string idOrSlug, string movieId, string participantId, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        var movie = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw new NotFoundException("Film introuvable");

        var participant = await _participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct);
        if (participant is null)
            throw new BadRequestException("Participant invalide pour cette soirée");

        var currentUserId = _currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId) || participant.UserId != currentUserId)
            throw new ForbiddenException("Vous ne pouvez modifier que votre propre vote.");

        await _voteRepository.DeleteByMovieAndParticipantAsync(movie.Id, participant.Id, ct);
    }
}
