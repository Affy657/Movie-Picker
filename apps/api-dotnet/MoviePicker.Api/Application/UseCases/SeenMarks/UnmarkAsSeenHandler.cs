using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SeenMarks;

public sealed class UnmarkAsSeenHandler : IUnmarkAsSeenHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly ISeenMarkRepository _seenMarkRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly TimeProvider _clock;

    public UnmarkAsSeenHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        ISeenMarkRepository seenMarkRepository,
        ICurrentUserAccessor currentUserAccessor,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _seenMarkRepository = seenMarkRepository;
        _currentUserAccessor = currentUserAccessor;
        _clock = clock;
    }

    public async Task HandleAsync(
        string idOrSlug,
        string movieId,
        string participantId,
        CancellationToken ct = default)
    {
        var (evt, movie, participant) = await MovieActionContext.ResolveOwnedMovieAsync(
            _eventRepository,
            _movieRepository,
            _participantRepository,
            _currentUserAccessor,
            _clock.GetUtcNow(),
            idOrSlug,
            movieId,
            participantId,
            Errors.SeenMarkOwnOnly,
            ct);

        var deleted = await _seenMarkRepository.DeleteAsync(evt.Id, movie.Id, participant.Id, ct);
        if (!deleted)
            throw Errors.SeenMarkNotFound();
    }
}
